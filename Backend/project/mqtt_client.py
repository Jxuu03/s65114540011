import paho.mqtt.client as mqtt
import time
import json
from .models import *
from django.utils import timezone

PUBLIC_MQTT_BROKER = "test.mosquitto.org"
PUBLIC_MQTT_PORT = 1883


class MQTTClient:
    def __init__(self):
        self.client = mqtt.Client()
        self.response_data = None
        self.response_received = False

        self.client.on_message = self.on_message

    def connect(self):
        if not self.client.is_connected():
            try:
                self.client.connect(PUBLIC_MQTT_BROKER, PUBLIC_MQTT_PORT, 60)
                print(f"Connected to public MQTT broker at {PUBLIC_MQTT_BROKER}:{PUBLIC_MQTT_PORT}")
            except Exception as e:
                print(f"Connection to public broker failed: {str(e)}")

    def publish(self, topic, message):
        self.client.publish(topic, message)
        print(f"Published to Public Broker: {topic} -> {message}")

    def subscribe(self, topic):
        self.client.subscribe(topic)
        print(f"Subscribed to Public Broker: {topic}")

    def loop_start(self):
        self.client.loop_start()

    def on_message(self, client, userdata, message):
        topic = message.topic
        payload = message.payload.decode("utf-8")
        print(f"Received message on {topic}: {payload}")

        if topic == "Freshyfishy/sensor":
            self.handle_sensor_data(payload)
        elif topic == "Freshyfishy/response":
            self.handle_device_response(payload)
        elif topic == "Freshyfishy/command":
            self.handle_device_command(payload)
        elif topic == "Freshyfishy/pump":
            self.handle_device_pump(payload)
        elif topic == "Freshyfishy/waterLv":
            self.handle_device_waterlv(payload)
        elif topic == "Freshyfishy/reqstatus":
            self.handle_device_status(payload)
        elif topic == "Freshyfishy/display":
            self.handle_device_display(payload)

    def handle_sensor_data(self, payload):
        try:
            data = json.loads(payload)
            print(f"Received sensor data: {data}")
            process_sensor_data(data)
        except Exception as e:
            print(f"Error processing sensor data: {str(e)}")

    def handle_device_response(self, payload):
        try:
            print(f"Received response from IoT: {payload}")
            self.response_data = payload
            self.response_received = True
        except Exception as e:
            print(f"Error processing device response: {str(e)}")

    def handle_device_command(self, payload):
        print(f"Received command from IoT: {payload}")

    def handle_device_pump(self, payload):
        print(f"Received pump command from IoT: {payload}")
        
    def handle_device_waterlv(self, payload):
        print(f"Received water level from IoT: {payload}")
        
    def handle_device_status(self, payload):
        print(f"Handling device status: {payload}")
        latest_feed = feedingData.objects.latest("timestamp")
        latest_light = lightData.objects.latest("timestamp")

        response = {
            "feed": latest_feed.timestamp.timestamp(),  
            "light": latest_light.status, 
            "color": latest_light.color
        }

        response_json = json.dumps(response)
        self.publish("Freshyfishy/status", response_json)  
        print(f"Published response: {response_json}")
    
    def update_status(self):
        latest_feed = feedingData.objects.latest("timestamp")
        latest_light = lightData.objects.latest("timestamp")

        response = {
            "feed": latest_feed.timestamp.timestamp(),  
            "light": latest_light.status, 
            "color": latest_light.color
        }

        response_json = json.dumps(response)
        self.publish("Freshyfishy/status", response_json)  
        print(f"Published response: {response_json}")
        
    def handle_device_display(self, payload):
        print(f"Received display update from IoT: {payload}")
        data = json.loads(payload)  

        if "feed" in data :
            timestamp = timezone.now()
            feedingData.objects.create(timestamp=timestamp, data="Feed Successful!")
            print(f"Stored feeding data: {data['feed']} at {timestamp}")

        if "light" in data :
            status = "ON" if "ON" in data["light"] else "OFF"
            
            latest_light = lightData.objects.latest("timestamp")
            latest_color = latest_light.color 

            timestamp = timezone.now()
            lightData.objects.create(timestamp=timestamp, status=status, color=latest_color)
            print(f"Updated light status: {status}, Color: {latest_color} at {timestamp}")
        
        latest_feed = feedingData.objects.latest("timestamp")
        latest_light = lightData.objects.latest("timestamp")

        response = {
            "feed": latest_feed.timestamp.timestamp(),  
            "light": latest_light.status, 
            "color": latest_light.color
        }

        response_json = json.dumps(response)
        self.publish("Freshyfishy/status", response_json)  
        print(f"Published response: {response_json}")
            

    def reset_response_data(self):
        self.response_data = None
        self.response_received = False

    def loop_until_response(self, timeout=30):
        start_time = time.time()
        while not self.response_received:
            time.sleep(0.1)
            if time.time() - start_time > timeout:
                raise Exception("Response timeout")
        return self.response_data


mqtt_client_instance = MQTTClient()


def setup_sensor():
    mqtt_client_instance.connect()

    mqtt_client_instance.subscribe("Freshyfishy/sensor")
    mqtt_client_instance.subscribe("Freshyfishy/response")
    mqtt_client_instance.subscribe("Freshyfishy/pump")
    mqtt_client_instance.subscribe("Freshyfishy/reqstatus")
    mqtt_client_instance.subscribe("Freshyfishy/waterLv")
    mqtt_client_instance.subscribe("Freshyfishy/command")
    mqtt_client_instance.subscribe("Freshyfishy/display")

    mqtt_client_instance.loop_start()

setup_sensor()


def process_sensor_data(data):
    try:
        # Ensure data is in dict format
        if isinstance(data, dict):
            print("Data received from MQTT")
            temp = data.get("temp")
            ph = data.get("ph")
            tds = data.get("tds")
            waterLv = data.get("waterLv")
        else:
            raise ValueError("Invalid data format")

        # Fetch the latest user preferences
        preferences = userPreferences.objects.last()
        if not preferences:
            raise ValueError("User preferences not found")

        # Determine evaluation status
        eval_status = "Green"
        if (
            temp < preferences.minOrgTemp
            or temp > preferences.maxOrgTemp
            or ph < preferences.minOrgPh
            or ph > preferences.maxOrgPh
            or tds < preferences.minOrgTds
            or tds > preferences.maxOrgTds
            or waterLv < preferences.orgWaterLv
            or waterLv > 100
        ):
            eval_status = "Red"
        elif (
            temp < preferences.minGrnTemp
            or temp > preferences.maxGrnTemp
            or ph < preferences.minGrnPh
            or ph > preferences.maxGrnPh
            or tds < preferences.minGrnTds
            or tds > preferences.maxGrnTds
            or waterLv < preferences.grnWaterLv
        ):
            eval_status = "Orange"

        # Log evaluated values
        print(
            f"Evaluated Data -> Temp: {temp}, pH: {ph}, TDS: {tds}, Water Level: {waterLv}, Eval: {eval_status}"
        )

        # Save the data to the database
        sensorData.objects.create(
            temp=temp,
            ph=ph,
            tds=tds,
            waterLv=waterLv,
            timestamp=timezone.now(),
            eval=eval_status,
        )

        print("Sensor data processed and stored successfully.")
        return {
            "temp": temp,
            "ph": ph,
            "tds": tds,
            "waterLv": waterLv,
            "eval": eval_status,
        }

    except Exception as e:
        print(f"Error processing sensor data: {str(e)}")
        return None
