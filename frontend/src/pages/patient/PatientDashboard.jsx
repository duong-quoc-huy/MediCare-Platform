import DashboardPlaceholder from '../shared/DashboardPlaceholder'

export default function PatientDashboard() {
  return (
    <DashboardPlaceholder
      eyebrow="Patient portal"
      title="Welcome to your MediCare dashboard"
      subtitle="Manage your doctor appointments, medicine orders, cart, and health services from one place."
      cards={[
        {
          icon: '📅',
          title: 'My appointments',
          text: 'View upcoming doctor visits, appointment status, and booking history.',
        },
        {
          icon: '💊',
          title: 'Medicine orders',
          text: 'Track medicine purchases, delivery status, and previous orders.',
        },
        {
          icon: '🛒',
          title: 'Cart and checkout',
          text: 'Review selected medicines before placing an order.',
        },
      ]}
    />
  )
}