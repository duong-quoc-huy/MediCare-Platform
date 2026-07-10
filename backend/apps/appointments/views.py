from rest_framework import generics, permissions
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework import status

from .models import Appointment
from .serializers import (
	AppointmentListSerializer, 
	AppointmentDetailSerializer, 
	AppointmentCreateSerializer, 
	AppointmentStatusUpdateSerializer,
)


# Create your views here.
class AppointmentListCreateView(generics.ListCreateAPIView):
	"""
	GET /api/appointments/
	POST /api/appointments/

	Patient: read and create their appointments
	
	Doctor: can see appointments assigned to them

	Admin: can read all appointments

	"""

	permission_classes = [permissions.IsAuthenticated]

	def get_serializer_class(self):
		if self.request.method == 'POST':
			return AppointmentCreateSerializer
		return AppointmentListSerializer


	def get_queryset(self):
		user = self.request.user

		queryset = (
			Appointment.objects
			.select_related('patient', 'doctor', 'doctor__user')
			.all()
			.order_by('-created_at')
			)

		#admin can read all appointments
		if getattr(user,'role', None) == 'admin' or user.is_staff:
			return queryset

		#Doctor can see appointments assigned to them
		if getattr(user, 'role', None) == 'doctor':
			return queryset.filter(doctor__user=user)

		#patient can see their own appointments
		return queryset.filter(patient=user)


class AppointmentDetailView(generics.RetrieveAPIView):
	"""
	
	GET /api/appoinments/<uuid:appointment_id>/

	"""

	serializer_class = AppointmentDetailSerializer
	permission_classes = [permissions.IsAuthenticated]
	lookup_field = 'appointment_id'

	def get_queryset(self):
		user = self.request.user

		queryset = (
			Appointment.objects
			.select_related('patient', 'doctor', 'doctor__user')
			.all()
			)

		if getattr(user, 'role', None) == 'admin' or user.is_staff:
			return queryset

		if getattr(user, 'role', None) == 'doctor':
			return queryset.filter(doctor__user=user)

		return queryset.filter(patient=user)



class AppointmentStatusUpdateView(generics.UpdateAPIView):
	"""
	
	PATCH /api/appointments/<uuid:appointment_id>/status
	"""

	serializer_class = AppointmentStatusUpdateSerializer
	permission_classes = [permissions.IsAuthenticated]
	lookup_field = 'appointment_id'
	http_method_names = ['patch']

	def get_queryset(self):
		user = self.request.user

		queryset = (
			Appointment.objects
			.select_related('patient', 'doctor', 'doctor__user')
			.all()
			)

		#admin can update any status
		if getattr(user, 'role', None) == 'admin' or user.is_staff:
			return queryset

		# doctor can update appointment assigned to them
		if getattr(user, 'role', None) == 'doctor':
			return queryset.filter(doctor__user=user)

		# patient should not update status directly
		return Appointment.objects.none()

class AppointmentCancelView(generics.UpdateAPIView):
	"""
	
	PATCH /api/appointments/<uuid:appointment_id>/cancel

	Patient can cancel their own pending / confirmed appointment
	Doctor / Admin / Nurse can cancel it as well

	"""

	serializer_class = AppointmentStatusUpdateSerializer
	permission_classes = [permissions.IsAuthenticated]
	lookup_field = 'appointment_id'
	http_method_names = ['patch']

	def get_queryset(self):
		user = self.request.user

		queryset = (
			Appointment.objects
			.select_related('patient', 'doctor', 'doctor__user')
			.all()
		)

		if getattr(user, 'role', None) == 'admin' or user.is_staff:
			return queryset

		if getattr(user, 'role', None) == 'doctor':
			return queryset.filter(doctor__user=user)

		return queryset.filter(patient=user)

	def patch(self, request, *args, **kwargs):
		appointment = self.get_object()

		if appointment.status not in ['pending', 'confirmed']:
			return Response(
				{'detail': 'Only pending or confirmed appointments can be cancelled.'},
				status=status.HTTP_400_BAD_REQUEST
			)

		serializer = self.get_serializer(
			appointment,
			data={'status': 'cancelled'},
			partial=True
		)
		serializer.is_valid(raise_exception=True)
		serializer.save()

		return Response(serializer.data)

