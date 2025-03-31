from django.db import models

class TimeStampedModel(models.Model):
    class Meta:
        abstract = True

    timestamp = models.DateTimeField(auto_now=True)

class feedingData(TimeStampedModel):
    data = models.CharField(max_length=255)
    
class lightData(TimeStampedModel):
    class Status(models.TextChoices):
        ON = 'ON'
        OFF = 'OFF'

    status = models.CharField(
        max_length=10,
        choices=Status.choices,
        default=Status.OFF,
    )
    color = models.CharField(max_length=50, default='rgb(245, 255, 197)')

class sensorData(TimeStampedModel):
    class Evaluate(models.TextChoices):
        Green = 'Green'
        Orange = 'Orange'
        Red = 'Red'
        
    temp = models.FloatField(default=0)
    ph = models.FloatField(default=0)
    tds = models.FloatField(default=0)
    waterLv = models.FloatField(default=0)
    eval = models.CharField(
        max_length = 255, 
        choices = Evaluate.choices,
        default = Evaluate.Green,)
    
class userPreferences(models.Model):
    minGrnTemp = models.FloatField(default=22.0)
    maxGrnTemp = models.FloatField(default=28.0)
    minOrgTemp = models.FloatField(default=19.0)
    maxOrgTemp = models.FloatField(default=39.0)
    
    minGrnPh = models.FloatField(default=7.0)
    maxGrnPh = models.FloatField(default=8.0)
    minOrgPh = models.FloatField(default=5.5)
    maxOrgPh = models.FloatField(default=9.0)
    
    minGrnTds = models.FloatField(default=250.0)
    maxGrnTds = models.FloatField(default=400.0)
    minOrgTds = models.FloatField(default=200.0)
    maxOrgTds = models.FloatField(default=600.0)
    
    grnWaterLv = models.FloatField(default=90)
    orgWaterLv = models.FloatField(default=70)
    tankHeight = models.FloatField(default=24)

class userToken(TimeStampedModel):
    token = models.CharField(max_length=1000)
    
class schedule(TimeStampedModel):
    class Description(models.TextChoices):
        Feeding = 'Automatic Feed ON'
        LightON = 'Automatic Light ON'
        LightOFF = 'Automatic Light OFF'
    class Frequency(models.TextChoices):
        Today = 'Today'
        Everyday = 'Everyday'
    class Status(models.TextChoices):
        Pending = 'Pending'
        Success = 'Success'
    
    workingTime = models.TimeField(default='00:00')
    workingDate = models.DateField()
    desc = models.CharField(
        max_length = 50,
        choices = Description.choices,
        default = '',)
    freq = models.CharField(
        max_length = 10,
        choices = Frequency.choices,
        default = Frequency.Today,)
    status = models.CharField(
        max_length = 10,
        choices = Status.choices,
        default = Status.Pending,)
