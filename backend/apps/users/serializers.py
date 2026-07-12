from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.exceptions import AuthenticationFailed
from .models import User

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
				{'detail': 'Your account has been deactivated. Please contact customer service'}
			)


		# check password
		if not user.check_password(attrs['password']):
			raise auth_error

		return super().validate(attrs)


class RegisterSerializer(serializers.ModelSerializer):
	password = serializers.CharField(write_only=True, validators=[validate_password])
	password2 = serializers.CharField(write_only=True)

	class Meta:
		model = User
		fields = ('user_id', 'email', 'full_name', 'address', 'phone_number_1', 'phone_number_2', 'role', 'password', 'password2')


	def validate(self, attrs):
		if attrs['password'] != attrs['password2']:
			raise serializers.ValidationError({'password' : 'Passwords do not match'})
		if attrs.get('role') == User.Role.ADMIN:
			raise serializers.ValidationError({'role' : 'Cannot self-assign admin role'})
		return attrs

	def create(self, validated_data):
		validated_data.pop('password2')
		password = validated_data.pop('password')
		validated_data['role'] = 'patient'
		user = User(**validated_data)
		user.set_password(password)
		user.save()
		return user


class UserSerializer(serializers.ModelSerializer):
	class Meta:
		model = User
		fields = ('user_id', 'email', 'full_name', 'phone_number_1', 'phone_number_2', 'address', 'role', 'created_at')
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

