from django.urls import path
from .views import DoctorListView, DoctorDetailView, DoctorAvailableSlotsView

urlpatterns = [
	path('doctor/', DoctorListView.as_view(), name='doctor-list'),
	path('doctor/<slug:slug>/', DoctorDetailView.as_view(), name='doctor-detail'),
	path('doctor/<int:doctor_id>/slots/', DoctorAvailableSlotsView.as_view(), name='doctor-slots'),
]