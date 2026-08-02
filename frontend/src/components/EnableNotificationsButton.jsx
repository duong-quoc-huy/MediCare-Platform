import { useState } from 'react';

import {
  registerFirebaseDevice,
} from '../services/firebaseNotifications';

export default function EnableNotificationsButton() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleEnableNotifications = async () => {
    setLoading(true);
    setMessage('');

    try {
      await registerFirebaseDevice();

      setMessage(
        'Browser notifications have been enabled.',
      );
    } catch (error) {
      const detail =
        error.response?.data?.detail ||
        error.message ||
        'Could not enable notifications.';

      setMessage(detail);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={handleEnableNotifications}
        disabled={loading}
      >
        {loading
          ? 'Enabling notifications...'
          : 'Enable notifications'}
      </button>

      {message && (
        <p>{message}</p>
      )}
    </div>
  );
}