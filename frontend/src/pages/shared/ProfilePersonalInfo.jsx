import { useRef, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { updateProfile, uploadProfileImage } from '../../services/userService'
import { ROLE_LABELS, GENDER_LABELS } from './profileConstants'
import styles from './Profile.module.css'

const NATIONAL_ID_REGEX = /^\d{12}$/
const HEALTH_INSURANCE_REGEX = /^[A-Z]{2}\d{13}$/
const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg']
const MAX_IMAGE_SIZE = 2 * 1024 * 1024 // 2MB — must match validators.py

function buildInfoForm(profile) {
  return {
    full_name: profile?.full_name || '',
    phone_number_1: profile?.phone_number_1 || '',
    phone_number_2: profile?.phone_number_2 || '',
    gender: profile?.gender || '',
    date_of_birth: profile?.date_of_birth || '',
    national_id: profile?.national_id || '',
    health_insurance_card: profile?.health_insurance_card || '',
  }
}

export default function ProfilePersonalInfo() {
  const { profile, setProfile } = useOutletContext()
  const { user, token, login } = useAuth()

  const [editing, setEditing] = useState(false)
  const [infoForm, setInfoForm] = useState(() => buildInfoForm(profile))
  const [infoLoading, setInfoLoading] = useState(false)
  const [infoError, setInfoError] = useState('')
  const [infoSuccess, setInfoSuccess] = useState('')

  // Avatar upload
  const fileInputRef = useRef(null)
  const [imageUploading, setImageUploading] = useState(false)
  const [imageError, setImageError] = useState('')

  const role = profile?.role || user?.role
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-GB')
    : '-'
  const dobDisplay = profile?.date_of_birth
    ? new Date(profile.date_of_birth).toLocaleDateString('en-GB')
    : '-'
  const initials = (profile?.full_name || '?')
    .trim()
    .split(/\s+/)
    .map(part => part[0])
    .slice(-2)
    .join('')
    .toUpperCase()

  function handleEditClick() {
    setInfoForm(buildInfoForm(profile))
    setInfoError('')
    setEditing(true)
  }

  function handleCancelEdit() {
    setInfoForm(buildInfoForm(profile))
    setInfoError('')
    setEditing(false)
  }

  async function handleInfoSubmit(e) {
    e.preventDefault()
    setInfoError('')

    if (!infoForm.full_name.trim()) return setInfoError('Full name is required.')
    if (!infoForm.phone_number_1.trim()) return setInfoError('Phone number is required.')

    const nationalId = infoForm.national_id.trim()
    if (nationalId && !NATIONAL_ID_REGEX.test(nationalId)) {
      return setInfoError('National ID must be exactly 12 digits.')
    }

    const healthInsuranceCard = infoForm.health_insurance_card.trim()
    if (healthInsuranceCard && !HEALTH_INSURANCE_REGEX.test(healthInsuranceCard)) {
      return setInfoError(
        'Health insurance card must start with 2 uppercase letters followed by 13 digits (e.g. HS4030012345678).'
      )
    }

    setInfoLoading(true)
    try {
      const payload = {
        ...infoForm,
        // Send null instead of '' for optional unique fields, so multiple
        // users leaving these blank don't collide on the unique constraint.
        national_id: nationalId || null,
        health_insurance_card: healthInsuranceCard || null,
        date_of_birth: infoForm.date_of_birth || null,
      }
      const updated = await updateProfile(payload)
      setProfile(updated)
      // Keep Navbar name in sync without re-login
      const updatedUser = { ...user, full_name: infoForm.full_name }
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

  function handleAvatarClick() {
    fileInputRef.current?.click()
  }

  async function handleImageChange(e) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file later
    if (!file) return

    setImageError('')
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return setImageError('Only PNG and JPG images are allowed.')
    }
    if (file.size > MAX_IMAGE_SIZE) {
      return setImageError('Image must be smaller than 2MB.')
    }

    setImageUploading(true)
    try {
      const updated = await uploadProfileImage(file)
      setProfile(updated)
    } catch (err) {
      console.error('Failed to upload profile image:', err)
      setImageError(err.response?.data?.detail || 'Failed to upload image. Please try again.')
    } finally {
      setImageUploading(false)
    }
  }

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Personal Information</h2>

      {infoSuccess && <p className={styles.successMsg}>{infoSuccess}</p>}
      {infoError && <p className={styles.errorMsg}>{infoError}</p>}

      {/* ---------- Avatar ---------- */}
      <div className={styles.avatarSection}>
        <div className={styles.avatarWrapper} onClick={handleAvatarClick}>
          {profile?.profile_image ? (
            <img src={profile.profile_image} alt="Profile" className={styles.avatarImg} />
          ) : (
            <span className={styles.avatarPlaceholder}>{initials}</span>
          )}
          <span className={styles.avatarEditBtn} aria-hidden="true">
            ✎
          </span>
        </div>
        <div className={styles.avatarMeta}>
          <button
            type="button"
            className={styles.editBtn}
            onClick={handleAvatarClick}
            disabled={imageUploading}
          >
            {imageUploading ? 'Uploading...' : 'Change photo'}
          </button>
          <p className={styles.hint}>PNG or JPG, up to 2MB.</p>
          {imageError && <p className={styles.errorMsg}>{imageError}</p>}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".png,.jpg,.jpeg,image/png,image/jpeg"
          className={styles.visuallyHidden}
          onChange={handleImageChange}
        />
      </div>

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
              <span className={styles.label}>Gender</span>
              <span className={styles.value}>
                {GENDER_LABELS[profile?.gender] || '-'}
              </span>
            </div>
            <div className={styles.infoField}>
              <span className={styles.label}>Date of birth</span>
              <span className={styles.value}>{dobDisplay}</span>
            </div>
            <div className={styles.infoField}>
              <span className={styles.label}>National ID</span>
              <span className={styles.value}>{profile?.national_id || '-'}</span>
            </div>
            <div className={styles.infoField}>
              <span className={styles.label}>Health insurance card</span>
              <span className={styles.value}>{profile?.health_insurance_card || '-'}</span>
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
                onChange={e => setInfoForm(prev => ({ ...prev, full_name: e.target.value }))}
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
              <label className={styles.label}>Gender (optional)</label>
              <select
                className={styles.select}
                value={infoForm.gender}
                onChange={e => setInfoForm(prev => ({ ...prev, gender: e.target.value }))}
              >
                <option value="">Select gender</option>
                {Object.entries(GENDER_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.infoField}>
              <label className={styles.label}>Date of birth (optional)</label>
              <input
                className={styles.input}
                type="date"
                value={infoForm.date_of_birth}
                onChange={e =>
                  setInfoForm(prev => ({ ...prev, date_of_birth: e.target.value }))
                }
              />
            </div>
            <div className={styles.infoField}>
              <label className={styles.label}>National ID (optional)</label>
              <input
                className={styles.input}
                maxLength={12}
                inputMode="numeric"
                placeholder="12 digits"
                value={infoForm.national_id}
                onChange={e =>
                  setInfoForm(prev => ({ ...prev, national_id: e.target.value }))
                }
              />
            </div>
            <div className={styles.infoField}>
              <label className={styles.label}>Health insurance card (optional)</label>
              <input
                className={styles.input}
                maxLength={15}
                placeholder="e.g. HS4030012345678"
                value={infoForm.health_insurance_card}
                onChange={e =>
                  setInfoForm(prev => ({
                    ...prev,
                    health_insurance_card: e.target.value.toUpperCase(),
                  }))
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
  )
}