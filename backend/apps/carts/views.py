from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import PermissionDenied
from drf_spectacular.utils import extend_schema
from django.db.models import Prefetch
from .models import Cart, CartItem
from .serializers import (
	CartSerializer,
	CartItemAddSerializer,
	CartItemUpdateSerializer,
)


def get_or_create_user_cart(user):
	cart, created = Cart.objects.get_or_create(patient=user)
	return cart

def check_patient_user(user):
	if getattr(user, 'role', None) != 'patient':
		raise PermissionDenied('Only patient can use the cart')


def get_optimized_cart(cart_id):
	return (
		Cart.objects
		.prefetch_related(
			Prefetch(
				'items',
				queryset=CartItem.objects.select_related('medicine')
			)
		)
		.get(cart_id=cart_id)
	)


class CartDetailView(APIView):
	permission_classes = [permissions.IsAuthenticated]

	def get(self, request):
		check_patient_user(request.user)

		cart = get_or_create_user_cart(request.user)
		cart = get_optimized_cart(cart.cart_id)

		serializer = CartSerializer(
			cart,
			context={'request': request}
		)

		return Response(serializer.data)


class CartAddItemView(APIView):
	permission_classes = [permissions.IsAuthenticated]

	@extend_schema(
		request=CartItemAddSerializer,
		responses=CartSerializer
	)
	def post(self, request):
		check_patient_user(request.user)

		cart = get_or_create_user_cart(request.user)

		serializer = CartItemAddSerializer(data=request.data)
		serializer.is_valid(raise_exception=True)

		medicine = serializer.validated_data['medicine']
		quantity = serializer.validated_data['quantity']

		cart_item, created = CartItem.objects.get_or_create(
			cart=cart,
			medicine=medicine,
			defaults={'quantity': quantity}
		)

		if not created:
			new_quantity = cart_item.quantity + quantity

			if new_quantity > medicine.medicine_stock:
				return Response(
					{
						'quantity': f'Only {medicine.medicine_stock} items available.'
					},
					status=status.HTTP_400_BAD_REQUEST
				)

			cart_item.quantity = new_quantity
			cart_item.save(update_fields=['quantity'])

		optimized_cart = get_optimized_cart(cart.cart_id)

		cart_serializer = CartSerializer(
			optimized_cart,
			context={'request': request}
		)

		return Response(cart_serializer.data, status=status.HTTP_200_OK)


class CartItemUpdateView(generics.UpdateAPIView):
	serializer_class = CartItemUpdateSerializer
	permission_classes = [permissions.IsAuthenticated]
	lookup_field = 'cart_item_id'
	http_method_names = ['patch']

	def get_queryset(self):
		check_patient_user(self.request.user)
		return CartItem.objects.filter(cart__patient=self.request.user)


class CartItemRemoveView(generics.DestroyAPIView):
	permission_classes = [permissions.IsAuthenticated]
	lookup_field = 'cart_item_id'

	def get_queryset(self):
		check_patient_user(self.request.user)
		return CartItem.objects.filter(cart__patient=self.request.user)


class CartClearView(APIView):

	permission_classes = [permissions.IsAuthenticated]

	def delete(self, request):
		check_patient_user(request.user)
		cart = get_or_create_user_cart(request.user)
		cart.items.all().delete()

		return Response(
			{'detail': 'Cart cleared successfully.'},
			status=status.HTTP_200_OK
		)


class CartMergeView(APIView):
	permission_classes = [permissions.IsAuthenticated]

	@extend_schema(
		request={
			'application/json': {
				'type': 'object',
				'properties': {
					'items': {
						'type': 'array',
						'items': {
							'type': 'object',
							'properties': {
								'medicine': {
									'type': 'string',
									'format': 'uuid'
								},
								'quantity': {
									'type': 'integer'
								},
							},
							'required': ['medicine', 'quantity']
						}
					}
				},
				'required': ['items']
			}
		},
		responses=CartSerializer
	)
	def post(self, request):
		check_patient_user(request.user)

		cart = get_or_create_user_cart(request.user)

		items = request.data.get('items', [])

		if not isinstance(items, list):
			return Response(
				{'items': 'Items must be a list.'},
				status=status.HTTP_400_BAD_REQUEST
			)

		for item in items:
			serializer = CartItemAddSerializer(data=item)
			serializer.is_valid(raise_exception=True)

			medicine = serializer.validated_data['medicine']
			quantity = serializer.validated_data['quantity']

			cart_item, created = CartItem.objects.get_or_create(
				cart=cart,
				medicine=medicine,
				defaults={'quantity': quantity}
			)

			if not created:
				new_quantity = cart_item.quantity + quantity
				cart_item.quantity = min(new_quantity, medicine.medicine_stock)
				cart_item.save(update_fields=['quantity'])

		optimized_cart = get_optimized_cart(cart.cart_id)

		cart_serializer = CartSerializer(
			optimized_cart,
			context={'request': request}
		)

		return Response(cart_serializer.data)