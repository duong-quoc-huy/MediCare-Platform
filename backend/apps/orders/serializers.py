from rest_framework import serializers
from .models import MedicineOrder, MedicineOrderItem
from apps.medicines.models import Medicine


class MedicineOrderItemSerializer(serializers.ModelSerializer):
	medicine_name = serializers.CharField(
		source='medicine.medicine_name',
		read_only=True
	)
	medicine_image = serializers.ImageField(
		source='medicine.medicine_image',
		read_only=True
	)
	sub_total = serializers.DecimalField(
		max_digits=10,
		decimal_places=2,
		read_only=True
	)

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
	patient_name = serializers.CharField(
		source='patient.full_name',
		read_only=True
	)
	item_count = serializers.SerializerMethodField()

	class Meta:
		model = MedicineOrder
		fields = [
			'medicine_order_id',
			'patient_name',
			'status',
			'total_amount',
			'delivery_address',
			'created_at',
			'item_count',
		]

	def get_item_count(self, obj):
		return obj.items.count()


class MedicineOrderDetailSerializer(serializers.ModelSerializer):
	patient_name = serializers.CharField(
		source='patient.full_name',
		read_only=True
	)
	patient_phone = serializers.CharField(
		source='patient.phone_number_1',
		read_only=True
	)
	items = MedicineOrderItemSerializer(many=True, read_only=True)

	class Meta:
		model = MedicineOrder
		fields = [
			'medicine_order_id',
			'patient_name',
			'patient_phone',
			'status',
			'total_amount',
			'delivery_address',
			'ghtk_order_id',
			'ghtk_tracking_url',
			'created_at',
			'items',
		]


class MedicineOrderCreateItemSerializer(serializers.Serializer):
	medicine = serializers.PrimaryKeyRelatedField(
		queryset=Medicine.objects.all()
	)
	quantity = serializers.IntegerField(min_value=1)


class MedicineOrderCreateSerializer(serializers.ModelSerializer):
	items = MedicineOrderCreateItemSerializer(many=True)

	class Meta:
		model = MedicineOrder
		fields = [
			'delivery_address',
			'items',
		]

	def validate_items(self, value):
		if not value:
			raise serializers.ValidationError('Order must contain at least one medicine.')

		for item in value:
			medicine = item['medicine']
			quantity = item['quantity']

			if quantity > medicine.medicine_stock:
				raise serializers.ValidationError(
					f'{medicine.medicine_name} only has {medicine.medicine_stock} items left.'
				)

		return value

	def create(self, validated_data):
		request = self.context['request']
		items_data = validated_data.pop('items')

		total_amount = 0

		order = MedicineOrder.objects.create(
			patient=request.user,
			total_amount=0,
			**validated_data
		)

		for item_data in items_data:
			medicine = item_data['medicine']
			quantity = item_data['quantity']
			unit_price = medicine.medicine_price

			MedicineOrderItem.objects.create(
				order=order,
				medicine=medicine,
				quantity=quantity,
				unit_price=unit_price,
			)

			total_amount += unit_price * quantity

			medicine.medicine_stock -= quantity
			medicine.save()

		order.total_amount = total_amount
		order.save()

		return order


class MedicineOrderStatusUpdateSerializer(serializers.ModelSerializer):
	class Meta:
		model = MedicineOrder
		fields = [
			'status',
		]

	def validate_status(self, value):
		current_status = self.instance.status

		allowed_transitions = {
			'pending': ['confirmed', 'cancelled'],
			'confirmed': ['dispatched', 'cancelled'],
			'dispatched': ['delivering', 'cancelled'],
			'delivering': ['delivered'],
			'delivered': [],
			'cancelled': [],
		}

		allowed = allowed_transitions.get(current_status, [])

		if value not in allowed:
			raise serializers.ValidationError(
				f'Cannot move from {current_status} to {value}.'
			)

		return value