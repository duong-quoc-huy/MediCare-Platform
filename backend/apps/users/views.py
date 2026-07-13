from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from .serializers import RegisterSerializer, UserSerializer, ChangePasswordSerializer, UserAddressSerializer, VerifyOTPSerializer, ChangeEmailSerializer, VerifyEmailChangeSerializer, VerifyPasswordChangeSerializer
from .serializers import CustomTokenObtainPairSerializer
from .models import User, UserAddress
from .otp_service import send_otp, verify_otp

class RegisterView(generics.CreateAPIView):
	queryset = User.objects.all()
	serializer_class    = RegisterSerializer
	permission_classes  = [AllowAny]

	def create(self, request, *args, **kwargs):
		serializer = self.get_serializer(data=request.data)
		serializer.is_valid(raise_exception=True)
		user = serializer.save()
		return Response({
			'message': 'Account created successfully',
			'user': UserSerializer(user).data
		}, status=status.HTTP_201_CREATED)


class LoginView(TokenObtainPairView):
	serializer_class   = CustomTokenObtainPairSerializer
	permission_classes = [AllowAny]

	def post(self, request, *args, **kwargs):
		response = super().post(request, *args, **kwargs)
		if response.status_code == 200:
			# fetch user and attach profile to response
			user = User.objects.get(email=request.data.get('email'))
			response.data['user'] = UserSerializer(user).data
		return response


class LogoutView(APIView):
	permission_classes = [IsAuthenticated]

	def post(self, request):
		try:
			refresh_token = request.data['refresh']
			token = RefreshToken(refresh_token)
			token.blacklist()
			return Response({'message': 'Logged out successfully'}, status=status.HTTP_200_OK)
		except Exception:
			return Response({'error': 'Invalid token'}, status=status.HTTP_400_BAD_REQUEST)


class ProfileView(generics.RetrieveUpdateAPIView):
	serializer_class    = UserSerializer
	permission_classes  = [IsAuthenticated]

	def get_object(self):
		return self.request.user


class ChangePasswordView(generics.UpdateAPIView):
	serializer_class    = ChangePasswordSerializer
	permission_classes  = [IsAuthenticated]

	def post(self, request, *args, **kwargs):
		serializer = self.get_serializer(data=request.data, context={'request': request})
		serializer.is_valid(raise_exception=True)
		serializer.save()
		return Response({'message': 'Password changed successfully'})

class UserAddressListCreateView(generics.ListCreateAPIView):
	serializer_class = UserAddressSerializer
	permission_classes = [IsAuthenticated]
	lookup_field = 'user_address_id'

	def get_queryset(self):
		return UserAddress.objects.filter(user=self.request.user)

	def perform_create(self, serializer):
		serializer.save()

class UserAddressDetailView(generics.RetrieveUpdateDestroyAPIView):
	serializer_class = UserAddressSerializer
	permission_classes = [IsAuthenticated]
	lookup_field = 'user_address_id'

	def get_queryset(self):
		return UserAddress.objects.filter(user=self.request.user)

class VerifyOTPView(APIView):
	permission_classes = [AllowAny]

	def post(self, request):
		serializer = VerifyOTPSerializer(data=request.data)
		serializer.is_valid(raise_exception=True)

		email   = serializer.validated_data['email']
		code    = serializer.validated_data['code']
		purpose = serializer.validated_data['purpose']

		try:
			user = User.objects.get(email=email)
		except User.DoesNotExist:
			return Response(
				{'detail': 'No account found with this email.'},
				status=status.HTTP_404_NOT_FOUND
			)

		valid, result = verify_otp(user, code, purpose)

		if not valid:
			return Response(
				{'detail': result},
				status=status.HTTP_400_BAD_REQUEST
			)

		# Activate account on registration
		if purpose == 'register':
			user.email_verified = True
			user.save()

		return Response({'detail': 'Verified successfully.'})


class ChangeEmailView(APIView):
	permission_classes = [IsAuthenticated]

	def post(self, request):
		# Only patients can change email
		if request.user.role != 'patient':
			return Response(
				{'detail': 'Only patients can change their email.'},
				status=status.HTTP_403_FORBIDDEN
			)

		serializer = ChangeEmailSerializer(
			data=request.data,
			context={'request': request}  # needed for same-email check
		)
		serializer.is_valid(raise_exception=True)

		new_email = serializer.validated_data['new_email']

		# Mark email as unverified — new email not confirmed yet
		request.user.email_verified = False
		request.user.save()

		# Send OTP to new email
		send_otp(request.user, purpose='change_email', new_email=new_email)

		return Response({
			'detail': f'OTP sent to {new_email}. Please verify your new email.'
		})


class VerifyEmailChangeView(APIView):
	permission_classes = [IsAuthenticated]

	def post(self, request):
		serializer = VerifyEmailChangeSerializer(data=request.data)
		serializer.is_valid(raise_exception=True)

		code = serializer.validated_data['code']

		valid, result = verify_otp(request.user, code, purpose='change_email')

		if not valid:
			return Response(
				{'detail': result},
				status=status.HTTP_400_BAD_REQUEST
			)

		# Update email to new_email stored in OTP record
		otp = result
		request.user.email          = otp.new_email
		request.user.email_verified = True   # new email now verified
		request.user.save()

		return Response({'detail': 'Email updated successfully.'})


class RequestPasswordChangeOTPView(APIView):
	permission_classes = [IsAuthenticated]

	def post(self, request):
		send_otp(request.user, purpose='change_password')
		return Response({'detail': f'OTP sent to {request.user.email}.'})


class VerifyPasswordChangeView(APIView):
	permission_classes = [IsAuthenticated]

	def post(self, request):
		serializer = VerifyPasswordChangeSerializer(data=request.data)
		serializer.is_valid(raise_exception=True)

		code         = serializer.validated_data['code']
		new_password = serializer.validated_data['new_password']

		valid, result = verify_otp(request.user, code, purpose='change_password')

		if not valid:
			return Response(
				{'detail': result},
				status=status.HTTP_400_BAD_REQUEST
			)

		request.user.set_password(new_password)
		request.user.save()

		return Response({'detail': 'Password changed successfully.'})


class ResendOTPView(APIView):
	permission_classes = [AllowAny]

	def post(self, request):
		email   = request.data.get('email')
		purpose = request.data.get('purpose', 'register')

		try:
			user = User.objects.get(email=email)
		except User.DoesNotExist:
			return Response(
				{'detail': 'No account found with this email.'},
				status=status.HTTP_404_NOT_FOUND
			)

		# Don't resend if already active
		if purpose == 'register' and user.is_active:
			return Response(
				{'detail': 'Account is already verified.'},
				status=status.HTTP_400_BAD_REQUEST
			)

		send_otp(user, purpose=purpose)
		return Response({'detail': f'OTP resent to {email}.'})