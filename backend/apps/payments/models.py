from django.db import models
import uuid
import uuid_utils
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
import secrets

# Create your models here.

# Custom UUID field
def generate_uuid7():
	return uuid.UUID(str(uuid_utils.uuid7()))

class UUIDv7Field(models.UUIDField):
	def __init__(self, *args, **kwargs):
		kwargs.setdefault('default', generate_uuid7)
		kwargs.setdefault('editable', False)
		super().__init__(*args, **kwargs)


class Payment(models.Model):
	class ReferenceType(models.TextChoices):
		APPOINTMENT     = 'appointment',     'Appointment'
		MEDICINE_ORDER  = 'medicine_order',  'Medicine Order'

	class Method(models.TextChoices):
		VNPAY   = 'vnpay',  'VNPAY'
		PAYPAL  = 'paypal', 'PayPal'

	class Status(models.TextChoices):
		PENDING     = 'pending',    'Pending'
		SUCCESS     = 'success',    'Success'
		FAILED      = 'failed',     'Failed'
		REFUNDED    = 'refunded',   'Refunded'

	class PaymentStage(models.TextChoices):
		FULL = 'full', 'Full'
		DEPOSIT = 'deposit', 'Deposit'
		FINAL = 'final', 'Final'

	payment_id = UUIDv7Field(primary_key=True, editable=False)
	reference_id    = models.UUIDField()
	reference_type  = models.CharField(max_length=20, choices=ReferenceType.choices)
	method          = models.CharField(max_length=10, choices=Method.choices)
	amount          = models.DecimalField(max_digits=10, decimal_places=2)
	currency        = models.CharField(max_length=10, default='VND')
	status          = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
	payment_stage = models.CharField(max_length=20, choices=PaymentStage.choices, default=PaymentStage.FULL)
	transaction_id  = models.CharField(max_length=255, blank=True)
	created_at      = models.DateTimeField(auto_now_add=True)

	def __str__(self):
		return f'{self.method} — {self.amount} — {self.status}'

def generate_final_payment_token():
	return secrets.token_urlsafe(32)


class AppointmentFinalPaymentSession(models.Model):
	session_id = UUIDv7Field(primary_key=True, editable=False)

	appointment = models.ForeignKey('appointments.Appointment', on_delete=models.CASCADE, related_name='final_payment_sessions')

	token = models.CharField(max_length=255, unique=True, default=generate_final_payment_token)

	amount = models.DecimalField(max_digits=10, decimal_places=2)

	created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='created_final_payment_sessions')

	is_used = models.BooleanField(default=False)
	expires_at = models.DateTimeField()
	created_at = models.DateTimeField(auto_now_add=True)

	def save(self, *args, **kwargs):
		if not self.expires_at:
			self.expires_at = timezone.now() + timedelta(minutes=30)

		super().save(*args, **kwargs)

	@property
	def is_expired(self):
		return timezone.now() > self.expires_at

	def __str__(self):
		return f'Final payment session — {self.appointment_id} — {self.amount}'