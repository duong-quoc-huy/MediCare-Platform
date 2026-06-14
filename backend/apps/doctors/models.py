from django.db import models
from apps.users.models import User
import uuid_utils
import uuid

# Create your models here.


# Custom UUID field
def generate_uuid7():
	return uuid.UUID(str(uuid_utils.uuid7()))

class UUIDv7Field(models.UUIDField):
	def __init__(self, *args, **kwargs):
		kwargs.setdefault('default', generate_uuid7)
		kwargs.setdefault('editable', False)
		super().__init__(*args, **kwargs)

class Doctor(models.Model):
	
	user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='doctor_profile')
	specialty = models.CharField(max_length=100)
	bio = models.TextField(blank=True)
	experience_years = models.PositiveIntegerField(default=0)
	consultation_fee = models.DecimalField(max_digits=10, decimal_places=2)
	rating = models.DecimalField(max_digits=2, decimal_places=1, default=0.0)
	is_available = models.BooleanField(default=True)
	created_at = models.DateTimeField(auto_now_add=True)

	def __str__(self):
		return f'Doctor. {self.user.full_name} - {self.specialty}'

class DoctorSchedule(models.Model):
	class DayOfWeek(models.IntegerChoices):
		MONDAY = 0, 'Monday'
		TUESDAY = 1, 'Tuesday'
		WEDNESDAY = 2, 'Wednesday'
		THURSDAY = 3, 'Thursday'
		FRIDAY = 4, 'Friday'
		SATURDAY = 5, 'Saturday'
		SUNDAY = 6, 'Sunday'

	doctor = models.ForeignKey(Doctor, on_delete=models.CASCADE, related_name='schedules')
	day_of_week = models.IntegerField(choices=DayOfWeek.choices)
	start_time = models.TimeField()
	end_time = models.TimeField()
	slot_duration_minutes = models.PositiveIntegerField(default=30)

	class Meta:
		unique_together = ('doctor', 'day_of_week')

	def __str__(self):
		return f'{self.doctor} - {self.get_day_of_week_display()}'
