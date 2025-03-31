from django.urls import path
from project.views import *

urlpatterns =[
    path('test-noti/', sendPushNotification, name='test-noti'),
    path('feedingControl/', feedingControl, name='feeding-control'),
    path('lightControl/', lightControl, name='light-control'),
    path('sensorDataDisplay/', sensorDataDisplay, name='sensorDataDisplay'),
    path('saveToken/', saveToken, name='saveToken'),
    path('schedule/', scheduleData, name='schedule-data'),
    path('preferences/', preferences, name='preferences'),
    path('report/', report, name='report')
]
