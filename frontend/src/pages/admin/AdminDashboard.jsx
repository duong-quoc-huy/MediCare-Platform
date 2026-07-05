import DashboardPlaceholder from '../shared/DashboardPlaceholder'

export default function AdminDashboard() {
  return (
    <DashboardPlaceholder
      eyebrow="Admin portal"
      title="MediCare admin dashboard"
      subtitle="Monitor users, doctors, medicines, appointments, and platform activity."
      cards={[
        {
          icon: '👥',
          title: 'User management',
          text: 'View users, manage roles, and monitor account activity.',
        },
        {
          icon: '💊',
          title: 'Medicine management',
          text: 'Add, edit, deactivate medicines, and manage stock levels.',
        },
        {
          icon: '📊',
          title: 'Reports and analytics',
          text: 'View appointment volume, order statistics, and system performance.',
        },
      ]}
    />
  )
}