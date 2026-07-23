import { getMyAppointments } from './appointmentService'

function getTodayDateString() {
  return new Date().toISOString().split('T')[0]
}

function getDateAfterDays(days) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().split('T')[0]
}

function normalizeList(data) {
  return Array.isArray(data) ? data : data.results || []
}

export async function getTodayDoctorAppointments() {
  const today = getTodayDateString()
  const data = await getMyAppointments({ date: today })
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

  const completedToday = todayAppointments.filter(
    appointment => appointment.status === 'completed'
  ).length

  const activeToday = todayAppointments.filter(
    appointment =>
      appointment.status === 'confirmed' ||
      appointment.status === 'in_progress'
  ).length

  return {
    todayAppointments,
    upcomingAppointments,
    stats: {
      totalToday: todayAppointments.length,
      completedToday,
      activeToday,
      upcomingCount: upcomingAppointments.length,
    },
  }
}