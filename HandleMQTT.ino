#include <WiFiManager.h>
#include <PubSubClient.h>
#include <ESP32Servo.h>
#include <ArduinoJson.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <Adafruit_NeoPixel.h>
#include <Adafruit_GFX.h>
#include <Adafruit_ST7789.h>
#include <XPT2046_Touchscreen.h>
#include <SPI.h>
#include <HTTPClient.h>
#include <TimeLib.h>

// WiFi and MQTT setup
WiFiClient espClient;
PubSubClient client(espClient);
const char* mqtt_server = "test.mosquitto.org";

// Sensor and module
Servo myServo;  // for feeding

// Light control
#define LED_PIN 26  // Pin connected to the data input of the WS2812B strip
#define NUM_LEDS 8  // Number of LEDs in the strip
Adafruit_NeoPixel strip(NUM_LEDS, LED_PIN, NEO_GRB + NEO_KHZ800);

// Drainage and Refilling
#define DRAINAGE_RELAY_PIN 27
#define REFILLING_RELAY_PIN 25
bool stopCommandReceived = false;

// DS18B20 Temperature Sensor Pin
#define ONE_WIRE_BUS 4
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature sensors(&oneWire);

// Ultrasonic Sensor Pins
const int trig = 5;
const int echo = 21;
float tankSize = 24;  // Default tank full value in cm
float duration, distance;
int filledPercentage = 0;

// TDS Sensor
#define TdsSensorPin 34
#define VREF 3.3           // Analog reference voltage (Volt)
#define SCOUNT 50          // Sum of sample points
int analogBuffer[SCOUNT];  // Store analog values read from ADC
int analogBufferTemp[SCOUNT];
int analogBufferIndex = 0, tdsValue = 0, temperature = 25;
float averageVoltage = 0;

//pH Sensor
const int analogPhPin = 35;
float pHValue;
float phTot = 0;
float phAvg = 0;
const int sampleSize = 50;
int sampleCount = 0;
// Calibration values
float C = 25.85;  // Adjusted constant based on buffer solution
float m = -6.80;  // Slope of the calibration curve
#define NUM_SAMPLES 50
float phReadings[NUM_SAMPLES];
int sampleIndex = 0;
unsigned long lastSampleTime = 0;  // Time tracking for non-blocking sampling
const int sampleInterval = 10;     // Time interval between samples (10 ms)
float getFilteredpH(float newpH) {
  phReadings[sampleIndex] = newpH;
  sampleIndex = (sampleIndex + 1) % NUM_SAMPLES;

  float sum = 0;
  for (int i = 0; i < NUM_SAMPLES; i++) {
    sum += phReadings[i];
  }
  return sum / NUM_SAMPLES;
}

// TFT Display
#define TFT_CS 15      // Chip Select for TFT
#define TFT_RST 32     // Reset for TFT
#define TFT_DC 33      // Data/Command control for TFT
#define TOUCH_CS 23    // Chip Select for Touchscreen
#define TOUCH_CLK 14   // Clock for Touchscreen
#define TOUCH_MISO 12  // MISO for Touchscreen
#define TOUCH_MOSI 13  // MOSI for Touchscreen

// Initialize the TFT display
Adafruit_ST7789 tft = Adafruit_ST7789(TFT_CS, TFT_DC, TFT_RST);
XPT2046_Touchscreen ts(TOUCH_CS);

bool isBlinking = false;
int currentPage = 0;
// Default border colors
uint16_t tempColor = ST77XX_WHITE;
uint16_t phColor = ST77XX_WHITE;
uint16_t tdsColor = ST77XX_WHITE;
uint16_t waterLevelColor = ST77XX_WHITE;
uint16_t tempTxt = ST77XX_CYAN;
uint16_t phTxt = ST77XX_CYAN;
uint16_t tdsTxt = ST77XX_CYAN;
uint16_t waterLevelTxt = ST77XX_CYAN;
String statusText = "NORMAL";
time_t feed;
String formattedTime;
String light;
String color = "rgb(255, 255, 255)";

// Timer variables
unsigned long lastSensorPublish = 0, lastDisplayRefresh = 0, lastCommandTime = 0, lastSensorRead = 0;
const unsigned long
  sensorReadInterval = 10000,       // 10 Sec
  sensorPublishInterval = 60000,    // 1 minutes
  displayRefreshInterval = 120000;  // 2 minutes

void setup() {
  Serial.begin(9600);

  // *** 1️⃣ Initialize TFT First ***
  SPI.begin(14, 12, 13, 15);       // Initialize SPI communication
  tft.init(240, 320);              // Initialize TFT display
  tft.setRotation(1);              // Set screen rotation
  tft.fillScreen(ST77XX_BLACK);    // Fill screen with black color
  tft.setTextColor(ST77XX_WHITE);  // Set text color to white
  tft.setTextSize(2);              // Set text size

  tft.setCursor(60, 100);
  tft.print("Setting up..");

  tft.setCursor(40, 130);
  tft.print("Please check if there's");

  tft.setCursor(50, 160);
  tft.print("WiFi portal for");

  tft.setCursor(30, 190);
  tft.print("\"FreshyFishySetup\"");

  tft.invertDisplay(false);

  // *** 2️⃣ Initialize Touchscreen ***
  ts.begin();         // Initialize touchscreen
  ts.setRotation(1);  // Set touchscreen rotation

  // *** 3️⃣ Setup WiFi (with timeout) ***
  WiFiManager wifiManager;
  if (!wifiManager.autoConnect("FreshyFishySetup")) {
    Serial.println("⚠ WiFi Failed. Running offline...");
    tft.setCursor(20, 160);
    tft.print("WiFi Failed. Offline Mode.");
  } else {
    Serial.println("✅ WiFi Connected!");
    Serial.print("ESP IP Address: ");
    Serial.println(WiFi.localIP());

    /// *** 4️⃣ Setup MQTT ***
    client.setServer(mqtt_server, 1883);  // Set MQTT server
    client.setCallback(mqttCallback);     // Set MQTT callback function
    client.setSocketTimeout(30);

    // *** TFT Update for MQTT Connection ***
    tft.fillScreen(ST77XX_BLACK);  // Clear the screen
    tft.setTextColor(ST77XX_WHITE);
    tft.setCursor(40, 120);
    tft.print("Connecting to MQTT...");

    while (!client.connected()) {
      String client_id = "esp32-client-";
      client_id += String(WiFi.macAddress());

      Serial.printf("Connecting to MQTT as %s...\n", client_id.c_str());
      tft.setCursor(60, 150);
      tft.print("Retrying...");

      // Attempt to connect to MQTT
      if (client.connect(client_id.c_str())) {
        tft.fillScreen(ST77XX_BLACK);  // Clear the screen after successful connection
        tft.setCursor(50, 130);
        tft.print("✅ MQTT Connected!");

        // Proceed to MQTT connection setup
        connectToMQTT();
      } else {
        Serial.print("❌ MQTT Connection Failed: ");
        Serial.println(client.state());
        delay(5000);  // Wait for 2 seconds before retrying
      }
    }
  }

  // *** 5️⃣ Update TFT Display After Connections ***
  sendReqStatus();  // Request sensor status
  updateDisplay();  // Update display with new information

  // *** 6️⃣ Initialize Sensors ***
  sensors.begin();               // Initialize DS18B20 or similar sensor (One-Wire)
  analogReadResolution(12);      // Set ADC resolution
  pinMode(TdsSensorPin, INPUT);  // Initialize TDS sensor pin
  delay(100);

  pinMode(echo, INPUT);   // Set Ultrasonic echo pin as input
  pinMode(trig, OUTPUT);  // Set Ultrasonic trigger pin as output

  // *** 7️⃣ Initialize Actuators ***
  myServo.attach(18);                       // Attach servo motor to pin 18
  pinMode(DRAINAGE_RELAY_PIN, OUTPUT);      // Initialize drainage relay
  pinMode(REFILLING_RELAY_PIN, OUTPUT);     // Initialize refilling relay
  digitalWrite(DRAINAGE_RELAY_PIN, HIGH);   // Set drainage relay off
  digitalWrite(REFILLING_RELAY_PIN, HIGH);  // Set refilling relay off

  // *** 8️⃣ Initialize LED Strip (Last) ***
  strip.begin();  // Initialize LED strip
  strip.show();   // Display the initial LED state

  // ✅ Final delay before first readings
  delay(200);
}

void loop() {
  unsigned long currentMillis = millis();
  client.loop();

  calculateTDS();
  calculatepH();

  // Publish sensor data every 1 minutes
  if (currentMillis - lastSensorPublish >= sensorPublishInterval) {
    lastSensorPublish = currentMillis;
    sendDataSensor();
  }

  // Refresh display every 2 minutes
  if (currentMillis - lastDisplayRefresh >= displayRefreshInterval) {
    lastDisplayRefresh = currentMillis;
    sensors.requestTemperatures();
    temperature = sensors.getTempCByIndex(0);
    calculateDistance();
    calculateTDS();
    calculatepH();
    updateDisplay();
  }

  // Handle touchscreen input
  if (ts.touched()) {
    TS_Point p = ts.getPoint();
    int x = map(p.y, 300, 3500, 0, 320);
    int y = map(p.x, 300, 3700, 0, 240);

    // Page change: instant update
    if (x >= 0 && x <= 60 && y >= 70 && y <= 220 && currentPage == 0) {
      currentPage = 1;
      updateDisplay();  // Instant update on page change
    } else if (x >= 200 && x <= 350 && y >= 0 && y <= 210 && currentPage == 1) {
      currentPage = 0;
      updateDisplay();  // Instant update on page change
    }
    // Feed button: Check cooldown before executing
    else if (x >= 165 && x <= 250 && y >= 85 && y <= 140 && currentPage == 1) {
      tft.fillRoundRect(85, 60, 110, 100, 10, ST77XX_BLUE);
      tft.setCursor(105, 100);
      tft.setTextColor(ST77XX_WHITE);
      tft.setTextSize(3);
      tft.print("FEED");

      String request = "{\"feed\":\"Feed\"}";
      client.publish("Freshyfishy/display", request.c_str());
      Serial.println("send /display");
      triggerFeed();
    }
    // Light button: Check cooldown before executing
    else if (x >= 10 && x <= 100 && y >= 70 && y <= 145 && currentPage == 1) {
      String request;

      if (light == "ON") {
        request = "{\"light\":\"OFF\"}";
        client.publish("Freshyfishy/display", request.c_str());
        Serial.println("send /display");
        switchLight("OFF", color);
      } else {
        request = "{\"light\":\"ON\"}";
        client.publish("Freshyfishy/display", request.c_str());
        Serial.print("send /display");
        switchLight("ON", color);
      }
    }
  }


  // Handle blinking only when on Page 0
  if (currentPage == 0) {
    if (statusText == "NORMAL") {
      blinkRectangle(ST77XX_CYAN);
    } else if (statusText == "CAUTION") {
      blinkRectangle(ST77XX_ORANGE);
    } else if (statusText == "DANGER") {
      blinkRectangle(ST77XX_RED);
    }
  }
  
  delay(100);

}


void connectToMQTT() {
  client.subscribe("Freshyfishy/command");
  Serial.println("Subscribed to Freshyfishy/command");

  client.subscribe("Freshyfishy/tank");
  Serial.println("Subscribed to Freshyfishy/tank");

  client.subscribe("Freshyfishy/quality");
  Serial.println("Subscribed to Freshyfishy/quality");

  client.subscribe("Freshyfishy/wifi");
  Serial.println("Subscribed to Freshyfishy/wifi");

  client.subscribe("Freshyfishy/status");
  Serial.println("Subscribed to Freshyfishy/status");
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  Serial.print("Message arrived on topic: ");
  Serial.println(topic);

  // Convert payload to string
  String message = "";
  for (unsigned int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  Serial.print("Message: ");
  Serial.println(message);

  // Process messages based on the topic
  if (String(topic) == "Freshyfishy/command") {
    processCommand(message);
  } else if (String(topic) == "Freshyfishy/tank") {
    processTankSetting(message);
  } else if (String(topic) == "Freshyfishy/quality") {
    processQuality(message);
  } else if (String(topic) == "Freshyfishy/wifi" && message == "1") {
    Serial.println("Reset WiFi command received! Opening portal...");
    WiFiManager wifiManager;
    wifiManager.startConfigPortal("FreshyFishySetup");
  } else if (String(topic) == "Freshyfishy/status") {
    DynamicJsonDocument doc(1024);
    deserializeJson(doc, message);
    double feedDouble = doc["feed"].as<double>();
    feed = (time_t)feedDouble;
    light = doc["light"].as<String>();
    color = doc["color"].as<String>();

    formattedTime = formatTime(feed);
    Serial.print("Formatted Time: ");
    Serial.println(formattedTime);
    updateDisplay();
  }
}

// Check the command and trigger the appropriate action
void processCommand(String command) {
  if (command == "Feed") {
    triggerFeed();
    client.publish("Freshyfishy/response", "Feed Successful!");
    updateDisplay();

  } else if (command.startsWith("ON")) {  //(e.g., "ON/(2,117,231,100)")
    String color = command.substring(3);  // Extract color part
    String status = "ON";
    Serial.println("Switching Light ON with color: " + color);
    switchLight(status, color);
    // Send response to MQTT
    client.publish("Freshyfishy/response", "Switch Successfully!");
    updateDisplay();

  } else if (command.startsWith("OFF")) {  // (e.g., "OFF")
    String status = "OFF";
    Serial.println("Switching Light OFF");
    switchLight(status, "");
    // Send response to MQTT
    client.publish("Freshyfishy/response", "Switch Successfully!");
    updateDisplay();

  } else if (command.startsWith("Drainage")) {
    String action = command.substring(9);
    Serial.println("Recieve command for drainage to: " + action);

    if (action == "Start") {
      Serial.println("Starting drainage process...");
      startDrainage(-1);
    } else if (action == "30") {
      Serial.println("Starting drainage process...");
      startDrainage(30);
    } else if (action == "100") {
      Serial.println("Starting drainage process...");
      startDrainage(100);
    } else if (action == "Stop") {
      Serial.println("Stopping drainage process...");
      stopCommandReceived = true;
    }

  } else if (command.startsWith("Refilling")) {
    String action = command.substring(command.indexOf('/') + 1);
    Serial.println("Recieve command for drainage to: " + action);

    if (action == "Start") {
      Serial.println("Starting refilling process...");
      startRefilling();
    } else if (action == "Stop") {
      Serial.println("Stopping refilling process...");
      stopCommandReceived = true;
    }
  }
}

void processTankSetting(String message) {
  float newTankHeight = message.toFloat();
  if (newTankHeight > 0) {
    tankSize = newTankHeight;
    Serial.println("Updated tank height to: " + String(tankSize) + " cm");
  } else {
    Serial.println("Invalid tank height received: " + message);
  }
}

// Feeding Control
void triggerFeed() {
  myServo.writeMicroseconds(1300);
  delay(400);
  myServo.writeMicroseconds(1500);
  delay(100);
  myServo.writeMicroseconds(1700);
  delay(400);
  myServo.writeMicroseconds(1500);
}

// Light Control
void switchLight(String status, String color) {
  int red = 0, green = 0, blue = 0, brightness = 255;  // Fixed brightness at 25

  if (status == "ON" && color.length() > 0) {
    // Remove the "rgb(" and ")" from the string
    color.replace("rgb(", "");
    color.replace(")", "");

    // Now parse the color string, which should look like "167,121,142"
    int comma1 = color.indexOf(',');
    int comma2 = color.lastIndexOf(',');

    // Extract the red, green, and blue values
    red = color.substring(0, comma1).toInt();
    green = color.substring(comma1 + 1, comma2).toInt();
    blue = color.substring(comma2 + 1).toInt();
  }

  // Ensure brightness stays in valid range (0-255)
  brightness = constrain(brightness, 0, 255);

  // Apply brightness and switch LED strip color
  strip.setBrightness(brightness);

  if (status == "ON") {
    for (int i = 0; i < NUM_LEDS; i++) {
      strip.setPixelColor(i, strip.Color(red, green, blue));  // Set LED color
    }
    strip.show();  // Update the LED strip
    Serial.println("Light ON with RGB: " + String(red) + "," + String(green) + "," + String(blue));
  } else if (status == "OFF") {
    // Turn off the LEDs
    for (int i = 0; i < NUM_LEDS; i++) {
      strip.setPixelColor(i, strip.Color(0, 0, 0));  // Turn off LED
    }
    strip.show();  // Update the LED strip
    Serial.println("Light OFF");
  }
}

// Water Quality Section; send data to backend
void sendDataSensor() {
  // Read temperature
  sensors.requestTemperatures();
  temperature = sensors.getTempCByIndex(0);

  // Calculate water level percentage
  calculateDistance();

  // Read and calculate TDS value
  calculateTDS();

  // Read and calculate pH value
  calculatepH();

  // Prepare JSON payload
  StaticJsonDocument<200> doc;
  doc["temp"] = temperature;
  doc["ph"] = pHValue;
  doc["tds"] = tdsValue;
  doc["waterLv"] = filledPercentage;

  char buffer[256];
  serializeJson(doc, buffer);

  // Publish to MQTT
  client.publish("Freshyfishy/sensor", buffer);

  // Print sensor data to Serial Monitor
  Serial.print("Sensor data sent to MQTT: ");
  Serial.println(buffer);
}

// Water Level; Ultrasonic
void calculateDistance() {
  digitalWrite(trig, LOW);
  delayMicroseconds(2);
  digitalWrite(trig, HIGH);
  delayMicroseconds(10);
  digitalWrite(trig, LOW);

  duration = pulseIn(echo, HIGH);
  distance = (duration * 0.0343) / 2;

  Serial.print("Measured Distance: ");
  Serial.print(distance);
  Serial.println(" cm");

  float sensorHeight = tankSize + 3.0;
  float fullWaterHeight = tankSize - 3.0;
  float waterFill = fullWaterHeight - (distance - 6.0);  // Adjusted calculation

  filledPercentage = round((waterFill / fullWaterHeight) * 100);

  // Ensure filledPercentage stays within valid range (0-100)
  if (filledPercentage < 0) {
    filledPercentage = 0;
  }
}

// TDS; TDS Sensor
void calculateTDS() {
  static unsigned long analogSampleTimepoint = millis();
  if (millis() - analogSampleTimepoint > 40U) {  // Every 40ms, read ADC
    analogSampleTimepoint = millis();
    analogBuffer[analogBufferIndex] = analogRead(TdsSensorPin);
    analogBufferIndex++;
    if (analogBufferIndex == SCOUNT) analogBufferIndex = 0;
  }

  static unsigned long printTimepoint = millis();
  if (millis() - printTimepoint > 800U) {  // Every 800ms, print data
    printTimepoint = millis();

    // Read DS18B20 temperature
    sensors.requestTemperatures();
    float tempReading = sensors.getTempCByIndex(0);
    if (tempReading != -127.00) {
      temperature = tempReading;  // Only update if valid
    }

    // Median filter ADC values
    for (int i = 0; i < SCOUNT; i++) {
      analogBufferTemp[i] = analogBuffer[i];
    }
    averageVoltage = getMedianNum(analogBufferTemp, SCOUNT) * (VREF / 4096.0);

    // Temperature compensation
    float compensationCoefficient = 1.0 + 0.02 * (temperature - 25.0);
    float compensationVoltage = averageVoltage / compensationCoefficient;

    // Convert voltage to TDS (ppm)
    tdsValue = (133.42 * compensationVoltage * compensationVoltage * compensationVoltage
                - 255.86 * compensationVoltage * compensationVoltage
                + 857.39 * compensationVoltage)
               * 0.5;
  }
}

// Median filter function
int getMedianNum(int bArray[], int iFilterLen) {
  int bTab[iFilterLen];
  for (int i = 0; i < iFilterLen; i++) {
    bTab[i] = bArray[i];
  }

  // Sort array
  for (int j = 0; j < iFilterLen - 1; j++) {
    for (int i = 0; i < iFilterLen - j - 1; i++) {
      if (bTab[i] > bTab[i + 1]) {
        int bTemp = bTab[i];
        bTab[i] = bTab[i + 1];
        bTab[i + 1] = bTemp;
      }
    }
  }

  // Return median value
  if (iFilterLen % 2 == 0) {
    return (bTab[iFilterLen / 2] + bTab[iFilterLen / 2 - 1]) / 2;
  } else {
    return bTab[iFilterLen / 2];
  }
}

// Drainage Functions
void startDrainage(int targetLevel) {
  float stopLevel = -1;
  calculateDistance();  // Ensure an initial reading
  Serial.print("Starting Drainage at: ");
  Serial.print(filledPercentage);
  Serial.println(" %");

  if (targetLevel == 30) {
    stopLevel = filledPercentage - (filledPercentage * (30 / 100.0));
    Serial.print("Target Stop Level (30% removal): ");
    Serial.println(stopLevel);
  } else if (targetLevel == 100) {
    stopLevel = 0;
    Serial.println("Target Stop Level: 0%");
  } else if (targetLevel == -1) {
    Serial.println("Continuous drainage with no specific stop level.");
  }

  // Start drainage process
  digitalWrite(DRAINAGE_RELAY_PIN, LOW);
  Serial.println("Pump is ON. Draining...");

  unsigned long lastCheckTime = millis();  // To manage non-blocking delays

  while (true) {
    // Process MQTT messages
    client.loop();

    // Check stop conditions
    if ((targetLevel == 30 && filledPercentage <= stopLevel) || (targetLevel == 100 && filledPercentage <= 0) || stopCommandReceived) {
      if (stopCommandReceived) {
        Serial.println("Stop command received. Stopping drainage...");
        client.publish("Freshyfishy/pump", "Drainage Stopped");
      } else {
        Serial.println("Drainage target reached.");
        client.publish("Freshyfishy/pump", "Drainage Success");
      }
      stopDrainage();
      break;
    }

    // Update sensor readings every second (non-blocking delay)
    if (millis() - lastCheckTime >= 1000) {
      lastCheckTime = millis();

      calculateDistance();
      Serial.print("Current Filled Percentage: ");
      Serial.println(filledPercentage);
      String message = "Water Level: " + String(filledPercentage);
      client.publish("Freshyfishy/waterLv", message.c_str());
    }
  }
}

void stopDrainage() {
  digitalWrite(DRAINAGE_RELAY_PIN, HIGH);
  Serial.println("Pump is OFF. Drainage stopped.");
  stopCommandReceived = false;
}

// Refilling Functions
void startRefilling() {
  // Ensure the refilling only starts if filledPercentage is less than 100
  calculateDistance();
  if (filledPercentage == 100) {
    String message = "Water Level: " + String(filledPercentage);
    client.publish("Freshyfishy/waterLv", message.c_str());
    client.publish("Freshyfishy/pump", "Refilling Stopped");
    stopRefilling();
    return;
  }

  // Start refilling process
  digitalWrite(REFILLING_RELAY_PIN, LOW);
  Serial.println("Pump is ON. Refilling...");

  unsigned long lastCheckTime = millis();  // To manage non-blocking delays

  while (true) {
    // Process MQTT messages
    client.loop();

    // Check stop conditions
    if (filledPercentage >= 100 || stopCommandReceived) {
      if (stopCommandReceived) {
        Serial.println("Stop command received. Stopping refilling...");
        client.publish("Freshyfishy/pump", "Refilling Stopped");
      } else {
        Serial.println("Tank is full. Refilling completed.");
        client.publish("Freshyfishy/pump", "Refilling Success");
      }
      stopRefilling();
      break;
    }

    // Update sensor readings every second (non-blocking delay)
    if (millis() - lastCheckTime >= 1000) {
      lastCheckTime = millis();

      calculateDistance();
      Serial.print("Current Filled Percentage: ");
      Serial.println(filledPercentage);
      String message = "Water Level: " + String(filledPercentage);
      client.publish("Freshyfishy/waterLv", message.c_str());
    }
  }
}

void stopRefilling() {
  digitalWrite(REFILLING_RELAY_PIN, HIGH);
  Serial.println("Pump is OFF. Refilling stopped.");
  stopCommandReceived = false;
}

void sendReqStatus() {
  String request = "{\"status\":\"request\"}";
  client.publish("Freshyfishy/reqstatus", request.c_str());
  Serial.println("✅ send request to device/reqstatus!");
}

// For TFT Display
void updateDisplay() {
  tft.fillScreen(ST77XX_BLACK);  // Clear the screen
  tft.setTextColor(ST77XX_WHITE);
  tft.setTextSize(2);

  if (currentPage == 0) {
    // Water Quality Status
    tft.fillRect(60, 20, 140, 45, ST77XX_BLACK);
    tft.setTextColor(ST77XX_WHITE);
    tft.setTextSize(3);
    tft.setCursor(60, 25);
    tft.print(statusText);

    // Temperature Section
    tft.fillRoundRect(5, 70, 120, 80, 10, ST77XX_BLACK);
    tft.drawRoundRect(5, 70, 120, 80, 10, tempColor);
    tft.setTextColor(tempTxt);
    tft.setTextSize(2);
    tft.setCursor(40, 85);
    tft.print("Temp: ");

    tft.setTextColor(ST77XX_WHITE);
    tft.setTextSize(3);
    tft.setCursor(35, 115);
    tft.print(temperature);
    tft.setTextSize(2);
    tft.write(0xF7);
    tft.print("C");

    // pH Section
    tft.fillRoundRect(130, 70, 120, 80, 10, ST77XX_BLACK);
    tft.drawRoundRect(130, 70, 120, 80, 10, phColor);
    tft.setTextColor(phTxt);
    tft.setCursor(175, 85);
    tft.print("pH: ");

    tft.setTextColor(ST77XX_WHITE);
    tft.setTextSize(3);
    tft.setCursor(160, 115);
    tft.println(pHValue);

    // TDS Section
    tft.fillRoundRect(5, 155, 120, 80, 10, ST77XX_BLACK);
    tft.drawRoundRect(5, 155, 120, 80, 10, tdsColor);
    tft.setTextColor(tdsTxt);
    tft.setCursor(45, 170);
    tft.setTextSize(2);
    tft.print("TDS: ");

    tft.setTextColor(ST77XX_WHITE);
    tft.setTextSize(3);
    tft.setCursor(35, 200);
    tft.print(tdsValue);
    tft.setTextSize(1);
    tft.print(" ppm");

    // Water Level Section
    tft.fillRoundRect(130, 155, 120, 80, 10, ST77XX_BLACK);
    tft.drawRoundRect(130, 155, 120, 80, 10, waterLevelColor);
    tft.setTextColor(waterLevelTxt);
    tft.setTextSize(2);
    tft.setCursor(135, 170);
    tft.print("Water Lv:");

    tft.setTextColor(ST77XX_WHITE);
    tft.setTextSize(3);
    tft.setCursor(160, 200);
    tft.print(filledPercentage);
    tft.setTextSize(2);
    tft.print(" %");

    // Draw the "Next Page" button (on both pages)
    tft.drawRoundRect(255, 70, 60, 165, 10, ST77XX_WHITE);  // Button border
    tft.setTextColor(ST77XX_WHITE);
    tft.setCursor(280, 140);  // Position the button text
    tft.setTextSize(3);
    tft.print(">");

  } else if (currentPage == 1) {
    // Draw the "Previous" button
    tft.drawRoundRect(5, 0, 60, 240, 10, ST77XX_WHITE);  // Button border
    tft.setTextColor(ST77XX_WHITE);
    tft.setCursor(25, 120);  // Position the button text
    tft.setTextSize(3);
    tft.print("<");

    // latest Feed
    tft.setTextColor(ST77XX_WHITE);
    tft.setTextSize(1);
    tft.setCursor(105, 170);
    tft.println("Latest Feed: ");
    tft.setTextColor(ST77XX_WHITE);
    tft.setTextSize(1);
    tft.setCursor(90, 185);
    tft.println(formattedTime);

    // latest light status
    tft.setTextColor(ST77XX_WHITE);
    tft.setTextSize(1);
    tft.setCursor(240, 170);
    tft.println("Status: ");
    tft.setTextColor(ST77XX_WHITE);
    tft.setTextSize(1);
    tft.setCursor(250, 185);
    tft.println(light);

    // Topic with button
    tft.setCursor(100, 35);
    tft.setTextColor(ST77XX_WHITE);
    tft.setTextSize(2);
    tft.print("Feeding");

    tft.fillRoundRect(85, 60, 110, 100, 10, ST77XX_CYAN);   // Button bg
    tft.drawRoundRect(85, 60, 110, 100, 10, ST77XX_WHITE);  // Button border
    tft.setTextColor(ST77XX_BLACK);
    tft.setCursor(105, 100);  // Position the button text
    tft.setTextSize(3);
    tft.print("FEED");

    tft.setCursor(230, 35);
    tft.setTextColor(ST77XX_WHITE);
    tft.setTextSize(2);
    tft.print("Light");

    if (light == "ON") {
      tft.fillRoundRect(205, 60, 110, 100, 10, ST77XX_RED);  // Button bg
      tft.setCursor(240, 100);
      tft.setTextSize(3);
      tft.print("OFF");
    } else {
      tft.fillRoundRect(205, 60, 110, 100, 10, ST77XX_GREEN);  // Button bg
      tft.setCursor(245, 100);
      tft.setTextColor(ST77XX_BLACK);
      tft.setTextSize(3);
      tft.print("ON");
    }

    tft.drawRoundRect(205, 60, 110, 100, 10, ST77XX_WHITE);  // Button border
    tft.setTextColor(ST77XX_WHITE);
  }
}

void blinkRectangle(uint16_t color) {
  static unsigned long lastMillis = 0;
  unsigned long currentMillis = millis();

  if (color == ST77XX_CYAN) {
    // If the color is CYAN, display it statically without blinking
    tft.fillRoundRect(225, 5, 90, 60, 10, ST77XX_CYAN);
  } else {
    // Blink every 1000 milliseconds (1 second)
    if (currentMillis - lastMillis >= 1000) {
      lastMillis = currentMillis;
      isBlinking = !isBlinking;

      // Draw the rectangle based on the blinking state
      if (isBlinking) {
        tft.fillRoundRect(225, 5, 90, 60, 10, color);  // Show with selected color
      } else {
        tft.fillRoundRect(225, 5, 90, 60, 10, ST77XX_BLACK);  // Hide (black)
      }
    }
  }
}

void processQuality(String message) {
  StaticJsonDocument<2048> doc;
  DeserializationError error = deserializeJson(doc, message);

  if (error) {
    Serial.println("JSON Parsing Failed!");
    return;
  }

  String eval = doc["eval"].as<String>();

  if (currentPage == 0) {
    if (eval == "Green") {
      statusText = "NORMAL";
    } else if (eval == "Orange") {
      statusText = "CAUTION";
    } else if (eval == "Red") {
      statusText = "DANGER";
    }

    tempColor = ST77XX_WHITE;
    phColor = ST77XX_WHITE;
    tdsColor = ST77XX_WHITE;
    waterLevelColor = ST77XX_WHITE;

    tempTxt = ST77XX_CYAN;
    phTxt = ST77XX_CYAN;
    tdsTxt = ST77XX_CYAN;
    waterLevelTxt = ST77XX_CYAN;

    // Check "toNotice" list
    JsonArray notices = doc["notice"];

    for (JsonVariant notice : notices) {
      if (notice.containsKey("Temperature")) {
        String tempStatus = notice["Temperature"].as<String>();
        if (tempStatus == "Red") {
          tempColor = ST77XX_RED;
          tempTxt = ST77XX_RED;
        } else if (tempStatus == "Orange" && tempColor != ST77XX_RED) {
          tempColor = ST77XX_ORANGE;
          tempTxt = ST77XX_ORANGE;
        }
      }

      if (notice.containsKey("pH")) {
        String phStatus = notice["pH"].as<String>();
        if (phStatus == "Red") {
          phColor = ST77XX_RED;
          phTxt = ST77XX_RED;
        } else if (phStatus == "Orange" && phColor != ST77XX_RED) {
          phColor = ST77XX_ORANGE;
          phTxt = ST77XX_ORANGE;
        }
      }

      if (notice.containsKey("TDS")) {
        String tdsStatus = notice["TDS"].as<String>();
        if (tdsStatus == "Red") {
          tdsColor = ST77XX_RED;
          tdsTxt = ST77XX_RED;
        } else if (tdsStatus == "Orange" && tdsColor != ST77XX_RED) {
          tdsColor = ST77XX_ORANGE;
          tdsTxt = ST77XX_ORANGE;
        }
      }

      if (notice.containsKey("Water Level")) {
        String waterLevelStatus = notice["Water Level"].as<String>();
        if (waterLevelStatus == "Red") {
          waterLevelColor = ST77XX_RED;
          waterLevelTxt = ST77XX_RED;
        } else if (waterLevelStatus == "Orange" && waterLevelColor != ST77XX_RED) {
          waterLevelColor = ST77XX_ORANGE;
          waterLevelTxt = ST77XX_ORANGE;
        }
      }
    }
  }
  updateDisplay();
}

String formatTime(time_t timestamp) {
  struct tm timeInfo;
  timestamp += 7 * 3600;               // Add 7 hours (UTC+7 for Bangkok)
  localtime_r(&timestamp, &timeInfo);  // Convert to local time

  char buffer[20];
  strftime(buffer, sizeof(buffer), "%Y-%m-%d %H:%M", &timeInfo);  // Format time
  return String(buffer);
}

void calculatepH() {
  unsigned long currentMillis = millis();

  // Collect pH samples without delay
  if (currentMillis - lastSampleTime >= sampleInterval) {
    lastSampleTime = currentMillis;

    phTot += analogRead(analogPhPin);
    sampleCount++;

    // Process the samples after collecting enough data
    if (sampleCount >= sampleSize) {
      phAvg = phTot / sampleSize;

      // Convert ADC value to voltage
      float phVoltage = phAvg * (3.3 / 4096.0);

      // Read temperature
      sensors.requestTemperatures();
      float temperature = sensors.getTempCByIndex(0);  // Get temperature in Celsius

      // If the sensor is not found, use 25°C as the default
      if (temperature == DEVICE_DISCONNECTED_C) {
        Serial.println("Warning: Temperature sensor not detected. Using default 25°C.");
        temperature = 25.0;
      }

      // Apply temperature compensation
      float tempCompensation = (temperature - 25.0) * 0.03;  // Adjust for 0.03 pH per °C
      float rawpHValue = (phVoltage * m) + C + tempCompensation;

      // Apply moving average filter
      pHValue = getFilteredpH(rawpHValue);

      // Reset sampling variables
      phTot = 0;
      sampleCount = 0;
    }
  }
}