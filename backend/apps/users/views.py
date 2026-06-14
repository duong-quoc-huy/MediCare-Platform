from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from .serializers import RegisterSerializer, UserSerializer, ChangePasswordSerializer
from .models import User


class RegisterView(generics.CreateAPIView):
	queryset            = User.objects.all()
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
	permission_classes = [AllowAny]

	def post(self, request, *args, **kwargs):
		response = super().post(request, *args, **kwargs)
		if response.status_code == 200:
			# fetch user and attach profile to response
			from django.contrib.auth import authenticate
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

	def get_object(self):
		return self.request.user

	def update(self, request, *args, **kwargs):
		serializer = self.get_serializer(data=request.data, context={'request': request})
		serializer.is_valid(raise_exception=True)
		serializer.save()
		return Response({'message': 'Password changed successfully'})