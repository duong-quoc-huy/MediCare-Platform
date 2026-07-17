from django.contrib import admin
from .models import Medicine, MedicineCategory, MedicineManufacturer


@admin.register(MedicineCategory)
class MedicineCategoryAdmin(admin.ModelAdmin):
    list_display = ('category_name',)
    search_fields = ('category_name',)


@admin.register(MedicineManufacturer)
class MedicineManufacturerAdmin(admin.ModelAdmin):
    list_display = ('manufacturer_name',)
    search_fields = ('manufacturer_name',)


@admin.register(Medicine)
class MedicineAdmin(admin.ModelAdmin):
    list_display = (
        'medicine_name',
        'generic_name',
        'medicine_category',
        'medicine_manufacturer',
        'dosage',
        'unit_type',
        'package_size',
        'medicine_price',
        'medicine_stock',
        'medicine_requires_prescription',
        'medicine_is_active',
        'expiry_date',
    )

    list_filter = (
        'medicine_category',
        'medicine_manufacturer',
        'unit_type',
        'medicine_requires_prescription',
        'medicine_is_active',
    )

    search_fields = (
        'medicine_name',
        'generic_name',
        'dosage',
        'active_ingredients',
        'medicine_category__category_name',
        'medicine_manufacturer__manufacturer_name',
    )

    readonly_fields = ('created_at',)

    fieldsets = (
        (
            'Basic Information',
            {
                'fields': (
                    'medicine_name',
                    'generic_name',
                    'medicine_category',
                    'medicine_manufacturer',
                    'medicine_description',
                    'medicine_image',
                )
            },
        ),
        (
            'Medicine Details',
            {
                'fields': (
                    'dosage',
                    'unit_type',
                    'package_size',
                    'active_ingredients',
                    'expiry_date',
                )
            },
        ),
        (
            'Usage & Safety',
            {
                'fields': (
                    'usage_instructions',
                    'side_effects',
                    'storage_instructions',
                    'medicine_requires_prescription',
                )
            },
        ),
        (
            'Sales Information',
            {
                'fields': (
                    'medicine_price',
                    'medicine_stock',
                    'medicine_is_active',
                )
            },
        ),
        (
            'System Information',
            {
                'fields': (
                    'created_at',
                )
            },
        ),
    )