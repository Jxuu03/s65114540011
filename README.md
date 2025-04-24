# Freshy Fishy

**Proposed by 65114540011 Kamon Charoensri**  
As a Capstone Project for the course **1145104 Data Science and Software Innovation Project**,  
Bachelor of Science (Data Science and Software Innovation),  
Department of Mathematics, Statistics, and Computer,  
Faculty of Science, Ubon Ratchathani University

## 📌 Project Overview
In recent years, ornamental fish keeping has gained significant popularity. However, maintaining a healthy and stable aquarium environment remains a challenge for many fish keepers. 
Tasks such as feeding and monitoring water quality parameters must be carried out regularly to ensure the fish's health and growth. 
Without proper management, poor water conditions can lead to fish stress, disease, or even mortality.

This project introduces a smart aquarium system that integrates IoT technology with a web application for remote monitoring and control. The system consists of two main components:

### 1. IoT Device
An ESP32-based microcontroller is used to collect real-time data from sensors that monitor:
- **Temperature**
- **pH Level**
- **TDS (Total Dissolved Solids)**
- **Water Level**

These sensors form the foundation of a **Water Quality Monitoring System**. The data is then transmitted via the internet to the web application.

### 2. Web Application
A responsive web app allows users to:
- View real-time water quality data
- Receive alerts when water quality is abnormal
- Remotely control certain actions within the aquarium (e.g., water refilling, drainage, feeding, and lighting)

## 💻 Technologies Used
- **Frontend**: React.js  
- **Backend**: Django
- **Database**: MySQL
- **Microcontroller / IoT**: ESP32

## 📡 IoT Components Used
- **Microcontroller**: ESP32 
- **Display**: SPI TFT 2.4" Display (5V)
- **Motor**: MG90 Servo Motor (Continuous)
- **LED Strip**: WS2812B (8 LEDs)
- **Distance Sensor**: Ultrasonic Sensor HC-SR04
- **TDS Sensor**: Total Dissolved Solids Sensor
- **pH Sensor**: E-201-C Analog pH Sensor
- **Temperature Sensor**: DS18B20 Digital Temperature Sensor
- **Water Pumps**: 2× Mini Water Pumps (DC 3V–5V) with 5V 2-Channel Relay Module

## 🔌	Circuit
![image](https://github.com/user-attachments/assets/3ed4096a-501d-4b43-902e-700c43603e55)

## 📱 Web Application Screenshot
- **Main Page or Dashboard**  
![Screenshot 2025-04-04 230648](https://github.com/user-attachments/assets/dea94f8e-b592-4753-b892-97b061f60a63)
- **User Preferences Setting**  
![Screenshot 2025-04-04 234343](https://github.com/user-attachments/assets/7171fb13-d780-4f4f-8dc8-1cba1e3bf00c)
- **Feeding Control**  
![Screenshot 2025-04-04 235533](https://github.com/user-attachments/assets/eb422aae-8707-4c17-a3c5-88bf7e7f600b)
- **Light Control**  
![Screenshot 2025-04-05 000658](https://github.com/user-attachments/assets/52f05555-316f-4866-9b64-ffc68b9c7ec2)
- **Scedule**  
![Screenshot 2025-04-05 001402](https://github.com/user-attachments/assets/f1ad328d-681d-4ccf-a8cd-0ee1bc0d355d)
- **Drainage**  
![Screenshot 2025-04-05 002552](https://github.com/user-attachments/assets/306f1850-d1fd-473f-91a7-0f069a4bed27)
![Screenshot 2025-04-05 002845](https://github.com/user-attachments/assets/258318c6-e779-418a-bf6c-00908298274c)
- **Refilling**  
![Screenshot 2025-04-05 003209](https://github.com/user-attachments/assets/2d168035-ec87-4ae0-9316-3c6de297b4a4)
