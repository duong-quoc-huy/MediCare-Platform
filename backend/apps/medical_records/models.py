from django.db import models

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


class Prescription(models.Model):
	appointment = models.OneToOneField(
		Appointment,
		on_delete=models.CASCADE,
		related_name='prescription'
	)

	diagnosis = models.TextField(blank=True)
	notes = models.TextField(blank=True)
	sent_to_pharmacy = models.BooleanField(default=False)

	pdf_file = models.FileField(
		upload_to='prescriptions/',
		blank=True,
		null=True
	)

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

	medicine_name = models.CharField(max_length=150)
	dosage = models.CharField(max_length=100)
	frequency = models.CharField(max_length=100)
	duration = models.CharField(max_length=100)
	instructions = models.TextField(blank=True)
	quantity = models.PositiveIntegerField(default=1)

	def __str__(self):
		return f'{self.medicine_name} - {self.dosage}'