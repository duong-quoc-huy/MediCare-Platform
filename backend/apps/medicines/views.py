from rest_framework import viewsets
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from .models import Medicine, MedicineCategory, MedicineManufacturer
from .serializers import (
	MedicineSerializer,
	MedicineCategorySerializer,
	MedicineManufacturerSerializer,
)
from rest_framework.permissions import AllowAny

class MedicineCategoryViewSet(viewsets.ModelViewSet):
	queryset = MedicineCategory.objects.all().order_by('category_name')
	serializer_class = MedicineCategorySerializer
	permission_classes = [AllowAny]

class MedicineManufacturerViewSet(viewsets.ModelViewSet):
	queryset = MedicineManufacturer.objects.all().order_by('manufacturer_name')
	serializer_class = MedicineManufacturerSerializer
	permission_classes = [AllowAny]

class MedicineViewSet(viewsets.ModelViewSet):
	queryset = (
		Medicine.objects
		.select_related('medicine_category', 'medicine_manufacturer')
		.all()
		.order_by('-created_at')
	)
	serializer_class = MedicineSerializer
	parser_classes = [MultiPartParser, FormParser, JSONParser]
	permission_classes = [AllowAny]
	
	def get_queryset(self):
		queryset = super().get_queryset()

		category_id = self.request.query_params.get('category')
		search = self.request.query_params.get('search')
		active = self.request.query_params.get('active')

		if category_id:
			queryset = queryset.filter(medicine_category_id=category_id)

		if search:
			queryset = queryset.filter(medicine_name__icontains=search)

		if active == 'true':
			queryset = queryset.filter(medicine_is_active=True)

		if active == 'false':
			queryset = queryset.filter(medicine_is_active=False)

		return queryset