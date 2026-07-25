from django.urls import path
from .views import (
	AppointmentListCreateView,
	AppointmentDetailView,
	AppointmentStatusUpdateView,
	AppointmentCancelView,
	AppointmentStartCheckupView,
	AppointmentCompleteCheckupView,
	AppointmentFinalPaymentCreateView,
	AppointmentFinalPaymentConfirmView,
	AppointmentMedicalPDFDownloadView,
)

urlpatterns = [
	path('', AppointmentListCreateView.as_view(), name='appointment-list-create'),
	path('<uuid:appointment_id>/', AppointmentDetailView.as_view(), name='appointment-detail'),
	path('<uuid:appointment_id>/status/', AppointmentStatusUpdateView.as_view(), name='appointment-status-update'),
	path('<uuid:appointment_id>/cancel/', AppointmentCancelView.as_view(), name='appointment-cancel'),
	path('<uuid:appointment_id>/start-checkup/', AppointmentStartCheckupView.as_view(), name='appointment-start-checkup'),
	path('<uuid:appointment_id>/complete/', AppointmentCompleteCheckupView.as_view(), name='appointment-complete-checkup'),
	path('<uuid:appointment_id>/payment/final/', AppointmentFinalPaymentCreateView.as_view(), name='appointment-final-payment'),
	path('<uuid:appointment_id>/payment/confirm/', AppointmentFinalPaymentConfirmView.as_view(), name='appointment-final-payment-confirm'),
	path('<uuid:appointment_id>/medical-record/pdf/', AppointmentMedicalPDFDownloadView.as_view(), name='appointment-medical-pdf-download'),
]