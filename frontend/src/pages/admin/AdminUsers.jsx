import { useEffect, useRef, useState } from 'react'
import { Camera, Plus, Trash2, X } from 'lucide-react'
import AdminPage from '../../components/admin/AdminPage'
import {
  createAdminUser,
  getAdminUsers,
  setAdminUserActive,
  updateAdminUser,
} from '../../services/adminService'
import common from './adminCommon.module.css'

const normalize = data =>
  Array.isArray(data) ? data : data?.results || []

const EMPTY = {
  full_name: '',
  email: '',
  phone_number_1: '',
  phone_number_2: '',
  role: 'patient',
  password: '',
  is_active: true,
  email_verified: true,
  profile_image: null,
  remove_profile_image: false,
}

function resolveMediaUrl(value) {
  if (!value) return ''
  if (/^(https?:|blob:|data:)/i.test(value)) return value
  return `${window.location.origin}${value.startsWith('/') ? '' : '/'}${value}`
}

function buildUserFormData(form, editing) {
  const data = new FormData()

  ;[
    'full_name',
    'email',
    'phone_number_1',
    'phone_number_2',
    'role',
  ].forEach(key => {
    data.append(key, form[key] ?? '')
  })

  data.append('is_active', String(form.is_active))
  data.append('email_verified', String(form.email_verified))

  if (form.password) {
    data.append('password', form.password)
  }

  // Patients intentionally do not receive an admin profile-image field.
  if (form.role !== 'patient') {
    if (form.profile_image instanceof File) {
      data.append('profile_image', form.profile_image)
    } else if (
      editing &&
      form.remove_profile_image
    ) {
      // DRF ImageField accepts an empty value on multipart PATCH
      // when allow_null=True.
      data.append('profile_image', '')
    }
  }

  return data
}

export default function AdminUsers() {
  const [rows, setRows] = useState([])
  const [search, setSearch] = useState('')
  const [role, setRole] = useState('')
  const [form, setForm] = useState(EMPTY)
  const [editing, setEditing] = useState(null)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [previewUrl, setPreviewUrl] = useState('')
  const fileInputRef = useRef(null)

  async function load() {
    try {
      setError('')
      setRows(
        normalize(
          await getAdminUsers({
            search: search || undefined,
            role: role || undefined,
          })
        )
      )
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        'Could not load users.'
      )
    }
  }

  useEffect(() => {
    const timeout = window.setTimeout(load, 250)
    return () => window.clearTimeout(timeout)
  }, [search, role])

  useEffect(() => {
    return () => {
      if (previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  function resetEditor() {
    if (previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl)
    }

    setPreviewUrl('')
    setEditing(null)
    setForm(EMPTY)
  }

  function beginCreate() {
    resetEditor()
    setOpen(true)
  }

  function beginEdit(user) {
    resetEditor()
    setEditing(user)
    setForm({
      full_name: user.full_name,
      email: user.email,
      phone_number_1: user.phone_number_1,
      phone_number_2: user.phone_number_2 || '',
      role: user.role,
      password: '',
      is_active: user.is_active,
      email_verified: user.email_verified,
      profile_image: null,
      remove_profile_image: false,
    })
    setPreviewUrl(resolveMediaUrl(user.profile_image))
    setOpen(true)
  }

  function handleImageChange(event) {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Please choose a valid image file.')
      event.target.value = ''
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Profile image must be 5 MB or smaller.')
      event.target.value = ''
      return
    }

    if (previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl)
    }

    setPreviewUrl(URL.createObjectURL(file))
    setForm(previous => ({
      ...previous,
      profile_image: file,
      remove_profile_image: false,
    }))
  }

  function removeImage() {
    if (previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl)
    }

    setPreviewUrl('')
    setForm(previous => ({
      ...previous,
      profile_image: null,
      remove_profile_image: true,
    }))

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  async function submit(event) {
    event.preventDefault()

    try {
      setSaving(true)
      setError('')

      const payload = buildUserFormData(
        form,
        Boolean(editing)
      )

      if (editing) {
        await updateAdminUser(
          editing.user_id,
          payload
        )
      } else {
        await createAdminUser(payload)
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
        'Could not save user.'
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
          <h1>User management</h1>
          <p>
            Create, edit, activate, and deactivate
            system accounts.
          </p>
        </div>

        <button
          className={common.primary}
          onClick={beginCreate}
        >
          <Plus size={18} />
          Add user
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
          placeholder="Search name, email, or phone"
        />

        <select
          value={role}
          onChange={event =>
            setRole(event.target.value)
          }
        >
          <option value="">All roles</option>

          {[
            'patient',
            'doctor',
            'nurse',
            'shipper',
            'admin',
          ].map(item => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        <button
          className={common.primary}
          onClick={load}
        >
          Refresh
        </button>
      </section>

      <section className={common.grid}>
        {rows.map(user => (
          <article
            className={common.card}
            key={user.user_id}
          >
            <div className={common.identityRow}>
              {user.role !== 'patient' &&
              user.profile_image ? (
                <img
                  className={common.avatarImage}
                  src={resolveMediaUrl(
                    user.profile_image
                  )}
                  alt={`${user.full_name} profile`}
                />
              ) : (
                <div className={common.avatarFallback}>
                  {(user.full_name || user.email)
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
              )}

              <div>
                <span className={common.badge}>
                  {user.role}
                </span>
                <h2>{user.full_name}</h2>
                <p>{user.email}</p>
              </div>
            </div>

            <div className={common.meta}>
              <div>
                <span>Phone</span>
                <strong>
                  {user.phone_number_1}
                </strong>
              </div>

              <div>
                <span>Status</span>
                <strong>
                  {user.is_active
                    ? 'Active'
                    : 'Inactive'}
                </strong>
              </div>

              <div>
                <span>Verified</span>
                <strong>
                  {user.email_verified
                    ? 'Yes'
                    : 'No'}
                </strong>
              </div>
            </div>

            <div className={common.actions}>
              <button
                className={common.secondary}
                onClick={() => beginEdit(user)}
              >
                Edit
              </button>

              <button
                className={
                  user.is_active
                    ? common.danger
                    : common.success
                }
                onClick={async () => {
                  await setAdminUserActive(
                    user.user_id,
                    !user.is_active
                  )
                  await load()
                }}
              >
                {user.is_active
                  ? 'Deactivate'
                  : 'Activate'}
              </button>
            </div>
          </article>
        ))}
      </section>

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
                    ? 'Edit user'
                    : 'Create user'}
                </h2>

                <p>
                  Patient accounts intentionally do
                  not expose profile-image management
                  here.
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
              ].map(([key, label, type]) => (
                <label key={key}>
                  <span>{label}</span>

                  <input
                    required={
                      !editing &&
                      key !== 'phone_number_2'
                    }
                    type={type}
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

              <label>
                <span>Role</span>

                <select
                  value={form.role}
                  onChange={event => {
                    const nextRole =
                      event.target.value

                    if (nextRole === 'patient') {
                      removeImage()
                    }

                    setForm(previous => ({
                      ...previous,
                      role: nextRole,
                    }))
                  }}
                >
                  {[
                    'patient',
                    'doctor',
                    'nurse',
                    'shipper',
                    'admin',
                  ].map(item => (
                    <option
                      key={item}
                      value={item}
                    >
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              {form.role !== 'patient' && (
                <div className={common.full}>
                  <span className={common.fieldLabel}>
                    Profile image
                  </span>

                  <div className={common.imageEditor}>
                    <div className={common.imagePreview}>
                      {previewUrl ? (
                        <img
                          src={previewUrl}
                          alt="Profile preview"
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
                        ref={fileInputRef}
                        className={common.fileInput}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={handleImageChange}
                      />

                      <small>
                        JPG, PNG, or WEBP. Maximum
                        5 MB.
                      </small>

                      {previewUrl && (
                        <button
                          type="button"
                          className={common.danger}
                          onClick={removeImage}
                        >
                          <Trash2 size={17} />
                          Remove image
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

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
                    : 'Save account'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </AdminPage>
  )
}
