from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from drf_spectacular.utils import extend_schema
from django.db import transaction
from django.utils import timezone
from rest_framework.permissions import AllowAny
from django.conf import settings

from .ghtk.client import GHTKClient
from .ghtk.exceptions import GHTKError
from .ghtk.payloads import build_ghtk_order_payload
from .ghtk.status_service import apply_ghtk_status_update


from .models import MedicineOrder
from .serializers import (
	CreateGHTKShipmentResponseSerializer,
	MedicineOrderAdminStatusUpdateSerializer,
	MedicineOrderCreateSerializer,
	MedicineOrderDetailSerializer,
	MedicineOrderListSerializer,
	NurseMedicineOrderStatusSerializer,
	ShippingFeeRequestSerializer,
	ShippingFeeResponseSerializer,
	GHTKStatusUpdateResponseSerializer,
	GHTKWebhookSerializer,
	MockGHTKStatusSerializer,
)
from apps.notifications.models import Notification
from apps.notifications.services import notify_order_event

def is_admin(user):
	return (getattr(user, 'role', None) == 'admin' or user.is_staff)


def is_nurse(user):
	return getattr(user, 'role', None) == 'nurse'

class ShippingFeeCalculateView(APIView):
	permission_classes = [permissions.IsAuthenticated]

	@extend_schema(
		request=ShippingFeeRequestSerializer,
		responses={
			200: {
				'type': 'object',
				'properties': {
					'service_name': {
						'type': 'string',
						'example': 'mock_local',
					},
					'shipping_fee': {
						'type': 'string',
						'example': '22000.00',
					},
					'insurance_fee': {
						'type': 'string',
						'example': '0.00',
					},
					'total_shipping_fee': {
						'type': 'string',
						'example': '22000.00',
					},
					'delivery_supported': {
						'type': 'boolean',
						'example': True,
					},
					'mock': {
						'type': 'boolean',
						'example': True,
					},
				},
			},
		},
		summary='Calculate medicine shipping fee',
		description=(
			'Calculate the GHTK shipping fee for a patient address. '
			'The authenticated user must own the selected address.'
		),
		tags=['Medicine Orders'],
	)
	
	def post(self, request):
		if (
			getattr(
				request.user,
				'role',
				None,
			)
			!= 'patient'
		):
			return Response(
				{
					'detail': (
						'Only patients can calculate '
						'shipping fees.'
					)
				},
				status=status.HTTP_403_FORBIDDEN,
			)

		serializer = ShippingFeeRequestSerializer(
			data=request.data,
			context={
				'request': request,
			},
		)

		serializer.is_valid(
			raise_exception=True,
		)

		calculation = serializer.calculate()

		fee_result = calculation[
			'fee_result'
		]

		return Response(
			{
				'service_name': (
					fee_result.service_name
				),

				'medicine_subtotal': str(
					calculation[
						'medicine_subtotal'
					]
				),

				'package_weight_grams': (
					calculation[
						'package_weight_grams'
					]
				),

				'shipping_fee': str(
					fee_result.shipping_fee
				),

				'insurance_fee': str(
					fee_result.insurance_fee
				),

				'total_shipping_fee': str(
					fee_result.total_fee
				),

				'delivery_supported': (
					fee_result.delivery_supported
				),

				'mock': (
					fee_result.raw_response.get(
						'mock',
						False,
					)
				),
			},
			status=status.HTTP_200_OK,
		)

class MedicineOrderListCreateView(generics.ListCreateAPIView):
	permission_classes = [permissions.IsAuthenticated]

	def get_serializer_class(self):
		if self.request.method == 'POST':
			return MedicineOrderCreateSerializer

		return MedicineOrderListSerializer

	def get_queryset(self):
		user = self.request.user

		queryset = (
			MedicineOrder.objects
			.select_related(
				'patient',
				'source_address',
			)
			.prefetch_related(
				'items',
				'items__medicine',
			)
			.all()
			.order_by('-created_at')
		)

		if is_admin(user):
			return queryset

		if is_nurse(user):
			return queryset.filter(
				status__in=[
					MedicineOrder.Status.CONFIRMED,
					MedicineOrder.Status.PREPARING,
					MedicineOrder.Status.READY_FOR_PICKUP,
				]
			)

		if getattr(user, 'role', None) == 'patient':
			return queryset.filter(patient=user)
		return queryset.none()

	def create(self, request, *args, **kwargs):
		if getattr(request.user, 'role', None) != 'patient':
			return Response(
				{
					'detail': (
						'Only patients can create '
						'medicine orders.'
					)
				},
				status=status.HTTP_403_FORBIDDEN,
			)

		create_serializer = self.get_serializer(data=request.data)
		create_serializer.is_valid(raise_exception=True)
		order = create_serializer.save()
		detail_serializer = (MedicineOrderDetailSerializer(order, context={'request': request}))
		return Response(detail_serializer.data, status=status.HTTP_201_CREATED)


class MedicineOrderDetailView(generics.RetrieveAPIView):
	serializer_class = MedicineOrderDetailSerializer
	permission_classes = [permissions.IsAuthenticated]

	lookup_field = 'medicine_order_id'

	def get_queryset(self):
		user = self.request.user

		queryset = (
			MedicineOrder.objects
			.select_related(
				'patient',
				'source_address',
			)
			.prefetch_related(
				'items',
				'items__medicine',
			)
			.all()
		)

		if is_admin(user):
			return queryset

		if is_nurse(user):
			return queryset.filter(
				status__in=[
					MedicineOrder.Status.CONFIRMED,
					MedicineOrder.Status.PREPARING,
					MedicineOrder.Status.READY_FOR_PICKUP,
				]
			)

		if getattr(user, 'role', None) == 'patient':
			return queryset.filter(
				patient=user,
			)

		return queryset.none()


class MedicineOrderStatusUpdateView(generics.UpdateAPIView):
	serializer_class = MedicineOrderAdminStatusUpdateSerializer
	permission_classes = [permissions.IsAuthenticated]

	lookup_field = 'medicine_order_id'
	http_method_names = ['patch']

	def get_queryset(self):
		user = self.request.user

		if not is_admin(user):
			return MedicineOrder.objects.none()

		return MedicineOrder.objects.all()


class NurseMedicineOrderStatusUpdateView(generics.UpdateAPIView):
	serializer_class = NurseMedicineOrderStatusSerializer

	permission_classes = [permissions.IsAuthenticated]

	lookup_field = 'medicine_order_id'
	http_method_names = ['patch']

	def get_queryset(self):
		user = self.request.user

		if not is_nurse(user):
			return MedicineOrder.objects.none()

		return MedicineOrder.objects.filter(
			status__in=[
				MedicineOrder.Status.CONFIRMED,
			]
		)

	def patch(self, request, *args, **kwargs):
		order = self.get_object()

		serializer = self.get_serializer(order, data=request.data, partial=True)

		serializer.is_valid(raise_exception=True)

		updated_order = serializer.save()

		if (updated_order.status == MedicineOrder.Status.PREPARING):
			transaction.on_commit(
				lambda order=updated_order:
				notify_order_event(
					order=order,
					event=(
						Notification.Event
						.ORDER_PREPARING
					),
				)
			)

		response_serializer = (
			MedicineOrderDetailSerializer(
				updated_order,
				context={
					'request': request,
				},
			)
		)

		return Response(
			response_serializer.data,
			status=status.HTTP_200_OK,
		)


class MedicineOrderCancelView(generics.UpdateAPIView):
	serializer_class = MedicineOrderAdminStatusUpdateSerializer

	permission_classes = [permissions.IsAuthenticated]
	

	lookup_field = 'medicine_order_id'
	http_method_names = ['patch']

	def get_queryset(self):
		user = self.request.user

		queryset = MedicineOrder.objects.all()

		if is_admin(user):
			return queryset

		if getattr(user, 'role', None) == 'patient':
			return queryset.filter(
				patient=user,
			)

		return queryset.none()

	def patch(self, request, *args, **kwargs):
		order = self.get_object()

		if order.status not in [
			MedicineOrder.Status.PENDING,
			MedicineOrder.Status.CONFIRMED,
		]:
			return Response(
				{
					'detail': (
						'Only pending or confirmed '
						'medicine orders can be cancelled.'
					)
				},
				status=status.HTTP_400_BAD_REQUEST,
			)

		serializer = self.get_serializer(
			order,
			data={
				'status': (
					MedicineOrder.Status.CANCELLED
				)
			},
			partial=True,
		)

		serializer.is_valid(
			raise_exception=True,
		)

		serializer.save()

		return Response(
			serializer.data,
			status=status.HTTP_200_OK,
		)

class CreateGHTKShipmentView(APIView):
	permission_classes = [
		permissions.IsAuthenticated,
	]

	@extend_schema(
		request=None,
		responses={
			200: CreateGHTKShipmentResponseSerializer,
		},
		summary='Create GHTK shipment',
		description=(
			'Create a GHTK shipment for a fully paid medicine '
			'order currently being prepared by the pharmacy.'
		),
		tags=['Medicine Orders'],
	)
	def post(
		self,
		request,
		medicine_order_id,
	):
		if not is_nurse(request.user):
			return Response(
				{
					'detail': (
						'Only nurses can create '
						'GHTK shipments.'
					)
				},
				status=status.HTTP_403_FORBIDDEN,
			)

		try:
			order = (
				MedicineOrder.objects
				.select_related(
					'patient',
					'source_address',
				)
				.prefetch_related(
					'items',
					'items__medicine',
				)
				.get(
					medicine_order_id=(
						medicine_order_id
					)
				)
			)
		except MedicineOrder.DoesNotExist:
			return Response(
				{
					'detail': (
						'Medicine order was not found.'
					)
				},
				status=status.HTTP_404_NOT_FOUND,
			)

		if (
			order.status
			!= MedicineOrder.Status.PREPARING
		):
			return Response(
				{
					'detail': (
						'Only orders currently being '
						'prepared can be submitted to GHTK.'
					),
					'current_status': order.status,
				},
				status=status.HTTP_400_BAD_REQUEST,
			)

		if order.ghtk_order_id:
			return Response(
				{
					'detail': (
						'A GHTK shipment has already '
						'been created for this order.'
					),
					'ghtk_order_id': (
						order.ghtk_order_id
					),
				},
				status=status.HTTP_400_BAD_REQUEST,
			)

		missing_fields = []

		required_order_fields = {
			'delivery_recipient_name': (
				order.delivery_recipient_name
			),
			'delivery_phone': (
				order.delivery_phone
			),
			'delivery_street_address': (
				order.delivery_street_address
			),
			'delivery_ward_name': (
				order.delivery_ward_name
			),
			'delivery_province_name': (
				order.delivery_province_name
			),
		}

		for field_name, field_value in (
			required_order_fields.items()
		):
			if not field_value:
				missing_fields.append(field_name)

		if missing_fields:
			return Response(
				{
					'detail': (
						'The order is missing required '
						'delivery information.'
					),
					'missing_fields': missing_fields,
				},
				status=status.HTTP_400_BAD_REQUEST,
			)

		try:
			payload = build_ghtk_order_payload(
				order
			)
		except ValueError as exc:
			return Response(
				{
					'detail': str(exc),
				},
				status=status.HTTP_400_BAD_REQUEST,
			)

		client = GHTKClient()

		try:
			shipment_result = (
				client.create_order(
					payload=payload,
				)
			)
		except GHTKError as exc:
			return Response(
				{
					'detail': str(exc),
				},
				status=status.HTTP_502_BAD_GATEWAY,
			)

		current_time = timezone.now()

		with transaction.atomic():
			locked_order = (
				MedicineOrder.objects
				.select_for_update()
				.get(
					medicine_order_id=(
						medicine_order_id
					)
				)
			)

			if (
				locked_order.status
				!= MedicineOrder.Status.PREPARING
			):
				return Response(
					{
						'detail': (
							'The order status changed '
							'while creating the shipment.'
						),
						'current_status': (
							locked_order.status
						),
					},
					status=(
						status.HTTP_409_CONFLICT
					),
				)

			if locked_order.ghtk_order_id:
				return Response(
					{
						'detail': (
							'A shipment was already '
							'created for this order.'
						),
						'ghtk_order_id': (
							locked_order
							.ghtk_order_id
						),
					},
					status=(
						status.HTTP_409_CONFLICT
					),
				)

			locked_order.status = (
				MedicineOrder.Status
				.READY_FOR_PICKUP
			)

			locked_order.ghtk_order_id = (
				shipment_result.tracking_id
			)

			locked_order.ghtk_tracking_url = (
				shipment_result.tracking_url
			)

			locked_order.ghtk_status = (
				shipment_result.status
			)

			locked_order.ghtk_status_text = (
				shipment_result.status_text
			)

			locked_order.ghtk_last_synced_at = (
				current_time
			)

			locked_order.ready_at = current_time

			locked_order.save(
				update_fields=[
					'status',
					'ghtk_order_id',
					'ghtk_tracking_url',
					'ghtk_status',
					'ghtk_status_text',
					'ghtk_last_synced_at',
					'ready_at',
					'updated_at',
				]
			)

		transaction.on_commit(
			lambda order=locked_order:
			notify_order_event(
				order=order,
				event=(
					Notification.Event
					.READY_FOR_PICKUP
				),
			)
		)

		return Response(
			{
				'medicine_order_id': (
					locked_order.medicine_order_id
				),
				'status': locked_order.status,
				'ghtk_order_id': (
					locked_order.ghtk_order_id
				),
				'ghtk_tracking_url': (
					locked_order
					.ghtk_tracking_url
				),
				'ghtk_status': (
					locked_order.ghtk_status
				),
				'ghtk_status_text': (
					locked_order
					.ghtk_status_text
				),
				'ready_at': (
					locked_order.ready_at
				),
				'mock': (
					shipment_result
					.raw_response
					.get('mock', False)
				),
			},
			status=status.HTTP_200_OK,
		)

class GHTKWebhookView(APIView):
	authentication_classes = []
	permission_classes = [AllowAny]

	@extend_schema(
		request=GHTKWebhookSerializer,
		responses={
			200: GHTKStatusUpdateResponseSerializer,
		},
		summary='Receive GHTK delivery status',
		description=(
			'Webhook used by GHTK to synchronize '
			'medicine-order delivery statuses.'
		),
		tags=['GHTK'],
	)
	def post(self, request):
		provided_secret = (
			request.query_params.get('secret', '')
		)

		expected_secret = (
			settings.GHTK_WEBHOOK_SECRET
		)

		if (
			not expected_secret
			or provided_secret != expected_secret
		):
			return Response(
				{
					'detail': (
						'Invalid GHTK webhook secret.'
					)
				},
				status=status.HTTP_403_FORBIDDEN,
			)

		serializer = GHTKWebhookSerializer(
			data=request.data,
		)

		serializer.is_valid(
			raise_exception=True,
		)

		data = serializer.validated_data

		try:
			order = MedicineOrder.objects.get(
				medicine_order_id=(
					data['partner_id']
				)
			)
		except MedicineOrder.DoesNotExist:
			return Response(
				{
					'detail': (
						'Medicine order was not found.'
					)
				},
				status=status.HTTP_404_NOT_FOUND,
			)

		if (
			order.ghtk_order_id
			and order.ghtk_order_id
			!= data['label_id']
		):
			return Response(
				{
					'detail': (
						'The GHTK label does not match '
						'this medicine order.'
					)
				},
				status=status.HTTP_409_CONFLICT,
			)

		try:
			result = apply_ghtk_status_update(
				order=order,
				status_id=data['status_id'],
				label_id=data['label_id'],
				action_time=data.get(
					'action_time'
				),
				reason_code=data.get(
					'reason_code',
					'',
				),
				reason=data.get(
					'reason',
					'',
				),
			)
		except ValueError as exc:
			return Response(
				{
					'detail': str(exc),
				},
				status=status.HTTP_400_BAD_REQUEST,
			)

		return Response(
			{
				'medicine_order_id': (
					result.order.medicine_order_id
				),
				'previous_status': (
					result.previous_status
				),
				'status': result.current_status,
				'ghtk_status': (
					result.order.ghtk_status
				),
				'ghtk_status_text': (
					result.order.ghtk_status_text
				),
				'changed': result.changed,
				'informational': (
					result.informational
				),
			},
			status=status.HTTP_200_OK,
		)

class MockGHTKStatusUpdateView(APIView):
	permission_classes = [
		permissions.IsAuthenticated,
	]

	@extend_schema(
		request=MockGHTKStatusSerializer,
		responses={
			200: GHTKStatusUpdateResponseSerializer,
		},
		summary='Simulate a GHTK status update',
		description=(
			'Development-only endpoint for simulating '
			'GHTK delivery events while mock mode is active.'
		),
		tags=['GHTK'],
	)
	def post(self, request):
		if not settings.GHTK_MOCK_MODE:
			return Response(
				{
					'detail': (
						'The mock GHTK endpoint is disabled.'
					)
				},
				status=status.HTTP_404_NOT_FOUND,
			)

		if not (
			is_nurse(request.user)
			or is_admin(request.user)
		):
			return Response(
				{
					'detail': (
						'Only nurses or administrators '
						'can simulate GHTK statuses.'
					)
				},
				status=status.HTTP_403_FORBIDDEN,
			)

		serializer = MockGHTKStatusSerializer(
			data=request.data,
		)

		serializer.is_valid(
			raise_exception=True,
		)

		data = serializer.validated_data

		try:
			order = MedicineOrder.objects.get(
				medicine_order_id=(
					data['medicine_order_id']
				)
			)
		except MedicineOrder.DoesNotExist:
			return Response(
				{
					'detail': (
						'Medicine order was not found.'
					)
				},
				status=status.HTTP_404_NOT_FOUND,
			)

		if not order.ghtk_order_id:
			return Response(
				{
					'detail': (
						'Create the GHTK shipment before '
						'simulating delivery statuses.'
					)
				},
				status=status.HTTP_400_BAD_REQUEST,
			)

		result = apply_ghtk_status_update(
			order=order,
			status_id=data['status_id'],
			label_id=order.ghtk_order_id,
			action_time=timezone.now(),
			reason_code=data.get(
				'reason_code',
				'',
			),
			reason=data.get(
				'reason',
				'',
			),
		)

		return Response(
			{
				'medicine_order_id': (
					result.order.medicine_order_id
				),
				'previous_status': (
					result.previous_status
				),
				'status': result.current_status,
				'ghtk_status': (
					result.order.ghtk_status
				),
				'ghtk_status_text': (
					result.order.ghtk_status_text
				),
				'changed': result.changed,
				'informational': (
					result.informational
				),
			},
			status=status.HTTP_200_OK,
		)