from django.db import models
from django.conf import settings
from apps.appointments.models import Appointment
from apps.users.models import User


class AppointmentVitals(models.Model):
	appointment = models.OneToOneField(
		Appointment,
		on_delete=models.CASCADE,
		related_name='vitals'
	)

	blood_pressure_systolic = models.PositiveIntegerField(null=True, blank=True)
	blood_pressure_diastolic = models.PositiveIntegerField(null=True, blank=True)
	heart_rate = models.PositiveIntegerField(null=True, blank=True)

	temperature = models.DecimalField(
		max_digits=4,
		decimal_places=1,
		null=True,
		blank=True
	)

	weight = models.DecimalField(
		max_digits=5,
		decimal_places=1,
		null=True,
		blank=True
	)

	height = models.DecimalField(
		max_digits=5,
		decimal_places=1,
		null=True,
		blank=True
	)

	spo2 = models.PositiveIntegerField(null=True, blank=True)
	diagnosis = models.TextField(blank=True)

	recorded_by = models.ForeignKey(
		User,
		on_delete=models.SET_NULL,
		null=True,
		blank=True,
		related_name='recorded_vitals'
	)

	recorded_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	def __str__(self):
		return f'Vitals for {self.appointment}'


class MasterComorbidity(models.Model):
	comorbidity_id = models.BigAutoField(primary_key=True)
	comorbidity_code = models.CharField(max_length=50, unique=True)
	comorbidity_name = models.CharField(max_length=200)
	category = models.CharField(max_length=100, blank=True)
	is_common = models.BooleanField(default=True)
	created_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		ordering = ['-is_common', 'category', 'comorbidity_name']

	def __str__(self):
		return self.comorbidity_name


class MasterSymptom(models.Model):
	symptom_id = models.BigAutoField(primary_key=True)
	symptom_code = models.CharField(max_length=50, unique=True)
	symptom_name = models.CharField(max_length=150)
	category = models.CharField(max_length=100, blank=True)
	is_common = models.BooleanField(default=True)
	created_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		ordering = ['-is_common', 'category', 'symptom_name']

	def __str__(self):
		return self.symptom_name


class AppointmentComorbidity(models.Model):
	appointment_comorbidity_id = models.BigAutoField(primary_key=True)

	appointment = models.ForeignKey(
		Appointment,
		on_delete=models.CASCADE,
		related_name='comorbidities'
	)

	comorbidity = models.ForeignKey(
		MasterComorbidity,
		on_delete=models.PROTECT,
		related_name='appointment_comorbidities'
	)

	comorbidity_code = models.CharField(max_length=50)
	comorbidity_name = models.CharField(max_length=200)
	notes = models.TextField(blank=True)
	created_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		unique_together = ['appointment', 'comorbidity']
		ordering = ['comorbidity_name']

	def save(self, *args, **kwargs):
		self.comorbidity_code = self.comorbidity.comorbidity_code
		self.comorbidity_name = self.comorbidity.comorbidity_name
		super().save(*args, **kwargs)

	def __str__(self):
		return f'{self.appointment} - {self.comorbidity_name}'


class AppointmentSymptom(models.Model):
	appointment_symptom_id = models.BigAutoField(primary_key=True)

	appointment = models.ForeignKey(
		Appointment,
		on_delete=models.CASCADE,
		related_name='symptoms'
	)

	symptom = models.ForeignKey(
		MasterSymptom,
		on_delete=models.PROTECT,
		related_name='appointment_symptoms'
	)

	symptom_code = models.CharField(max_length=50)
	symptom_name = models.CharField(max_length=200)

	severity_score = models.PositiveSmallIntegerField(null=True, blank=True)

	duration_hours = models.DecimalField(
		max_digits=8,
		decimal_places=2,
		null=True,
		blank=True
	)

	notes = models.TextField(blank=True)
	created_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		unique_together = ['appointment', 'symptom']
		ordering = ['symptom_name']

	def save(self, *args, **kwargs):
		self.symptom_code = self.symptom.symptom_code
		self.symptom_name = self.symptom.symptom_name
		super().save(*args, **kwargs)

	def __str__(self):
		return f'{self.appointment} - {self.symptom_name}'

class HospitalMedicine(models.Model):
	medicine_id = models.BigAutoField(primary_key=True)
	medicine_code = models.CharField(max_length=50, unique=True)
	medicine_name = models.CharField(max_length=150)
	generic_name = models.CharField(max_length=150, blank=True)
	dosage_form = models.CharField(max_length=100, blank=True)
	strength = models.CharField(max_length=100, blank=True)
	unit_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)

	default_dosage = models.CharField(max_length=100, blank=True)
	default_frequency = models.CharField(max_length=100, blank=True)
	default_duration = models.CharField(max_length=100, blank=True)
	default_instructions = models.TextField(blank=True)

	is_active = models.BooleanField(default=True)
	created_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		ordering = ['medicine_name']

	def __str__(self):
		return self.medicine_name
		

class Prescription(models.Model):
	class PharmacyStatus(models.TextChoices):
		WAITING = 'waiting', 'Waiting'
		ASSIGNED = 'assigned', 'Assigned'
		PREPARING = 'preparing', 'Preparing'
		READY = 'ready', 'Ready'
		COMPLETED = 'completed', 'Completed'

	class PharmacyCounter(models.TextChoices):
		COUNTER_1 = 'counter_1', 'Counter 1'
		COUNTER_2 = 'counter_2', 'Counter 2'
		COUNTER_3 = 'counter_3', 'Counter 3'

	appointment = models.OneToOneField(Appointment, on_delete=models.CASCADE, related_name='prescription')

	diagnosis = models.TextField(blank=True)
	notes = models.TextField(blank=True)
	sent_to_pharmacy = models.BooleanField(default=False)

	assigned_nurse = models.ForeignKey(
		settings.AUTH_USER_MODEL,
		on_delete=models.SET_NULL,
		null=True,
		blank=True,
		related_name='assigned_prescriptions',
		limit_choices_to={'role': 'nurse'},
	)

	assigned_at = models.DateTimeField(null=True, blank=True)

	pharmacy_counter = models.CharField(max_length=20, choices=PharmacyCounter.choices,blank=True,)

	pharmacy_status = models.CharField(max_length=20, choices=PharmacyStatus.choices, default=PharmacyStatus.WAITING,)

	pdf_file = models.FileField(upload_to='prescriptions/', blank=True,null=True)

	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	def __str__(self):
		return f'Prescription for {self.appointment}'


class PrescriptionItem(models.Model):
	prescription = models.ForeignKey(
		Prescription,
		on_delete=models.CASCADE,
		related_name='items'
	)

	hospital_medicine = models.ForeignKey(
		HospitalMedicine,
		on_delete=models.SET_NULL,
		null=True,
		blank=True,
		related_name='prescription_items'
	)

	medicine_name = models.CharField(max_length=150)
	dosage = models.CharField(max_length=100)
	frequency = models.CharField(max_length=100)
	duration = models.CharField(max_length=100)
	instructions = models.TextField(blank=True)
	quantity = models.PositiveIntegerField(default=1)
	unit_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
	line_total = models.DecimalField(max_digits=10, decimal_places=2, default=0)

	def save(self, *args, **kwargs):
		from decimal import Decimal

		if self.hospital_medicine:
			if not self.medicine_name:
				self.medicine_name = self.hospital_medicine.medicine_name
			if not self.pk and not self.unit_price:
				self.unit_price = self.hospital_medicine.unit_price

		self.line_total = (
			Decimal(self.unit_price or 0) * Decimal(self.quantity or 0)
		).quantize(Decimal('0.01'))

		super().save(*args, **kwargs)

	def __str__(self):
		return f'{self.medicine_name} - {self.dosage}'

