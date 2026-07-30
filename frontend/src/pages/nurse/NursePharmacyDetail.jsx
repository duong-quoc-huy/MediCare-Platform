import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  LoaderCircle,
  QrCode,
  RefreshCw,
  UserCheck,
} from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'

import {
  claimNursePharmacyPrescription,
  createNursePharmacyPayment,
  getNursePharmacyPrescription,
} from '../../services/nurseService'

import styles from './NursePharmacyDetail.module.css'

const PAYMENT_POLL_INTERVAL = 3000

function formatMoney(value) {
  return Number(value || 0).toLocaleString('vi-VN')
}

function isAppointmentCompleted(data) {
  return (
    data?.final_paid === true ||
    data?.appointment_status === 'completed'
  )
}

function formatPharmacyStatus(value) {
  if (!value) {
    return 'Waiting'
  }

  return String(value)
    .replaceAll('_', ' ')
    .replace(/\b\w/g, character => character.toUpperCase())
}

export default function NursePharmacyDetail() {
  const { prescriptionId } = useParams()

  const [prescription, setPrescription] = useState(null)

  const [selectedCounter, setSelectedCounter] =
    useState('counter_1')

  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [receiptNumber, setReceiptNumber] = useState('')
  const [paymentLink, setPaymentLink] = useState('')

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [claiming, setClaiming] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [monitoringPayment, setMonitoringPayment] =
    useState(false)

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const pollingInProgressRef = useRef(false)

  async function fetchPrescriptionDetail({
    showInitialLoading = false,
    showRefreshing = false,
    showError = true,
  } = {}) {
    try {
      if (showInitialLoading) {
        setLoading(true)
      }

      if (showRefreshing) {
        setRefreshing(true)
      }

      const data =
        await getNursePharmacyPrescription(prescriptionId)

      setPrescription(data)

      return data
    } catch (err) {
      console.error(
        'Could not load prescription detail:',
        err
      )

      if (showError) {
        setError(
          err.response?.data?.detail ||
          'Could not load prescription detail.'
        )
      }

      return null
    } finally {
      if (showInitialLoading) {
        setLoading(false)
      }

      if (showRefreshing) {
        setRefreshing(false)
      }
    }
  }

  useEffect(() => {
    let active = true

    async function loadInitialDetail() {
      try {
        setLoading(true)
        setError('')

        const data =
          await getNursePharmacyPrescription(prescriptionId)

        if (!active) {
          return
        }

        setPrescription(data)

        if (isAppointmentCompleted(data)) {
          setSuccess('This appointment is completed.')
        }
      } catch (err) {
        console.error(
          'Could not load prescription detail:',
          err
        )

        if (active) {
          setError(
            err.response?.data?.detail ||
            'Could not load prescription detail.'
          )
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadInitialDetail()

    return () => {
      active = false
    }
  }, [prescriptionId])

  useEffect(() => {
    if (!monitoringPayment || !prescriptionId) {
      return undefined
    }

    let active = true

    async function checkPaymentStatus() {
      if (pollingInProgressRef.current) {
        return
      }

      pollingInProgressRef.current = true

      try {
        const data =
          await getNursePharmacyPrescription(prescriptionId)

        if (!active) {
          return
        }

        setPrescription(data)

        if (isAppointmentCompleted(data)) {
          setMonitoringPayment(false)
          setPaymentLink('')
          setError('')
          setSuccess('This appointment is completed.')
        }
      } catch (err) {
        console.error(
          'Payment status polling failed:',
          err
        )
      } finally {
        pollingInProgressRef.current = false
      }
    }

    checkPaymentStatus()

    const intervalId = window.setInterval(
      checkPaymentStatus,
      PAYMENT_POLL_INTERVAL
    )

    return () => {
      active = false
      pollingInProgressRef.current = false
      window.clearInterval(intervalId)
    }
  }, [monitoringPayment, prescriptionId])

  async function handleClaimPrescription() {
    try {
      setClaiming(true)
      setError('')
      setSuccess('')

      const result =
        await claimNursePharmacyPrescription(
          prescriptionId,
          selectedCounter
        )

      if (result.prescription) {
        setPrescription(result.prescription)
      } else {
        const updated =
          await getNursePharmacyPrescription(
            prescriptionId
          )

        setPrescription(updated)
      }

      setSuccess(
        result.detail ||
        'Prescription claimed successfully.'
      )
    } catch (err) {
      console.error(
        'Could not claim prescription:',
        err
      )

      if (err.response?.status === 409) {
        const responseData = err.response.data

        setError(
          responseData.assigned_nurse
            ? `This prescription was already claimed by ${responseData.assigned_nurse} at ${responseData.pharmacy_counter}.`
            : 'This prescription was already claimed by another nurse.'
        )

        const updated =
          await getNursePharmacyPrescription(
            prescriptionId
          )

        setPrescription(updated)

        return
      }

      setError(
        err.response?.data?.detail ||
        'Could not claim this prescription.'
      )
    } finally {
      setClaiming(false)
    }
  }

  async function handleManualRefresh() {
    setError('')

    const data = await fetchPrescriptionDetail({
      showRefreshing: true,
      showError: true,
    })

    if (!data) {
      return
    }

    if (isAppointmentCompleted(data)) {
      setMonitoringPayment(false)
      setPaymentLink('')
      setSuccess('This appointment is completed.')
    }
  }

  async function handlePayment(event) {
    event.preventDefault()

    try {
      setSubmitting(true)
      setError('')
      setSuccess('')
      setPaymentLink('')
      setMonitoringPayment(false)

      const result =
        await createNursePharmacyPayment(
          prescriptionId,
          {
            payment_method: paymentMethod,
            receipt_number: receiptNumber.trim(),
          }
        )

      if (paymentMethod === 'cash') {
        const updatedPrescription =
          result.prescription ||
          await fetchPrescriptionDetail({
            showError: false,
          })

        if (updatedPrescription) {
          setPrescription(updatedPrescription)
        }

        setSuccess(
          'Cash payment confirmed. This appointment is completed.'
        )

        return
      }

      const generatedPaymentLink =
        result.payment_url ||
        result.approval_url

      if (!generatedPaymentLink) {
        throw new Error(
          'The backend did not return a payment URL.'
        )
      }

      setPaymentLink(generatedPaymentLink)
      setMonitoringPayment(true)

      setSuccess(
        'Payment QR generated. Waiting for the patient to complete payment.'
      )
    } catch (err) {
      console.error(
        'Could not create payment:',
        err
      )

      setError(
        err.response?.data?.detail ||
        err.message ||
        'Could not create payment.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  function handlePaymentMethodChange(event) {
    setPaymentMethod(event.target.value)
    setPaymentLink('')
    setMonitoringPayment(false)
    setError('')
    setSuccess('')
  }

  if (loading) {
    return (
      <main className={styles.page}>
        <section className={styles.stateCard}>
          <LoaderCircle
            size={28}
            className={styles.spinner}
          />

          <h1>Loading prescription...</h1>
        </section>
      </main>
    )
  }

  if (!prescription) {
    return (
      <main className={styles.page}>
        <section className={styles.stateCard}>
          <h1>Prescription not found</h1>
        </section>
      </main>
    )
  }

  const completed =
    isAppointmentCompleted(prescription)

  const isAssigned =
    Boolean(prescription.assigned_nurse_id)

  const isClaimedByMe =
    prescription.is_claimed_by_me === true

  const canClaim =
    prescription.can_claim === true

  const counterDisplay =
    prescription.pharmacy_counter_display ||
    prescription.pharmacy_counter ||
    'Not assigned'

  return (
    <main className={styles.page}>
      <section className={styles.header}>
        <Link
          to="/nurse/pharmacy"
          className={styles.backLink}
        >
          <ArrowLeft size={18} />
          Back to queue
        </Link>

        <h1>Prescription Detail</h1>

        <p>
          Review medicine charges, pharmacy assignment,
          insurance coverage, and final payment.
        </p>
      </section>

      {error && (
        <div className={styles.errorBox}>
          {error}
        </div>
      )}

      {success && (
        <div className={styles.successBox}>
          {success}
        </div>
      )}

      {monitoringPayment && !completed && (
        <div className={styles.pendingBox}>
          <LoaderCircle
            size={22}
            className={styles.spinner}
          />

          <div>
            <strong>
              Waiting for payment confirmation...
            </strong>

            <p>
              This page checks the payment status
              automatically every three seconds.
            </p>
          </div>
        </div>
      )}

      <section className={styles.layout}>
        <section className={styles.card}>
          <h2>Patient and Appointment</h2>

          <div className={styles.infoGrid}>
            <div>
              <span>Patient</span>
              <strong>
                {prescription.patient_name}
              </strong>
            </div>

            <div>
              <span>Email</span>
              <strong>
                {prescription.patient_email}
              </strong>
            </div>

            <div>
              <span>Phone</span>
              <strong>
                {prescription.patient_phone_1 || 'N/A'}
              </strong>
            </div>

            <div>
              <span>Doctor</span>
              <strong>
                Dr. {prescription.doctor_name}
              </strong>
            </div>

            <div>
              <span>Date</span>
              <strong>
                {prescription.appointment_date}
              </strong>
            </div>

            <div>
              <span>Appointment status</span>
              <strong>
                {formatPharmacyStatus(
                  prescription.appointment_status
                )}
              </strong>
            </div>

            <div>
              <span>Insurance card</span>
              <strong>
                {prescription.health_insurance_card ||
                  'Not provided'}
              </strong>
            </div>

            <div>
              <span>Coverage</span>
              <strong>
                {prescription.has_insurance
                  ? '50%'
                  : 'No insurance'}
              </strong>
            </div>
          </div>

          <h2>Pharmacy Assignment</h2>

          <div className={styles.assignmentBox}>
            {isAssigned ? (
              <>
                <div>
                  <span>Assigned nurse</span>

                  <strong>
                    {prescription.assigned_nurse_name ||
                      'Unknown nurse'}
                  </strong>
                </div>

                <div>
                  <span>Pharmacy counter</span>

                  <strong>
                    {counterDisplay}
                  </strong>
                </div>

                <div>
                  <span>Pharmacy status</span>

                  <strong>
                    {formatPharmacyStatus(
                      prescription.pharmacy_status
                    )}
                  </strong>
                </div>

                {isClaimedByMe && !completed && (
                  <div className={styles.ownedAssignment}>
                    <UserCheck size={18} />

                    <span>
                      This prescription is assigned to you.
                    </span>
                  </div>
                )}
              </>
            ) : (
              <>
                <p className={styles.assignmentDescription}>
                  This prescription has not been assigned.
                  Select your current counter and accept it
                  before processing payment.
                </p>

                <label>
                  Pharmacy counter

                  <select
                    value={selectedCounter}
                    onChange={event =>
                      setSelectedCounter(
                        event.target.value
                      )
                    }
                    disabled={claiming || completed}
                  >
                    <option value="counter_1">
                      Counter 1
                    </option>

                    <option value="counter_2">
                      Counter 2
                    </option>

                    <option value="counter_3">
                      Counter 3
                    </option>
                  </select>
                </label>

                <button
                  type="button"
                  onClick={handleClaimPrescription}
                  disabled={
                    claiming ||
                    completed ||
                    !canClaim
                  }
                >
                  {claiming
                    ? 'Claiming...'
                    : 'Accept Prescription'}
                </button>

                {!canClaim && !completed && (
                  <p className={styles.assignmentNotice}>
                    This prescription cannot currently be
                    claimed. Confirm that the appointment is
                    in progress and the prescription has been
                    sent to pharmacy.
                  </p>
                )}
              </>
            )}
          </div>

          <h2>Diagnosis</h2>

          <p className={styles.textBox}>
            {prescription.diagnosis ||
              'No diagnosis recorded.'}
          </p>

          <h2>Prescription Items</h2>

          <div className={styles.tableWrap}>
            <table>
              <thead>
                <tr>
                  <th>Medicine</th>
                  <th>Dosage</th>
                  <th>Frequency</th>
                  <th>Qty</th>
                  <th>Unit price</th>
                  <th>Line total</th>
                </tr>
              </thead>

              <tbody>
                {prescription.items?.length > 0 ? (
                  prescription.items.map(item => (
                    <tr key={item.id}>
                      <td>
                        {item.medicine_name}
                      </td>

                      <td>
                        {item.dosage}
                      </td>

                      <td>
                        {item.frequency}
                      </td>

                      <td>
                        {item.quantity}
                      </td>

                      <td>
                        {formatMoney(
                          item.unit_price
                        )}{' '}
                        VND
                      </td>

                      <td>
                        {formatMoney(
                          item.line_total
                        )}{' '}
                        VND
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6}>
                      No prescription items found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <aside className={styles.card}>
          <h2>Bill Summary</h2>

          <div className={styles.paymentSummary}>
            <div>
              <span>Appointment fee</span>

              <strong>
                {formatMoney(
                  prescription.total_fee
                )}{' '}
                VND
              </strong>
            </div>

            <div>
              <span>Deposit</span>

              <strong>
                - {formatMoney(
                  prescription.deposit_amount
                )}{' '}
                VND
              </strong>
            </div>

            <div>
              <span>
                Remaining appointment fee
              </span>

              <strong>
                {formatMoney(
                  prescription
                    .remaining_appointment_fee
                )}{' '}
                VND
              </strong>
            </div>

            <div>
              <span>Medicine subtotal</span>

              <strong>
                {formatMoney(
                  prescription.medicine_subtotal
                )}{' '}
                VND
              </strong>
            </div>

            <div>
              <span>Gross bill</span>

              <strong>
                {formatMoney(
                  prescription.gross_amount
                )}{' '}
                VND
              </strong>
            </div>

            <div>
              <span>Insurance discount</span>

              <strong>
                - {formatMoney(
                  prescription.discount_amount
                )}{' '}
                VND
              </strong>
            </div>

            <div>
              <span>Final payable</span>

              <strong>
                {formatMoney(
                  prescription.payable_amount
                )}{' '}
                VND
              </strong>
            </div>
          </div>

          {completed ? (
            <div className={styles.completedBox}>
              <CheckCircle2 size={24} />

              <div>
                <strong>
                  This appointment is completed.
                </strong>

                <p>
                  The final payment has been confirmed
                  successfully.
                </p>
              </div>
            </div>
          ) : !isAssigned ? (
            <div className={styles.pendingBox}>
              <div>
                <strong>
                  Prescription not assigned
                </strong>

                <p>
                  Accept this prescription before
                  processing payment.
                </p>
              </div>
            </div>
          ) : !isClaimedByMe ? (
            <div className={styles.warningBox}>
              <strong>
                This prescription is assigned to{' '}
                {prescription.assigned_nurse_name ||
                  'another nurse'}.
              </strong>

              <p>
                The patient should go to{' '}
                {counterDisplay}.
              </p>
            </div>
          ) : (
            <form
              className={styles.form}
              onSubmit={handlePayment}
            >
              <label>
                Payment method

                <select
                  value={paymentMethod}
                  onChange={
                    handlePaymentMethodChange
                  }
                  disabled={
                    submitting ||
                    monitoringPayment
                  }
                >
                  <option value="cash">
                    Cash
                  </option>

                  <option value="vnpay">
                    VNPay QR
                  </option>

                  <option value="paypal">
                    PayPal QR
                  </option>
                </select>
              </label>

              {paymentMethod === 'cash' && (
                <label>
                  Receipt number

                  <input
                    value={receiptNumber}
                    onChange={event =>
                      setReceiptNumber(
                        event.target.value
                      )
                    }
                    placeholder="Optional"
                    disabled={submitting}
                  />
                </label>
              )}

              <button
                type="submit"
                disabled={
                  submitting ||
                  monitoringPayment
                }
              >
                {submitting
                  ? 'Processing...'
                  : paymentMethod === 'cash'
                    ? 'Confirm Cash & Complete'
                    : 'Generate Payment QR'}
              </button>
            </form>
          )}

          {paymentLink &&
            !completed &&
            isClaimedByMe && (
              <section className={styles.qrPanel}>
                <div className={styles.qrTitle}>
                  <QrCode size={20} />

                  <strong>
                    Patient payment QR
                  </strong>
                </div>

                <div className={styles.qrCode}>
                  <QRCodeSVG
                    value={paymentLink}
                    size={220}
                    includeMargin
                    level="M"
                  />
                </div>

                <p>
                  Scan using the patient&apos;s phone,
                  then complete payment on the sandbox
                  page.
                </p>

                <a
                  href={paymentLink}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open payment page
                  <ExternalLink size={16} />
                </a>

                <button
                  type="button"
                  className={styles.refreshButton}
                  onClick={handleManualRefresh}
                  disabled={refreshing}
                >
                  <RefreshCw
                    size={16}
                    className={
                      refreshing
                        ? styles.spinner
                        : undefined
                    }
                  />

                  {refreshing
                    ? 'Checking...'
                    : 'Check payment status'}
                </button>
              </section>
            )}
        </aside>
      </section>
    </main>
  )
}