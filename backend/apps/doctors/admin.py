from django.contrib import admin
from .models import Doctor, DoctorSchedule


@admin.register(Doctor)
class DoctorAdmin(admin.ModelAdmin):
    list_display    = ('__str__', 'specialty', 'consultation_fee', 'rating', 'is_available')
    list_filter     = ('specialty', 'is_available')
    search_fields   = ('user__full_name', 'specialty')


@admin.register(DoctorSchedule)
class DoctorScheduleAdmin(admin.ModelAdmin):
    list_display    = ('doctor', 'get_day_of_week_display', 'start_time', 'end_time', 'slot_duration_minutes')
    list_filter     = ('day_of_week',)