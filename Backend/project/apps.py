from django.apps import AppConfig
import os

class ProjectConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "project"

    def ready(self):
        if os.environ.get('RUN_MAIN'):
            from .scheduler import (
                check_and_trigger_task,
                check_and_trigger_notification,
                check_and_noti_task,
                everyday_task_reset
            )  
            from apscheduler.schedulers.background import BackgroundScheduler

            scheduler = BackgroundScheduler()
            scheduler.add_job(check_and_trigger_task, 'interval', minutes=1)
            scheduler.add_job(check_and_trigger_notification, 'interval', minutes=15)
            scheduler.add_job(check_and_noti_task, 'interval', minutes=1)
            scheduler.add_job(everyday_task_reset, 'cron', hour='00', minute='00')
            scheduler.start()