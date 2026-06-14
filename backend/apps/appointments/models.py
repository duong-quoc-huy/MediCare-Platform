from django.db import models
from apps.doctors.models import Doctor
from apps.users.models import User
import uuid_utils
import uuid


# Create your models here.

#UUID generator
def generate_uuid7():
	return uuid.UUID(str(uuid_utils.uuid7()))

class UUIDv7Field(models.UUIDField):
	def __init__(self, *args, **kwargs):
		kwargs.setdefault('default', generate_uuid7)
		kwargs.setdefault('editable', False)
		super().__init__(*args, **kwargs)



class Appointment(models.Model):
	class Status(models.TextChoices):
		PENDING = 'pending', 'Pending'
		CONFIRMED = 'confirmed', 'Confirmed'
		IN_PROGRESS = 'in_progress', 'In Progress'
		COMPLETED = 'completed', 'Completed'
		CANCELLED = 'cancelled', 'Cancelled'

	class VisitType(models.TextChoices):
		HOME_VISIT = 'home_visit', "Home Visit"
		CLINIC = 'clinic', 'Clinic'

	appointment_id = UUIDv7Field(primary_key=True, editable=False)
	patient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='appointments')
	doctor = models.ForeignKey(Doctor, on_delete=models.CASCADE, related_name='appointments')
	appointment_date = models.DateField()
	start_time = models.TimeField()
	end_time = models.TimeField()
	status = models.CharField(max_length=15, choices=Status.choices, default=Status.PENDING)
	visit_type = models.CharField(max_length=15, choices=VisitType.choices, default=VisitType.CLINIC)
	address = models.TextField(max_length=200)
	notes = models.TextField(max_length=255, blank=True, null=True)
	total_fee = models.DecimalField(max_digits=10, decimal_places=2)
	created_at = models.DateTimeField(auto_now_add=True)


	def __str__(self):
		return f'{self.patient.full_name} -> Dr.{self.doctor.user.full_name} on {self.appointment_date}'
