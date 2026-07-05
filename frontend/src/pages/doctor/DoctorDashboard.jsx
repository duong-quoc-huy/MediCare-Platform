import DashboardPlaceholder from '../shared/DashboardPlaceholder'

export default function DoctorDashboard() {
  return (
    <DashboardPlaceholder
      eyebrow="Doctor portal"
      title="Doctor dashboard"
      subtitle="Manage your schedule, review appointments, and update patient visit status."
      cards={[
        {
          icon: '🩺',
          title: 'Today’s appointments',
          text: 'View patients scheduled for today and check appointment details.',
        },
        {
          icon: '🕐',
          title: 'My schedule',
          text: 'Manage weekly availability and home visit time slots.',
        },
        {
          icon: '📝',
          title: 'Visit notes',
          text: 'Add notes or update appointment progress after a consultation.',
        },
      ]}
    />
  )
}