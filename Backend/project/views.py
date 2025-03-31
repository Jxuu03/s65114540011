from django.http import JsonResponse
from .models import *
from django.views.decorators.csrf import csrf_exempt
import json
from django.utils import timezone
from .firebase_config import messaging
from firebase_admin import messaging
from datetime import datetime, timedelta
from django.shortcuts import get_object_or_404
import time
from .mqtt_client import *
from django.db.models.functions import TruncDate, TruncTime

def save_schedule(workingTime, desc, freq):
    workingDate = timezone.now().date()
    status = "Pending"  # Added in server

    schedule.objects.create(
        workingTime=workingTime,
        workingDate=workingDate,
        desc=desc,
        freq=freq,
        status=status,
    )

    return {"message": "Schedule created successfully"}


def feed_instant():
    try:
        mqtt_client_instance.connect()
        mqtt_client_instance.subscribe("Freshyfishy/response")

        mqtt_client_instance.publish("Freshyfishy/command", "Feed")
        print(f"--------------- Feed command sent.")

        mqtt_client_instance.loop_until_response()

        print(f"*************** {mqtt_client_instance.response_data}")

        timestamp = timezone.now()
        feedingData.objects.create(
            data=mqtt_client_instance.response_data, timestamp=timestamp
        )

        mqtt_client_instance.reset_response_data()
        mqtt_client_instance.update_status()

        return {"message": "Feed instant triggered successfully"}
    except Exception as e:
        return {"error": f"IoT feed request failed: {str(e)}"}


@csrf_exempt
def feedingControl(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)

            action = data.get("action")
            print(f"Received {action} action")

            # Save users' schedule setting
            if action == "Schedule":
                working_time = data.get("workingTime")
                desc = data.get("desc")
                freq = data.get("freq")
                current_time = datetime.now().strftime("%H:%M")
                print(current_time)
                print(f"Received Schedule Feed action with status: {desc, freq}")

                if working_time == current_time:
                    result = save_schedule(working_time, desc, freq)
                    feed_instant()
                    current_schedule = schedule.objects.latest("timestamp")
                    current_schedule.status = "Success"
                    current_schedule.save()

                    print(f"Updated status of latest schedule to 'Success'")
                else:
                    result = save_schedule(working_time, desc, freq)

                return JsonResponse(result, status=201)

            elif action == "Instant":
                print(f"Received 'Instant Feed' action")
                result = feed_instant()
                return JsonResponse(result, status=200)

            else:
                return JsonResponse({"error": "Invalid action"}, status=400)

        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)

    elif request.method == "GET":
        try:
            latest_data = feedingData.objects.latest("timestamp")
            return JsonResponse(
                {
                    "data": latest_data.data,
                    "timestamp": latest_data.timestamp.timestamp(),
                }
            )
        except feedingData.DoesNotExist:
            return JsonResponse({"message": "No data found", "timestamp": None})

    return JsonResponse({"error": "Invalid request method"}, status=405)


def light_instant(switch, color):
    print(f"Received 'Instant' action with status: {switch, color}")
    try:
        mqtt_client_instance.connect()
        mqtt_client_instance.subscribe("Freshyfishy/response")

        payload = f"{switch}/{color}"
        print(f"----------------", payload)
        mqtt_client_instance.publish("Freshyfishy/command", payload)

        mqtt_client_instance.loop_until_response()

        print(f"*****************", mqtt_client_instance.response_data)

        mqtt_client_instance.reset_response_data()
        mqtt_client_instance.update_status()

        return {"message": "Light switching triggered successfully"}
    except Exception as e:
        return {"error": f"IoT light request failed: {str(e)}"}


@csrf_exempt
def lightControl(request):
    if request.method == "POST":
        try:
            print(f"Raw request body: {request.body}")
            data = json.loads(request.body)

            action = data.get("action")
            status = data.get("status")
            latestcolor = lightData.objects.latest("timestamp")
            color = latestcolor.color

            # Save users' light schedule setting
            if action == "Schedule":
                working_time = data.get("workingTime")
                freq = data.get("freq")
                desc = data.get("desc")
                switch = "ON" if "ON" in desc else "OFF"
                current_time = datetime.now().strftime("%H:%M")
                print(current_time)
                print(f"Received Schedule Light action with status: {desc, freq}")

                if working_time == current_time:
                    result = save_schedule(working_time, desc, freq)
                    light_instant(switch, color)
                    current_schedule = schedule.objects.latest("timestamp")
                    current_schedule.status = "Success"
                    current_schedule.save()

                    print(f"Updated status of latest schedule to 'Success'")
                else:
                    result = save_schedule(working_time, desc, freq)

                return JsonResponse(result, status=201)

            # Instantly switching light
            elif action == "Instant":

                print(f"Received 'Instant Light' action")
                result = light_instant(status, color)
                # Log the event
                timestamp = timezone.now()
                lightData.objects.create(timestamp=timestamp, status=status, color=color)
                return JsonResponse(result, status=200)

        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)

    elif request.method == "GET":
        try:
            latest_data = lightData.objects.latest("timestamp")
            return JsonResponse(
                {"status": latest_data.status, "color": latest_data.color}
            )
        except lightData.DoesNotExist:
            return JsonResponse({"message": "No data found", "timestamp": None})

    elif request.method == "PUT":
        try:
            data = json.loads(request.body)
            rgb = data.get("color")
            print(f"Received 'Light Color Changing' action with RGB: {rgb}")

            latest_data = lightData.objects.latest("timestamp")
            latest_data.color = rgb
            latest_data.save()

            switch = latest_data.status
            color = latest_data.color
            result = light_instant(switch, color)

            return JsonResponse(result, status=200)

        except lightData.DoesNotExist:
            return JsonResponse({"message": "No data found", "timestamp": None})

    else:
        return JsonResponse({"error": "Invalid request method"}, status=405)


def sensorEval(action, data):
    if isinstance(data, dict):
        print("Data received from request.body")
        temp = data.get("temp")
        ph = data.get("ph")
        tds = data.get("tds")
        waterLv = data.get("waterLv")
    elif isinstance(data, sensorData):
        print("Data received from database")
        temp = data.temp
        ph = data.ph
        tds = data.tds
        waterLv = data.waterLv

    preferences = userPreferences.objects.last()

    if action == "getEval":
        eval = "Green"

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
            eval = "Red"

        elif (
            temp < preferences.minGrnTemp
            or temp > preferences.maxGrnTemp
            or ph < preferences.minGrnPh
            or ph > preferences.maxGrnPh
            or tds < preferences.minGrnTds
            or tds > preferences.maxGrnTds
            or waterLv < preferences.grnWaterLv
        ):
            eval = "Orange"

        print(temp, ph, tds, waterLv, eval)

        return {
            "temp": temp,
            "ph": ph,
            "tds": tds,
            "waterLv": waterLv,
            "eval": eval,
        }

    else:
        toNotice = {}

        # Check for "Red" alerts first
        if data.temp < preferences.minOrgTemp or data.temp > preferences.maxOrgTemp:
            toNotice["Temperature"] = "Red"
        if data.ph < preferences.minOrgPh or data.ph > preferences.maxOrgPh:
            toNotice["pH"] = "Red"
        if data.tds < preferences.minOrgTds or data.tds > preferences.maxOrgTds:
            toNotice["TDS"] = "Red"
        if data.waterLv < preferences.orgWaterLv or data.waterLv > 100:
            toNotice["Water Level"] = "Red"

        # Check for "Orange" alerts only if "Red" is NOT already present
        if "Temperature" not in toNotice and (data.temp < preferences.minGrnTemp or data.temp > preferences.maxGrnTemp):
            toNotice["Temperature"] = "Orange"
        if "pH" not in toNotice and (data.ph < preferences.minGrnPh or data.ph > preferences.maxGrnPh):
            toNotice["pH"] = "Orange"
        if "TDS" not in toNotice and (data.tds < preferences.minGrnTds or data.tds > preferences.maxGrnTds):
            toNotice["TDS"] = "Orange"
        if "Water Level" not in toNotice and data.waterLv < preferences.grnWaterLv:
            toNotice["Water Level"] = "Orange"

        # Convert dictionary to list of dictionaries (expected format)
        notice_list = [{key: value} for key, value in toNotice.items()]

        print(data.temp, data.ph, data.tds, data.waterLv, data.eval, notice_list)
        return {"toNotice": notice_list}


@csrf_exempt
def sensorDataDisplay(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            timestamp = timezone.now()

            result = sensorEval("getEval", data)

            sensorData.objects.create(
                temp=result["temp"],
                ph=result["ph"],
                tds=result["tds"],
                waterLv=result["waterLv"],
                timestamp=timestamp,
                eval=result["eval"],
            )

            return JsonResponse(
                {
                    "message": "Data stored successfully",
                    "timestamp": timestamp.timestamp(),
                }
            )

        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)

    elif request.method == "GET":
        try:
            latest_data = sensorData.objects.latest("timestamp")
            if latest_data.eval in ["Orange", "Red"]:
                title = "Water Quality Alert"

                if latest_data.eval == "Orange":
                    body = "Water quality needs attention!"
                elif latest_data.eval == "Red":
                    body = "Critical water quality evaluate detected!"
                    
                sendPushNotification(title, body, latest_data.eval)

            result = sensorEval("getToNotice", latest_data)
            print(f'*********** {result["toNotice"]}')
            
            display_quality(latest_data, result)
            
            return JsonResponse(
                {
                    "temp": round(latest_data.temp, 1),
                    "ph": round(latest_data.ph, 1),
                    "tds": round(latest_data.tds, 1),
                    "waterLv": latest_data.waterLv,
                    "timestamp": latest_data.timestamp.timestamp(),
                    "eval": latest_data.eval,
                    "toNotice": result["toNotice"],
                }
            )
        except sensorData.DoesNotExist:
            return JsonResponse({"message": "No data found", "timestamp": None})

    else:
        return JsonResponse({"error": "Invalid request method"}, status=405)


@csrf_exempt
def saveToken(request):
    if request.method == "POST":
        data = json.loads(request.body)
        token = data.get("token")

        if token:
            if not userToken.objects.filter(token=token).exists():
                userToken.objects.create(token=token)
                return JsonResponse({"message": "Token saved successfully"})
            else:
                return JsonResponse({"message": "Token already exists"})
        else:
            return JsonResponse({"error": "No token provided"}, status=400)
    else:
        return JsonResponse({"error": "Invalid request method"}, status=405)


def sendPushNotification(title, body, eval):
    try:
        tokens = list(set(userToken.objects.values_list("token", flat=True)))

        if not tokens:
            return JsonResponse({"status": "error", "message": "No tokens found"})

        message = messaging.MulticastMessage(
            data={
                "title": title,
                "body": body,
                "color": eval,
            },
            tokens=tokens,
        )

        response = messaging.send_each_for_multicast(message)
        print(f"FCM Response: {response}")

        for result in response.responses:
            if result.success:
                print("Message sent successfully.")
            else:
                print(f"Message failed: {result.exception}")
        print(
            f"Successfully sent {response.success_count} messages to {len(tokens)} tokens"
        )
        return JsonResponse(
            {
                "status": "success",
                "message": f"Notification sent to {response.success_count} tokens",
            }
        )

    except Exception as e:
        print(f"Error sending notification: {str(e)}")
        return JsonResponse({"status": "error", "message": str(e)})


@csrf_exempt
def scheduleData(request):
    if request.method == "GET":
        try:
            today = timezone.now().date()
            next_day = today + timedelta(1)
            today_schedules = schedule.objects.filter(workingDate=today)
            everyday_success = schedule.objects.filter(
                workingDate=next_day, status="Success"
            )

            print(f"today: {today}, timestamp__date: {today_schedules}")
            print(f"for everyday: {next_day}, timestamp__date: {everyday_success}")

            # Collect data for each schedule into a list of dictionaries
            schedules_data = []

            # Add today's schedules
            for today in today_schedules:
                schedules_data.append(
                    {
                        "id": today.id,
                        "workingTime": today.workingTime,
                        "desc": today.desc,
                        "freq": today.freq,
                        "status": today.status,
                    }
                )

            # Add the "everyday success" schedules
            for everyday in everyday_success:
                schedules_data.append(
                    {
                        "id": everyday.id,
                        "workingTime": everyday.workingTime,
                        "desc": everyday.desc,
                        "freq": everyday.freq,
                        "status": everyday.status,
                    }
                )

            return JsonResponse({"schedules": schedules_data})

        except schedule.DoesNotExist:
            return JsonResponse({"message": "No data found", "timestamp": None})

    elif request.method == "DELETE":
        try:
            data = json.loads(request.body)
            print(f"Received DELETE request payload: {data}")
            id = data.get("id")
            type = data.get("type")

            if not id or not type:
                return JsonResponse(
                    {"error": "Missing required fields: id or type"}, status=400
                )

            selected_schedule = get_object_or_404(schedule, id=id)
            print(f"Deleting schedule: {selected_schedule}")

            if type == "Permanent":
                selected_schedule.delete()
                return JsonResponse(
                    {"message": "Successfully canceled schedule"}, status=200
                )
            elif type == "Today":
                today = selected_schedule.workingDate

                if isinstance(today, str):
                    today = datetime.strptime(today, "%Y-%m-%d").date()

                next_day = today + timedelta(days=1)
                selected_schedule.workingDate = next_day
                selected_schedule.save()

                return JsonResponse(
                    {"message": "Schedule shall be handle tomorrow"}, status=200
                )
            else:
                return JsonResponse({"error": "Invalid type"}, status=400)

        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid JSON format"}, status=400)
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)

    else:
        return JsonResponse({"error": "Invalid request method"}, status=405)


@csrf_exempt
def preferences(request):
    if request.method == "PUT":
        try:
            data = json.loads(request.body)

            print(f"Received new preferences setting: {data}")

            preferences = userPreferences.objects.get_or_create(
                id=1  
            )

            # Update 
            preferences.minGrnTemp = data.get("minGrnTemp", preferences.minGrnTemp)
            preferences.maxGrnTemp = data.get("maxGrnTemp", preferences.maxGrnTemp)
            preferences.minOrgTemp = data.get("minOrgTemp", preferences.minOrgTemp)
            preferences.maxOrgTemp = data.get("maxOrgTemp", preferences.maxOrgTemp)
            
            preferences.minGrnPh = data.get("minGrnPh", preferences.minGrnPh)
            preferences.maxGrnPh = data.get("maxGrnPh", preferences.maxGrnPh)
            preferences.minOrgPh = data.get("minOrgPh", preferences.minOrgPh)
            preferences.maxOrgPh = data.get("maxOrgPh", preferences.maxOrgPh)
            
            preferences.minGrnTds = data.get("minGrnTds", preferences.minGrnTds)
            preferences.maxGrnTds = data.get("maxGrnTds", preferences.maxGrnTds)
            preferences.minOrgTds = data.get("minOrgTds", preferences.minOrgTds)
            preferences.maxOrgTds = data.get("maxOrgTds", preferences.maxOrgTds)
            
            preferences.grnWaterLv = data.get("grnWaterLv", preferences.grnWaterLv)
            preferences.orgWaterLv = data.get("orgWaterLv", preferences.orgWaterLv)
            preferences.tankHeight = data.get("tankHeight", preferences.tankHeight)

            preferences.save()
            
            # Evaluate Latest Sensor Data again with the newest preferences
            latest_data = sensorData.objects.last()
            new_eval = sensorEval("getEval", latest_data)
            latest_data.eval = new_eval["eval"]
            latest_data.save()

            print(f"*-*-*-*-*--*-*-*-*-", data.get("tankheight"))
            mqtt_client_instance.publish("device/tank", data.get("tankHeight"))

            return JsonResponse({"message": "Successfully created preferences!"})

        except Exception as e:
            return JsonResponse({"message": f"Error occurred: {str(e)}"}, status=500)

    elif request.method == "GET":
        try:
            latest_data = userPreferences.objects.last()
            if latest_data:
                return JsonResponse(
                    {
                        "minGrnTemp": latest_data.minGrnTemp,
                        "maxGrnTemp": latest_data.maxGrnTemp,
                        "minOrgTemp": latest_data.minOrgTemp,
                        "maxOrgTemp": latest_data.maxOrgTemp,
                        "minGrnPh": latest_data.minGrnPh,
                        "maxGrnPh": latest_data.maxGrnPh,
                        "minOrgPh": latest_data.minOrgPh,
                        "maxOrgPh": latest_data.maxOrgPh,
                        "minGrnTds": latest_data.minGrnTds,
                        "maxGrnTds": latest_data.maxGrnTds,
                        "minOrgTds": latest_data.minOrgTds,
                        "maxOrgTds": latest_data.maxOrgTds,
                        "grnWaterLv": latest_data.grnWaterLv,
                        "orgWaterLv": latest_data.orgWaterLv,
                        "tankHeight": latest_data.tankHeight,
                    }
                )
            else:
                return JsonResponse({"message": "No data found", "timestamp": None})

        except Exception as e:
            return JsonResponse({"message": f"Error occurred: {str(e)}"}, status=500)

def display_quality(latest_data, toNotice):
    mqtt_client_instance.connect()
    payload = json.dumps({
        "eval": latest_data.eval,
        "notice": toNotice["toNotice"],
    })
    print(f"----------------", payload)
    mqtt_client_instance.publish("Freshyfishy/quality", payload)

@csrf_exempt
def report(request):
    if request.method == 'GET':
        try:
            sensor_query = (
                sensorData.objects.annotate(
                    date=TruncDate('timestamp'),
                    time=TruncTime('timestamp'))
                .values('date', 'time', 'temp', 'ph', 'tds', 'waterLv', 'eval')
                .order_by('timestamp')  
            )
            
            feeding_query = (
                feedingData.objects.annotate(
                    date=TruncDate('timestamp'),
                    time=TruncTime('timestamp'))
                .values('date', 'time', 'data')
                .order_by('timestamp')  
            )
            
            light_query = (
                lightData.objects.annotate(
                    date=TruncDate('timestamp'),
                    time=TruncTime('timestamp'))
                .values('date', 'time', 'status')
                .order_by('timestamp')  
            )
            
            sensor_data = list(sensor_query)
            feeding_data = list(feeding_query)
            light_data = list(light_query)

            for data in sensor_data + feeding_data + light_data:
                data['time'] = data['time'].strftime('%H:%M')

            return JsonResponse({
                "sensor": sensor_data,
                "feeding": feeding_data,
                "light": light_data
            }, safe=False)
            
        except Exception as e:
            return JsonResponse({"message": f"Error occurred: {str(e)}"}, status=500)