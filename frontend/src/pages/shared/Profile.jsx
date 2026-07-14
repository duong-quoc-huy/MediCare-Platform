import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../context/AuthContext'
import {
  getProfile,
  updateProfile,
  requestPasswordOTP,
  verifyPasswordChange,
  changeEmail,
  verifyEmailChange,
} from '../../services/userService'
import AddressBook from './AddressBook'
import styles from './Profile.module.css'

const ROLE_LABELS = {
  patient: 'Patient',
  doctor: 'Doctor',
  admin: 'Admin',
  shipper: 'Shipper',
}

const NAV_ITEMS = [
  { id: 'personal-info', label: 'Personal Information' },
  { id: 'address-book', label: 'Address Book' },
  { id: 'security', label: 'Security' },
]

export default function Profile() {
  const { user, token, login, isPatient } = useAuth()

  const [profile, setProfile] = useState(null)
  const [loadingProfile, setLoadingProfile] = useState(true)

  // Personal info edit
  const [editing, setEditing] = useState(false)
  const [infoForm, setInfoForm] = useState({
    full_name: '',
    phone_number_1: '',
    phone_number_2: '',
  })
  const [infoLoading, setInfoLoading] = useState(false)
  const [infoError, setInfoError] = useState('')
  const [infoSuccess, setInfoSuccess] = useState('')

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

  // Sidebar nav / scroll spy
  const [activeSection, setActiveSection] = useState('personal-info')
  const personalInfoRef = useRef(null)
  const addressBookRef = useRef(null)
  const securityRef = useRef(null)
  const sectionRefs = {
    'personal-info': personalInfoRef,
    'address-book': addressBookRef,
    security: securityRef,
  }

  useEffect(() => {
    async function loadProfile() {
      try {
        const data = await getProfile()
        setProfile(data)
        setInfoForm({
          full_name: data.full_name || '',
          phone_number_1: data.phone_number_1 || '',
          phone_number_2: data.phone_number_2 || '',
        })
      } catch (err) {
        console.error('Failed to load profile:', err)
      } finally {
        setLoadingProfile(false)
      }
    }
    loadProfile()
  }, [])

  // Highlight the active sidebar item as the user scrolls past each section
  useEffect(() => {
    if (loadingProfile) return
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) setActiveSection(entry.target.id)
        })
      },
      { rootMargin: '-15% 0px -70% 0px', threshold: 0 }
    )
    Object.values(sectionRefs).forEach(ref => {
      if (ref.current) observer.observe(ref.current)
    })
    return () => observer.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingProfile])

  function scrollToSection(id) {
    sectionRefs[id]?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function handleEditClick() {
    setInfoForm({
      full_name: profile?.full_name || '',
      phone_number_1: profile?.phone_number_1 || '',
      phone_number_2: profile?.phone_number_2 || '',
    })
    setInfoError('')
    setEditing(true)
  }

  function handleCancelEdit() {
    setInfoForm({
      full_name: profile?.full_name || '',
      phone_number_1: profile?.phone_number_1 || '',
      phone_number_2: profile?.phone_number_2 || '',
    })
    setInfoError('')
    setEditing(false)
  }

  async function handleInfoSubmit(e) {
    e.preventDefault()
    setInfoError('')

    if (!infoForm.full_name.trim()) return setInfoError('Full name is required.')
    if (!infoForm.phone_number_1.trim()) return setInfoError('Phone number is required.')

    setInfoLoading(true)
    try {
      const updated = await updateProfile(infoForm)
      setProfile(updated)
      // Keep Navbar name in sync without re-login
      const updatedUser = { ...user, ...infoForm }
      login(token, localStorage.getItem('refresh_token'), updatedUser)
      setEditing(false)
      setInfoSuccess('Profile updated successfully.')
      setTimeout(() => setInfoSuccess(''), 3000)
    } catch (err) {
      console.error('Failed to update profile:', err)
      setInfoError(err.response?.data?.detail || 'Failed to update profile.')
    } finally {
      setInfoLoading(false)
    }
  }

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

  if (loadingProfile) {
    return (
      <div className={styles.page}>
        <p className={styles.muted}>Loading profile...</p>
      </div>
    )
  }

  const role = profile?.role || user?.role
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-GB')
    : '-'

  return (
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>Account Center</h1>

      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <nav>
            {NAV_ITEMS.map(item => (
              <button
                key={item.id}
                type="button"
                className={`${styles.navItem} ${
                  activeSection === item.id ? styles.navItemActive : ''
                }`}
                onClick={() => scrollToSection(item.id)}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </aside>

        <main className={styles.content}>
          {/* ---------- Personal Information ---------- */}
          <section id="personal-info" ref={personalInfoRef} className={styles.section}>
            <h2 className={styles.sectionTitle}>Personal Information</h2>

            {infoSuccess && <p className={styles.successMsg}>{infoSuccess}</p>}
            {infoError && <p className={styles.errorMsg}>{infoError}</p>}

            {!editing ? (
              <>
                <div className={styles.infoGrid}>
                  <div className={styles.infoField}>
                    <span className={styles.label}>Full name</span>
                    <span className={styles.value}>{profile?.full_name || '-'}</span>
                  </div>
                  <div className={styles.infoField}>
                    <span className={styles.label}>Email</span>
                    <span className={styles.value}>{profile?.email || '-'}</span>
                  </div>
                  <div className={styles.infoField}>
                    <span className={styles.label}>Phone number</span>
                    <span className={styles.value}>{profile?.phone_number_1 || '-'}</span>
                  </div>
                  <div className={styles.infoField}>
                    <span className={styles.label}>Secondary phone</span>
                    <span className={styles.value}>{profile?.phone_number_2 || '-'}</span>
                  </div>
                  <div className={styles.infoField}>
                    <span className={styles.label}>Role</span>
                    <span className={`${styles.roleBadge} ${styles[role] || ''}`}>
                      {ROLE_LABELS[role] || role}
                    </span>
                  </div>
                  <div className={styles.infoField}>
                    <span className={styles.label}>Member since</span>
                    <span className={styles.value}>{memberSince}</span>
                  </div>
                </div>
                <button className={styles.editBtn} onClick={handleEditClick}>
                  Edit
                </button>
              </>
            ) : (
              <form onSubmit={handleInfoSubmit}>
                <div className={styles.infoGrid}>
                  <div className={styles.infoField}>
                    <label className={styles.label}>Full name</label>
                    <input
                      className={styles.input}
                      value={infoForm.full_name}
                      onChange={e =>
                        setInfoForm(prev => ({ ...prev, full_name: e.target.value }))
                      }
                    />
                  </div>
                  <div className={styles.infoField}>
                    <span className={styles.label}>Email</span>
                    <span className={styles.value}>{profile?.email || '-'}</span>
                  </div>
                  <div className={styles.infoField}>
                    <label className={styles.label}>Phone number</label>
                    <input
                      className={styles.input}
                      maxLength={10}
                      inputMode="numeric"
                      value={infoForm.phone_number_1}
                      onChange={e =>
                        setInfoForm(prev => ({ ...prev, phone_number_1: e.target.value }))
                      }
                    />
                  </div>
                  <div className={styles.infoField}>
                    <label className={styles.label}>Secondary phone (optional)</label>
                    <input
                      className={styles.input}
                      maxLength={10}
                      inputMode="numeric"
                      value={infoForm.phone_number_2}
                      onChange={e =>
                        setInfoForm(prev => ({ ...prev, phone_number_2: e.target.value }))
                      }
                    />
                  </div>
                  <div className={styles.infoField}>
                    <span className={styles.label}>Role</span>
                    <span className={`${styles.roleBadge} ${styles[role] || ''}`}>
                      {ROLE_LABELS[role] || role}
                    </span>
                  </div>
                  <div className={styles.infoField}>
                    <span className={styles.label}>Member since</span>
                    <span className={styles.value}>{memberSince}</span>
                  </div>
                </div>
                <div className={styles.formActions}>
                  <button type="submit" className={styles.saveBtn} disabled={infoLoading}>
                    {infoLoading ? 'Saving...' : 'Save'}
                  </button>
                  <button type="button" className={styles.cancelBtn} onClick={handleCancelEdit}>
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </section>

          {/* ---------- Address Book ---------- */}
          <section id="address-book" ref={addressBookRef} className={styles.section}>
            <h2 className={styles.sectionTitle}>Address Book</h2>
            <AddressBook />
          </section>

          {/* ---------- Security ---------- */}
          <section id="security" ref={securityRef} className={styles.section}>
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
        </main>
      </div>
    </div>
  )
}