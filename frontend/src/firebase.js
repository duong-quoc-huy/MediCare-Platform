import {
  initializeApp,
} from 'firebase/app'

import {
  deleteToken,
  getMessaging,
  getToken,
  isSupported,
  onMessage,
} from 'firebase/messaging'

const firebaseConfig = {
  apiKey:
    import.meta.env.VITE_FIREBASE_API_KEY,

  authDomain:
    import.meta.env
      .VITE_FIREBASE_AUTH_DOMAIN,

  projectId:
    import.meta.env
      .VITE_FIREBASE_PROJECT_ID,

  storageBucket:
    import.meta.env
      .VITE_FIREBASE_STORAGE_BUCKET,

  messagingSenderId:
    import.meta.env
      .VITE_FIREBASE_MESSAGING_SENDER_ID,

  appId:
    import.meta.env
      .VITE_FIREBASE_APP_ID,
}

const firebaseApp =
  initializeApp(firebaseConfig)

let messagingInstance = null

export async function getFirebaseMessaging() {
  const supported = await isSupported()

  if (!supported) {
    return null
  }

  if (!messagingInstance) {
    messagingInstance =
      getMessaging(firebaseApp)
  }

  return messagingInstance
}

export async function getFirebaseRegistrationToken() {
  if (!('serviceWorker' in navigator)) {
    throw new Error(
      'Service workers are not supported by this browser.'
    )
  }

  const messaging =
    await getFirebaseMessaging()

  if (!messaging) {
    throw new Error(
      'Firebase messaging is not supported by this browser.'
    )
  }

  const vapidKey =
    import.meta.env.VITE_FIREBASE_VAPID_KEY

  if (!vapidKey) {
    throw new Error(
      'VITE_FIREBASE_VAPID_KEY is not configured.'
    )
  }

  await navigator.serviceWorker.register(
    '/firebase-messaging-sw.js',
    {
      scope: '/',
    }
  )

  // Wait until the service worker becomes active.
  const activeRegistration =
    await navigator.serviceWorker.ready

  if (!activeRegistration.active) {
    throw new Error(
      'The Firebase service worker did not become active.'
    )
  }

  const token = await getToken(
    messaging,
    {
      vapidKey,
      serviceWorkerRegistration:
        activeRegistration,
    }
  )

  if (!token) {
    throw new Error(
      'Firebase did not return a registration token.'
    )
  }

  return token
}

export async function removeFirebaseToken() {
  const messaging =
    await getFirebaseMessaging()

  if (!messaging) {
    return false
  }

  return deleteToken(messaging)
}

export async function listenForForegroundMessages(
  callback
) {
  const messaging =
    await getFirebaseMessaging()

  if (!messaging) {
    return () => {}
  }

  return onMessage(
    messaging,
    callback
  )
}