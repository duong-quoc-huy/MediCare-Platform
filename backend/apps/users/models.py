from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
import uuid_utils
import uuid
from django.core.validators import RegexValidator
import random
from django.utils import timezone
from datetime import timedelta
from .validators import validate_profile_image

# Custom UUID field
def generate_uuid7():
	return uuid.UUID(str(uuid_utils.uuid7()))

class UUIDv7Field(models.UUIDField):
	def __init__(self, *args, **kwargs):
		kwargs.setdefault('default', generate_uuid7)
		kwargs.setdefault('editable', False)
		super().__init__(*args, **kwargs)


class UserManager(BaseUserManager):
	def create_user(self, email, password=None, **extra_fields):
		if not email:
			raise ValueError('Email is required')
		email = self.normalize_email(email)
		user = self.model(email=email, **extra_fields)
		user.set_password(password)
		user.save(using=self.db)
		return user

	def create_superuser(self, email, password=None, **extra_fields):
		extra_fields.setdefault('role', 'admin')
		extra_fields.setdefault('is_staff', True)
		extra_fields.setdefault('is_superuser', True)
		return self.create_user(email, password, **extra_fields)



class User(AbstractBaseUser, PermissionsMixin):
	class Role(models.TextChoices):
		PATIENT = 'patient', 'Patient'
		DOCTOR = 'doctor', 'Doctor'
		ADMIN = 'admin', 'Admin'
		SHIPPER = 'shipper', 'Shipper'

	class Gender(models.TextChoices):
		MALE = 'male', 'Male'
		FEMALE = 'female', 'Female'
		OTHER = 'other', 'OTHER'

	user_id = UUIDv7Field(primary_key=True, editable=False)
	email = models.EmailField(unique=True)
	full_name = models.CharField(max_length=100)
	gender = models.CharField(max_length=10, choices=Gender.choices, blank=True)
	date_of_birth = models.DateField(null=True, blank=True)

	national_id = models.CharField(
		max_length=12, 
		unique=True, 
		blank=True, 
		null=True,
		validators=[RegexValidator(
			regex=r'^\d{12}$',
			message='National ID must be exactly 12 digits.')]
		)
	
	health_insurance_card = models.CharField(
			max_length=15,
			unique=True,
			blank=True,
			null=True,
			validators=[RegexValidator(
				regex=r'^[A-Z]{2}\d{13}$',
				message='Health insurance card must start with 2 uppercase letters followed by 13 digits (e.g. HS4030012345678).'
			)]
		)

	phone_number_1 = models.CharField(max_length=10, validators=[RegexValidator(regex=r'^\d{10}$', message='Phone number must be 10 digits and start with 0.')], unique=True)
	phone_number_2 = models.CharField(max_length=10, validators=[RegexValidator(regex=r'^\d{10}$', message='Phone number must be 10 digits and start with 0')], unique=True, blank=True, null=True)
	role = models.CharField(max_length=10, choices=Role.choices, default=Role.PATIENT)
	is_active = models.BooleanField(default=True)
	is_staff = models.BooleanField(default=False)
	email_verified = models.BooleanField(default=False)
	created_at = models.DateTimeField(auto_now_add=True)
	profile_image = models.ImageField(upload_to='profiles/', blank=True, null=True, validators=[validate_profile_image])
	objects = UserManager()

	USERNAME_FIELD = 'email'
	REQUIRED_FIELDS = ['full_name']


	def __str__(self):
		return f'{self.email} ({self.role})'

	@property
	def is_patient(self):
		return self.role == self.Role.PATIENT

	@property
	def is_doctor(self):
		return self.role == self.Role.DOCTOR

	@property
	def is_admin(self):
		return self.role == self.Role.ADMIN

	@property
	def is_shipper(self):
		return self.role == self.Role.SHIPPER
		


class UserAddress(models.Model):
	user_address_id = UUIDv7Field(primary_key=True, editable=False)
	user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="addresses")

	label = models.CharField(max_length=50)

	street_address = models.CharField(max_length=255)


	ward_code = models.CharField(max_length=20)
	ward_name = models.CharField(max_length=255)

	province_code = models.CharField(max_length=20)
	province_name = models.CharField(max_length=255)


	postal_code = models.CharField(max_length=10, blank=True)

	is_default = models.BooleanField(default=False)
	created_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		ordering = ['-is_default', '-created_at']

	@property
	def full_address(self):
		parts = [self.street_address, self.ward_name, self.province_name]
		if self.postal_code:
			parts.append(self.postal_code)
		return ', '.join(parts)

	def __str__(self):
		return f'{self.user.full_name} - {self.label}'


class OTP(models.Model):
	class Purpose(models.TextChoices):
		REGISTER = 'register', 'Register'
		CHANGE_EMAIL = 'change_email', 'Change Email'
		CHANGE_PASSWORD = 'change_password', 'Change Password'


	otp_id = UUIDv7Field(primary_key=True, editable=False)
	user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="otps")
	code = models.CharField(max_length=6)
	purpose = models.CharField(max_length=20, choices=Purpose.choices)
	new_email = models.EmailField(blank=True)
	is_used = models.BooleanField(default=False)
	created_at = models.DateTimeField(auto_now_add=True)
	expires_at = models.DateTimeField()

	class Meta:
		ordering = ['-created_at']

	def save(self, *args, **kwargs):
		if not self.expires_at:
			self.expires_at = timezone.now() + timedelta(minutes=5)
		super().save(*args, **kwargs)

	@property
	def is_expired(self):
		return timezone.now() > self.expires_at

	def __str__(self):
		return f'{self.user.email} — {self.purpose} — {self.code}'