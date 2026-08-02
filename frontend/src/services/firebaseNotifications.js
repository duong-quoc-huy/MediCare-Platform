import { getToken } from 'firebase/messaging';

import api from '../api';
import {
  getFirebaseMessaging,
} from '../firebase';

const VAPID_KEY =
  import.meta.env.VITE_FIREBASE_VAPID_KEY;

export async function registerFirebaseDevice() {
  if (!('Notification' in window)) {
    throw new Error(
      'This browser does not support notifications.',
    );
  }

  if (!('serviceWorker' in navigator)) {
    throw new Error(
      'This browser does not support service workers.',
    );
  }

  if (!VAPID_KEY) {
    throw new Error(
      'VITE_FIREBASE_VAPID_KEY is missing.',
    );
  }

  const permission =
    await Notification.requestPermission();

  if (permission !== 'granted') {
    throw new Error(
      'Notification permission was not granted.',
    );
  }

  const serviceWorkerRegistration =
    await navigator.serviceWorker.register(
      '/firebase-messaging-sw.js',
    );

  const messaging =
    await getFirebaseMessaging();

  if (!messaging) {
    throw new Error(
      'Firebase Messaging is not supported.',
    );
  }

  const registrationToken = await getToken(
    messaging,
    {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration,
    },
  );

  if (!registrationToken) {
    throw new Error(
      'Firebase did not return a registration token.',
    );
  }

  const response = await api.post(
    '/api/notifications/devices/register/',
    {
      registration_token: registrationToken,
      platform: 'web',
      device_name: navigator.userAgent,
    },
  );

  localStorage.setItem(
    'firebase_registration_token',
    registrationToken,
  );

  return response.data;
}

export async function unregisterFirebaseDevice() {
  const registrationToken =
    localStorage.getItem(
      'firebase_registration_token',
    );

  if (!registrationToken) {
    return;
  }

  await api.post(
    '/api/notifications/devices/unregister/',
    {
      registration_token: registrationToken,
    },
  );

  localStorage.removeItem(
    'firebase_registration_token',
  );
}