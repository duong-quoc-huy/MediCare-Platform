from django.db import models
import uuid
import uuid_utils


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

	payment_id = UUIDv7Field(primary_key=True, editable=False)
	reference_id    = models.PositiveIntegerField()
	reference_type  = models.CharField(max_length=20, choices=ReferenceType.choices)
	method          = models.CharField(max_length=10, choices=Method.choices)
	amount          = models.DecimalField(max_digits=10, decimal_places=2)
	currency        = models.CharField(max_length=10, default='VND')
	status          = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
	transaction_id  = models.CharField(max_length=255, blank=True)
	created_at      = models.DateTimeField(auto_now_add=True)

	def __str__(self):
		return f'{self.method} — {self.amount} — {self.status}'