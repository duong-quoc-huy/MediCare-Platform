from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
	RegisterView, LoginView, LogoutView,
	ProfileView, ChangePasswordView,
	UserAddressListCreateView, UserAddressDetailView,
	VerifyOTPView, ChangeEmailView, VerifyEmailChangeView,
	RequestPasswordChangeOTPView, VerifyPasswordChangeView,
	ResendOTPView,
)

urlpatterns = [
	path('auth/register/', RegisterView.as_view(), name='register'),
	path('auth/login/', LoginView.as_view(), name='login'),
	path('auth/logout/', LogoutView.as_view(), name='logout'),
	path('auth/token/refresh/', TokenRefreshView.as_view(), name='token_fresh'),
	path('auth/profile/', ProfileView.as_view(), name='profile'),
	path('auth/change-password/', ChangePasswordView.as_view(), name='change-password'),

	# otp api
	path('auth/verify-otp/', VerifyOTPView.as_view(), name='verify-otp'),
	path('auth/change-email/', ChangeEmailView.as_view(), name='change-email'),
	path('auth/verify-email-change/', VerifyEmailChangeView.as_view(), name='verify-email-change'),
	path('auth/request-password-otp/', RequestPasswordChangeOTPView.as_view(),name='request-password-otp'),
	path('auth/verify-password-change/', VerifyPasswordChangeView.as_view(), name='verify-password-change'),
	path('auth/resend-otp/', ResendOTPView.as_view(), name='resend-otp'),


	#address book 
	path('addresses/', UserAddressListCreateView.as_view(), name='address-list-create'),
	path('addresses/<uuid:user_address_id>/', UserAddressDetailView.as_view(), name='address-detail'),
]