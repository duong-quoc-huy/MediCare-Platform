from django.utils import timezone

from drf_spectacular.utils import extend_schema

from rest_framework import permissions, status
from rest_framework.generics import ListAPIView
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import FirebaseDevice, Notification

from .serializers import (
	FirebaseDeviceRegisterSerializer,
	FirebaseDeviceSerializer,
	NotificationSerializer,
)


class FirebaseDeviceRegisterView(APIView):
	permission_classes = [
		permissions.IsAuthenticated,
	]

	@extend_schema(
		request=FirebaseDeviceRegisterSerializer,
		responses={
			200: FirebaseDeviceSerializer,
			201: FirebaseDeviceSerializer,
		},
		tags=['Notifications'],
	)
	def post(self, request):
		serializer = FirebaseDeviceRegisterSerializer(
			data=request.data,
		)

		serializer.is_valid(
			raise_exception=True,
		)

		data = serializer.validated_data

		device, created = (
			FirebaseDevice.objects.update_or_create(
				registration_token=(
					data['registration_token']
				),
				defaults={
					'user': request.user,
					'platform': data['platform'],
					'device_name': data.get(
						'device_name',
						'',
					),
					'is_active': True,
					'last_used_at': timezone.now(),
				},
			)
		)

		return Response(
			FirebaseDeviceSerializer(device).data,
			status=(
				status.HTTP_201_CREATED
				if created
				else status.HTTP_200_OK
			),
		)


class FirebaseDeviceUnregisterView(APIView):
	permission_classes = [
		permissions.IsAuthenticated,
	]

	def post(self, request):
		registration_token = request.data.get(
			'registration_token',
			'',
		)

		if not registration_token:
			return Response(
				{
					'detail': (
						'registration_token is required.'
					)
				},
				status=status.HTTP_400_BAD_REQUEST,
			)

		updated = FirebaseDevice.objects.filter(
			user=request.user,
			registration_token=registration_token,
		).update(
			is_active=False,
			last_used_at=timezone.now(),
		)

		if not updated:
			return Response(
				{
					'detail': (
						'Firebase device was not found.'
					)
				},
				status=status.HTTP_404_NOT_FOUND,
			)

		return Response(
			{
				'detail': (
					'Firebase device was unregistered.'
				)
			},
			status=status.HTTP_200_OK,
		)


class NotificationListView(ListAPIView):
	permission_classes = [
		permissions.IsAuthenticated,
	]

	serializer_class = NotificationSerializer

	def get_queryset(self):
		queryset = (
			Notification.objects
			.filter(
				recipient=self.request.user,
				channel=Notification.Channel.IN_APP,
			)
			.select_related(
				'medicine_order',
			)
		)

		unread = (
			self.request.query_params
			.get('unread', '')
			.lower()
		)

		if unread in {
			'1',
			'true',
			'yes',
		}:
			queryset = queryset.filter(
				is_read=False,
			)

		return queryset


class NotificationUnreadCountView(APIView):
	permission_classes = [
		permissions.IsAuthenticated,
	]

	def get(self, request):
		unread_count = (
			Notification.objects.filter(
				recipient=request.user,
				channel=Notification.Channel.IN_APP,
				is_read=False,
			).count()
		)

		return Response(
			{
				'unread_count': unread_count,
			},
			status=status.HTTP_200_OK,
		)


class NotificationMarkReadView(APIView):
	permission_classes = [
		permissions.IsAuthenticated,
	]

	def patch(
		self,
		request,
		notification_id,
	):
		notification = (
			Notification.objects.filter(
				notification_id=notification_id,
				recipient=request.user,
				channel=Notification.Channel.IN_APP,
			)
			.select_related(
				'medicine_order',
			)
			.first()
		)

		if not notification:
			return Response(
				{
					'detail': (
						'Notification was not found.'
					)
				},
				status=status.HTTP_404_NOT_FOUND,
			)

		if not notification.is_read:
			notification.is_read = True
			notification.read_at = timezone.now()

			notification.save(
				update_fields=[
					'is_read',
					'read_at',
				]
			)

		return Response(
			NotificationSerializer(
				notification
			).data,
			status=status.HTTP_200_OK,
		)


class NotificationReadAllView(APIView):
	permission_classes = [
		permissions.IsAuthenticated,
	]

	def post(self, request):
		now = timezone.now()

		updated = (
			Notification.objects.filter(
				recipient=request.user,
				channel=Notification.Channel.IN_APP,
				is_read=False,
			).update(
				is_read=True,
				read_at=now,
			)
		)

		return Response(
			{
				'detail': (
					'All notifications were marked '
					'as read.'
				),
				'updated_count': updated,
			},
			status=status.HTTP_200_OK,
		)