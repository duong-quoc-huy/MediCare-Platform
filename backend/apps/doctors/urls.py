from django.urls import path
from .views import DoctorListView, DoctorDetailView

urlpatterns = [
	path('', DoctorListView.as_view(), name='doctor-list'),
	path('<slug:slug>/', DoctorDetailView.as_view(), name='doctor-detail'),
]