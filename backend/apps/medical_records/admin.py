from django.contrib import admin

from .models import (
    AppointmentVitals,
    MasterComorbidity,
    MasterSymptom,
    AppointmentComorbidity,
    AppointmentSymptom,
    Prescription,
    PrescriptionItem,
)


class PrescriptionItemInline(admin.TabularInline):
    model = PrescriptionItem
    extra = 1


@admin.register(Prescription)
class PrescriptionAdmin(admin.ModelAdmin):
    list_display = (
        'appointment',
        'sent_to_pharmacy',
        'created_at',
        'updated_at',
    )
    search_fields = (
        'appointment__patient__full_name',
        'appointment__doctor__user__full_name',
        'diagnosis',
    )
    list_filter = ('sent_to_pharmacy', 'created_at')
    inlines = [PrescriptionItemInline]


@admin.register(AppointmentVitals)
class AppointmentVitalsAdmin(admin.ModelAdmin):
    list_display = (
        'appointment',
        'heart_rate',
        'temperature',
        'spo2',
        'recorded_by',
        'recorded_at',
    )
    search_fields = (
        'appointment__patient__full_name',
        'appointment__doctor__user__full_name',
        'diagnosis',
    )


@admin.register(MasterComorbidity)
class MasterComorbidityAdmin(admin.ModelAdmin):
    list_display = (
        'comorbidity_code',
        'comorbidity_name',
        'category',
        'is_common',
    )
    search_fields = ('comorbidity_code', 'comorbidity_name', 'category')
    list_filter = ('category', 'is_common')


@admin.register(MasterSymptom)
class MasterSymptomAdmin(admin.ModelAdmin):
    list_display = (
        'symptom_code',
        'symptom_name',
        'category',
        'is_common',
    )
    search_fields = ('symptom_code', 'symptom_name', 'category')
    list_filter = ('category', 'is_common')


@admin.register(AppointmentComorbidity)
class AppointmentComorbidityAdmin(admin.ModelAdmin):
    list_display = (
        'appointment',
        'comorbidity_code',
        'comorbidity_name',
        'created_at',
    )
    search_fields = (
        'appointment__patient__full_name',
        'comorbidity_code',
        'comorbidity_name',
    )


@admin.register(AppointmentSymptom)
class AppointmentSymptomAdmin(admin.ModelAdmin):
    list_display = (
        'appointment',
        'symptom_code',
        'symptom_name',
        'severity_score',
        'duration_hours',
        'created_at',
    )
    search_fields = (
        'appointment__patient__full_name',
        'symptom_code',
        'symptom_name',
    )