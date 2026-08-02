from decimal import Decimal

from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from apps.medicines.models import Medicine
from apps.users.models import UserAddress

from .models import MedicineOrder, MedicineOrderItem
from .ghtk.client import GHTKClient
from .ghtk.exceptions import GHTKError
from .weight_service import calculate_package_weight

class MedicineOrderItemSerializer(serializers.ModelSerializer):
	medicine_name = serializers.CharField(source='medicine.medicine_name', read_only=True)
	medicine_image = serializers.ImageField(source='medicine.medicine_image', read_only=True)
	sub_total = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

	class Meta:
		model = MedicineOrderItem
		fields = [
			'medicine_order_item_id',
			'medicine',
			'medicine_name',
			'medicine_image',
			'quantity',
			'unit_price',
			'sub_total',
		]

		read_only_fields = [
			'medicine_order_item_id',
			'medicine_name',
			'medicine_image',
			'unit_price',
			'sub_total',
		]


class MedicineOrderListSerializer(serializers.ModelSerializer):
	patient_name = serializers.CharField(source='patient.full_name', read_only=True)

	item_count = serializers.SerializerMethodField()

	final_shipping_fee = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

	class Meta:
		model = MedicineOrder
		fields = [
			'medicine_order_id',
			'patient_name',
			'status',

			'medicine_subtotal',
			'shipping_fee',
			'shipping_discount',
			'final_shipping_fee',
			'total_amount',

			'delivery_recipient_name',
			'delivery_phone',
			'delivery_address',

			'ghtk_order_id',
			'ghtk_tracking_url',
			'ghtk_status',
			'ghtk_status_text',

			'created_at',
			'updated_at',
			'item_count',
		]

	def get_item_count(self, obj):
		prefetched_items = getattr(
			obj,
			'_prefetched_objects_cache',
			{},
		).get('items')

		if prefetched_items is not None:
			return len(prefetched_items)

		return obj.items.count()


class MedicineOrderDetailSerializer(serializers.ModelSerializer):
	patient_name = serializers.CharField(source='patient.full_name', read_only=True)
	patient_phone_1 = serializers.CharField(source='patient.phone_number_1', read_only=True)
	patient_phone_2 = serializers.CharField(source='patient.phone_number_2', read_only=True,allow_null=True)

	final_shipping_fee = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
	items = MedicineOrderItemSerializer(many=True, read_only=True)

	class Meta:
		model = MedicineOrder
		fields = [
			'medicine_order_id',

			'patient_name',
			'patient_phone_1',
			'patient_phone_2',

			'status',

			'medicine_subtotal',
			'shipping_fee',
			'shipping_discount',
			'final_shipping_fee',
			'total_amount',

			'delivery_recipient_name',
			'delivery_phone',
			'delivery_phone_2',
			'delivery_address',
			'delivery_street_address',
			'delivery_ward_code',
			'delivery_ward_name',
			'delivery_province_code',
			'delivery_province_name',
			'delivery_postal_code',
			'delivery_notes',

			'package_weight_grams',

			'ghtk_order_id',
			'ghtk_tracking_url',
			'ghtk_status',
			'ghtk_status_text',
			'ghtk_last_synced_at',

			'confirmed_at',
			'preparing_at',
			'ready_at',
			'pickup_at',
			'delivering_at',
			'delivered_at',
			'failed_at',
			'returning_at',
			'returned_at',
			'cancelled_at',

			'created_at',
			'updated_at',
			'items',
		]


class MedicineOrderCreateItemSerializer(serializers.Serializer):
	medicine = serializers.PrimaryKeyRelatedField(queryset=Medicine.objects.all(),)
	quantity = serializers.IntegerField(min_value=1,)


class MedicineOrderCreateSerializer(serializers.Serializer):
	user_address_id = serializers.UUIDField()

	delivery_notes = serializers.CharField(required=False, allow_blank=True, max_length=500)

	items = MedicineOrderCreateItemSerializer(many=True)

	def validate_user_address_id(self, value):
		request = self.context['request']

		try:
			address = UserAddress.objects.get(
				user_address_id=value,
				user=request.user,
			)
		except UserAddress.DoesNotExist:
			raise serializers.ValidationError(
				'The selected delivery address does not exist '
				'or does not belong to you.'
			)

		return address

	def validate_items(self, value):
		if not value:
			raise serializers.ValidationError(
				'Order must contain at least one medicine.'
			)

		medicine_ids = [
			item['medicine'].pk
			for item in value
		]

		if len(medicine_ids) != len(set(medicine_ids)):
			raise serializers.ValidationError(
				'The same medicine cannot appear more than once.'
			)

		for item in value:
			medicine = item['medicine']
			quantity = item['quantity']

			if quantity > medicine.medicine_stock:
				raise serializers.ValidationError(
					f'{medicine.medicine_name} only has '
					f'{medicine.medicine_stock} items left.'
				)

		return value

	def create(self, validated_data):
		request = self.context['request']
		user = request.user

		address = validated_data['user_address_id']
		items_data = validated_data['items']

		delivery_notes = validated_data.get('delivery_notes','',)
		package_weight_grams = calculate_package_weight(items_data)

		
		# Calculate medicine subtotal on the backend
		medicine_subtotal = Decimal('0.00')

		for item_data in items_data:
			medicine = item_data['medicine']
			quantity = item_data['quantity']

			medicine_subtotal += (
				medicine.medicine_price * quantity
			)

		
		# Calculate GHTK shipping fee on the backend
		ghtk_client = GHTKClient()

		try:
			fee_result = ghtk_client.calculate_fee(
				destination_address=address.street_address,
				destination_street=address.street_address,
				destination_ward=address.ward_name,
				destination_province=address.province_name,
				package_weight_grams=package_weight_grams,
				order_value=medicine_subtotal,
				transport='road',
			)
		except GHTKError as exc:
			raise serializers.ValidationError(
				{
					'shipping': str(exc),
				}
			) from exc

		# The current model does not have a separate
		# insurance_fee field, so shipping_fee stores the
		# complete shipping charge returned by GHTK.
		shipping_fee = fee_result.total_fee

		# Voucher support will be added afterward.
		shipping_discount = Decimal('0.00')

		final_shipping_fee = max(
			shipping_fee - shipping_discount,
			Decimal('0.00'),
		)

		total_amount = (
			medicine_subtotal +
			final_shipping_fee
		)

		# Lock medicines and create the order atomically
		with transaction.atomic():
			locked_medicines = {}

			for item_data in items_data:
				medicine_id = item_data['medicine'].pk

				medicine = (
					Medicine.objects
					.select_for_update()
					.get(pk=medicine_id)
				)

				quantity = item_data['quantity']

				if quantity > medicine.medicine_stock:
					raise serializers.ValidationError(
						{
							'items': (
								f'{medicine.medicine_name} only has '
								f'{medicine.medicine_stock} items left.'
							)
						}
					)

				locked_medicines[medicine_id] = medicine

			order = MedicineOrder.objects.create(
				patient=user,
				status=MedicineOrder.Status.PENDING,

				source_address=address,

				delivery_recipient_name=user.full_name,
				delivery_phone=user.phone_number_1,
				delivery_phone_2=(user.phone_number_2 or ''),

				delivery_address=address.full_address,
				delivery_street_address=(address.street_address),
				delivery_ward_code=address.ward_code,
				delivery_ward_name=address.ward_name,
				delivery_province_code=(address.province_code),
				delivery_province_name=(address.province_name),
				delivery_postal_code=(address.postal_code or ''),

				delivery_notes=delivery_notes,
				package_weight_grams=(package_weight_grams),

				medicine_subtotal=medicine_subtotal,
				shipping_fee=shipping_fee,
				shipping_discount=shipping_discount,
				total_amount=total_amount,
			)

			for item_data in items_data:
				medicine_id = item_data['medicine'].pk
				medicine = locked_medicines[medicine_id]
				quantity = item_data['quantity']

				MedicineOrderItem.objects.create(
					order=order,
					medicine=medicine,
					quantity=quantity,
					unit_price=medicine.medicine_price,
				)

		return order


class MedicineOrderAdminStatusUpdateSerializer(serializers.ModelSerializer):
	class Meta:
		model = MedicineOrder
		fields = [
			'status',
		]

	def validate_status(self, value):
		current_status = self.instance.status

		allowed_transitions = {
			MedicineOrder.Status.PENDING: [
				MedicineOrder.Status.CONFIRMED,
				MedicineOrder.Status.CANCELLED,
			],
			MedicineOrder.Status.CONFIRMED: [
				MedicineOrder.Status.CANCELLED,
			],
			MedicineOrder.Status.PREPARING: [
				MedicineOrder.Status.CANCELLED,
			],
			MedicineOrder.Status.READY_FOR_PICKUP: [],
			MedicineOrder.Status.DISPATCHED: [],
			MedicineOrder.Status.DELIVERING: [],
			MedicineOrder.Status.DELIVERED: [],
			MedicineOrder.Status.DELIVERY_FAILED: [],
			MedicineOrder.Status.RETURNING: [],
			MedicineOrder.Status.RETURNED: [],
			MedicineOrder.Status.CANCELLED: [],
		}

		allowed = allowed_transitions.get(
			current_status,
			[],
		)

		if value not in allowed:
			raise serializers.ValidationError(
				f'Cannot move from {current_status} '
				f'to {value}.'
			)

		return value

	def update(self, instance, validated_data):
		new_status = validated_data['status']
		current_time = timezone.now()

		instance.status = new_status

		update_fields = [
			'status',
			'updated_at',
		]

		if new_status == MedicineOrder.Status.CONFIRMED:
			instance.confirmed_at = current_time
			update_fields.append('confirmed_at')

		elif new_status == MedicineOrder.Status.CANCELLED:
			instance.cancelled_at = current_time
			update_fields.append('cancelled_at')

		instance.save(
			update_fields=update_fields,
		)

		return instance


class NurseMedicineOrderStatusSerializer(serializers.Serializer):
	status = serializers.ChoiceField(
		choices=[
			MedicineOrder.Status.PREPARING,
		]
	)

	def validate_status(self, value):
		order = self.instance

		if (order.status == MedicineOrder.Status.CONFIRMED and value == MedicineOrder.Status.PREPARING):
			return value

		raise serializers.ValidationError(
			f'Cannot move from {order.status} '
			f'to {value}.'
		)

	def update(self, instance, validated_data):
		instance.status = validated_data['status']
		instance.preparing_at = timezone.now()

		instance.save(
			update_fields=[
				'status',
				'preparing_at',
				'updated_at',
			]
		)

		return instance

class ShippingFeeRequestSerializer(serializers.Serializer):
	user_address_id = serializers.UUIDField()

	items = MedicineOrderCreateItemSerializer(many=True,)

	transport = serializers.ChoiceField(
		choices=[
			'road',
			'fly',
		],
		default='road',
	)

	def validate_user_address_id(self, value):
		request = self.context['request']

		try:
			return UserAddress.objects.get(
				user_address_id=value,
				user=request.user,
			)
		except UserAddress.DoesNotExist:
			raise serializers.ValidationError(
				'The selected address does not exist '
				'or does not belong to you.'
			)

	def validate_items(self, value):
		if not value:
			raise serializers.ValidationError(
				'At least one medicine is required.'
			)

		medicine_ids = [
			item['medicine'].pk
			for item in value
		]

		if len(medicine_ids) != len(set(medicine_ids)):
			raise serializers.ValidationError(
				'The same medicine cannot appear more than once.'
			)

		return value

	def calculate(self):
		address = self.validated_data['user_address_id']

		items_data = self.validated_data['items']

		medicine_subtotal = Decimal('0.00')

		for item_data in items_data:
			medicine = item_data['medicine']
			quantity = item_data['quantity']

			medicine_subtotal += (
				medicine.medicine_price * quantity
			)

		package_weight_grams = (
			calculate_package_weight(
				items_data
			)
		)

		client = GHTKClient()

		try:
			fee_result = client.calculate_fee(
				destination_address=(
					address.street_address
				),
				destination_street=(
					address.street_address
				),
				destination_ward=(
					address.ward_name
				),
				destination_province=(
					address.province_name
				),
				package_weight_grams=(
					package_weight_grams
				),
				order_value=medicine_subtotal,
				transport=self.validated_data[
					'transport'
				],
			)
		except GHTKError as exc:
			raise serializers.ValidationError(
				{
					'shipping': str(exc),
				}
			) from exc

		return {
			'fee_result': fee_result,
			'package_weight_grams': (
				package_weight_grams
			),
			'medicine_subtotal': (
				medicine_subtotal
			),
		}

class ShippingFeeResponseSerializer(serializers.Serializer):
	service_name = serializers.CharField()
	shipping_fee = serializers.DecimalField(max_digits=10,decimal_places=2,)
	insurance_fee = serializers.DecimalField(max_digits=10,decimal_places=2,)
	total_shipping_fee = serializers.DecimalField(max_digits=10,decimal_places=2,)
	delivery_supported = serializers.BooleanField()
	mock = serializers.BooleanField()

class CreateGHTKShipmentResponseSerializer(serializers.Serializer):
	medicine_order_id = serializers.UUIDField()
	status = serializers.CharField()
	ghtk_order_id = serializers.CharField()
	ghtk_tracking_url = serializers.CharField()
	ghtk_status = serializers.CharField()
	ghtk_status_text = serializers.CharField()
	ready_at = serializers.DateTimeField()
	mock = serializers.BooleanField()


class GHTKWebhookSerializer(serializers.Serializer):
	partner_id = serializers.UUIDField()
	label_id = serializers.CharField(max_length=100)
	status_id = serializers.IntegerField()
	action_time = serializers.DateTimeField(required=False, allow_null=True)
	reason_code = serializers.CharField(required=False, allow_blank=True,max_length=50)
	reason = serializers.CharField(required=False, allow_blank=True,max_length=500)
	weight = serializers.FloatField(required=False)
	fee = serializers.IntegerField(required=False)
	pick_money = serializers.IntegerField(required=False)
	return_part_package = serializers.IntegerField(required=False)


class MockGHTKStatusSerializer(serializers.Serializer):
	medicine_order_id = serializers.UUIDField()

	status_id = serializers.ChoiceField(
		choices=[
			-1,
			1,
			2,
			3,
			4,
			5,
			6,
			7,
			8,
			9,
			10,
			20,
			21,
		]
	)

	reason_code = serializers.CharField(required=False, allow_blank=True, max_length=50)

	reason = serializers.CharField(required=False, allow_blank=True, max_length=500)


class GHTKStatusUpdateResponseSerializer(serializers.Serializer):
	medicine_order_id = serializers.UUIDField()
	previous_status = serializers.CharField()
	status = serializers.CharField()
	ghtk_status = serializers.CharField()
	ghtk_status_text = serializers.CharField()
	changed = serializers.BooleanField()
	informational = serializers.BooleanField()