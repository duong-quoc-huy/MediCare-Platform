import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { registerUser } from '../../services/authService'
import styles from './Auth.module.css'
import { Loader2, Eye, EyeOff } from 'lucide-react'

export default function Register() {
  const navigate = useNavigate()

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone_number_1: '',
    password: '',
    password2: '',
  })

  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  function getErrorMessage(field) {
    const error = errors[field]

    if (!error) return ''
    if (Array.isArray(error)) return error.join(' ')
    return error
  }

  function handleChange(e) {
    const { name, value } = e.target

    setFormData(prev => ({
      ...prev,
      [name]: value,
    }))

    setErrors(prev => ({
      ...prev,
      [name]: '',
      non_field_errors: '',
    }))
  }

  function validateForm() {
    const newErrors = {}

    if (!formData.full_name.trim()) {
      newErrors.full_name = 'Full name is required.'
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required.'
    }

    if (!formData.phone_number_1.trim()) {
      newErrors.phone_number_1 = 'Phone number is required.'
    } else if (!/^\d{10}$/.test(formData.phone_number_1)) {
      newErrors.phone_number_1 = 'Phone number must contain exactly 10 digits.'
    }

    if (!formData.password) {
      newErrors.password = 'Password is required.'
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters.'
    }

    if (!formData.password2) {
      newErrors.password2 = 'Please confirm your password.'
    } else if (formData.password !== formData.password2) {
      newErrors.password2 = 'Passwords do not match.'
    }

    return newErrors
  }

  async function handleSubmit(e) {
    e.preventDefault()

    const validationErrors = validateForm()

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setLoading(true)
    setErrors({})

    try {
      await registerUser({
        full_name: formData.full_name.trim(),
        email: formData.email.trim(),
        phone_number_1: formData.phone_number_1.trim(),
        password: formData.password,
        password2: formData.password2,
      })

      localStorage.setItem('pending_verification_email', formData.email.trim())
      navigate('/verify-otp?purpose=register', { replace: true })
    } catch (err) {
      const data = err.response?.data

      if (data && typeof data === 'object') {
        setErrors(data)
      } else {
        setErrors({
          non_field_errors: 'Something went wrong. Please try again.',
        })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}>
          <div className={styles.logoCross}>+</div>
          MediCare
        </div>

        <h1 className={styles.title}>Create account</h1>
        <p className={styles.subtitle}>
          Join MediCare — healthcare at your door
        </p>

        {getErrorMessage('non_field_errors') && (
          <div className={styles.errorBox}>
            {getErrorMessage('non_field_errors')}
          </div>
        )}

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="full_name">
              Full name
            </label>
            <input
              id="full_name"
              className={`${styles.input} ${getErrorMessage('full_name') ? styles.error : ''}`}
              type="text"
              name="full_name"
              value={formData.full_name}
              onChange={handleChange}
              placeholder="Nguyen Van A"
              autoComplete="name"
              required
            />
            {getErrorMessage('full_name') && (
              <span className={styles.fieldError}>
                {getErrorMessage('full_name')}
              </span>
            )}
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="email">
              Email address
            </label>
            <input
              id="email"
              className={`${styles.input} ${getErrorMessage('email') ? styles.error : ''}`}
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
            {getErrorMessage('email') && (
              <span className={styles.fieldError}>
                {getErrorMessage('email')}
              </span>
            )}
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="phone_number_1">
              Phone number
            </label>
            <input
              id="phone_number_1"
              className={`${styles.input} ${getErrorMessage('phone_number_1') ? styles.error : ''}`}
              type="tel"
              name="phone_number_1"
              value={formData.phone_number_1}
              onChange={handleChange}
              placeholder="0901234567"
              maxLength={10}
              inputMode="numeric"
              autoComplete="tel"
              required
            />
            {getErrorMessage('phone_number_1') && (
              <span className={styles.fieldError}>
                {getErrorMessage('phone_number_1')}
              </span>
            )}
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="password">
              Password
            </label>

            <div className={styles.passwordWrap}>
              <input
                id="password"
                className={`${styles.passwordInput} ${getErrorMessage('password') ? styles.error : ''}`}
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Min. 8 characters"
                autoComplete="new-password"
                required
              />

              <button
                type="button"
                className={styles.eyeBtn}
                onClick={() => setShowPassword(prev => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {getErrorMessage('password') && (
              <span className={styles.fieldError}>
                {getErrorMessage('password')}
              </span>
            )}
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="password2">
              Confirm password
            </label>

            <div className={styles.passwordWrap}>
              <input
                id="password2"
                className={`${styles.passwordInput} ${getErrorMessage('password2') ? styles.error : ''}`}
                type={showConfirmPassword ? 'text' : 'password'}
                name="password2"
                value={formData.password2}
                onChange={handleChange}
                placeholder="••••••••"
                autoComplete="new-password"
                required
              />

              <button
                type="button"
                className={styles.eyeBtn}
                onClick={() => setShowConfirmPassword(prev => !prev)}
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {getErrorMessage('password2') && (
              <span className={styles.fieldError}>
                {getErrorMessage('password2')}
              </span>
            )}
          </div>

          <button
            type="submit"
            className={styles.submitBtn}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 size={18} className={styles.spinner} />
                Creating account...
              </>
            ) : (
              'Create account'
            )}
          </button>
        </form>

        <p className={styles.footer}>
          Already have an account?{' '}
          <Link to="/login" className={styles.link}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}