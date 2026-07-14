import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  requestPasswordOTP,
  verifyPasswordChange,
  changeEmail,
  verifyEmailChange,
} from '../../services/userService'
import styles from './Profile.module.css'

export default function ProfileSecurity() {
  const { setProfile } = useOutletContext()
  const { user, token, login, isPatient } = useAuth()

  // Change email (patient only) — 3 steps
  const [emailStep, setEmailStep] = useState(1)
  const [newEmail, setNewEmail] = useState('')
  const [emailOtp, setEmailOtp] = useState('')
  const [emailError, setEmailError] = useState('')
  const [emailSuccess, setEmailSuccess] = useState('')
  const [emailLoading, setEmailLoading] = useState(false)

  // Change password — 2 steps
  const [passwordStep, setPasswordStep] = useState(1)
  const [passwordOtp, setPasswordOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordSuccess, setPasswordSuccess] = useState('')

  async function handleRequestEmailChange() {
    setEmailError('')
    setEmailLoading(true)
    try {
      await changeEmail({ new_email: newEmail })
      setEmailStep(3)
    } catch (err) {
      console.error('Failed to request email change:', err)
      setEmailError(err.response?.data?.detail || 'Failed to send OTP. Please try again.')
    } finally {
      setEmailLoading(false)
    }
  }

  async function handleVerifyEmailChange() {
    setEmailError('')
    setEmailLoading(true)
    try {
      await verifyEmailChange({ code: emailOtp })
      const updatedUser = { ...user, email: newEmail }
      login(token, localStorage.getItem('refresh_token'), updatedUser)
      setProfile(prev => (prev ? { ...prev, email: newEmail } : prev))
      setEmailStep(1)
      setNewEmail('')
      setEmailOtp('')
      setEmailSuccess('Email updated successfully.')
      setTimeout(() => setEmailSuccess(''), 3000)
    } catch (err) {
      console.error('Failed to verify email change:', err)
      setEmailError(err.response?.data?.detail || 'Invalid OTP. Please try again.')
    } finally {
      setEmailLoading(false)
    }
  }

  async function handleRequestPasswordOTP() {
    setPasswordError('')
    setPasswordLoading(true)
    try {
      await requestPasswordOTP()
      setPasswordStep(2)
    } catch (err) {
      console.error('Failed to request password OTP:', err)
      setPasswordError(err.response?.data?.detail || 'Failed to send OTP. Please try again.')
    } finally {
      setPasswordLoading(false)
    }
  }

  async function handleVerifyPasswordChange() {
    setPasswordError('')
    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters.')
      return
    }
    setPasswordLoading(true)
    try {
      await verifyPasswordChange({ code: passwordOtp, new_password: newPassword })
      setPasswordStep(1)
      setPasswordOtp('')
      setNewPassword('')
      setPasswordSuccess('Password updated successfully.')
      setTimeout(() => setPasswordSuccess(''), 3000)
    } catch (err) {
      console.error('Failed to verify password change:', err)
      setPasswordError(err.response?.data?.detail || 'Invalid OTP. Please try again.')
    } finally {
      setPasswordLoading(false)
    }
  }

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Security</h2>

      {isPatient && (
        <div className={styles.securityBlock}>
          <h3 className={styles.subTitle}>Change Email</h3>
          {emailSuccess && <p className={styles.successMsg}>{emailSuccess}</p>}
          {emailError && <p className={styles.errorMsg}>{emailError}</p>}

          {emailStep === 1 && (
            <button className={styles.editBtn} onClick={() => setEmailStep(2)}>
              Change Email
            </button>
          )}

          {emailStep === 2 && (
            <div className={styles.inlineForm}>
              <input
                className={styles.input}
                type="email"
                placeholder="Enter new email address"
                value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
              />
              <div className={styles.formActions}>
                <button
                  className={styles.saveBtn}
                  disabled={emailLoading || !newEmail}
                  onClick={handleRequestEmailChange}
                >
                  {emailLoading ? 'Sending...' : 'Send OTP'}
                </button>
                <button className={styles.cancelBtn} onClick={() => setEmailStep(1)}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {emailStep === 3 && (
            <div className={styles.inlineForm}>
              <p className={styles.hint}>Enter the OTP sent to {newEmail}</p>
              <input
                className={styles.input}
                value={emailOtp}
                maxLength={6}
                inputMode="numeric"
                placeholder="6-digit OTP"
                onChange={e => setEmailOtp(e.target.value)}
              />
              <div className={styles.formActions}>
                <button
                  className={styles.saveBtn}
                  disabled={emailLoading || emailOtp.length !== 6}
                  onClick={handleVerifyEmailChange}
                >
                  {emailLoading ? 'Verifying...' : 'Verify'}
                </button>
                <button className={styles.cancelBtn} onClick={() => setEmailStep(2)}>
                  Back
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className={styles.securityBlock}>
        <h3 className={styles.subTitle}>Change Password</h3>
        {passwordSuccess && <p className={styles.successMsg}>{passwordSuccess}</p>}
        {passwordError && <p className={styles.errorMsg}>{passwordError}</p>}

        {passwordStep === 1 && (
          <button
            className={styles.editBtn}
            disabled={passwordLoading}
            onClick={handleRequestPasswordOTP}
          >
            {passwordLoading ? 'Sending...' : 'Change Password'}
          </button>
        )}

        {passwordStep === 2 && (
          <div className={styles.inlineForm}>
            <p className={styles.hint}>Enter the OTP sent to your email</p>
            <input
              className={styles.input}
              value={passwordOtp}
              maxLength={6}
              inputMode="numeric"
              placeholder="6-digit OTP"
              onChange={e => setPasswordOtp(e.target.value)}
            />
            <input
              className={styles.input}
              type="password"
              placeholder="New password (min. 8 characters)"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
            />
            <div className={styles.formActions}>
              <button
                className={styles.saveBtn}
                disabled={passwordLoading}
                onClick={handleVerifyPasswordChange}
              >
                {passwordLoading ? 'Saving...' : 'Change Password'}
              </button>
              <button className={styles.cancelBtn} onClick={() => setPasswordStep(1)}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}