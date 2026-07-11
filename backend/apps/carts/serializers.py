from rest_framework import serializers
from .models import Cart, CartItem
from .models import Medicine


class CartItemSerializer(serializers.ModelSerializer):
	medicine_name = serializers.CharField(
		source='medicine.medicine_name',
		read_only=True
	)
	medicine_price = serializers.DecimalField(
		source='medicine.medicine_price',
		max_digits=10,
		decimal_places=2,
		read_only=True
	)
	medicine_image = serializers.ImageField(
		source='medicine.medicine_image',
		read_only=True
	)
	medicine_stock = serializers.IntegerField(
		source='medicine.medicine_stock',
		read_only=True
	)
	sub_total = serializers.DecimalField(
		max_digits=10,
		decimal_places=2,
		read_only=True
	)

	class Meta:
		model = CartItem
		fields = [
			'cart_item_id',
			'medicine',
			'medicine_name',
			'medicine_price',
			'medicine_image',
			'medicine_stock',
			'quantity',
			'sub_total',
		]


class CartSerializer(serializers.ModelSerializer):
	items = CartItemSerializer(many=True, read_only=True)
	total_amount = serializers.DecimalField(
		max_digits=10,
		decimal_places=2,
		read_only=True
	)
	total_items = serializers.IntegerField(read_only=True)

	class Meta:
		model = Cart
		fields = [
			'cart_id',
			'items',
			'total_amount',
			'total_items',
			'created_at',
			'updated_at',
		]


class CartItemAddSerializer(serializers.Serializer):
	medicine = serializers.PrimaryKeyRelatedField(
		queryset=Medicine.objects.all()
	)
	quantity = serializers.IntegerField(min_value=1, default=1)

	def validate(self, attrs):
		medicine = attrs['medicine']
		quantity = attrs['quantity']

		if quantity > medicine.medicine_stock:
			raise serializers.ValidationError({
				'quantity': f'Only {medicine.medicine_stock} items available.'
			})

		return attrs


class CartItemUpdateSerializer(serializers.ModelSerializer):
	class Meta:
		model = CartItem
		fields = ['quantity']

	def validate_quantity(self, value):
		if value < 1:
			raise serializers.ValidationError('Quantity must be at least 1.')

		if value > self.instance.medicine.medicine_stock:
			raise serializers.ValidationError(
				f'Only {self.instance.medicine.medicine_stock} items available.'
			)

		return value