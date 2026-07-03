from django.urls import path
from .views import DoctorListView, DoctorDetailView

urlpatterns = [
	path('doctor/', DoctorListView.as_view(), name='doctor-list'),
	path('doctor/<slug:slug>/', DoctorDetailView.as_view(), name='doctor-detail'),
]