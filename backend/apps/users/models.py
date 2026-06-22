from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
import uuid_utils
import uuid
from django.core.validators import RegexValidator


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

	user_id = UUIDv7Field(primary_key=True, editable=False)
	email = models.EmailField(unique=True)
	full_name = models.CharField(max_length=100)
	phone_number_1 = models.CharField(max_length=10, validators=[RegexValidator(regex=r'^\d{10}$', message='Phone number must be 10 digits and start with 0.')], unique=True)
	phone_number_2 = models.CharField(max_length=10, validators=[RegexValidator(regex=r'^\d{10}$', message='Phone number must be 10 digits and start with 0')], unique=True, blank=True, null=True)
	address = models.TextField(blank=True)
	role = models.CharField(max_length=10, choices=Role.choices, default=Role.PATIENT)
	is_active = models.BooleanField(default=True)
	is_staff = models.BooleanField(default=False)
	created_at = models.DateTimeField(auto_now_add=True)

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
		
