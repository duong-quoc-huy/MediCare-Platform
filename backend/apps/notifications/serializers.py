from rest_framework import serializers

from .models import FirebaseDevice, Notification


class FirebaseDeviceRegisterSerializer(
	serializers.Serializer
):
	registration_token = serializers.CharField()

	platform = serializers.ChoiceField(
		choices=FirebaseDevice.Platform.choices,
		default=FirebaseDevice.Platform.WEB,
	)

	device_name = serializers.CharField(
		required=False,
		allow_blank=True,
		max_length=150,
	)


class FirebaseDeviceSerializer(
	serializers.ModelSerializer
):
	class Meta:
		model = FirebaseDevice

		fields = [
			'device_id',
			'platform',
			'device_name',
			'is_active',
			'last_used_at',
			'created_at',
		]

		read_only_fields = fields


class NotificationSerializer(
	serializers.ModelSerializer
):
	medicine_order_id = serializers.UUIDField(
		source='medicine_order.medicine_order_id',
		read_only=True,
		allow_null=True,
	)

	event_display = serializers.CharField(
		source='get_event_display',
		read_only=True,
	)

	channel_display = serializers.CharField(
		source='get_channel_display',
		read_only=True,
	)

	delivery_status_display = serializers.CharField(
		source='get_delivery_status_display',
		read_only=True,
	)

	target_url = serializers.SerializerMethodField()

	class Meta:
		model = Notification

		fields = [
			'notification_id',
			'medicine_order_id',
			'event',
			'event_display',
			'channel',
			'channel_display',
			'title',
			'message',
			'delivery_status',
			'delivery_status_display',
			'is_read',
			'sent_at',
			'read_at',
			'created_at',
			'target_url',
		]

		read_only_fields = fields

	def get_target_url(self, obj):
		if obj.medicine_order_id:
			return (
				f'/orders/'
				f'{obj.medicine_order.medicine_order_id}'
			)

		return '/notifications'