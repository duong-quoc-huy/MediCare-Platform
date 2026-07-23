from django.db import models
from apps.users.models import User
from ckeditor.fields import RichTextField
from django.utils.text import slugify
# Create your models here.


class Doctor(models.Model):
	
	user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='doctor_profile')
	slug = models.SlugField(unique=True, blank=True)
	specialty = models.CharField(max_length=100)
	bio = RichTextField(blank=True)
	experience_years = models.PositiveIntegerField(default=0)
	consultation_fee = models.DecimalField(max_digits=10, decimal_places=2)
	rating = models.DecimalField(max_digits=2, decimal_places=1, default=0.0)
	is_available = models.BooleanField(default=True)
	created_at = models.DateTimeField(auto_now_add=True)


	def save(self, *args, **kwargs):
		if not self.slug:
			base_slug = slugify(self.user.full_name)
			unique_slug = base_slug
			counter = 1

			#checking the exist slug name in table
			while Doctor.objects.filter(slug=unique_slug).exists():
				unique_slug = f'{base_slug}-{counter}'
				counter += 1
			self.slug = unique_slug
		super().save(*args, **kwargs)

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

	class VisitType(models.TextChoices):
		CLINIC = 'clinic', 'Clinic'
		HOME_VISIT = 'home_visit', 'Home Visit'

	doctor = models.ForeignKey(Doctor, on_delete=models.CASCADE, related_name='schedules')

	day_of_week = models.IntegerField(choices=DayOfWeek.choices)
	start_time = models.TimeField()
	end_time = models.TimeField()

	visit_type = models.CharField(max_length=15, choices=VisitType.choices, default=VisitType.CLINIC)

	slot_duration_minutes = models.PositiveIntegerField(default=30)

	class Meta:
		ordering = ['day_of_week', 'start_time']
		unique_together = (
			'doctor',
			'day_of_week',
			'visit_type',
			'start_time',
			'end_time',
		)

	def clean(self):
		from django.core.exceptions import ValidationError

		if self.start_time >= self.end_time:
			raise ValidationError({
				'end_time': 'End time must be after start time.'
			})

		if self.slot_duration_minutes <= 0:
			raise ValidationError({
				'slot_duration_minutes': 'Slot duration must be greater than 0.'
			})

		overlapping_schedules = DoctorSchedule.objects.filter(
			doctor=self.doctor,
			day_of_week=self.day_of_week,
			start_time__lt=self.end_time,
			end_time__gt=self.start_time,
		)

		if self.pk:
			overlapping_schedules = overlapping_schedules.exclude(pk=self.pk)

		if overlapping_schedules.exists():
			raise ValidationError(
				'This schedule overlaps with another schedule for the same doctor.'
			)

	def save(self, *args, **kwargs):
		self.full_clean()
		super().save(*args, **kwargs)

	def __str__(self):
		return (
			f'{self.doctor.user.full_name} - '
			f'{self.get_day_of_week_display()} - '
			f'{self.get_visit_type_display()} - '
			f'{self.start_time} to {self.end_time}'
		)