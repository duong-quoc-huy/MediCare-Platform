from django.contrib import admin
from .models import Doctor, DoctorSchedule


@admin.register(Doctor)
class DoctorAdmin(admin.ModelAdmin):
	list_display = (
		'__str__',
		'specialty',
		'consultation_fee',
		'rating',
		'is_available',
		'has_signature',
	)

	list_filter = (
		'specialty',
		'is_available',
	)

	search_fields = (
		'user__full_name',
		'user__email',
		'specialty',
	)

	readonly_fields = (
		'created_at',
	)

	fields = (
		'user',
		'slug',
		'specialty',
		'bio',
		'experience_years',
		'consultation_fee',
		'rating',
		'is_available',
		'signature_image',
		'created_at',
	)

	def has_signature(self, obj):
		return bool(obj.signature_image)

	has_signature.boolean = True
	has_signature.short_description = 'Signature'


@admin.register(DoctorSchedule)
class DoctorScheduleAdmin(admin.ModelAdmin):
	list_display = (
		'doctor',
		'get_day_of_week_display',
		'visit_type',
		'start_time',
		'end_time',
		'slot_duration_minutes',
	)

	list_filter = (
		'day_of_week',
		'visit_type',
	)