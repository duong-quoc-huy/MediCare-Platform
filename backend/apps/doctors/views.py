from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from .serializers import DoctorScheduleSerializer, DoctorSerializer
from .models import Doctor, DoctorSchedule

class DoctorListView(generics.ListAPIView):
	queryset = Doctor.objects.all()
	serializer_class = DoctorSerializer
	permission_classes = [AllowAny]

class DoctorDetailView(generics.RetrieveAPIView):
	queryset = Doctor.objects.all()
	serializer_class = DoctorSerializer
	permission_classes = [AllowAny]
	lookup_field = 'slug'

		



