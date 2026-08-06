from django.urls import path

from .views import (
	DoctorAvailableSlotsView,
	DoctorDetailView,
	DoctorListView,
	MyDoctorScheduleDetailView,
	MyDoctorScheduleListCreateView,
)


urlpatterns = [
	path('doctor/', DoctorListView.as_view(), name='doctor-list'),
	path('doctor/my-schedules/', MyDoctorScheduleListCreateView.as_view(), name='doctor-my-schedule-list-create'),
	path('doctor/my-schedules/<int:pk>/', MyDoctorScheduleDetailView.as_view(), name='doctor-my-schedule-detail'),
	path('doctor/<int:doctor_id>/slots/', DoctorAvailableSlotsView.as_view(), name='doctor-slots'),
	path('doctor/<slug:slug>/', DoctorDetailView.as_view(), name='doctor-detail'),
]