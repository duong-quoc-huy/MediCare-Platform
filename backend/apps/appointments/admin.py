from django.contrib import admin
from .models import Appointment


@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    list_display    = ('patient', 'doctor', 'appointment_date', 'start_time', 'status', 'visit_type')
    list_filter     = ('status', 'visit_type', 'appointment_date')
    search_fields   = ('patient__full_name', 'doctor__user__full_name')
    ordering        = ('-appointment_date',)