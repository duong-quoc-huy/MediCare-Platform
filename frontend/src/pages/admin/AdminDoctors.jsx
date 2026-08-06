import {
  useEffect,
  useRef,
  useState,
} from 'react'
import {
  CalendarClock,
  Camera,
  FileSignature,
  Plus,
  Trash2,
  X,
} from 'lucide-react'
import AdminPage from '../../components/admin/AdminPage'
import {
  createAdminDoctor,
  getAdminDoctors,
  updateAdminDoctor,
} from '../../services/adminService'
import common from './adminCommon.module.css'
import DoctorScheduleManager from './DoctorScheduleManager'

const normalize = data =>
  Array.isArray(data) ? data : data?.results || []

const EMPTY = {
  full_name: '',
  email: '',
  phone_number_1: '',
  phone_number_2: '',
  password: '',
  specialty: '',
  bio: '',
  experience_years: 0,
  consultation_fee: '',
  is_available: true,
  user_is_active: true,
  profile_image: null,
  signature_image: null,
  remove_profile_image: false,
  remove_signature_image: false,
}

function resolveMediaUrl(value) {
  if (!value) return ''
  if (/^(https?:|blob:|data:)/i.test(value)) return value
  return `${window.location.origin}${value.startsWith('/') ? '' : '/'}${value}`
}

function htmlToPlainText(value = '') {
  if (!value) return ''

  const parser = new DOMParser()
  const document = parser.parseFromString(
    value,
    'text/html'
  )

  document.querySelectorAll('br').forEach(node => {
    node.replaceWith('\n')
  })

  document
    .querySelectorAll('p, div, li')
    .forEach(node => {
      node.append('\n')
    })

  return (document.body.textContent || '')
    .replace(/\u00a0/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function buildDoctorFormData(form, editing) {
  const data = new FormData()

  ;[
    'full_name',
    'email',
    'phone_number_1',
    'phone_number_2',
    'specialty',
    'bio',
    'experience_years',
    'consultation_fee',
  ].forEach(key => {
    data.append(key, form[key] ?? '')
  })

  data.append(
    'is_available',
    String(form.is_available)
  )
  data.append(
    'user_is_active',
    String(form.user_is_active)
  )

  if (form.password) {
    data.append('password', form.password)
  }

  if (form.profile_image instanceof File) {
    data.append(
      'profile_image',
      form.profile_image
    )
  } else if (
    editing &&
    form.remove_profile_image
  ) {
    data.append('profile_image', '')
  }

  if (form.signature_image instanceof File) {
    data.append(
      'signature_image',
      form.signature_image
    )
  } else if (
    editing &&
    form.remove_signature_image
  ) {
    data.append('signature_image', '')
  }

  return data
}

export default function AdminDoctors() {
  const [rows, setRows] = useState([])
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [scheduleDoctor, setScheduleDoctor] = useState(null)

  const [profilePreview, setProfilePreview] =
    useState('')
  const [
    signaturePreview,
    setSignaturePreview,
  ] = useState('')

  const profileInputRef = useRef(null)
  const signatureInputRef = useRef(null)

  async function load() {
    try {
      setError('')
      setRows(
        normalize(
          await getAdminDoctors({
            search: search || undefined,
          })
        )
      )
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        'Could not load doctors.'
      )
    }
  }

  useEffect(() => {
    const timeout = window.setTimeout(load, 250)
    return () => window.clearTimeout(timeout)
  }, [search])

  useEffect(() => {
    return () => {
      ;[
        profilePreview,
        signaturePreview,
      ].forEach(url => {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url)
        }
      })
    }
  }, [profilePreview, signaturePreview])

  function clearBlob(url) {
    if (url.startsWith('blob:')) {
      URL.revokeObjectURL(url)
    }
  }

  function resetEditor() {
    clearBlob(profilePreview)
    clearBlob(signaturePreview)

    setProfilePreview('')
    setSignaturePreview('')
    setEditing(null)
    setForm(EMPTY)
  }

  function beginCreate() {
    resetEditor()
    setOpen(true)
  }

  function beginEdit(row) {
    resetEditor()
    setEditing(row)

    setForm({
      full_name: row.full_name,
      email: row.email,
      phone_number_1: row.phone_number_1,
      phone_number_2:
        row.phone_number_2 || '',
      password: '',
      specialty: row.specialty,
      // CKEditor stores HTML. Convert entities such as
      // &aacute; and tags such as <p> into readable
      // Vietnamese plain text for the textarea.
      bio: htmlToPlainText(row.bio),
      experience_years:
        row.experience_years,
      consultation_fee:
        row.consultation_fee,
      is_available: row.is_available,
      user_is_active: row.user_is_active,
      profile_image: null,
      signature_image: null,
      remove_profile_image: false,
      remove_signature_image: false,
    })

    setProfilePreview(
      resolveMediaUrl(row.profile_image)
    )
    setSignaturePreview(
      resolveMediaUrl(row.signature_image)
    )
    setOpen(true)
  }

  function validateImage(file, label) {
    if (!file.type.startsWith('image/')) {
      setError(
        `${label} must be a valid image file.`
      )
      return false
    }

    if (file.size > 5 * 1024 * 1024) {
      setError(
        `${label} must be 5 MB or smaller.`
      )
      return false
    }

    return true
  }

  function chooseProfile(event) {
    const file = event.target.files?.[0]
    if (!file) return

    if (!validateImage(file, 'Profile image')) {
      event.target.value = ''
      return
    }

    clearBlob(profilePreview)
    setProfilePreview(URL.createObjectURL(file))
    setForm(previous => ({
      ...previous,
      profile_image: file,
      remove_profile_image: false,
    }))
  }

  function chooseSignature(event) {
    const file = event.target.files?.[0]
    if (!file) return

    if (!validateImage(file, 'Signature image')) {
      event.target.value = ''
      return
    }

    clearBlob(signaturePreview)
    setSignaturePreview(
      URL.createObjectURL(file)
    )
    setForm(previous => ({
      ...previous,
      signature_image: file,
      remove_signature_image: false,
    }))
  }

  function removeProfile() {
    clearBlob(profilePreview)
    setProfilePreview('')
    setForm(previous => ({
      ...previous,
      profile_image: null,
      remove_profile_image: true,
    }))

    if (profileInputRef.current) {
      profileInputRef.current.value = ''
    }
  }

  function removeSignature() {
    clearBlob(signaturePreview)
    setSignaturePreview('')
    setForm(previous => ({
      ...previous,
      signature_image: null,
      remove_signature_image: true,
    }))

    if (signatureInputRef.current) {
      signatureInputRef.current.value = ''
    }
  }

  async function submit(event) {
    event.preventDefault()

    try {
      setSaving(true)
      setError('')

      const payload = buildDoctorFormData(
        form,
        Boolean(editing)
      )

      if (editing) {
        await updateAdminDoctor(
          editing.id,
          payload
        )
      } else {
        await createAdminDoctor(payload)
      }

      setOpen(false)
      resetEditor()
      await load()
    } catch (err) {
      const data = err.response?.data

      setError(
        data?.detail ||
        Object.values(data || {})
          .flat()
          .join(' ') ||
        'Could not save doctor.'
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <AdminPage>
      <header className={common.header}>
        <div>
          <span>Admin portal</span>
          <h1>Doctor management</h1>
          <p>
            Manage doctor accounts, profiles,
            signatures, fees, and availability.
          </p>
        </div>

        <button
          className={common.primary}
          onClick={beginCreate}
        >
          <Plus size={18} />
          Add doctor
        </button>
      </header>

      {error && (
        <div className={common.error}>
          {error}
        </div>
      )}

      <section className={common.toolbar}>
        <input
          value={search}
          onChange={event =>
            setSearch(event.target.value)
          }
          placeholder="Search doctor, email, or specialty"
        />

        <span />

        <button
          className={common.primary}
          onClick={load}
        >
          Refresh
        </button>
      </section>

      <section className={common.grid}>
        {rows.map(row => (
          <article
            className={common.card}
            key={row.id}
          >
            <div className={common.identityRow}>
              {row.profile_image ? (
                <img
                  className={common.avatarImage}
                  src={resolveMediaUrl(
                    row.profile_image
                  )}
                  alt={`${row.full_name} profile`}
                />
              ) : (
                <div className={common.avatarFallback}>
                  {row.full_name
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
              )}

              <div>
                <span className={common.badge}>
                  {row.is_available
                    ? 'available'
                    : 'unavailable'}
                </span>

                <h2>{row.full_name}</h2>
                <p>{row.specialty}</p>
              </div>
            </div>

            <div className={common.meta}>
              <div>
                <span>Email</span>
                <strong>{row.email}</strong>
              </div>

              <div>
                <span>Experience</span>
                <strong>
                  {row.experience_years} years
                </strong>
              </div>

              <div>
                <span>Fee</span>
                <strong>
                  {Number(
                    row.consultation_fee
                  ).toLocaleString('vi-VN')}{' '}
                  VND
                </strong>
              </div>

              <div>
                <span>Signature</span>
                <strong>
                  {row.signature_image
                    ? 'Uploaded'
                    : 'Not uploaded'}
                </strong>
              </div>
            </div>

            <div className={common.actions}>
              <button
                className={common.secondary}
                onClick={() => beginEdit(row)}
              >
                Edit profile
              </button>
              <button
                className={common.secondary}
                onClick={() => setScheduleDoctor(row)}
              >
                <CalendarClock size={17} />
                Manage schedule
              </button>
            </div>
          </article>
        ))}
      </section>

      {scheduleDoctor && (
        <DoctorScheduleManager
          doctor={scheduleDoctor}
          onClose={() => setScheduleDoctor(null)}
        />
      )}

      {open && (
        <div
          className={common.modalBackdrop}
          onMouseDown={() => {
            setOpen(false)
            resetEditor()
          }}
        >
          <section
            className={common.modal}
            onMouseDown={event =>
              event.stopPropagation()
            }
          >
            <div className={common.modalHeader}>
              <div>
                <h2>
                  {editing
                    ? 'Edit doctor'
                    : 'Create doctor'}
                </h2>

                <p>
                  Upload the public profile image
                  and clinical signature separately.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  resetEditor()
                }}
              >
                <X size={20} />
              </button>
            </div>

            <form
              className={common.form}
              onSubmit={submit}
            >
              {[
                [
                  'full_name',
                  'Full name',
                  'text',
                ],
                ['email', 'Email', 'email'],
                [
                  'phone_number_1',
                  'Primary phone',
                  'text',
                ],
                [
                  'phone_number_2',
                  'Secondary phone',
                  'text',
                ],
                [
                  'password',
                  editing
                    ? 'New password (optional)'
                    : 'Password',
                  'password',
                ],
                [
                  'specialty',
                  'Specialty',
                  'text',
                ],
                [
                  'experience_years',
                  'Experience years',
                  'number',
                ],
                [
                  'consultation_fee',
                  'Consultation fee',
                  'number',
                ],
              ].map(([key, label, type]) => (
                <label key={key}>
                  <span>{label}</span>

                  <input
                    type={type}
                    required={
                      !editing &&
                      key !== 'phone_number_2'
                    }
                    value={form[key]}
                    onChange={event =>
                      setForm(previous => ({
                        ...previous,
                        [key]: event.target.value,
                      }))
                    }
                  />
                </label>
              ))}

              <label className={common.full}>
                <span>Biography</span>

                <textarea
                  rows={5}
                  value={form.bio}
                  onChange={event =>
                    setForm(previous => ({
                      ...previous,
                      bio: event.target.value,
                    }))
                  }
                  placeholder="Example: Bác sĩ Tai Mũi Họng"
                />

                <small className={common.helpText}>
                  Existing CKEditor HTML and entities
                  are converted into readable Vietnamese
                  text while editing.
                </small>
              </label>

              <div className={common.full}>
                <span className={common.fieldLabel}>
                  Profile image
                </span>

                <div className={common.imageEditor}>
                  <div className={common.imagePreview}>
                    {profilePreview ? (
                      <img
                        src={profilePreview}
                        alt="Doctor profile preview"
                      />
                    ) : (
                      <Camera size={30} />
                    )}
                  </div>

                  <div
                    className={
                      common.imageEditorActions
                    }
                  >
                    <input
                      ref={profileInputRef}
                      className={common.fileInput}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={chooseProfile}
                    />

                    <small>
                      Public doctor portrait. JPG,
                      PNG, or WEBP, maximum 5 MB.
                    </small>

                    {profilePreview && (
                      <button
                        type="button"
                        className={common.danger}
                        onClick={removeProfile}
                      >
                        <Trash2 size={17} />
                        Remove profile image
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className={common.full}>
                <span className={common.fieldLabel}>
                  Doctor signature image
                </span>

                <div className={common.imageEditor}>
                  <div
                    className={
                      common.signaturePreview
                    }
                  >
                    {signaturePreview ? (
                      <img
                        src={signaturePreview}
                        alt="Doctor signature preview"
                      />
                    ) : (
                      <FileSignature size={32} />
                    )}
                  </div>

                  <div
                    className={
                      common.imageEditorActions
                    }
                  >
                    <input
                      ref={signatureInputRef}
                      className={common.fileInput}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={chooseSignature}
                    />

                    <small>
                      Used for generated clinical
                      documents and prescriptions.
                    </small>

                    {signaturePreview && (
                      <button
                        type="button"
                        className={common.danger}
                        onClick={removeSignature}
                      >
                        <Trash2 size={17} />
                        Remove signature
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <label>
                <span>Availability</span>

                <select
                  value={String(
                    form.is_available
                  )}
                  onChange={event =>
                    setForm(previous => ({
                      ...previous,
                      is_available:
                        event.target.value ===
                        'true',
                    }))
                  }
                >
                  <option value="true">
                    Available
                  </option>
                  <option value="false">
                    Unavailable
                  </option>
                </select>
              </label>

              <label>
                <span>Account state</span>

                <select
                  value={String(
                    form.user_is_active
                  )}
                  onChange={event =>
                    setForm(previous => ({
                      ...previous,
                      user_is_active:
                        event.target.value ===
                        'true',
                    }))
                  }
                >
                  <option value="true">
                    Active
                  </option>
                  <option value="false">
                    Inactive
                  </option>
                </select>
              </label>

              <div className={common.formActions}>
                <button
                  type="button"
                  className={common.secondary}
                  onClick={() => {
                    setOpen(false)
                    resetEditor()
                  }}
                >
                  Cancel
                </button>

                <button
                  className={common.primary}
                  disabled={saving}
                >
                  {saving
                    ? 'Saving...'
                    : 'Save doctor'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </AdminPage>
  )
}
