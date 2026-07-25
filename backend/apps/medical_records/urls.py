from django.urls import path

from .views import (
	MasterComorbidityListView,
	MasterSymptomListView,
	HospitalMedicineListView,
	AppointmentVitalsView,
	AppointmentComorbidityListCreateView,
	AppointmentComorbidityDeleteView,
	AppointmentSymptomListCreateView,
	AppointmentSymptomDeleteView,
	AppointmentPrescriptionView,
	SendPrescriptionToPharmacyView,
)

urlpatterns = [
	path(
		'master-comorbidities/',
		MasterComorbidityListView.as_view(),
		name='master-comorbidity-list'
	),

	path(
		'master-symptoms/',
		MasterSymptomListView.as_view(),
		name='master-symptom-list'
	),

	path(
		'appointments/<uuid:appointment_id>/vitals/',
		AppointmentVitalsView.as_view(),
		name='appointment-vitals'
	),

	path(
		'appointments/<uuid:appointment_id>/comorbidities/',
		AppointmentComorbidityListCreateView.as_view(),
		name='appointment-comorbidity-list-create'
	),

	path(
		'appointments/<uuid:appointment_id>/comorbidities/<int:comorbidity_id>/',
		AppointmentComorbidityDeleteView.as_view(),
		name='appointment-comorbidity-delete'
	),

	path(
		'appointments/<uuid:appointment_id>/symptoms/',
		AppointmentSymptomListCreateView.as_view(),
		name='appointment-symptom-list-create'
	),

	path(
		'appointments/<uuid:appointment_id>/symptoms/<int:symptom_id>/',
		AppointmentSymptomDeleteView.as_view(),
		name='appointment-symptom-delete'
	),

	path(
		'appointments/<uuid:appointment_id>/prescription/',
		AppointmentPrescriptionView.as_view(),
		name='appointment-prescription'
	),

	path(
		'appointments/<uuid:appointment_id>/prescription/send/',
		SendPrescriptionToPharmacyView.as_view(),
		name='appointment-prescription-send'
	),

	path(
		'hospital-medicines/',
		HospitalMedicineListView.as_view(),
		name='hospital-medicine-list'
	),
]