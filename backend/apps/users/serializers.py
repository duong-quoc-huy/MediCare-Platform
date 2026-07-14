from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.exceptions import AuthenticationFailed
from .models import User, UserAddress
from .otp_service import send_otp


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
	def validate(self, attrs):
		auth_error = AuthenticationFailed(
			{'detail': 'Invalid Information. Please try again'}
		)

		# check email exist
		try:
			user = User.objects.get(email=attrs['email'])
		except User.DoesNotExist:
			raise auth_error

		# check active account
		if not user.is_active:	
			raise AuthenticationFailed(
				{'detail': 'Your account has been deactivated. Please contact customer service.',
				 'code': 'account_deactivated'}
			)

		if not user.email_verified:
			raise AuthenticationFailed({
				'detail': 'Please verify your email before logging in.',
				'code': 'email_not_verified'
			})

		# check password
		if not user.check_password(attrs['password']):
			raise auth_error

		return super().validate(attrs)


class RegisterSerializer(serializers.ModelSerializer):
	password  = serializers.CharField(write_only=True, validators=[validate_password])
	password2 = serializers.CharField(write_only=True)

	class Meta:
		model  = User
		fields = ('email', 'full_name', 'phone_number_1', 'phone_number_2', 'password', 'password2')

	def validate(self, attrs):
		if attrs['password'] != attrs['password2']:
			raise serializers.ValidationError({'password': 'Passwords do not match.'})
		return attrs

	def create(self, validated_data):
		validated_data.pop('password2')
		password = validated_data.pop('password')

		# Always patient, always inactive until OTP verified
		validated_data['role']      = 'patient'
		validated_data['is_active'] = True
		validated_data['email_verified'] = False

		user = User(**validated_data)
		user.set_password(password)
		user.save()

		# Send OTP
		send_otp(user, purpose='register')

		return user


class UserSerializer(serializers.ModelSerializer):
	class Meta:
		model = User
		fields = ('user_id', 'email', 'full_name', 'phone_number_1', 'phone_number_2', 'role', 'created_at')
		read_only_fields = ('user_id', 'email', 'role', 'created_at')


class ChangePasswordSerializer(serializers.Serializer):
	old_password = serializers.CharField(write_only=True)
	new_password = serializers.CharField(write_only=True, validators=[validate_password])

	def validate_old_password(self, value):
		user = self.context['request'].user
		if not user.check_password(value):
			raise serializers.ValidationError("Old password is incorrect")
		return value

	def save(self):
		user = self.context['request'].user
		user.set_password(self.validated_data['new_password'])
		user.save()
		return user

class UserAddressSerializer(serializers.ModelSerializer):
	class Meta:
		model = UserAddress
		fields = [
			'user_address_id',
			'label',
			'street_address',
			'ward_code',
			'ward_name',
			'province_code',
			'province_name',
			'postal_code',
			'is_default',
			'created_at'
		]
		read_only_fields = ['user_address_id', 'created_at']


	def create(self, validated_data):
		user = self.context['request'].user
		if validated_data.get('is_default'):
			# unset previous default
			UserAddress.objects.filter(user=user, is_default=True).update(is_default=False)
		validated_data['user'] = user
		return UserAddress.objects.create(**validated_data)

	def update(self, instance, validated_data):
		user = self.context['request'].user
		if validated_data.get('is_default'):
			UserAddress.objects.filter(user=user, is_default=True).exclude(pk=instance.pk).update(is_default=False)
		return super().update(instance, validated_data)


class VerifyOTPSerializer(serializers.Serializer):
	email = serializers.EmailField()
	code = serializers.CharField(max_length=6)
	purpose = serializers.ChoiceField(choices=['register', 'change_email', 'change_password'])


class ChangeEmailSerializer(serializers.Serializer):
	new_email = serializers.EmailField()

	def validate_new_email(self, value):
		user = self.context['request'].user

		if value == user.email:
			raise serializers.ValidationError('This is already your current email.')
			
		if User.objects.filter(email=value).exists():
			raise serializers.ValidationError('This email is already in use.')
		return value


class VerifyEmailChangeSerializer(serializers.Serializer):
	code = serializers.CharField(max_length=6)


class VerifyPasswordChangeSerializer(serializers.Serializer):
	code = serializers.CharField(max_length=6)
	new_password = serializers.CharField(write_only=True, validators=[validate_password])