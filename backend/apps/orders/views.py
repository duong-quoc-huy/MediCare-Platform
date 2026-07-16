from rest_framework import generics, permissions, status
from rest_framework.response import Response

from .models import MedicineOrder
from .serializers import (
	MedicineOrderListSerializer,
	MedicineOrderDetailSerializer,
	MedicineOrderCreateSerializer,
	MedicineOrderStatusUpdateSerializer,
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
			.select_related('patient')
			.prefetch_related('items', 'items__medicine')
			.all()
			.order_by('-created_at')
		)

		if getattr(user, 'role', None) == 'admin' or user.is_staff:
			return queryset

		if getattr(user, 'role', None) == 'shipper':
			return queryset.filter(
				status__in=['confirmed', 'dispatched', 'delivering']
			)

		return queryset.filter(patient=user)

	def create(self, request, *args, **kwargs):
		create_serializer = self.get_serializer(data=request.data)
		create_serializer.is_valid(raise_exception=True)

		order = create_serializer.save()

		detail_serializer = MedicineOrderDetailSerializer(
			order,
			context={'request': request}
		)

		return Response(
			detail_serializer.data,
			status=status.HTTP_201_CREATED
		)


class MedicineOrderDetailView(generics.RetrieveAPIView):
	serializer_class = MedicineOrderDetailSerializer
	permission_classes = [permissions.IsAuthenticated]
	lookup_field = 'medicine_order_id'

	def get_queryset(self):
		user = self.request.user

		queryset = (
			MedicineOrder.objects
			.select_related('patient')
			.prefetch_related('items', 'items__medicine')
			.all()
		)

		if getattr(user, 'role', None) == 'admin' or user.is_staff:
			return queryset

		if getattr(user, 'role', None) == 'shipper':
			return queryset.filter(
				status__in=['confirmed', 'dispatched', 'delivering']
			)

		return queryset.filter(patient=user)


class MedicineOrderStatusUpdateView(generics.UpdateAPIView):
	serializer_class = MedicineOrderStatusUpdateSerializer
	permission_classes = [permissions.IsAuthenticated]
	lookup_field = 'medicine_order_id'
	http_method_names = ['patch']

	def get_queryset(self):
		user = self.request.user

		queryset = MedicineOrder.objects.select_related('patient').all()

		if getattr(user, 'role', None) == 'admin' or user.is_staff:
			return queryset

		if getattr(user, 'role', None) == 'shipper':
			return queryset.filter(
				status__in=['confirmed', 'dispatched', 'delivering']
			)

		return MedicineOrder.objects.none()


class MedicineOrderCancelView(generics.UpdateAPIView):
	serializer_class = MedicineOrderStatusUpdateSerializer
	permission_classes = [permissions.IsAuthenticated]
	lookup_field = 'medicine_order_id'
	http_method_names = ['patch']

	def get_queryset(self):
		user = self.request.user

		queryset = MedicineOrder.objects.select_related('patient').all()

		if getattr(user, 'role', None) == 'admin' or user.is_staff:
			return queryset

		return queryset.filter(patient=user)

	def patch(self, request, *args, **kwargs):
		order = self.get_object()

		if order.status not in ['pending', 'confirmed']:
			return Response(
				{
					'detail': 'Only pending or confirmed medicine orders can be cancelled.'
				},
				status=status.HTTP_400_BAD_REQUEST
			)

		serializer = self.get_serializer(
			order,
			data={'status': 'cancelled'},
			partial=True
		)
		serializer.is_valid(raise_exception=True)
		serializer.save()

		return Response(serializer.data)