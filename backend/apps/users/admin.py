from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display    = ( 'user_id','email', 'full_name', 'phone_number_1', 'phone_number_2', 'address', 'role', 'is_active', 'created_at')
    list_filter     = ('role', 'is_active')
    search_fields   = ('email', 'full_name')
    ordering        = ('-created_at',)
    fieldsets       = (
        (None,          {'fields': ('email', 'password')}),
        ('Personal',    {'fields': ('full_name', 'phone_number_1', 'phone_number_2', 'address')}),
        ('Role',        {'fields': ('role',)}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser')}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'full_name', 'address', 'phone_number_1', 'phone_number_2', 'password1', 'password2', 'role'),
        }),
    )