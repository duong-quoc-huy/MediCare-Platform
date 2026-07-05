import DashboardPlaceholder from '../shared/DashboardPlaceholder'

export default function ShipperDashboard() {
  return (
    <DashboardPlaceholder
      eyebrow="Shipper portal"
      title="Delivery dashboard"
      subtitle="View assigned medicine delivery orders and update delivery progress."
      cards={[
        {
          icon: '🚚',
          title: 'Assigned deliveries',
          text: 'View medicine orders assigned to you for delivery.',
        },
        {
          icon: '📍',
          title: 'Delivery status',
          text: 'Update order progress such as picked up, delivering, or completed.',
        },
        {
          icon: '📦',
          title: 'Order details',
          text: 'Check recipient information, address, and delivery notes.',
        },
      ]}
    />
  )
}