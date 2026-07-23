from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, UserAddress, OTP


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display    = ( 'user_id','email', 'full_name', 'phone_number_1', 'phone_number_2',  'role', 'is_active', 'email_verified', 'created_at')
    list_filter     = ('role', 'is_active')
    search_fields   = ('email', 'full_name')
    ordering        = ('-created_at',)
    fieldsets       = (
        (None,          {'fields': ('email', 'password')}),
        ('Personal',    {'fields': ('full_name', 'phone_number_1', 'phone_number_2')}),
        ('Role',        {'fields': ('role',)}),
        ('Permissions', {'fields': ('is_active', 'email_verified', 'is_staff', 'is_superuser')}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'full_name', 'gender', 'date_of_birth',  'phone_number_1', 'phone_number_2', 'password1', 'password2',
                'national_id', 'health_insurance_card', 'profile_image', 
                'role'),
        }),
    )

@admin.register(OTP)
class OTPAdmin(admin.ModelAdmin):
    list_display = ('user', 'purpose', 'code', 'is_used', 'is_expired', 'created_at')
    list_filter  = ('purpose', 'is_used')