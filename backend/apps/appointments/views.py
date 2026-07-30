from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Appointment
from .serializers import (
	AppointmentListSerializer,
	AppointmentDetailSerializer,
	AppointmentCreateSerializer,
	AppointmentStatusUpdateSerializer,
)

from apps.medical_records.models import AppointmentVitals, Prescription
from .pdf_service import generate_medical_pdf
from django.http import FileResponse
from django.utils import timezone
from .time_rules import get_checkup_start_availability, synchronize_missed_appointment

#code goes here
def get_user_role(user):
	return str(getattr(user, 'role', '')).lower()


def is_admin_user(user):
	return get_user_role(user) == 'admin' or user.is_superuser


def is_doctor_user(user):
	return get_user_role(user) == 'doctor'


def is_patient_user(user):
	return get_user_role(user) == 'patient'


def is_assigned_doctor(user, appointment):
	return (
		is_doctor_user(user) and
		appointment.doctor.user == user
	)


class AppointmentListCreateView(generics.ListCreateAPIView):
	"""
	GET /api/appointments/
	POST /api/appointments/

	Patient: read and create their own appointments
	Doctor: read appointments assigned to them
	Admin: read all appointments
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
		user_role = get_user_role(user)

		queryset = (
			Appointment.objects
			.select_related('patient', 'doctor', 'doctor__user')
			.all()
		)

		if user_role == 'admin' or user.is_superuser:
			role_queryset = queryset

		elif user_role == 'doctor':
			role_queryset = queryset.filter(doctor__user=user)

		elif user_role == 'patient':
			role_queryset = queryset.filter(patient=user)

		else:
			role_queryset = Appointment.objects.none()

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

	def list(self, request, *args, **kwargs):
		queryset = self.filter_queryset(
			self.get_queryset()
		)

		current_time = timezone.localtime()

		for appointment in queryset:
			synchronize_missed_appointment(
				appointment,
				current_time=current_time,
			)

		page = self.paginate_queryset(queryset)

		if page is not None:
			serializer = self.get_serializer(
				page,
				many=True,
			)

			return self.get_paginated_response(
				serializer.data
			)

		serializer = self.get_serializer(
			queryset,
			many=True,
		)

		return Response(serializer.data)


class AppointmentDetailView(generics.RetrieveAPIView):
	"""
	GET /api/appointments/<uuid:appointment_id>/
	"""

	serializer_class = AppointmentDetailSerializer
	permission_classes = [permissions.IsAuthenticated]
	lookup_field = 'appointment_id'

	def get_queryset(self):
		user = self.request.user
		user_role = get_user_role(user)

		queryset = Appointment.objects.select_related(
			'patient',
			'doctor',
			'doctor__user',
		)

		if user_role == 'admin' or user.is_superuser:
			return queryset

		if user_role == 'doctor':
			return queryset.filter(doctor__user=user)

		if user_role == 'patient':
			return queryset.filter(patient=user)

		return Appointment.objects.none()


class AppointmentStatusUpdateView(generics.UpdateAPIView):
	"""
	PATCH /api/appointments/<uuid:appointment_id>/status/
	"""

	serializer_class = AppointmentStatusUpdateSerializer
	permission_classes = [permissions.IsAuthenticated]
	lookup_field = 'appointment_id'
	http_method_names = ['patch']

	def get_queryset(self):
		user = self.request.user
		user_role = get_user_role(user)

		queryset = (
			Appointment.objects
			.select_related('patient', 'doctor', 'doctor__user')
			.all()
		)

		if user_role == 'admin' or user.is_superuser:
			return queryset

		if user_role == 'doctor':
			return queryset.filter(doctor__user=user)

		return Appointment.objects.none()


class AppointmentCancelView(generics.UpdateAPIView):
	"""
	PATCH /api/appointments/<uuid:appointment_id>/cancel/

	Patient can cancel their own pending / confirmed appointment.
	Doctor can cancel appointments assigned to them.
	Admin can cancel all appointments.
	"""

	serializer_class = AppointmentStatusUpdateSerializer
	permission_classes = [permissions.IsAuthenticated]
	lookup_field = 'appointment_id'
	http_method_names = ['patch']

	def get_queryset(self):
		user = self.request.user
		user_role = get_user_role(user)

		queryset = (
			Appointment.objects
			.select_related('patient', 'doctor', 'doctor__user')
			.all()
		)

		if user_role == 'admin' or user.is_superuser:
			return queryset

		if user_role == 'doctor':
			return queryset.filter(doctor__user=user)

		if user_role == 'patient':
			return queryset.filter(patient=user)

		return Appointment.objects.none()

	def patch(self, request, *args, **kwargs):
		appointment = self.get_object()

		if appointment.status not in [
			Appointment.Status.PENDING,
			Appointment.Status.CONFIRMED,
		]:
			return Response(
				{'detail': 'Only pending or confirmed appointments can be cancelled.'},
				status=status.HTTP_400_BAD_REQUEST
			)

		serializer = self.get_serializer(
			appointment,
			data={'status': Appointment.Status.CANCELLED},
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
				.select_related(
					'doctor',
					'doctor__user',
					'patient',
				)
				.get(appointment_id=appointment_id)
			)
		except Appointment.DoesNotExist:
			return Response(
				{'detail': 'Appointment not found.'},
				status=status.HTTP_404_NOT_FOUND
			)

		user = request.user

		if (
			not is_admin_user(user)
			and not is_assigned_doctor(user, appointment)
		):
			return Response(
				{
					'detail': (
						'You do not have permission to start '
						'this appointment.'
					)
				},
				status=status.HTTP_403_FORBIDDEN
			)

		synchronize_missed_appointment(appointment)
		if appointment.status == Appointment.Status.MISSED:
			return Response(
				{
					'detail': (
						'This appointment was missed because '
						'its allowed start window expired. '
						'The deposit is non-refundable.'
					),
					'reason': 'appointment_missed',
				},
				status=status.HTTP_400_BAD_REQUEST,
			)
		

		if appointment.status != Appointment.Status.CONFIRMED:
			return Response(
				{
					'detail': (
						'Only confirmed appointments can be started.'
					)
				},
				status=status.HTTP_400_BAD_REQUEST
			)

		availability = get_checkup_start_availability(
			appointment
		)

		if not availability['can_start']:
			return Response(
				{
					'detail': availability['message'],
					'reason': availability['reason'],
					'current_time': (
						timezone.localtime().isoformat()
					),
					'scheduled_start': (
						availability['scheduled_start'].isoformat()
					),
					'scheduled_end': (
						availability['scheduled_end'].isoformat()
					),
					'earliest_start': (
						availability['earliest_start'].isoformat()
					),
					'latest_start': (
						availability['latest_start'].isoformat()
					),
				},
				status=status.HTTP_400_BAD_REQUEST
			)

		appointment.status = Appointment.Status.IN_PROGRESS

		appointment.save(
			update_fields=[
				'status',
				'updated_at',
			]
		)

		serializer = AppointmentDetailSerializer(
			appointment,
			context={'request': request}
		)

		return Response(
			serializer.data,
			status=status.HTTP_200_OK
		)


class AppointmentCompleteCheckupView(APIView):
	permission_classes = [permissions.IsAuthenticated]

	def post(self, request, appointment_id):
		try:
			appointment = (
				Appointment.objects
				.select_related('doctor', 'doctor__user', 'patient')
				.get(appointment_id=appointment_id)
			)
		except Appointment.DoesNotExist:
			return Response(
				{'detail': 'Appointment not found.'},
				status=status.HTTP_404_NOT_FOUND
			)

		user = request.user

		if not is_admin_user(user) and not is_assigned_doctor(user, appointment):
			return Response(
				{'detail': 'You do not have permission to complete this appointment.'},
				status=status.HTTP_403_FORBIDDEN
			)

		if appointment.status != Appointment.Status.IN_PROGRESS:
			return Response(
				{'detail': 'Only in-progress appointments can be completed.'},
				status=status.HTTP_400_BAD_REQUEST
			)

		has_vitals = AppointmentVitals.objects.filter(
			appointment=appointment
		).exists()

		if not has_vitals:
			return Response(
				{'detail': 'Please save vitals before completing the checkup.'},
				status=status.HTTP_400_BAD_REQUEST
			)

		prescription = Prescription.objects.filter(
			appointment=appointment
		).first()

		if not prescription:
			return Response(
				{'detail': 'Please save prescription before completing the checkup.'},
				status=status.HTTP_400_BAD_REQUEST
			)

		if appointment.visit_type == Appointment.VisitType.CLINIC:
			if not prescription.sent_to_pharmacy:
				return Response(
					{
						'detail': 'Please send prescription to pharmacy before completing clinic appointment.'
					},
					status=status.HTTP_400_BAD_REQUEST
				)

		if appointment.visit_type == Appointment.VisitType.CLINIC:
			return Response(
				{
					'detail': 'Clinic appointments are completed by nurse/pharmacy after final payment.'
				},
				status=status.HTTP_400_BAD_REQUEST
			)

		if appointment.visit_type == Appointment.VisitType.HOME_VISIT:
			if not appointment.final_paid:
				return Response(
					{
						'detail': 'Final payment must be completed before completing home visit appointment.'
					},
					status=status.HTTP_400_BAD_REQUEST
				)

		appointment.status = Appointment.Status.COMPLETED
		appointment.save(update_fields=['status', 'updated_at'])

		serializer = AppointmentDetailSerializer(
			appointment,
			context={'request': request}
		)

		return Response(
			{
				'detail': 'Appointment completed successfully.',
				'appointment': serializer.data,
			},
			status=status.HTTP_200_OK
		)

class AppointmentMedicalPDFDownloadView(APIView):
	permission_classes = [permissions.IsAuthenticated]

	def get(self, request, appointment_id):
		try:
			appointment = (
				Appointment.objects
				.select_related('patient', 'doctor', 'doctor__user')
				.get(appointment_id=appointment_id)
			)
		except Appointment.DoesNotExist:
			return Response(
				{'detail': 'Appointment not found.'},
				status=status.HTTP_404_NOT_FOUND
			)

		user = request.user
		user_role = get_user_role(user)

		is_admin = user_role == 'admin' or user.is_superuser
		is_patient = appointment.patient == user
		is_doctor = user_role == 'doctor' and appointment.doctor.user == user

		if not is_admin and not is_patient and not is_doctor:
			return Response(
				{'detail': 'You do not have permission to download this medical record.'},
				status=status.HTTP_403_FORBIDDEN
			)

		if appointment.status != Appointment.Status.COMPLETED:
			return Response(
				{'detail': 'Medical record PDF is only available after the appointment is completed.'},
				status=status.HTTP_403_FORBIDDEN
			)

		if appointment.visit_type == Appointment.VisitType.HOME_VISIT and not appointment.final_paid:
			return Response(
				{'detail': 'Final payment is required before downloading the medical record PDF.'},
				status=status.HTTP_403_FORBIDDEN
			)

		if not appointment.medical_pdf:
			return Response(
				{'detail': 'Medical record PDF has not been generated yet.'},
				status=status.HTTP_404_NOT_FOUND
			)

		try:
			return FileResponse(
				appointment.medical_pdf.open('rb'),
				as_attachment=True,
				filename=f'medical_record_{appointment.appointment_id}.pdf',
				content_type='application/pdf'
			)
		except FileNotFoundError:
			return Response(
				{'detail': 'Medical record PDF file was not found on the server.'},
				status=status.HTTP_404_NOT_FOUND
			)


class AppointmentFinalPaymentCreateView(APIView):
	permission_classes = [permissions.IsAuthenticated]

	def post(self, request, appointment_id):
		try:
			appointment = (
				Appointment.objects
				.select_related('doctor', 'doctor__user', 'patient')
				.get(appointment_id=appointment_id)
			)
		except Appointment.DoesNotExist:
			return Response(
				{'detail': 'Appointment not found.'},
				status=status.HTTP_404_NOT_FOUND
			)

		user = request.user

		if not is_admin_user(user) and not is_assigned_doctor(user, appointment):
			return Response(
				{'detail': 'You do not have permission to generate final payment for this appointment.'},
				status=status.HTTP_403_FORBIDDEN
			)

		if appointment.visit_type != Appointment.VisitType.HOME_VISIT:
			return Response(
				{'detail': 'Final QR payment from doctor is only for home visit appointments.'},
				status=status.HTTP_400_BAD_REQUEST
			)

		if appointment.status != Appointment.Status.IN_PROGRESS:
			return Response(
				{'detail': 'Final payment can only be generated when appointment is in progress.'},
				status=status.HTTP_400_BAD_REQUEST
			)

		if not AppointmentVitals.objects.filter(appointment=appointment).exists():
			return Response(
				{'detail': 'Please save vitals before generating final payment.'},
				status=status.HTTP_400_BAD_REQUEST
			)

		prescription = Prescription.objects.filter(appointment=appointment).first()

		if not prescription or not prescription.items.exists():
			return Response(
				{'detail': 'Please save prescription before generating final payment.'},
				status=status.HTTP_400_BAD_REQUEST
			)

		if appointment.final_paid:
			return Response(
				{'detail': 'Final payment has already been completed.'},
				status=status.HTTP_400_BAD_REQUEST
			)

		total_fee = appointment.total_fee or 0
		final_amount = total_fee / 2

		appointment.final_amount = final_amount
		appointment.save(update_fields=['final_amount', 'updated_at'])

		# TODO: Replace this placeholder with your real VNPay QR/payment URL creation.
		return Response(
			{
				'detail': 'Final payment QR generated successfully.',
				'appointment_id': appointment.appointment_id,
				'final_amount': appointment.final_amount,
				'payment_url': 'TODO_GENERATE_VNPAY_PAYMENT_URL_HERE',
			},
			status=status.HTTP_200_OK
		)

class AppointmentFinalPaymentConfirmView(APIView):
	permission_classes = [permissions.IsAuthenticated]

	def post(self, request, appointment_id):
		try:
			appointment = (
				Appointment.objects
				.select_related('doctor', 'doctor__user', 'patient')
				.get(appointment_id=appointment_id)
			)
		except Appointment.DoesNotExist:
			return Response(
				{'detail': 'Appointment not found.'},
				status=status.HTTP_404_NOT_FOUND
			)

		user = request.user

		if not is_admin_user(user) and not is_assigned_doctor(user, appointment):
			return Response(
				{'detail': 'You do not have permission to confirm final payment for this appointment.'},
				status=status.HTTP_403_FORBIDDEN
			)

		if appointment.visit_type != Appointment.VisitType.HOME_VISIT:
			return Response(
				{'detail': 'This final payment confirmation is only for home visit appointments.'},
				status=status.HTTP_400_BAD_REQUEST
			)

		if appointment.status != Appointment.Status.IN_PROGRESS:
			return Response(
				{'detail': 'Only in-progress appointments can receive final payment.'},
				status=status.HTTP_400_BAD_REQUEST
			)

		if not appointment.final_amount:
			total_fee = appointment.total_fee or 0
			appointment.final_amount = total_fee / 2

		appointment.final_paid = True
		appointment.status = Appointment.Status.COMPLETED
		appointment.save(
			update_fields=[
				'final_paid',
				'final_amount',
				'status',
				'updated_at',
			]
		)

		generate_medical_pdf(appointment)

		serializer = AppointmentDetailSerializer(
			appointment,
			context={'request': request}
		)

		return Response(
			{
				'detail': 'Final payment confirmed. Appointment completed.',
				'appointment': serializer.data,
			},
			status=status.HTTP_200_OK
		)

		