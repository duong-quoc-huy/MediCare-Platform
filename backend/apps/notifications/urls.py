from django.urls import path

from .views import (
	FirebaseDeviceRegisterView,
	FirebaseDeviceUnregisterView,
	NotificationListView,
	NotificationMarkReadView,
	NotificationReadAllView,
	NotificationUnreadCountView,
)


urlpatterns = [
	path('', NotificationListView.as_view(), name='notification-list'),
	path('unread-count/', NotificationUnreadCountView.as_view(), name='notification-unread-count'),
	path('read-all/', NotificationReadAllView.as_view(), name='notification-read-all'),
	path('<uuid:notification_id>/read/', NotificationMarkReadView.as_view(), name='notification-mark-read'),
	path('devices/register/', FirebaseDeviceRegisterView.as_view(), name='firebase-device-register'),
	path('devices/unregister/', FirebaseDeviceUnregisterView.as_view(), name='firebase-device-unregister'),
]