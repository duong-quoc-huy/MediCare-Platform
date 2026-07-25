import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  Download,
  FileText,
  Pill,
  Stethoscope,
  UserRound,
} from 'lucide-react'

import {
  getAppointmentById,
  downloadAppointmentMedicalPdf,
} from '../../services/appointmentService'
import { getPatientPrescription } from '../../services/medicalRecordService'

import styles from './PatientPrescription.module.css'

function formatTime(time) {
  if (!time) return ''
  return time.slice(0, 5)
}

function formatVisitType(value) {
  if (value === 'home_visit') return 'Home visit'
  return 'Clinic visit'
}

export default function PatientPrescription() {
  const { id } = useParams()

  const [appointment, setAppointment] = useState(null)
  const [prescription, setPrescription] = useState(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        setError('')

        const appointmentData = await getAppointmentById(id)
        setAppointment(appointmentData)

        try {
          const prescriptionData = await getPatientPrescription(id)
          setPrescription(prescriptionData)
        } catch (prescriptionError) {
          if (prescriptionError.response?.status === 404) {
            setPrescription(null)
          } else {
            throw prescriptionError
          }
        }
      } catch (err) {
        console.error(err)
        setError(
          err.response?.data?.detail ||
            'Could not load prescription information.'
        )
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [id])

  async function handleDownloadPdf() {
    try {
      setDownloading(true)
      setError('')
      setSuccess('')

      await downloadAppointmentMedicalPdf(id)

      setSuccess('Medical record PDF downloaded successfully.')
    } catch (err) {
      console.error(err)
      setError(
        err.response?.data?.detail ||
          'Could not download medical record PDF.'
      )
    } finally {
      setDownloading(false)
    }
  }

  const canDownloadPdf =
    appointment?.status === 'completed' &&
    appointment?.medical_pdf_available === true

  if (loading) {
    return (
      <main className={styles.page}>
        <p className={styles.empty}>Loading prescription...</p>
      </main>
    )
  }

  if (error || !appointment) {
    return (
      <main className={styles.page}>
        <div className={styles.emptyBox}>
          <p>{error || 'Appointment not found.'}</p>
          <Link to="/patient/appointments">Back to my appointments</Link>
        </div>
      </main>
    )
  }

  return (
    <main className={styles.page}>
      <Link to="/patient/appointments" className={styles.backLink}>
        <ArrowLeft size={18} />
        Back to my appointments
      </Link>

      <section className={styles.hero}>
        <div className={styles.heroIcon}>
          <FileText size={44} />
        </div>

        <div>
          <p className={styles.eyebrow}>Medical record</p>
          <h1>Prescription details</h1>
          <p>
            View the prescription and medical record from your completed
            appointment.
          </p>
        </div>
      </section>

      {success && <div className={styles.successBox}>{success}</div>}
      {error && <div className={styles.errorBox}>{error}</div>}

      <section className={styles.layout}>
        <section className={styles.card}>
          <h2>Appointment information</h2>

          <div className={styles.infoGrid}>
            <div>
              <span>
                <UserRound size={17} />
                Doctor
              </span>
              <strong>Dr. {appointment.doctor_name}</strong>
            </div>

            <div>
              <span>
                <CalendarDays size={17} />
                Date
              </span>
              <strong>{appointment.appointment_date}</strong>
            </div>

            <div>
              <span>
                <Clock size={17} />
                Time
              </span>
              <strong>
                {formatTime(appointment.start_time)} - {formatTime(appointment.end_time)}
              </strong>
            </div>

            <div>
              <span>
                <Stethoscope size={17} />
                Visit type
              </span>
              <strong>{formatVisitType(appointment.visit_type)}</strong>
            </div>

            <div>
              <span>Status</span>
              <strong className={styles.statusBadge}>
                {appointment.status}
              </strong>
            </div>
          </div>
        </section>

        <section className={styles.card}>
          <div className={styles.sectionHeader}>
            <div>
              <h2>Prescription</h2>
              <p>Medicine prescribed by your doctor.</p>
            </div>

            <Pill size={24} />
          </div>

          {!prescription ? (
            <div className={styles.noticeBox}>
              No prescription has been published for this appointment yet.
            </div>
          ) : (
            <>
              {prescription.diagnosis && (
                <div className={styles.diagnosisBox}>
                  <span>Diagnosis</span>
                  <p>{prescription.diagnosis}</p>
                </div>
              )}

              {prescription.notes && (
                <div className={styles.diagnosisBox}>
                  <span>Doctor notes</span>
                  <p>{prescription.notes}</p>
                </div>
              )}

              {prescription.items?.length > 0 ? (
                <div className={styles.medicineList}>
                  {prescription.items.map(item => (
                    <article
                      key={item.prescription_item_id || item.id}
                      className={styles.medicineCard}
                    >
                      <h3>{item.medicine_name}</h3>

                      <div className={styles.medicineGrid}>
                        <div>
                          <span>Dosage</span>
                          <strong>{item.dosage}</strong>
                        </div>

                        <div>
                          <span>Frequency</span>
                          <strong>{item.frequency}</strong>
                        </div>

                        <div>
                          <span>Duration</span>
                          <strong>{item.duration}</strong>
                        </div>

                        <div>
                          <span>Quantity</span>
                          <strong>{item.quantity}</strong>
                        </div>
                      </div>

                      {item.instructions && (
                        <p className={styles.instructions}>
                          {item.instructions}
                        </p>
                      )}
                    </article>
                  ))}
                </div>
              ) : (
                <div className={styles.noticeBox}>
                  No prescription items found.
                </div>
              )}
            </>
          )}
        </section>

        <aside className={styles.card}>
          <h2>Medical PDF</h2>

          {canDownloadPdf ? (
            <>
              <p className={styles.muted}>
                Your medical record PDF is available because the appointment is
                completed and payment has been confirmed.
              </p>

              <button
                type="button"
                className={styles.downloadButton}
                onClick={handleDownloadPdf}
                disabled={downloading}
              >
                <Download size={18} />
                {downloading ? 'Downloading...' : 'Download PDF'}
              </button>
            </>
          ) : (
            <div className={styles.noticeBox}>
              Medical PDF will be available after the appointment is completed
              and payment is confirmed.
            </div>
          )}

          <Link
            to={`/booking/confirmation/${appointment.appointment_id}`}
            className={styles.secondaryButton}
          >
            View booking
          </Link>
        </aside>
      </section>
    </main>
  )
}