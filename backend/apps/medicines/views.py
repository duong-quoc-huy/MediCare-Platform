from rest_framework import viewsets, generics, permissions, status
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from .models import Medicine, MedicineCategory, MedicineManufacturer, MedicineReview
from .serializers import (
	MedicineSerializer,
	MedicineCategorySerializer,
	MedicineManufacturerSerializer,
	MedicineReviewSerializer,
)
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.decorators import action
from drf_spectacular.utils import extend_schema
from django.db.models import Q
from .permissions import PublicReadAdminWrite

class MedicineCategoryViewSet(viewsets.ModelViewSet):
	queryset = MedicineCategory.objects.all().order_by('category_name')
	serializer_class = MedicineCategorySerializer
	permission_classes = [PublicReadAdminWrite]

class MedicineManufacturerViewSet(viewsets.ModelViewSet):
	queryset = MedicineManufacturer.objects.all().order_by('manufacturer_name')
	serializer_class = MedicineManufacturerSerializer
	permission_classes = [PublicReadAdminWrite]

class MedicineViewSet(viewsets.ModelViewSet):
	queryset = (
		Medicine.objects
		.select_related('medicine_category', 'medicine_manufacturer')
		.all()
		.order_by('-created_at')
	)
	serializer_class = MedicineSerializer
	parser_classes = [MultiPartParser, FormParser, JSONParser]
	permission_classes = [PublicReadAdminWrite]

	@extend_schema(
		request=MedicineReviewSerializer,
		responses=MedicineReviewSerializer,
	)
	@action(detail=True, methods=['get', 'post'], url_path='reviews')
	def reviews(self, request, pk=None):
		medicine = self.get_object()

		if request.method == 'GET':
			reviews = (
				medicine.reviews
				.select_related('user')
				.all()
				.order_by('-created_at')
			)

			serializer = MedicineReviewSerializer(reviews, many=True)
			return Response(serializer.data, status=status.HTTP_200_OK)

		if not request.user.is_authenticated:
			return Response(
				{'detail': 'Authentication is required to create a review.'},
				status=status.HTTP_401_UNAUTHORIZED
			)

		existing_review = MedicineReview.objects.filter(
			medicine=medicine,
			user=request.user
		).exists()

		if existing_review:
			return Response(
				{'detail': 'You have already reviewed this medicine.'},
				status=status.HTTP_400_BAD_REQUEST
			)

		serializer = MedicineReviewSerializer(data=request.data)

		serializer.is_valid(raise_exception=True)

		serializer.save(
			medicine=medicine,
			user=request.user
		)

		return Response(serializer.data, status=status.HTTP_201_CREATED)
	
	def get_queryset(self):
		queryset = (
			Medicine.objects
			.select_related('medicine_category', 'medicine_manufacturer')
			.all()
		)

		category_id = (
			self.request.query_params.get('medicine_category')
			or self.request.query_params.get('category')
		)

		search = self.request.query_params.get('search')
		active = self.request.query_params.get('active')
		ordering = self.request.query_params.get('ordering')

		if category_id and category_id != 'All':
			queryset = queryset.filter(medicine_category_id=category_id)

		if search:
			queryset = queryset.filter(
				Q(medicine_name__icontains=search)
				| Q(generic_name__icontains=search)
				| Q(medicine_description__icontains=search)
				| Q(active_ingredients__icontains=search)
				| Q(medicine_category__category_name__icontains=search)
				| Q(medicine_manufacturer__manufacturer_name__icontains=search)
			)

		if active == 'true':
			queryset = queryset.filter(medicine_is_active=True)

		if active == 'false':
			queryset = queryset.filter(medicine_is_active=False)

		allowed_ordering = {
			'medicine_price',
			'-medicine_price',
			'medicine_stock',
			'-medicine_stock',
			'created_at',
			'-created_at',
			'medicine_name',
			'-medicine_name',
		}

		if ordering in allowed_ordering:
			queryset = queryset.order_by(ordering)
		else:
			queryset = queryset.order_by('-created_at')

		return queryset

class MedicineReviewListCreateView(generics.ListCreateAPIView):
	serializer_class = MedicineReviewSerializer

	def get_permissions(self):
		if self.request.method == 'GET':
			return [permissions.AllowAny()]
		return [permissions.IsAuthenticated()]

	def get_queryset(self):
		medicine_id = self.kwargs.get('medicine_id')

		return (
			MedicineReview.objects
			.filter(medicine_id=medicine_id)
			.select_related('user', 'medicine')
			.order_by('-created_at')
		)

	def perform_create(self, serializer):
		medicine_id = self.kwargs.get('medicine_id')
		medicine = Medicine.objects.get(medicine_id=medicine_id)

		serializer.save(
			medicine=medicine,
			user=self.request.user
		)

class MedicineReviewDetailView(generics.RetrieveUpdateDestroyAPIView):
	serializer_class = MedicineReviewSerializer
	permission_classes = [permissions.IsAuthenticated]
	lookup_field = 'medicine_review_id'

	def get_queryset(self):
		return MedicineReview.objects.filter(user=self.request.user)