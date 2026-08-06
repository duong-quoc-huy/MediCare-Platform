from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework import generics, parsers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.appointments.models import Appointment
from apps.doctors.models import Doctor, DoctorSchedule
from apps.medical_records.models import AppointmentVitals, Prescription
from apps.medicines.models import Medicine, MedicineCategory, MedicineManufacturer

from apps.notifications.models import Notification
from apps.notifications.push import get_push_backend
from apps.orders.models import MedicineOrder
from apps.payments.models import Payment
from apps.users.models import User

from .models import AdminAuditLog
from .permissions import IsSystemAdmin
from .serializers import (
	AdminAppointmentSerializer,
	AdminAuditLogSerializer,
	AdminDoctorScheduleSerializer,
	AdminDoctorSerializer,
	AdminMedicineCategorySerializer,
	AdminMedicineManufacturerSerializer,
	AdminMedicineSerializer,
	AdminNotificationSerializer,
	AdminOrderSerializer,
	AdminPaymentSerializer,
	AdminPrescriptionSerializer,
	AdminUserSerializer,
	AdminVitalsSerializer,
)
from apps.doctors.schedule_rules import ensure_schedule_can_be_deleted
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework.exceptions import ValidationError as DRFValidationError

from .services import (
	dashboard_summary,
	distributions,
	revenue_series,
	write_admin_audit,
)


class AdminDashboardSummaryView(APIView):
	permission_classes = [IsSystemAdmin]

	def get(self, request):
		return Response(dashboard_summary())


class AdminDashboardRevenueView(APIView):
	permission_classes = [IsSystemAdmin]

	def get(self, request):
		try:
			days = int(request.query_params.get('days', 30))
		except (TypeError, ValueError):
			days = 30

		days = max(7, min(days, 365))
		return Response({
			'days': days,
			'series': revenue_series(days),
		})


class AdminDashboardDistributionView(APIView):
	permission_classes = [IsSystemAdmin]

	def get(self, request):
		return Response(distributions())


class AdminUserListCreateView(generics.ListCreateAPIView):
	serializer_class = AdminUserSerializer
	permission_classes = [IsSystemAdmin]

	def get_queryset(self):
		queryset = User.objects.all().order_by('-created_at')
		role = self.request.query_params.get('role')
		search = self.request.query_params.get('search')
		active = self.request.query_params.get('active')

		if role:
			queryset = queryset.filter(role=role)

		if search:
			queryset = queryset.filter(
				Q(full_name__icontains=search)
				| Q(email__icontains=search)
				| Q(phone_number_1__icontains=search)
			)

		if active in {'true', 'false'}:
			queryset = queryset.filter(
				is_active=(active == 'true')
			)

		return queryset

	def perform_create(self, serializer):
		user = serializer.save()
		write_admin_audit(
			request=self.request,
			action='user_created',
			resource_type='user',
			resource_id=user.user_id,
			new_data={
				'email': user.email,
				'role': user.role,
				'is_active': user.is_active,
			},
		)


class AdminUserDetailView(generics.RetrieveUpdateAPIView):
	serializer_class = AdminUserSerializer
	permission_classes = [IsSystemAdmin]
	lookup_field = 'user_id'
	http_method_names = ['get', 'patch']
	queryset = User.objects.all()

	@transaction.atomic
	def patch(self, request, *args, **kwargs):
		user = self.get_object()
		previous = {
			'email': user.email,
			'role': user.role,
			'is_active': user.is_active,
		}
		response = super().patch(request, *args, **kwargs)
		user.refresh_from_db()

		write_admin_audit(
			request=request,
			action='user_updated',
			resource_type='user',
			resource_id=user.user_id,
			previous_data=previous,
			new_data={
				'email': user.email,
				'role': user.role,
				'is_active': user.is_active,
			},
		)
		return response


class AdminUserActivationView(APIView):
	permission_classes = [IsSystemAdmin]

	@transaction.atomic
	def post(self, request, user_id):
		try:
			user = User.objects.select_for_update().get(
				user_id=user_id
			)
		except User.DoesNotExist:
			return Response(
				{'detail': 'User was not found.'},
				status=status.HTTP_404_NOT_FOUND,
			)

		if user == request.user:
			return Response(
				{'detail': 'You cannot deactivate your own account.'},
				status=status.HTTP_400_BAD_REQUEST,
			)

		active = request.data.get('is_active')
		if not isinstance(active, bool):
			return Response(
				{'detail': 'is_active must be true or false.'},
				status=status.HTTP_400_BAD_REQUEST,
			)

		previous = user.is_active
		user.is_active = active
		user.save(update_fields=['is_active'])

		write_admin_audit(
			request=request,
			action='user_activated' if active else 'user_deactivated',
			resource_type='user',
			resource_id=user.user_id,
			previous_data={'is_active': previous},
			new_data={'is_active': active},
		)

		return Response(AdminUserSerializer(user).data)


class AdminDoctorListCreateView(generics.ListCreateAPIView):
	serializer_class = AdminDoctorSerializer
	permission_classes = [IsSystemAdmin]
	parser_classes = [
		parsers.MultiPartParser,
		parsers.FormParser,
		parsers.JSONParser,
	]

	def get_queryset(self):
		queryset = (
			Doctor.objects
			.select_related('user')
			.prefetch_related('schedules')
			.order_by('-created_at')
		)
		search = self.request.query_params.get('search')
		available = self.request.query_params.get('available')

		if search:
			queryset = queryset.filter(
				Q(user__full_name__icontains=search)
				| Q(user__email__icontains=search)
				| Q(specialty__icontains=search)
			)

		if available in {'true', 'false'}:
			queryset = queryset.filter(
				is_available=(available == 'true')
			)

		return queryset

	def perform_create(self, serializer):
		doctor = serializer.save()
		write_admin_audit(
			request=self.request,
			action='doctor_created',
			resource_type='doctor',
			resource_id=doctor.id,
			new_data={
				'user_id': str(doctor.user_id),
				'specialty': doctor.specialty,
			},
		)


class AdminDoctorDetailView(generics.RetrieveUpdateAPIView):
	serializer_class = AdminDoctorSerializer
	permission_classes = [IsSystemAdmin]
	queryset = (
		Doctor.objects
		.select_related('user')
		.prefetch_related('schedules')
	)
	lookup_field = 'pk'
	http_method_names = ['get', 'patch']
	parser_classes = [
		parsers.MultiPartParser,
		parsers.FormParser,
		parsers.JSONParser,
	]


class AdminDoctorScheduleListCreateView(
	generics.ListCreateAPIView
):
	serializer_class = AdminDoctorScheduleSerializer
	permission_classes = [IsSystemAdmin]

	def get_queryset(self):
		return DoctorSchedule.objects.filter(
			doctor_id=self.kwargs['doctor_id']
		)

	def perform_create(self, serializer):
		serializer.save(
			doctor_id=self.kwargs['doctor_id']
		)


class AdminDoctorScheduleDetailView(
	generics.RetrieveUpdateDestroyAPIView
):
	serializer_class = AdminDoctorScheduleSerializer
	permission_classes = [IsSystemAdmin]
	http_method_names = ['get', 'patch', 'delete']

	def get_queryset(self):
		return DoctorSchedule.objects.filter(
			doctor_id=self.kwargs['doctor_id']
		)

	def perform_destroy(self, instance):
		try:
			ensure_schedule_can_be_deleted(instance)
		except DjangoValidationError as exc:
			raise DRFValidationError(
				exc.message_dict if hasattr(exc, 'message_dict') else exc.messages
			)
		instance.delete()


class AdminMedicineListCreateView(generics.ListCreateAPIView):
	serializer_class = AdminMedicineSerializer
	permission_classes = [IsSystemAdmin]
	parser_classes = [
		parsers.MultiPartParser,
		parsers.FormParser,
		parsers.JSONParser,
	]

	def get_queryset(self):
		queryset = (
			Medicine.objects
			.select_related(
				'medicine_category',
				'medicine_manufacturer',
			)
			.order_by('-created_at')
		)
		search = self.request.query_params.get('search')
		active = self.request.query_params.get('active')
		low_stock = self.request.query_params.get('low_stock')

		if search:
			queryset = queryset.filter(
				Q(medicine_name__icontains=search)
				| Q(generic_name__icontains=search)
				| Q(active_ingredients__icontains=search)
			)

		if active in {'true', 'false'}:
			queryset = queryset.filter(
				medicine_is_active=(active == 'true')
			)

		if low_stock == 'true':
			queryset = queryset.filter(medicine_stock__lte=10)

		return queryset


class AdminMedicineDetailView(generics.RetrieveUpdateAPIView):
	serializer_class = AdminMedicineSerializer
	permission_classes = [IsSystemAdmin]
	queryset = Medicine.objects.select_related(
		'medicine_category',
		'medicine_manufacturer',
	)
	lookup_field = 'medicine_id'
	http_method_names = ['get', 'patch']
	parser_classes = [
		parsers.MultiPartParser,
		parsers.FormParser,
		parsers.JSONParser,
	]


class AdminMedicineCategoryListCreateView(
	generics.ListCreateAPIView
):
	serializer_class = AdminMedicineCategorySerializer
	permission_classes = [IsSystemAdmin]
	queryset = MedicineCategory.objects.all().order_by(
		'category_name'
	)


class AdminMedicineCategoryDetailView(
	generics.RetrieveUpdateDestroyAPIView
):
	serializer_class = AdminMedicineCategorySerializer
	permission_classes = [IsSystemAdmin]
	queryset = MedicineCategory.objects.all()
	lookup_field = 'category_id'


class AdminMedicineManufacturerListCreateView(
	generics.ListCreateAPIView
):
	serializer_class = AdminMedicineManufacturerSerializer
	permission_classes = [IsSystemAdmin]
	queryset = MedicineManufacturer.objects.all().order_by(
		'manufacturer_name'
	)


class AdminMedicineManufacturerDetailView(
	generics.RetrieveUpdateDestroyAPIView
):
	serializer_class = AdminMedicineManufacturerSerializer
	permission_classes = [IsSystemAdmin]
	queryset = MedicineManufacturer.objects.all()
	lookup_field = 'manufacturer_id'


class AdminAppointmentListView(generics.ListAPIView):
	serializer_class = AdminAppointmentSerializer
	permission_classes = [IsSystemAdmin]

	def get_queryset(self):
		queryset = (
			Appointment.objects
			.select_related(
				'patient', 'doctor', 'doctor__user'
			)
			.order_by('-appointment_date', '-start_time')
		)

		appointment_status = self.request.query_params.get('status')
		search = self.request.query_params.get('search')
		from_date = self.request.query_params.get('from_date')
		to_date = self.request.query_params.get('to_date')

		if appointment_status:
			queryset = queryset.filter(status=appointment_status)

		if search:
			queryset = queryset.filter(
				Q(patient__full_name__icontains=search)
				| Q(doctor__user__full_name__icontains=search)
			)

		if from_date:
			queryset = queryset.filter(
				appointment_date__gte=from_date
			)

		if to_date:
			queryset = queryset.filter(
				appointment_date__lte=to_date
			)

		return queryset


class AdminAppointmentDetailView(generics.RetrieveAPIView):
	serializer_class = AdminAppointmentSerializer
	permission_classes = [IsSystemAdmin]
	queryset = Appointment.objects.select_related(
		'patient', 'doctor', 'doctor__user'
	)
	lookup_field = 'appointment_id'


class AdminAppointmentCancelView(APIView):
	permission_classes = [IsSystemAdmin]

	@transaction.atomic
	def post(self, request, appointment_id):
		try:
			appointment = (
				Appointment.objects
				.select_for_update()
				.get(appointment_id=appointment_id)
			)
		except Appointment.DoesNotExist:
			return Response(
				{'detail': 'Appointment was not found.'},
				status=status.HTTP_404_NOT_FOUND,
			)

		if appointment.status not in [
			Appointment.Status.PENDING,
			Appointment.Status.CONFIRMED,
		]:
			return Response(
				{'detail': 'Only pending or confirmed appointments can be cancelled.'},
				status=status.HTTP_400_BAD_REQUEST,
			)

		previous = appointment.status
		appointment.status = Appointment.Status.CANCELLED
		appointment.save(update_fields=['status', 'updated_at'])

		write_admin_audit(
			request=request,
			action='appointment_cancelled',
			resource_type='appointment',
			resource_id=appointment.appointment_id,
			previous_data={'status': previous},
			new_data={'status': appointment.status},
		)

		return Response(AdminAppointmentSerializer(appointment).data)


class AdminPrescriptionListView(generics.ListAPIView):
	serializer_class = AdminPrescriptionSerializer
	permission_classes = [IsSystemAdmin]

	def get_queryset(self):
		queryset = (
			Prescription.objects
			.select_related(
				'appointment',
				'appointment__patient',
				'appointment__doctor',
				'appointment__doctor__user',
				'assigned_nurse',
			)
			.prefetch_related('items')
			.order_by('-created_at')
		)

		search = self.request.query_params.get('search')
		pharmacy_status = self.request.query_params.get(
			'pharmacy_status'
		)

		if search:
			queryset = queryset.filter(
				Q(appointment__patient__full_name__icontains=search)
				| Q(appointment__doctor__user__full_name__icontains=search)
				| Q(diagnosis__icontains=search)
			)

		if pharmacy_status:
			queryset = queryset.filter(
				pharmacy_status=pharmacy_status
			)

		return queryset


class AdminPrescriptionDetailView(generics.RetrieveAPIView):
	serializer_class = AdminPrescriptionSerializer
	permission_classes = [IsSystemAdmin]
	queryset = (
		Prescription.objects
		.select_related(
			'appointment',
			'appointment__patient',
			'appointment__doctor',
			'appointment__doctor__user',
			'assigned_nurse',
		)
		.prefetch_related('items')
	)
	lookup_field = 'pk'


class AdminVitalsDetailView(generics.RetrieveAPIView):
	serializer_class = AdminVitalsSerializer
	permission_classes = [IsSystemAdmin]
	queryset = AppointmentVitals.objects.select_related(
		'appointment'
	)
	lookup_field = 'appointment__appointment_id'
	lookup_url_kwarg = 'appointment_id'


class AdminOrderListView(generics.ListAPIView):
	serializer_class = AdminOrderSerializer
	permission_classes = [IsSystemAdmin]

	def get_queryset(self):
		queryset = (
			MedicineOrder.objects
			.select_related(
				'patient',
				'assigned_shipper',
				'source_address',
			)
			.prefetch_related('items', 'items__medicine')
			.order_by('-created_at')
		)

		order_status = self.request.query_params.get('status')
		search = self.request.query_params.get('search')

		if order_status:
			queryset = queryset.filter(status=order_status)

		if search:
			queryset = queryset.filter(
				Q(patient__full_name__icontains=search)
				| Q(delivery_recipient_name__icontains=search)
				| Q(delivery_phone__icontains=search)
				| Q(ghtk_order_id__icontains=search)
			)

		return queryset


class AdminOrderDetailView(generics.RetrieveAPIView):
	serializer_class = AdminOrderSerializer
	permission_classes = [IsSystemAdmin]
	queryset = (
		MedicineOrder.objects
		.select_related(
			'patient', 'assigned_shipper', 'source_address'
		)
		.prefetch_related('items', 'items__medicine')
	)
	lookup_field = 'medicine_order_id'


class AdminOrderCancelView(APIView):
	permission_classes = [IsSystemAdmin]

	@transaction.atomic
	def post(self, request, medicine_order_id):
		try:
			order = MedicineOrder.objects.select_for_update().get(
				medicine_order_id=medicine_order_id
			)
		except MedicineOrder.DoesNotExist:
			return Response(
				{'detail': 'Medicine order was not found.'},
				status=status.HTTP_404_NOT_FOUND,
			)

		if order.status not in [
			MedicineOrder.Status.PENDING,
			MedicineOrder.Status.CONFIRMED,
			MedicineOrder.Status.PREPARING,
		]:
			return Response(
				{'detail': 'This order can no longer be cancelled.'},
				status=status.HTTP_400_BAD_REQUEST,
			)

		previous = order.status
		order.status = MedicineOrder.Status.CANCELLED
		order.cancelled_at = timezone.now()
		order.save(
			update_fields=['status', 'cancelled_at', 'updated_at']
		)

		write_admin_audit(
			request=request,
			action='order_cancelled',
			resource_type='medicine_order',
			resource_id=order.medicine_order_id,
			previous_data={'status': previous},
			new_data={'status': order.status},
		)

		return Response(AdminOrderSerializer(order).data)


class AdminOrderReleaseShipperView(APIView):
	permission_classes = [IsSystemAdmin]

	@transaction.atomic
	def post(self, request, medicine_order_id):
		try:
			order = MedicineOrder.objects.select_for_update().get(
				medicine_order_id=medicine_order_id
			)
		except MedicineOrder.DoesNotExist:
			return Response(
				{'detail': 'Medicine order was not found.'},
				status=status.HTTP_404_NOT_FOUND,
			)

		if order.status != MedicineOrder.Status.READY_FOR_PICKUP:
			return Response(
				{'detail': 'Shipper can only be released before pickup.'},
				status=status.HTTP_400_BAD_REQUEST,
			)

		previous_shipper = order.assigned_shipper_id
		order.assigned_shipper = None
		order.shipper_assigned_at = None
		order.save(
			update_fields=[
				'assigned_shipper',
				'shipper_assigned_at',
				'updated_at',
			]
		)

		write_admin_audit(
			request=request,
			action='shipper_released',
			resource_type='medicine_order',
			resource_id=order.medicine_order_id,
			previous_data={
				'assigned_shipper_id': (
					str(previous_shipper)
					if previous_shipper else None
				)
			},
			new_data={'assigned_shipper_id': None},
		)

		return Response(AdminOrderSerializer(order).data)


class AdminOrderAssignShipperView(APIView):
	permission_classes = [IsSystemAdmin]

	@transaction.atomic
	def post(self, request, medicine_order_id):
		shipper_id = request.data.get('shipper_id')

		try:
			shipper = User.objects.get(
				user_id=shipper_id,
				role=User.Role.SHIPPER,
				is_active=True,
			)
		except User.DoesNotExist:
			return Response(
				{'detail': 'Active shipper was not found.'},
				status=status.HTTP_404_NOT_FOUND,
			)

		try:
			order = MedicineOrder.objects.select_for_update().get(
				medicine_order_id=medicine_order_id
			)
		except MedicineOrder.DoesNotExist:
			return Response(
				{'detail': 'Medicine order was not found.'},
				status=status.HTTP_404_NOT_FOUND,
			)

		if order.status != MedicineOrder.Status.READY_FOR_PICKUP:
			return Response(
				{'detail': 'Shipper can only be assigned before pickup.'},
				status=status.HTTP_400_BAD_REQUEST,
			)

		previous_shipper = order.assigned_shipper_id
		order.assigned_shipper = shipper
		order.shipper_assigned_at = timezone.now()
		order.save(
			update_fields=[
				'assigned_shipper',
				'shipper_assigned_at',
				'updated_at',
			]
		)

		write_admin_audit(
			request=request,
			action='shipper_assigned',
			resource_type='medicine_order',
			resource_id=order.medicine_order_id,
			previous_data={
				'assigned_shipper_id': (
					str(previous_shipper)
					if previous_shipper else None
				)
			},
			new_data={
				'assigned_shipper_id': str(shipper.user_id)
			},
		)

		return Response(AdminOrderSerializer(order).data)


class AdminPaymentListView(generics.ListAPIView):
	serializer_class = AdminPaymentSerializer
	permission_classes = [IsSystemAdmin]

	def get_queryset(self):
		queryset = Payment.objects.all().order_by('-created_at')
		payment_status = self.request.query_params.get('status')
		method = self.request.query_params.get('method')
		reference_type = self.request.query_params.get(
			'reference_type'
		)
		search = self.request.query_params.get('search')

		if payment_status:
			queryset = queryset.filter(status=payment_status)

		if method:
			queryset = queryset.filter(method=method)

		if reference_type:
			queryset = queryset.filter(
				reference_type=reference_type
			)

		if search:
			queryset = queryset.filter(
				Q(transaction_id__icontains=search)
				| Q(reference_id__icontains=search)
			)

		return queryset


class AdminPaymentDetailView(generics.RetrieveAPIView):
	serializer_class = AdminPaymentSerializer
	permission_classes = [IsSystemAdmin]
	queryset = Payment.objects.all()
	lookup_field = 'payment_id'


class AdminNotificationListView(generics.ListAPIView):
	serializer_class = AdminNotificationSerializer
	permission_classes = [IsSystemAdmin]

	def get_queryset(self):
		queryset = (
			Notification.objects
			.select_related('recipient', 'medicine_order')
			.order_by('-created_at')
		)

		delivery_status = self.request.query_params.get(
			'delivery_status'
		)
		channel = self.request.query_params.get('channel')
		search = self.request.query_params.get('search')

		if delivery_status:
			queryset = queryset.filter(
				delivery_status=delivery_status
			)

		if channel:
			queryset = queryset.filter(channel=channel)

		if search:
			queryset = queryset.filter(
				Q(recipient__full_name__icontains=search)
				| Q(recipient__email__icontains=search)
				| Q(title__icontains=search)
			)

		return queryset


class AdminNotificationRetryView(APIView):
	permission_classes = [IsSystemAdmin]

	def post(self, request, notification_id):
		try:
			notification = (
				Notification.objects
				.select_related('recipient', 'medicine_order')
				.get(notification_id=notification_id)
			)
		except Notification.DoesNotExist:
			return Response(
				{'detail': 'Notification was not found.'},
				status=status.HTTP_404_NOT_FOUND,
			)

		if notification.channel != Notification.Channel.PUSH:
			return Response(
				{'detail': 'Only push notifications can be retried.'},
				status=status.HTTP_400_BAD_REQUEST,
			)

		try:
			result = get_push_backend().send_to_user(
				user=notification.recipient,
				title=notification.title,
				message=notification.message,
				data={
					'event': notification.event,
					'medicine_order_id': (
						str(notification.medicine_order_id)
						if notification.medicine_order_id
						else ''
					),
					'url': (
						f'/orders/{notification.medicine_order_id}'
						if notification.medicine_order_id
						else '/notifications'
					),
				},
			)

			if result.success_count > 0:
				notification.delivery_status = (
					Notification.DeliveryStatus.SENT
				)
				notification.provider_message_id = (
					','.join(result.message_ids)[:255]
				)
				notification.error_message = ''
				notification.sent_at = timezone.now()
			else:
				notification.delivery_status = (
					Notification.DeliveryStatus.FAILED
				)
				notification.error_message = (
					'; '.join(result.errors)
					or 'No active Firebase device.'
				)
		except Exception as exc:
			notification.delivery_status = (
				Notification.DeliveryStatus.FAILED
			)
			notification.error_message = str(exc)

		notification.save(
			update_fields=[
				'delivery_status',
				'provider_message_id',
				'error_message',
				'sent_at',
			]
		)

		return Response(AdminNotificationSerializer(notification).data)


class AdminAuditLogListView(generics.ListAPIView):
	serializer_class = AdminAuditLogSerializer
	permission_classes = [IsSystemAdmin]
	queryset = AdminAuditLog.objects.select_related('admin').all()
