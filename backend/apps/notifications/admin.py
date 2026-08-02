from django.contrib import admin

from .models import FirebaseDevice, Notification


@admin.register(FirebaseDevice)
class FirebaseDeviceAdmin(admin.ModelAdmin):
    list_display = (
        'device_id',
        'user',
        'platform',
        'device_name',
        'is_active',
        'last_used_at',
    )

    list_filter = (
        'platform',
        'is_active',
    )

    search_fields = (
        'user__full_name',
        'user__email',
        'device_name',
        'registration_token',
    )

    readonly_fields = (
        'device_id',
        'created_at',
        'updated_at',
    )