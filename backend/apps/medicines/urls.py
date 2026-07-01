from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    MedicineViewSet,
    MedicineCategoryViewSet,
    MedicineManufacturerViewSet,
)

router = DefaultRouter()

router.register(r'medicines', MedicineViewSet, basename='medicine')
router.register(r'medicine-categories', MedicineCategoryViewSet, basename='medicine-category')
router.register(r'medicine-manufacturers', MedicineManufacturerViewSet, basename='medicine-manufacturer')

urlpatterns = [
    path('', include(router.urls)),
]