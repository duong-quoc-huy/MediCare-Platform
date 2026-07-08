from django.urls import path
from .views import (
	AppointmentListCreateView,
	AppointmentDetailView,
	AppointmentStatusUpdateView,
	AppointmentCancelView,
)

urlpatterns = [
	path('', AppointmentListCreateView.as_view(), name='appointment-list-create'),
	path('<uuid:appointment_id>/', AppointmentDetailView.as_view(), name='appointment-detail'),
	path('<uuid:appointment_id>/status/', AppointmentStatusUpdateView.as_view(), name='appointment-status-update'),
	path('<uuid:appointment_id>/cancel/', AppointmentCancelView.as_view(), name='appointment-cancel'),
]