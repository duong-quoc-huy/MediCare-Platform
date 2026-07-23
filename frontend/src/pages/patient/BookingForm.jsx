import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  CreditCard,
  Home,
  MapPin,
  Stethoscope,
} from 'lucide-react'

import { createAppointment } from '../../services/appointmentService'
import { getAddresses } from '../../services/addressService'
import styles from './BookingForm.module.css'

function formatPrice(value) {
  return Number(value || 0).toLocaleString('vi-VN')
}

function calculateEndTime(startTime, schedules, date, visitType) {
  if (!startTime || !date || !visitType) return ''

  const [year, month, day] = date.split('-').map(Number)
  const localDate = new Date(year, month - 1, day)

  const jsDay = localDate.getDay()
  const modelDay = jsDay === 0 ? 6 : jsDay - 1

  const schedule = schedules?.find(
    item =>
      Number(item.day_of_week) === modelDay &&
      item.visit_type === visitType
  )

  const duration = schedule?.slot_duration_minutes || 30

  const [hour, minute] = startTime.split(':').map(Number)
  const start = new Date()
  start.setHours(hour, minute, 0, 0)
  start.setMinutes(start.getMinutes() + duration)

  return start.toTimeString().slice(0, 5)
}


function formatAddress(address) {
  if (!address) return ''

  if (address.full_address) {
    return address.full_address
  }

  return [
    address.street_address,
    address.ward_name,
    address.province_name,
    address.postal_code,
  ]
    .filter(Boolean)
    .join(', ')
}

export default function BookingForm() {
  const { slug } = useParams()
  const location = useLocation()
  const navigate = useNavigate()

  const { doctor, visitType: initialVisitType, date, slot} = location.state || {}

  const [visitType, setVisitType] = useState(initialVisitType || 'clinic')
  const lockedVisitType = initialVisitType || 'clinic'

  const [addresses, setAddresses] = useState([])
  const [loadingAddresses, setLoadingAddresses] = useState(false)
  const [selectedAddressId, setSelectedAddressId] = useState('')
  const [manualAddress, setManualAddress] = useState('')
  const [useManualAddress, setUseManualAddress] = useState(false)

  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!doctor || !date || !slot) {
      navigate(`/doctors/${slug}`, { replace: true })
    }
  }, [doctor, date, slot, slug, navigate])

  useEffect(() => {
    async function fetchAddresses() {
      try {
        setLoadingAddresses(true)

        const data = await getAddresses()
        const list = Array.isArray(data) ? data : data.results || []

        setAddresses(list)

        if (list.length > 0) {
          const defaultAddress = list.find(item => item.is_default) || list[0]
          setSelectedAddressId(defaultAddress.user_address_id)
          setUseManualAddress(false)
        } else {
          setUseManualAddress(true)
        }
      } catch (err) {
        console.error(err)
        setUseManualAddress(true)
      } finally {
        setLoadingAddresses(false)
      }
    }

    if (visitType === 'home_visit') {
      fetchAddresses()
    }
  }, [visitType])

  const endTime = useMemo(() => {
    return calculateEndTime(slot, doctor?.schedules || [], date, visitType)
  }, [slot, doctor, date, visitType])

  const depositAmount = useMemo(() => {
    return Number(doctor?.consultation_fee || 0) * 0.5
  }, [doctor])

  function buildHomeVisitAddress() {
    if (visitType !== 'home_visit') {
      return ''
    }

    if (useManualAddress) {
      return manualAddress.trim()
    }

    const selectedAddress = addresses.find(
      item => String(item.user_address_id) === String(selectedAddressId)
    )

    return formatAddress(selectedAddress)
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (!doctor || !date || !slot) return

    const finalAddress = buildHomeVisitAddress()

    if (visitType === 'home_visit' && !finalAddress) {
      setError('Address is required for home visit appointment.')
      return
    }

    try {
      setSubmitting(true)
      setError('')

      const appointmentData = {
        doctor: doctor.id,
        appointment_date: date,
        start_time: slot,
        visit_type: visitType,
        address: finalAddress,
        notes: notes.trim(),
      }

      const appointment = await createAppointment(appointmentData)

      navigate(`/appointment-payment/${appointment.appointment_id}`, {
        state: {
          appointment,
          doctor,
        },
      })
    } catch (err) {
      console.error(err)

      const data = err.response?.data

      if (data?.start_time) {
        setError('This slot was just taken. Please choose another time.')
        return
      }

      if (data?.address) {
        setError(data.address)
        return
      }

      if (data?.doctor) {
        setError(data.doctor)
        return
      }

      if (data?.detail) {
        setError(data.detail)
        return
      }

      setError('Could not create appointment. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!doctor || !date || !slot) {
    return (
      <main className={styles.page}>
        <p className={styles.empty}>Redirecting back to doctor page...</p>
      </main>
    )
  }

  return (
    <main className={styles.page}>
      <Link to={`/doctors/${slug}`} className={styles.backLink}>
        <ArrowLeft size={18} />
        Back to doctor detail
      </Link>

      <section className={styles.header}>
        <p className={styles.eyebrow}>Appointment booking</p>
        <h1>Confirm your appointment</h1>
        <p>
          Choose your visit type and add any notes before paying the 50%
          appointment deposit.
        </p>
      </section>

      <section className={styles.layout}>
        <form className={styles.formCard} onSubmit={handleSubmit}>
          <div className={styles.sectionTitle}>
            <Stethoscope size={22} />
            <div>
              <h2>Visit type</h2>
              <p>Select how you want to meet the doctor.</p>
            </div>
          </div>

          <div className={styles.visitOptions}>
            <label
             className={`${styles.visitOption} ${
                visitType === 'clinic' ? styles.selectedOption : ''
              } ${lockedVisitType !== 'clinic' ? styles.disabledOption : ''}`}
            >
              <input
                type="radio"
                name="visit_type"
                value="clinic"
                checked={visitType === 'clinic'}
                disabled={lockedVisitType !== 'clinic'}
                onChange={event => {
                  if (lockedVisitType !== 'clinic') return
                  setVisitType(event.target.value)
                  setError('')
                }}
              />



              <div className={styles.optionIcon}>
                <Stethoscope size={22} />
              </div>

              <div>
                <strong>Clinic visit</strong>
                <span>You visit the doctor at the clinic.</span>
              </div>
            </label>

            <label
              className={`${styles.visitOption} ${
                visitType === 'home_visit' ? styles.selectedOption : ''
              } ${lockedVisitType !== 'home_visit' ? styles.disabledOption : ''}`}
            >
              <input
                type="radio"
                name="visit_type"
                value="home_visit"
                checked={visitType === 'home_visit'}
                disabled={lockedVisitType !== 'home_visit'}
                onChange={event => {
                  if (lockedVisitType !== 'home_visit') return
                  setVisitType(event.target.value)
                  setError('')
                }}
              />

              <div className={styles.optionIcon}>
                <Home size={22} />
              </div>

              <div>
                <strong>Home visit</strong>
                <span>The doctor comes to your address.</span>
              </div>
            </label>
          </div>

          <p className={styles.hint}>
              Visit type was selected from the doctor detail page. Go back to change it.
            </p>

          {visitType === 'home_visit' && (
            <div className={styles.fieldGroup}>
              <label>
                <MapPin size={18} />
                Home visit address
              </label>

              {loadingAddresses && (
                <p className={styles.hint}>Loading saved addresses...</p>
              )}

              {!loadingAddresses && addresses.length > 0 && (
                <div className={styles.addressList}>
                  {addresses.map(item => (
                    <label
                      key={item.user_address_id}
                      className={`${styles.addressOption} ${
                        selectedAddressId === item.user_address_id &&
                        !useManualAddress
                          ? styles.selectedAddress
                          : ''
                      }`}
                    >
                      <input
                        type="radio"
                        name="address"
                        checked={
                          selectedAddressId === item.user_address_id &&
                          !useManualAddress
                        }
                        onChange={() => {
                          setSelectedAddressId(item.user_address_id)
                          setUseManualAddress(false)
                          setError('')
                        }}
                      />

                      <div>
                        <strong>{item.label || 'Saved address'}</strong>
                        <span>{formatAddress(item)}</span>
                      </div>
                    </label>
                  ))}

                  <label
                    className={`${styles.addressOption} ${
                      useManualAddress ? styles.selectedAddress : ''
                    }`}
                  >
                    <input
                      type="radio"
                      name="address"
                      checked={useManualAddress}
                      onChange={() => {
                        setUseManualAddress(true)
                        setError('')
                      }}
                    />

                    <div>
                      <strong>Use different address</strong>
                      <span>Type a new address for this appointment.</span>
                    </div>
                  </label>
                </div>
              )}

              {(useManualAddress || addresses.length === 0) && (
                <>
                  <textarea
                    id="manual-address"
                    rows="4"
                    placeholder="Enter your full address..."
                    value={manualAddress}
                    onChange={event => {
                      setManualAddress(event.target.value)
                      setError('')
                    }}
                    maxLength={200}
                  />

                  <p className={styles.hint}>
                    Please include house number, street, ward, district, and
                    city.
                  </p>
                </>
              )}
            </div>
          )}

          <div className={styles.fieldGroup}>
            <label htmlFor="notes">Notes for doctor</label>

            <textarea
              id="notes"
              rows="5"
              placeholder="Describe your symptoms or special request..."
              value={notes}
              onChange={event => setNotes(event.target.value)}
              maxLength={255}
            />

            <p className={styles.hint}>{notes.length}/255 characters</p>
          </div>

          {error && <div className={styles.errorBox}>{error}</div>}

          <button
            type="submit"
            className={styles.submitButton}
            disabled={submitting}
          >
            {submitting ? 'Creating appointment...' : 'Confirm booking'}
          </button>
        </form>

        <aside className={styles.summaryCard}>
          <h2>Booking summary</h2>

          <div className={styles.doctorBox}>
            <div className={styles.avatar}>
              {doctor.full_name?.charAt(0) || 'D'}
            </div>

            <div>
              <strong>Dr. {doctor.full_name}</strong>
              <span>{doctor.specialty}</span>
            </div>
          </div>

          <div className={styles.summaryList}>
            <div>
              <span>
                <CalendarDays size={17} />
                Date
              </span>
              <strong>{date}</strong>
            </div>

            <div>
              <span>
                <Clock size={17} />
                Time
              </span>
              <strong>
                {slot} {endTime ? `- ${endTime}` : ''}
              </strong>
            </div>

            <div>
              <span>
                <Stethoscope size={17} />
                Visit type
              </span>
              <strong>
                {visitType === 'home_visit' ? 'Home visit' : 'Clinic visit'}
              </strong>
            </div>

            {visitType === 'home_visit' && (
              <div>
                <span>
                  <MapPin size={17} />
                  Address
                </span>
                <strong>{buildHomeVisitAddress() || 'Not selected'}</strong>
              </div>
            )}

            <div>
              <span>
                <CreditCard size={17} />
                Consultation fee
              </span>
              <strong>{formatPrice(doctor.consultation_fee)} VND</strong>
            </div>

            <div className={styles.depositRow}>
              <span>Deposit required</span>
              <strong>{formatPrice(depositAmount)} VND</strong>
            </div>

            <div>
              <span>Remaining later</span>
              <strong>
                {formatPrice(
                  Number(doctor.consultation_fee || 0) - depositAmount
                )}{' '}
                VND
              </strong>
            </div>
          </div>

          <p className={styles.summaryNote}>
            After confirming, you will pay a 50% deposit to secure this
            appointment.
          </p>
        </aside>
      </section>
    </main>
  )
}