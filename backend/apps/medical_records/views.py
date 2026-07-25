from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db import models
from apps.appointments.models import Appointment

from .models import (
	AppointmentVitals,
	MasterComorbidity,
	MasterSymptom,
	AppointmentComorbidity,
	AppointmentSymptom,
	Prescription,
	HospitalMedicine,
)

from .serializers import (
	AppointmentVitalsSerializer,
	MasterComorbiditySerializer,
	MasterSymptomSerializer,
	AppointmentComorbiditySerializer,
	AppointmentSymptomSerializer,
	PrescriptionSerializer,
	HospitalMedicineSerializer,
)
from rest_framework.exceptions import PermissionDenied

def is_doctor(user):
	return getattr(user, 'role', None) == 'doctor'


def is_admin(user):
	return getattr(user, 'role', None) == 'admin' or user.is_staff


def is_nurse(user):
	return getattr(user, 'role', None) == 'nurse'


def is_doctor_or_admin(user):
	return is_doctor(user) or is_admin(user)


def get_doctor_appointment_or_403(request, appointment_id):
	try:
		appointment = Appointment.objects.select_related(
			'doctor',
			'doctor__user',
			'patient',
		).get(appointment_id=appointment_id)
	except Appointment.DoesNotExist:
		return None, Response(
			{'detail': 'Appointment not found.'},
			status=status.HTTP_404_NOT_FOUND
		)

	user = request.user
	user_role = str(getattr(user, 'role', '')).lower()

	is_admin_user = user_role == 'admin' or user.is_superuser

	is_assigned_doctor = (
		user_role == 'doctor' and
		appointment.doctor.user == user
	)

	if not is_admin_user and not is_assigned_doctor:
		return None, Response(
			{'detail': 'You do not have permission to access this appointment.'},
			status=status.HTTP_403_FORBIDDEN
		)

	return appointment, None

def get_medical_record_appointment_or_403(request, appointment_id, allow_patient_read=False):
	try:
		appointment = (
			Appointment.objects
			.select_related('doctor', 'doctor__user', 'patient')
			.get(appointment_id=appointment_id)
		)
	except Appointment.DoesNotExist:
		return None, Response(
			{'detail': 'Appointment not found.'},
			status=status.HTTP_404_NOT_FOUND
		)

	user = request.user
	user_role = str(getattr(user, 'role', '')).lower()

	is_admin_user = user_role == 'admin' or user.is_superuser
	is_assigned_doctor = user_role == 'doctor' and appointment.doctor.user == user
	is_owner_patient = user_role == 'patient' and appointment.patient == user

	if is_admin_user or is_assigned_doctor:
		return appointment, None

	if allow_patient_read and is_owner_patient:
		if appointment.status != Appointment.Status.COMPLETED:
			return None, Response(
				{'detail': 'Prescription is only available after the appointment is completed.'},
				status=status.HTTP_403_FORBIDDEN
			)

		if appointment.visit_type == Appointment.VisitType.HOME_VISIT and not appointment.final_paid:
			return None, Response(
				{'detail': 'Final payment is required before viewing this prescription.'},
				status=status.HTTP_403_FORBIDDEN
			)

		return appointment, None

	return None, Response(
		{'detail': 'You do not have permission to access this appointment.'},
		status=status.HTTP_403_FORBIDDEN
	)


def ensure_in_progress(appointment):
	if appointment.status != Appointment.Status.IN_PROGRESS:
		return Response(
			{'detail': 'This action is only allowed when appointment is in progress.'},
			status=status.HTTP_400_BAD_REQUEST
		)

	return None


class MasterComorbidityListView(generics.ListAPIView):
	serializer_class = MasterComorbiditySerializer
	permission_classes = [permissions.IsAuthenticated]

	def get_queryset(self):
		queryset = MasterComorbidity.objects.all()

		search = self.request.query_params.get('search')
		category = self.request.query_params.get('category')
		is_common = self.request.query_params.get('is_common')

		if search:
			queryset = queryset.filter(comorbidity_name__icontains=search)

		if category:
			queryset = queryset.filter(category__iexact=category)

		if is_common == 'true':
			queryset = queryset.filter(is_common=True)

		if is_common == 'false':
			queryset = queryset.filter(is_common=False)

		return queryset


class MasterSymptomListView(generics.ListAPIView):
	serializer_class = MasterSymptomSerializer
	permission_classes = [permissions.IsAuthenticated]

	def get_queryset(self):
		queryset = MasterSymptom.objects.all()

		search = self.request.query_params.get('search')
		category = self.request.query_params.get('category')
		is_common = self.request.query_params.get('is_common')

		if search:
			queryset = queryset.filter(symptom_name__icontains=search)

		if category:
			queryset = queryset.filter(category__iexact=category)

		if is_common == 'true':
			queryset = queryset.filter(is_common=True)

		if is_common == 'false':
			queryset = queryset.filter(is_common=False)

		return queryset


class AppointmentVitalsView(APIView):
	permission_classes = [permissions.IsAuthenticated]

	def get(self, request, appointment_id):
		appointment, error_response = get_doctor_appointment_or_403(
			request,
			appointment_id
		)

		if error_response:
			return error_response

		try:
			vitals = appointment.vitals
		except AppointmentVitals.DoesNotExist:
			return Response(
				{'detail': 'Vitals not found.'},
				status=status.HTTP_404_NOT_FOUND
			)

		serializer = AppointmentVitalsSerializer(vitals)
		return Response(serializer.data)

	def post(self, request, appointment_id):
		appointment, error_response = get_doctor_appointment_or_403(
			request,
			appointment_id
		)

		if error_response:
			return error_response

		progress_error = ensure_in_progress(appointment)
		if progress_error:
			return progress_error

		if hasattr(appointment, 'vitals'):
			return Response(
				{'detail': 'Vitals already exist. Use PATCH to update.'},
				status=status.HTTP_400_BAD_REQUEST
			)

		serializer = AppointmentVitalsSerializer(data=request.data)
		serializer.is_valid(raise_exception=True)
		serializer.save(
			appointment=appointment,
			recorded_by=request.user
		)

		return Response(serializer.data, status=status.HTTP_201_CREATED)

	def patch(self, request, appointment_id):
		appointment, error_response = get_doctor_appointment_or_403(
			request,
			appointment_id
		)

		if error_response:
			return error_response

		progress_error = ensure_in_progress(appointment)
		if progress_error:
			return progress_error

		try:
			vitals = appointment.vitals
		except AppointmentVitals.DoesNotExist:
			return Response(
				{'detail': 'Vitals not recorded yet. Use POST first.'},
				status=status.HTTP_404_NOT_FOUND
			)

		serializer = AppointmentVitalsSerializer(
			vitals,
			data=request.data,
			partial=True
		)
		serializer.is_valid(raise_exception=True)
		serializer.save()

		return Response(serializer.data)


class AppointmentComorbidityListCreateView(APIView):
	permission_classes = [permissions.IsAuthenticated]

	def get(self, request, appointment_id):
		appointment, error_response = get_doctor_appointment_or_403(
			request,
			appointment_id
		)

		if error_response:
			return error_response

		queryset = appointment.comorbidities.select_related('comorbidity').all()
		serializer = AppointmentComorbiditySerializer(queryset, many=True)

		return Response(serializer.data)

	def post(self, request, appointment_id):
		appointment, error_response = get_doctor_appointment_or_403(
			request,
			appointment_id
		)

		if error_response:
			return error_response

		progress_error = ensure_in_progress(appointment)
		if progress_error:
			return progress_error

		serializer = AppointmentComorbiditySerializer(data=request.data)
		serializer.is_valid(raise_exception=True)
		serializer.save(appointment=appointment)

		return Response(serializer.data, status=status.HTTP_201_CREATED)


class AppointmentComorbidityDeleteView(APIView):
	permission_classes = [permissions.IsAuthenticated]

	def delete(self, request, appointment_id, comorbidity_id):
		appointment, error_response = get_doctor_appointment_or_403(
			request,
			appointment_id
		)

		if error_response:
			return error_response

		progress_error = ensure_in_progress(appointment)
		if progress_error:
			return progress_error

		try:
			item = AppointmentComorbidity.objects.get(
				appointment=appointment,
				appointment_comorbidity_id=comorbidity_id
			)
		except AppointmentComorbidity.DoesNotExist:
			return Response(
				{'detail': 'Comorbidity not found.'},
				status=status.HTTP_404_NOT_FOUND
			)

		item.delete()

		return Response(status=status.HTTP_204_NO_CONTENT)


class AppointmentSymptomListCreateView(APIView):
	permission_classes = [permissions.IsAuthenticated]

	def get(self, request, appointment_id):
		appointment, error_response = get_doctor_appointment_or_403(
			request,
			appointment_id
		)

		if error_response:
			return error_response

		queryset = appointment.symptoms.select_related('symptom').all()
		serializer = AppointmentSymptomSerializer(queryset, many=True)

		return Response(serializer.data)

	def post(self, request, appointment_id):
		appointment, error_response = get_doctor_appointment_or_403(
			request,
			appointment_id
		)

		if error_response:
			return error_response

		progress_error = ensure_in_progress(appointment)
		if progress_error:
			return progress_error

		serializer = AppointmentSymptomSerializer(data=request.data)
		serializer.is_valid(raise_exception=True)
		serializer.save(appointment=appointment)

		return Response(serializer.data, status=status.HTTP_201_CREATED)


class AppointmentSymptomDeleteView(APIView):
	permission_classes = [permissions.IsAuthenticated]

	def delete(self, request, appointment_id, symptom_id):
		appointment, error_response = get_doctor_appointment_or_403(
			request,
			appointment_id
		)

		if error_response:
			return error_response

		progress_error = ensure_in_progress(appointment)
		if progress_error:
			return progress_error

		try:
			item = AppointmentSymptom.objects.get(
				appointment=appointment,
				appointment_symptom_id=symptom_id
			)
		except AppointmentSymptom.DoesNotExist:
			return Response(
				{'detail': 'Symptom not found.'},
				status=status.HTTP_404_NOT_FOUND
			)

		item.delete()

		return Response(status=status.HTTP_204_NO_CONTENT)


class AppointmentPrescriptionView(APIView):
	permission_classes = [permissions.IsAuthenticated]

	def get(self, request, appointment_id):
		appointment, error_response = get_medical_record_appointment_or_403(
			request,
			appointment_id,
			allow_patient_read=True
		)

		if error_response:
			return error_response

		try:
			prescription = appointment.prescription
		except Prescription.DoesNotExist:
			return Response(
				{'detail': 'Prescription not created yet.'},
				status=status.HTTP_404_NOT_FOUND
			)

		serializer = PrescriptionSerializer(prescription)
		return Response(serializer.data)

	def post(self, request, appointment_id):
		appointment, error_response = get_doctor_appointment_or_403(
			request,
			appointment_id
		)

		if error_response:
			return error_response

		progress_error = ensure_in_progress(appointment)
		if progress_error:
			return progress_error

		if not hasattr(appointment, 'vitals'):
			return Response(
				{'detail': 'Vitals must be recorded before creating prescription.'},
				status=status.HTTP_400_BAD_REQUEST
			)

		if hasattr(appointment, 'prescription'):
			return Response(
				{'detail': 'Prescription already exists. Use PATCH to update.'},
				status=status.HTTP_400_BAD_REQUEST
			)

		serializer = PrescriptionSerializer(data=request.data)
		serializer.is_valid(raise_exception=True)
		serializer.save(appointment=appointment)

		return Response(serializer.data, status=status.HTTP_201_CREATED)

	def patch(self, request, appointment_id):
		appointment, error_response = get_doctor_appointment_or_403(
			request,
			appointment_id
		)

		if error_response:
			return error_response

		progress_error = ensure_in_progress(appointment)
		if progress_error:
			return progress_error

		try:
			prescription = appointment.prescription
		except Prescription.DoesNotExist:
			return Response(
				{'detail': 'Prescription not created yet. Use POST first.'},
				status=status.HTTP_404_NOT_FOUND
			)

		if prescription.sent_to_pharmacy:
			return Response(
				{'detail': 'Prescription was already sent to pharmacy and cannot be edited.'},
				status=status.HTTP_400_BAD_REQUEST
			)

		serializer = PrescriptionSerializer(
			prescription,
			data=request.data,
			partial=True
		)
		serializer.is_valid(raise_exception=True)
		serializer.save()

		return Response(serializer.data)


class SendPrescriptionToPharmacyView(APIView):
	permission_classes = [permissions.IsAuthenticated]

	def post(self, request, appointment_id):
		appointment, error_response = get_doctor_appointment_or_403(
			request,
			appointment_id
		)

		if error_response:
			return error_response

		progress_error = ensure_in_progress(appointment)
		if progress_error:
			return progress_error

		try:
			prescription = appointment.prescription
		except Prescription.DoesNotExist:
			return Response(
				{'detail': 'Prescription must be created before sending to pharmacy.'},
				status=status.HTTP_400_BAD_REQUEST
			)

		if not prescription.items.exists():
			return Response(
				{'detail': 'Prescription must have at least one medicine item.'},
				status=status.HTTP_400_BAD_REQUEST
			)

		if appointment.visit_type != Appointment.VisitType.CLINIC:
			return Response(
				{'detail': 'Only clinic appointments can be sent to pharmacy.'},
				status=status.HTTP_400_BAD_REQUEST
			)

		prescription.sent_to_pharmacy = True
		prescription.save(update_fields=['sent_to_pharmacy'])

		return Response({
			'detail': 'Prescription sent to pharmacy successfully.',
			'prescription_id': prescription.id,
			'appointment_id': appointment.appointment_id,
			'appointment_status': appointment.status,
			'sent_to_pharmacy': prescription.sent_to_pharmacy,
		})

class HospitalMedicineListView(generics.ListAPIView):
	serializer_class = HospitalMedicineSerializer
	permission_classes = [permissions.IsAuthenticated]

	def get_queryset(self):
		queryset = HospitalMedicine.objects.all()

		search = self.request.query_params.get('search')
		is_active = self.request.query_params.get('is_active')

		if search:
			queryset = queryset.filter(
				models.Q(medicine_name__icontains=search) |
				models.Q(generic_name__icontains=search) |
				models.Q(medicine_code__icontains=search)
			)

		if is_active == 'true':
			queryset = queryset.filter(is_active=True)

		if is_active == 'false':
			queryset = queryset.filter(is_active=False)

		return queryset