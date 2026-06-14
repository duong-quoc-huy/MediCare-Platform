from django.contrib import admin
from .models import Medicine, MedicineCategory


@admin.register(MedicineCategory)
class MedicineCategoryAdmin(admin.ModelAdmin):
    list_display    = ('category_name',)
    search_fields   = ('category_name',)


@admin.register(Medicine)
class MedicineAdmin(admin.ModelAdmin):
    list_display    = ('medicine_name', 'medicine_category', 'medicine_manufacturer', 'medicine_description', 'medicine_price', 'medicine_stock', 'medicine_image', 'medicine_requires_prescription', 'medicine_is_active')
    list_filter     = ('medicine_category', 'medicine_requires_prescription', 'medicine_is_active')
    search_fields   = ('medicine_name',)