import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock,
  DollarSign,
  Home,
  Hospital,
  Star,
  UserRound,
} from 'lucide-react'

import SlotPicker from '../../components/ui/SlotPicker'
import { getAvailableSlots, getDoctorBySlug } from '../../services/doctorService'
import { useAuth } from '../../context/AuthContext'
import styles from './DoctorDetail.module.css'

const dayNames = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
]

function formatPrice(value) {
  return Number(value || 0).toLocaleString('vi-VN')
}

function formatTime(time) {
  if (!time) return ''
  return time.slice(0, 5)
}

function getVisitTypeLabel(value) {
  if (value === 'home_visit') return 'Home visit'
  return 'Clinic'
}

export default function DoctorDetail() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuth()

  const [doctor, setDoctor] = useState(null)

  const [visitType, setVisitType] = useState('clinic')
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedSlot, setSelectedSlot] = useState('')
  const [slots, setSlots] = useState([])

  const [loading, setLoading] = useState(true)
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [error, setError] = useState('')
  const [slotError, setSlotError] = useState('')

  useEffect(() => {
    async function fetchDoctor() {
      try {
        setLoading(true)
        setError('')

        const data = await getDoctorBySlug(slug)
        setDoctor(data)

        if (
          data.available_visit_types?.includes('clinic')
        ) {
          setVisitType('clinic')
        } else if (
          data.available_visit_types?.includes('home_visit')
        ) {
          setVisitType('home_visit')
        }
      } catch (err) {
        console.error(err)
        setError('Could not load doctor detail.')
      } finally {
        setLoading(false)
      }
    }

    fetchDoctor()
  }, [slug])

  const supportsClinic = doctor?.available_visit_types?.includes('clinic')
  const supportsHomeVisit = doctor?.available_visit_types?.includes('home_visit')

  const groupedSchedules = useMemo(() => {
    if (!doctor?.schedules) return []

    return doctor.schedules
  }, [doctor])

  async function loadSlots(date, selectedVisitType) {
    setSelectedSlot('')
    setSlots([])
    setSlotError('')

    if (!doctor?.id || !date || !selectedVisitType) return

    try {
      setLoadingSlots(true)
      const data = await getAvailableSlots(doctor.id, date, selectedVisitType)
      setSlots(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error(err)
      setSlotError('Could not load available slots.')
    } finally {
      setLoadingSlots(false)
    }
  }

  async function handleDateChange(date) {
    setSelectedDate(date)
    await loadSlots(date, visitType)
  }

  async function handleVisitTypeChange(nextVisitType) {
    setVisitType(nextVisitType)
    setSelectedSlot('')
    setSlots([])
    setSlotError('')

    if (selectedDate) {
      await loadSlots(selectedDate, nextVisitType)
    }
  }

  function handleContinue() {
    if (!isAuthenticated) {
      navigate('/login', {
        state: { from: `/doctors/${slug}` },
      })
      return
    }

    if (user?.role !== 'patient') {
      setSlotError('Only patients can book appointments.')
      return
    }

    if (!visitType) {
      setSlotError('Please select visit type first.')
      return
    }

    if (!selectedDate || !selectedSlot) {
      setSlotError('Please select a date and time slot first.')
      return
    }

    navigate(`/booking/${doctor.slug}`, {
      state: {
        doctor,
        visitType,
        date: selectedDate,
        slot: selectedSlot,
      },
    })
  }

  if (loading) {
    return (
      <main className={styles.page}>
        <p className={styles.empty}>Loading doctor detail...</p>
      </main>
    )
  }

  if (error || !doctor) {
    return (
      <main className={styles.page}>
        <div className={styles.emptyBox}>
          <p>{error || 'Doctor not found.'}</p>
          <Link to="/doctors">Back to doctors</Link>
        </div>
      </main>
    )
  }

  return (
    <main className={styles.page}>
      <Link to="/doctors" className={styles.backLink}>
        <ArrowLeft size={18} />
        Back to doctors
      </Link>

      <section className={styles.layout}>
        <div className={styles.leftColumn}>
          <section className={styles.profileCard}>
            <div className={styles.avatar}>
              {doctor.full_name?.charAt(0) || 'D'}
            </div>

            <div className={styles.profileInfo}>
              <p className={styles.eyebrow}>Doctor profile</p>
              <h1>Dr. {doctor.full_name}</h1>

              <div className={styles.badges}>
                <span>{doctor.specialty}</span>

                {supportsClinic && (
                  <span className={styles.clinicBadge}>
                    <Hospital size={15} />
                    Clinic
                  </span>
                )}

                {supportsHomeVisit && (
                  <span className={styles.homeVisitBadge}>
                    <Home size={15} />
                    Home visit
                  </span>
                )}

                {doctor.is_available ? (
                  <span className={styles.available}>
                    <CheckCircle2 size={15} />
                    Available
                  </span>
                ) : (
                  <span className={styles.unavailable}>Unavailable</span>
                )}
              </div>

              <div className={styles.stats}>
                <div>
                  <Star size={18} />
                  <strong>{doctor.rating || '0.0'}</strong>
                  <span>Rating</span>
                </div>

                <div>
                  <UserRound size={18} />
                  <strong>{doctor.experience_years}</strong>
                  <span>Years</span>
                </div>

                <div>
                  <DollarSign size={18} />
                  <strong>{formatPrice(doctor.consultation_fee)}</strong>
                  <span>VND fee</span>
                </div>
              </div>
            </div>
          </section>

          <section className={styles.infoCard}>
            <h2>About doctor</h2>

            {doctor.bio ? (
              <div
                className={styles.bio}
                dangerouslySetInnerHTML={{ __html: doctor.bio }}
              />
            ) : (
              <p className={styles.muted}>No biography available.</p>
            )}
          </section>

          <section className={styles.infoCard}>
            <h2>Weekly schedule</h2>

            {groupedSchedules.length > 0 ? (
              <div className={styles.scheduleList}>
                {groupedSchedules.map(schedule => (
                  <div key={schedule.id} className={styles.scheduleItem}>
                    <div>
                      <CalendarDays size={18} />
                      <strong>
                        {schedule.day_of_week_display || dayNames[schedule.day_of_week]}
                      </strong>
                    </div>

                    <span>
                      <Clock size={16} />
                      {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}
                    </span>

                    <span>
                      {schedule.visit_type_display || getVisitTypeLabel(schedule.visit_type)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className={styles.muted}>No working schedule available.</p>
            )}
          </section>
        </div>

        <aside className={styles.rightColumn}>
          <section className={styles.visitTypeCard}>
            <h2>Visit type</h2>

            <div className={styles.visitTypeOptions}>
              <button
                type="button"
                className={`${styles.visitTypeButton} ${
                  visitType === 'clinic' ? styles.selectedVisitType : ''
                }`}
                disabled={!supportsClinic}
                onClick={() => handleVisitTypeChange('clinic')}
              >
                <Hospital size={18} />
                Clinic
              </button>

              <button
                type="button"
                className={`${styles.visitTypeButton} ${
                  visitType === 'home_visit' ? styles.selectedVisitType : ''
                }`}
                disabled={!supportsHomeVisit}
                onClick={() => handleVisitTypeChange('home_visit')}
              >
                <Home size={18} />
                Home visit
              </button>
            </div>

            <p className={styles.visitTypeHint}>
              Available time slots depend on the selected visit type.
            </p>
          </section>

          <SlotPicker
            schedules={doctor.schedules || []}
            visitType={visitType}
            selectedDate={selectedDate}
            selectedSlot={selectedSlot}
            slots={slots}
            loadingSlots={loadingSlots}
            onDateChange={handleDateChange}
            onSlotSelect={setSelectedSlot}
          />

          {slotError && (
            <p className={styles.errorText}>{slotError}</p>
          )}

          <button
            type="button"
            className={styles.continueButton}
            disabled={!doctor.is_available || !visitType || !selectedDate || !selectedSlot}
            onClick={handleContinue}
          >
            Continue to booking
          </button>

          {!doctor.is_available && (
            <p className={styles.warningText}>
              This doctor is currently not accepting appointments.
            </p>
          )}
        </aside>
      </section>
    </main>
  )
}