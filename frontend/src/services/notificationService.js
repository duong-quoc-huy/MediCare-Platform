import api from './api'

export async function getNotifications(
  params = {}
) {
  const response = await api.get(
    '/api/notifications/',
    {
      params,
    }
  )

  return response.data
}

export async function getUnreadNotificationCount() {
  const response = await api.get(
    '/api/notifications/unread-count/'
  )

  return response.data
}

export async function markNotificationRead(
  notificationId
) {
  const response = await api.patch(
    `/api/notifications/${notificationId}/read/`
  )

  return response.data
}

export async function markAllNotificationsRead() {
  const response = await api.post(
    '/api/notifications/read-all/'
  )

  return response.data
}

export async function registerFirebaseDevice({
  registrationToken,
  platform = 'web',
  deviceName = '',
}) {
  const response = await api.post(
    '/api/notifications/devices/register/',
    {
      registration_token: registrationToken,
      platform,
      device_name: deviceName,
    }
  )

  return response.data
}

export async function unregisterFirebaseDevice(
  registrationToken
) {
  const response = await api.post(
    '/api/notifications/devices/unregister/',
    {
      registration_token: registrationToken,
    }
  )

  return response.data
}