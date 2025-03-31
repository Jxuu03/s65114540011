from datetime import timedelta, datetime, timezone
from .models import *
import logging
from .views import *

logging.basicConfig(level=logging.DEBUG)


def get_schedules():
    today = datetime.today().date()  # Get today's date
    schedules = schedule.objects.filter(workingDate=today, status='Pending')

    print("Retrieved schedules for today:", schedules)
    return schedules


def update_task_status(schedule_id):
    current_schedule = schedule.objects.get(id=schedule_id)
    current_schedule.status = "Success"
    current_schedule.save()

    print(f"Updated status of schedule {schedule_id} to 'Success'")


def updated_everyday_task(schedule_id):
    try:
        current_schedule = schedule.objects.get(id=schedule_id)

        today = current_schedule.workingDate

        if isinstance(today, str):
            today = datetime.strptime(today, "%Y-%m-%d").date()

        next_day = today + timedelta(days=1)
        current_schedule.workingDate = next_day
        current_schedule.save()

        print(f"Updated schedule {schedule_id} to next day: {next_day}")
    except Exception as e:
        print(f"Error updating schedule {schedule_id}: {e}")

def everyday_task_reset():
    today = datetime.today().date()
    tomorrow_schedules = schedule.objects.filter(workingDate=today, status='Success')

    for tomorrow in tomorrow_schedules:
        tomorrow.status = 'Pending'
        tomorrow.save()

    print(f"Updated status of tomorrow's schedule(s) to 'Pending'")

def feed(freq, schedule_id, schedule_desc):
    title = "Task Triggering Alert"
    body = f"Performing schedule: {schedule_desc}!"
    sendPushNotification(title, body, 'info')
    result = feed_instant()
    print(result)

    if freq == "Everyday":
        print(f"Performing feed for Everyday!")
        updated_everyday_task(schedule_id)
    else:
        print(f"Performing feed for Today!")

    print("Feed success, data saved.")


def light(freq, switch, schedule_id, schedule_desc):
    title = "Task Triggering Alert"
    body = f"Performing schedule: {schedule_desc}!"
    sendPushNotification(title, body, 'info')
    
    print(f'-------- {freq}, {switch}, {schedule_id}, {schedule_desc}')
    
    latest_light = lightData.objects.last()
    color = latest_light.color
    if "ON" in switch:
        result = light_instant("ON", color)
        
        # Log the event
        timestamp = timezone.now()
        lightData.objects.create(timestamp=timestamp, status="ON", color=color)
        print(result)
        
        if freq == "Everyday":
            updated_everyday_task(schedule_id)
        else:
            print(f"Performing light ON for Today!")

    else:
        result = light_instant("OFF", color)
        
        # Log the event
        timestamp = timezone.now()
        lightData.objects.create(timestamp=timestamp, status="OFF", color=color)
        print(result)
        
        if freq == "Everyday":
            updated_everyday_task(schedule_id)
        else:
            print(f"Performing light OFF for Today!")


# Function to check if it's time to trigger any task
def check_and_trigger_task():
    current_time = datetime.now().strftime("%H:%M")  # Format current time as HH:MM
    print(f"Current time: {current_time}")

    print(f"Checking schedules at {current_time}")

    schedules = get_schedules()
    print(f"Schedules fetched: {schedules}")

    if not schedules:
        print("No schedules for today.")
        return

    for schedule in schedules:
        working_time = schedule.workingTime.strftime(
            "%H:%M"
        )  # Format schedule time as HH:MM
        task_desc = schedule.desc
        task_freq = schedule.freq
        task_id = schedule.id
        

        print(f"Comparing {working_time} with {current_time}")

        if current_time == working_time:
            print(f"Triggering task: {task_desc} at {current_time}")

            if "Feed" in task_desc:
                feed(task_freq, task_id, task_desc)
            else:
                light(task_freq, task_desc, task_id, task_desc)
                
            update_task_status(task_id)

# Check latest data's evaluate in every 15 mins, if Ref or Orange, send push notification 
# in case app is on background or not open
def check_and_trigger_notification():
    latest_data = sensorData.objects.latest("timestamp")
    toNotice = sensorEval('getToNotice', latest_data)
    
    display_quality(latest_data, toNotice)
    
    if latest_data.eval in ["Orange", "Red"]:
        title = "Water Quality Alert"

        if latest_data.eval == "Orange":
            body = "Water quality needs attention!"
        elif latest_data.eval == "Red":
            body = "Critical water quality evaluate detected!"
                    
        sendPushNotification(title, body, latest_data.eval)
            
    else:
        print(f'Water Quality at {latest_data.timestamp} is {latest_data.eval}')
        
# Check schedule's workingTime, if now()-workingTime = 3 mins, send push noti to user
def check_and_noti_task():
    current_time = datetime.now()  # Format current time as HH:MM
    print(f"Current time: {current_time.strftime('%H:%M')}")

    schedules = get_schedules()
    print(f"Schedules fetched: {schedules}")

    if not schedules:
        print("No schedules for today.")
        return

    for schedule in schedules:
        if isinstance(schedule.workingTime, str):
            working_time = datetime.strptime(schedule.workingTime, "%H:%M")
        else:
            working_time = schedule.workingTime

        # Align working_time with today's date if it's only a time
        working_time = current_time.replace(hour=working_time.hour, minute=working_time.minute, second=0, microsecond=0)

        # Calculate the time difference
        time_difference = (working_time - current_time).total_seconds() / 60
        
        if 2.5 < time_difference < 3.5:
            print(f"Task: {schedule.desc} will be triggered in 3 minutes!")
            
            title = "Task Triggering Alert"
            body =  f"Task: {schedule.desc} will be triggered in 3 minutes!"
            sendPushNotification(title, body, 'info')
           
        elif 0 < time_difference <= 10:
            print(f"{time_difference:.0f} minutes left until next task!")