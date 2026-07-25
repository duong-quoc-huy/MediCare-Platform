import { getMyAppointments } from './appointmentService'

function formatLocalDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function getTodayDateString() {
  return formatLocalDate(new Date())
}

function getDateAfterDays(days) {
  const date = new Date()
  date.setDate(date.getDate() + days)

  return formatLocalDate(date)
}

function normalizeList(data) {
  if (Array.isArray(data)) return data
  return data.results || []
}

export async function getTodayDoctorAppointments() {
  const today = getTodayDateString()

  const data = await getMyAppointments({
    date: today,
  })

  return normalizeList(data)
}

export async function getUpcomingDoctorAppointments() {
  const today = getTodayDateString()
  const nextWeek = getDateAfterDays(7)

  const data = await getMyAppointments({
    from_date: today,
    to_date: nextWeek,
  })

  return normalizeList(data)
}

export async function getDoctorDashboardData() {
  const [todayAppointments, upcomingAppointments] = await Promise.all([
    getTodayDoctorAppointments(),
    getUpcomingDoctorAppointments(),
  ])

  const stats = {
    totalToday: todayAppointments.length,
    completedToday: todayAppointments.filter(
      appointment => appointment.status === 'completed'
    ).length,
    activeToday: todayAppointments.filter(
      appointment =>
        appointment.status === 'confirmed' ||
        appointment.status === 'in_progress'
    ).length,
    upcomingCount: upcomingAppointments.filter(
      appointment => appointment.status !== 'cancelled'
    ).length,
  }

  return {
    todayAppointments,
    upcomingAppointments,
    stats,
  }
}