importScripts(
  'https://www.gstatic.com/firebasejs/12.17.0/firebase-app-compat.js'
)

importScripts(
  'https://www.gstatic.com/firebasejs/12.17.0/firebase-messaging-compat.js'
)

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim())
})

firebase.initializeApp({
  apiKey: 'VITE_FIREBASE_API_KEY',
  authDomain: 'VITE_FIREBASE_AUTH_DOMAIN',
  projectId: 'VITE_FIREBASE_PROJECT_ID',
  storageBucket: 'VITE_FIREBASE_STORAGE_BUCKET',
  messagingSenderId:
    'VITE_FIREBASE_MESSAGING_SENDER_ID',
  appId: 'VITE_FIREBASE_APP_ID',
})

const messaging = firebase.messaging()

messaging.onBackgroundMessage(payload => {
  console.log(
    'Firebase background message:',
    payload
  )

  // The Django backend now sends a data-only Firebase message.
  const title =
    payload.data?.title ||
    'MediCare notification'

  const body =
    payload.data?.body ||
    'You have a new MediCare update.'

  const targetUrl =
    payload.data?.url ||
    '/patient/medicine-orders'

  self.registration.showNotification(
    title,
    {
      body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      data: {
        url: targetUrl,
      },
    }
  )
})

self.addEventListener(
  'notificationclick',
  event => {
    event.notification.close()

    const targetUrl =
      event.notification.data?.url ||
      '/patient/medicine-orders'

    event.waitUntil(
      clients
        .matchAll({
          type: 'window',
          includeUncontrolled: true,
        })
        .then(async windowClients => {
          for (const client of windowClients) {
            if ('navigate' in client) {
              try {
                await client.navigate(targetUrl)
              } catch (error) {
                console.error(
                  'Could not navigate existing client:',
                  error
                )
              }
            }

            if ('focus' in client) {
              return client.focus()
            }
          }

          if (clients.openWindow) {
            return clients.openWindow(
              targetUrl
            )
          }

          return null
        })
    )
  }
)