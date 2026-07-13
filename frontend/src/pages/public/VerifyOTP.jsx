import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { verifyOTP, resendOTP } from '../../services/authService'
import styles from './VerifyOTP.module.css'

const OTP_LENGTH = 6
const COOLDOWN_SECONDS = 60
const PENDING_EMAIL_KEY = 'pending_verification_email'

export default function VerifyOTP() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const purpose = searchParams.get('purpose') || 'register'

  // ── State ────────────────────────────────────────────────────────
  const [email,    setEmail]    = useState('')
  const [digits,   setDigits]   = useState(Array(OTP_LENGTH).fill(''))
  const [error,    setError]    = useState('')
  const [success,  setSuccess]  = useState('')
  const [loading,  setLoading]  = useState(false)
  const [resending, setResending] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [verified, setVerified] = useState(false)

  // Refs for each OTP input box
  const inputRefs = useRef([])

  // ── On mount — get email from localStorage ───────────────────────
  useEffect(() => {
    const pendingEmail = localStorage.getItem(PENDING_EMAIL_KEY)
    if (!pendingEmail) {
      navigate('/register', { replace: true })
      return
    }
    setEmail(pendingEmail)

    // Auto-focus first input
    inputRefs.current[0]?.focus()
  }, [])

  // ── Cooldown countdown ───────────────────────────────────────────
  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setTimeout(() => setCooldown(prev => prev - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  // ── OTP input handlers ───────────────────────────────────────────
  function handleDigitChange(index, value) {
    // Only allow single digit
    const digit = value.replace(/\D/g, '').slice(-1)

    const newDigits = [...digits]
    newDigits[index] = digit
    setDigits(newDigits)
    setError('')

    // Auto-advance to next input
    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus()
    }

    // Auto-submit when all digits filled
    if (digit && index === OTP_LENGTH - 1) {
      const fullCode = [...newDigits.slice(0, -1), digit].join('')
      if (fullCode.length === OTP_LENGTH) {
        handleVerify(fullCode)
      }
    }
  }

  function handleKeyDown(index, e) {
    // Backspace — clear current and go back
    if (e.key === 'Backspace') {
      const newDigits = [...digits]
      if (digits[index]) {
        newDigits[index] = ''
        setDigits(newDigits)
      } else if (index > 0) {
        newDigits[index - 1] = ''
        setDigits(newDigits)
        inputRefs.current[index - 1]?.focus()
      }
    }

    // Arrow keys
    if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
    if (e.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  function handlePaste(e) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH)
    if (!pasted) return

    const newDigits = Array(OTP_LENGTH).fill('')
    pasted.split('').forEach((char, i) => {
      newDigits[i] = char
    })
    setDigits(newDigits)

    // Focus last filled input
    const lastIndex = Math.min(pasted.length, OTP_LENGTH - 1)
    inputRefs.current[lastIndex]?.focus()

    // Auto-submit if full code pasted
    if (pasted.length === OTP_LENGTH) {
      handleVerify(pasted)
    }
  }

  // ── Verify OTP ───────────────────────────────────────────────────
  async function handleVerify(codeOverride) {
    const code = codeOverride || digits.join('')

    if (code.length < OTP_LENGTH) {
      setError('Please enter the complete 6-digit code.')
      return
    }

    setLoading(true)
    setError('')

    try {
      await verifyOTP(email, code, purpose)

      // Clear pending email from localStorage
      localStorage.removeItem(PENDING_EMAIL_KEY)
      setVerified(true)

      // Redirect to login after 2 seconds
      setTimeout(() => navigate('/login', { replace: true }), 2000)

    } catch (err) {
      const msg = err.response?.data?.detail || 'Invalid or expired code. Please try again.'
      setError(msg)

      // Clear digits on error
      setDigits(Array(OTP_LENGTH).fill(''))
      inputRefs.current[0]?.focus()
    } finally {
      setLoading(false)
    }
  }

  // ── Resend OTP ───────────────────────────────────────────────────
  async function handleResend() {
    if (cooldown > 0 || resending) return

    setResending(true)
    setError('')
    setSuccess('')

    try {
      await resendOTP(email, purpose)
      setSuccess('A new code has been sent to your email.')
      setCooldown(COOLDOWN_SECONDS)

      // Clear existing digits
      setDigits(Array(OTP_LENGTH).fill(''))
      inputRefs.current[0]?.focus()

    } catch (err) {
      setError(err.response?.data?.detail || 'Could not resend code. Please try again.')
    } finally {
      setResending(false)
    }
  }

  // ── Success screen ───────────────────────────────────────────────
  if (verified) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.successIcon}>✓</div>
          <h1 className={styles.title}>Email verified!</h1>
          <p className={styles.subtitle}>
            Your account is ready. Redirecting you to login...
          </p>
          <div className={styles.redirectDots}>
            <span /><span /><span />
          </div>
        </div>
      </div>
    )
  }

  // ── Main render ──────────────────────────────────────────────────
  return (
    <div className={styles.page}>
      <div className={styles.card}>

        {/* Logo */}
        <div className={styles.logo}>
          <div className={styles.logoCross}>+</div>
          MediCare
        </div>

        {/* Header */}
        <div className={styles.iconWrap}>
          <span className={styles.emailIcon}>✉</span>
        </div>

        <h1 className={styles.title}>Check your email</h1>
        <p className={styles.subtitle}>
          We sent a 6-digit verification code to
        </p>
        <p className={styles.emailDisplay}>{email}</p>

        {/* Error */}
        {error && (
          <div className={styles.errorBox}>
            {error}
          </div>
        )}

        {/* Success */}
        {success && (
          <div className={styles.successBox}>
            {success}
          </div>
        )}

        {/* OTP inputs */}
        <div className={styles.otpRow}>
          {digits.map((digit, index) => (
            <input
              key={index}
              ref={el => inputRefs.current[index] = el}
              className={`${styles.otpInput} ${error ? styles.otpInputError : ''} ${digit ? styles.otpInputFilled : ''}`}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={e => handleDigitChange(index, e.target.value)}
              onKeyDown={e => handleKeyDown(index, e)}
              onPaste={handlePaste}
              disabled={loading}
              autoComplete="off"
            />
          ))}
        </div>

        {/* Verify button */}
        <button
          type="button"
          className={styles.verifyBtn}
          onClick={() => handleVerify()}
          disabled={loading || digits.join('').length < OTP_LENGTH}
        >
          {loading ? 'Verifying...' : 'Verify email'}
        </button>

        {/* Resend */}
        <div className={styles.resendRow}>
          <span className={styles.resendText}>Didn't receive the code?</span>
          <button
            type="button"
            className={styles.resendBtn}
            onClick={handleResend}
            disabled={cooldown > 0 || resending}
          >
            {resending
              ? 'Sending...'
              : cooldown > 0
              ? `Resend in ${cooldown}s`
              : 'Resend code'}
          </button>
        </div>

        {/* Back link */}
        <Link to="/register" className={styles.backLink}>
          ← Back to register
        </Link>

      </div>
    </div>
  )
}