import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock,
  DollarSign,
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

export default function DoctorDetail() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuth()

  const [doctor, setDoctor] = useState(null)
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
      } catch (err) {
        console.error(err)
        setError('Could not load doctor detail.')
      } finally {
        setLoading(false)
      }
    }

    fetchDoctor()
  }, [slug])

  async function handleDateChange(date) {
    setSelectedDate(date)
    setSelectedSlot('')
    setSlots([])
    setSlotError('')

    if (!doctor?.id || !date) return

    try {
      setLoadingSlots(true)
      const data = await getAvailableSlots(doctor.id, date)
      setSlots(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error(err)
      setSlotError('Could not load available slots.')
    } finally {
      setLoadingSlots(false)
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

    if (!selectedDate || !selectedSlot) {
      setSlotError('Please select a date and time slot first.')
      return
    }

    navigate(`/booking/${doctor.slug}`, {
      state: {
        doctor,
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

            {doctor.schedules?.length > 0 ? (
              <div className={styles.scheduleList}>
                {doctor.schedules.map(schedule => (
                  <div key={schedule.id} className={styles.scheduleItem}>
                    <div>
                      <CalendarDays size={18} />
                      <strong>{dayNames[schedule.day_of_week]}</strong>
                    </div>

                    <span>
                      <Clock size={16} />
                      {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}
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
          <SlotPicker
            schedules={doctor.schedules || []}
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
            disabled={!doctor.is_available || !selectedDate || !selectedSlot}
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