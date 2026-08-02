import AdminResourceList from './AdminResourceList'
import {
  getAdminNotifications,
  retryAdminNotification,
} from '../../services/adminService'
import common from './adminCommon.module.css'

export default function AdminNotifications() {
  return (
    <AdminResourceList
      title="Notifications"
      subtitle="Inspect delivery results and retry failed push notifications."
      load={getAdminNotifications}
      filters={[
        {
          name: 'channel',
          allLabel: 'All channels',
          options: ['in_app', 'push', 'sms'].map(value => ({ value, label: value })),
        },
        {
          name: 'delivery_status',
          allLabel: 'All delivery states',
          options: ['pending', 'sent', 'failed'].map(value => ({ value, label: value })),
        },
      ]}
      renderCard={row => (
        <article className={common.card} key={row.notification_id}>
          <span className={common.badge}>{row.delivery_status}</span>
          <h2>{row.title}</h2>
          <p>{row.recipient_name} · {row.recipient_email}</p>
          <div className={common.meta}>
            <div><span>Channel</span><strong>{row.channel}</strong></div>
            <div><span>Event</span><strong>{row.event}</strong></div>
            <div><span>Error</span><strong>{row.error_message || 'None'}</strong></div>
          </div>
          {row.channel === 'push' && row.delivery_status === 'failed' && (
            <div className={common.actions}>
              <button className={common.primary} onClick={async () => {
                await retryAdminNotification(row.notification_id)
                window.location.reload()
              }}>Retry push</button>
            </div>
          )}
        </article>
      )}
    />
  )
}
