from rest_framework import generics, permissions, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from .models import Appointment
from .serializers import (
	AppointmentListSerializer, 
	AppointmentDetailSerializer, 
	AppointmentCreateSerializer, 
	AppointmentStatusUpdateSerializer,
)
from rest_framework.views import APIView

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

	def create(self, request, *args, **kwargs):
		create_serializer = self.get_serializer(data=request.data)
		create_serializer.is_valid(raise_exception=True)
		appointment = create_serializer.save()

		detail_serializer = AppointmentDetailSerializer(
			appointment,
			context={'request': request}
		)

		return Response(
			detail_serializer.data,
			status=status.HTTP_201_CREATED
		)

	def get_queryset(self):
		user = self.request.user

		queryset = (
			Appointment.objects
			.select_related('patient', 'doctor', 'doctor__user')
			.all()
			.order_by('-created_at')
		)

		# Admin can read all appointments
		if getattr(user, 'role', None) == 'admin' or user.is_staff:
			role_queryset = queryset

		# Doctor can see appointments assigned to them
		elif getattr(user, 'role', None) == 'doctor':
			role_queryset = queryset.filter(doctor__user=user)

		# Patient can see their own appointments
		else:
			role_queryset = queryset.filter(patient=user)

		date = self.request.query_params.get('date')
		from_date = self.request.query_params.get('from_date')
		to_date = self.request.query_params.get('to_date')
		status_param = self.request.query_params.get('status')
		visit_type = self.request.query_params.get('visit_type')

		if date:
			role_queryset = role_queryset.filter(appointment_date=date)

		if from_date:
			role_queryset = role_queryset.filter(appointment_date__gte=from_date)

		if to_date:
			role_queryset = role_queryset.filter(appointment_date__lte=to_date)

		if status_param:
			role_queryset = role_queryset.filter(status=status_param)

		if visit_type:
			role_queryset = role_queryset.filter(visit_type=visit_type)

		return role_queryset.order_by('appointment_date', 'start_time')


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

class AppointmentStartCheckupView(APIView):
	permission_classes = [permissions.IsAuthenticated]

	def post(self, request, appointment_id):
		try:
			appointment = (
				Appointment.objects
				.select_related('doctor', 'doctor__user')
				.get(appointment_id=appointment_id)
			)
		except Appointment.DoesNotExist:
			return Response(
				{'detail': 'Appointment not found.'},
				status=status.HTTP_404_NOT_FOUND
			)

		user = request.user

		is_admin_user = getattr(user, 'role', None) == 'admin' or user.is_staff
		is_appointment_doctor = (
			getattr(user, 'role', None) == 'doctor'
			and appointment.doctor.user_id == user.user_id
		)

		if not is_admin_user and not is_appointment_doctor:
			return Response(
				{'detail': 'You do not have permission to start this appointment.'},
				status=status.HTTP_403_FORBIDDEN
			)

		if appointment.status != Appointment.Status.CONFIRMED:
			return Response(
				{'detail': 'Only confirmed appointments can be started.'},
				status=status.HTTP_400_BAD_REQUEST
			)

		appointment.status = Appointment.Status.IN_PROGRESS
		appointment.save(update_fields=['status'])

		serializer = AppointmentDetailSerializer(
			appointment,
			context={'request': request}
		)

		return Response(serializer.data)

