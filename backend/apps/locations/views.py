from rest_framework import generics
from rest_framework.permissions import AllowAny
from .models import Province, Ward
from .serializers import ProvinceSerializer, WardSerializer
from drf_spectacular.utils import extend_schema, OpenApiParameter

class ProvinceListView(generics.ListAPIView):
	serializer_class = ProvinceSerializer
	permission_classes = [AllowAny]
	queryset = Province.objects.all().order_by('name')
	pagination_class = None

class WardListView(generics.ListAPIView):
	serializer_class = WardSerializer
	permission_classes = [AllowAny]
	pagination_class = None

	@extend_schema(
		parameters=[
			OpenApiParameter(
				name='province',
				type=str,
				location=OpenApiParameter.QUERY,
				description='Province code to filter wards by (e.g. "01")',
				required=False,
			)
		]
	)
	def get(self, request, *args, **kwargs):
		return super().get(request, *args, **kwargs)

	def get_queryset(self):
		province_code = self.request.query_params.get('province')
		if province_code:
			return Ward.objects.filter(province__code=province_code).order_by('name')
		return Ward.objects.none()