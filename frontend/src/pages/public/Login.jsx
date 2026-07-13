import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { loginUser } from '../../services/authService'
import styles from './Auth.module.css'
import { User, Lock, Loader2, Activity, AlertTriangle, Eye, EyeOff  } from 'lucide-react';

export default function Login() {
  const navigate  = useNavigate()
  const { login, isAuthenticated, user } = useAuth()

  //  Form state 
  const [formData, setFormData] = useState({
    email:    '',
    password: '',
  })

  //  UI state 
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)

  const [showPassword, setShowPassword] = useState(false)
  

  //  Handlers 
  function handleChange(e) {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
    setError('') // clear error on typing
  }

  async function handleSubmit(e) {
      e.preventDefault()
      setLoading(true)
      setError('')

      try {
          const data = await loginUser(formData.email, formData.password)

          const access  = data.access
          const refresh = data.refresh
          const user    = data.user

          if (!access || !refresh || !user) {
              throw new Error('Invalid login response from server.')
          }

          login(access, refresh, user)

          const role = user.role?.toLowerCase()

          if (role === 'admin')   return navigate('/admin/dashboard',   { replace: true })
          if (role === 'doctor')  return navigate('/doctor/dashboard',  { replace: true })
          if (role === 'shipper') return navigate('/shipper/dashboard', { replace: true })
          return navigate('/patient/dashboard', { replace: true })

      } catch (err) {
          const data = err.response?.data

          // Unverified email — redirect to OTP page
          if (data?.code === 'email_not_verified') {
              localStorage.setItem('pending_verification_email', formData.email)
              navigate('/verify-otp?purpose=register', { replace: true })
              return
          }

          const msg =
              data?.detail ||
              data?.message ||
              err.message ||
              'Something went wrong. Please try again.'

          setError(msg)
      } finally {
          setLoading(false)
      }
  }

  //  Render 
  return (
    <div className={styles.page}>
      <div className={styles.card}>

        {/* Logo */}
        <div className={styles.logo}>
          <div className={styles.logoCross}>+</div>
          MediCare
        </div>

        <h1 className={styles.title}>Welcome back</h1>
        <p className={styles.subtitle}>Sign in to your MediCare account</p>

        {/* Error message */}
        {error && <div className={styles.errorBox}>{error}</div>}

        {/* Form */}
        <form className={styles.form} onSubmit={handleSubmit}>

          <div className={styles.field}>
            <label className={styles.label}>Email address</label>
            <input
              className={styles.input}
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="you@example.com"
              required
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Password</label>

            <div className={styles.passwordWrap}>
              <input
                className={styles.passwordInput}
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
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
          </div>

          <button
            type="submit"
            className={styles.submitBtn}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 size={18} className={styles.spinner} />
                Signing in...
              </>
            ) : (
              'Sign in'
            )}
          </button>

        </form>

        {/* Footer */}
        <p className={styles.footer}>
          Don't have an account?{' '}
          <Link to="/register" className={styles.link}>Create one</Link>
        </p>

      </div>
    </div>
  )
}