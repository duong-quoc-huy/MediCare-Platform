from datetime import datetime

from django.db.models import Q
from rest_framework import generics, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.appointments.slot_engine import get_available_slots

from .models import Doctor
from .serializers import DoctorSerializer


class DoctorListView(generics.ListAPIView):
	serializer_class = DoctorSerializer
	permission_classes = []

	def get_queryset(self):
		queryset = (
			Doctor.objects
			.select_related('user')
			.prefetch_related('schedules')
			.all()
		)

		search = self.request.query_params.get('search')
		is_available = self.request.query_params.get('is_available')
		visit_type = self.request.query_params.get('visit_type')
		ordering = self.request.query_params.get('ordering')

		if search:
			queryset = queryset.filter(
				Q(user__full_name__icontains=search) |
				Q(specialty__icontains=search) |
				Q(bio__icontains=search)
			)

		if is_available == 'true':
			queryset = queryset.filter(is_available=True)

		if is_available == 'false':
			queryset = queryset.filter(is_available=False)

		if visit_type in ['clinic', 'home_visit']:
			queryset = queryset.filter(
				schedules__visit_type=visit_type
			).distinct()

		allowed_ordering = {
			'rating',
			'-rating',
			'experience_years',
			'-experience_years',
			'consultation_fee',
			'-consultation_fee',
			'created_at',
			'-created_at',
		}

		if ordering in allowed_ordering:
			queryset = queryset.order_by(ordering)
		else:
			queryset = queryset.order_by('-created_at')

		return queryset


class DoctorDetailView(generics.RetrieveAPIView):
	queryset = (
		Doctor.objects
		.select_related('user')
		.prefetch_related('schedules')
		.all()
	)
	serializer_class = DoctorSerializer
	permission_classes = [AllowAny]
	lookup_field = 'slug'


class DoctorAvailableSlotsView(APIView):
	permission_classes = []

	def get(self, request, doctor_id):
		date_str = request.query_params.get('date')
		visit_type = request.query_params.get('visit_type', 'clinic')

		if visit_type not in ['clinic', 'home_visit']:
			return Response(
				{'detail': 'Invalid visit_type. Use clinic or home_visit.'},
				status=status.HTTP_400_BAD_REQUEST
			)

		if not date_str:
			return Response(
				{
					'detail': 'date query parameter is required. Example: ?date=2026-07-23'
				},
				status=status.HTTP_400_BAD_REQUEST
			)

		try:
			appointment_date = datetime.strptime(date_str, '%Y-%m-%d').date()
		except ValueError:
			return Response(
				{'detail': 'Invalid date format. Use YYYY-MM-DD.'},
				status=status.HTTP_400_BAD_REQUEST
			)

		try:
			doctor = Doctor.objects.get(id=doctor_id)
		except Doctor.DoesNotExist:
			return Response(
				{'detail': 'Doctor not found.'},
				status=status.HTTP_404_NOT_FOUND
			)

		if not doctor.is_available:
			return Response([], status=status.HTTP_200_OK)

		slots = get_available_slots(
			doctor.id,
			appointment_date,
			visit_type=visit_type
		)

		return Response(slots, status=status.HTTP_200_OK)