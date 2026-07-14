import { useState, useEffect } from 'react'
import {
  getAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
} from '../../services/addressService'
import { getProvinces, getWards } from '../../services/locationService'
import styles from './AddressBook.module.css'

const emptyForm = {
  label: '',
  street_address: '',
  province_code: '',
  province_name: '',
  ward_code: '',
  ward_name: '',
  postal_code: '',
  is_default: false,
}

export default function AddressBook() {
  const [addresses, setAddresses] = useState([])
  const [provinces, setProvinces] = useState([])
  const [wards, setWards] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editingAddress, setEditingAddress] = useState(null) // null = adding new
  const [formData, setFormData] = useState(emptyForm)
  const [loadingAddresses, setLoadingAddresses] = useState(false)
  const [loadingWards, setLoadingWards] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchAddresses()
    fetchProvinces()
  }, [])

  async function fetchAddresses() {
    setLoadingAddresses(true)
    setError('')
    try {
      const data = await getAddresses()
      setAddresses(Array.isArray(data) ? data : data?.results || [])
    } catch (err) {
      console.error('Failed to load addresses:', err)
      setError('Failed to load addresses.')
    } finally {
      setLoadingAddresses(false)
    }
  }

  async function fetchProvinces() {
    try {
      const data = await getProvinces()
      setProvinces(Array.isArray(data) ? data : data?.results || [])
    } catch (err) {
      console.error('Failed to load provinces:', err)
    }
  }

  async function handleProvinceChange(provinceCode, provinceName) {
    setFormData(prev => ({
      ...prev,
      province_code: provinceCode,
      province_name: provinceName,
      ward_code: '',
      ward_name: '',
    }))
    setWards([])
    if (!provinceCode) return

    setLoadingWards(true)
    try {
      const data = await getWards(provinceCode)
      setWards(Array.isArray(data) ? data : data?.results || [])
    } catch (err) {
      console.error('Failed to load wards:', err)
    } finally {
      setLoadingWards(false)
    }
  }

  function handleWardChange(wardCode, wardName) {
    setFormData(prev => ({ ...prev, ward_code: wardCode, ward_name: wardName }))
  }

  function handleAddNew() {
    setFormData(emptyForm)
    setEditingAddress(null)
    setWards([])
    setError('')
    setShowForm(true)
  }

  async function handleEdit(address) {
    setFormData({
      label: address.label || '',
      street_address: address.street_address || '',
      province_code: address.province_code || '',
      province_name: address.province_name || '',
      ward_code: address.ward_code || '',
      ward_name: address.ward_name || '',
      postal_code: address.postal_code || '',
      is_default: address.is_default || false,
    })
    setEditingAddress(address)
    setError('')
    setShowForm(true)

    if (address.province_code) {
      setLoadingWards(true)
      try {
        const data = await getWards(address.province_code)
        setWards(Array.isArray(data) ? data : data?.results || [])
      } catch (err) {
        console.error('Failed to load wards:', err)
      } finally {
        setLoadingWards(false)
      }
    }
  }

  function handleCancelForm() {
    setShowForm(false)
    setEditingAddress(null)
    setFormData(emptyForm)
    setWards([])
    setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!formData.label.trim()) return setError('Label is required.')
    if (!formData.province_code) return setError('Please select a province.')
    if (!formData.ward_code) return setError('Please select a ward.')
    if (!formData.street_address.trim()) return setError('Street address is required.')

    setSubmitting(true)
    try {
      if (editingAddress) {
        await updateAddress(editingAddress.user_address_id, formData)
      } else {
        await createAddress(formData)
      }
      await fetchAddresses()
      setShowForm(false)
      setEditingAddress(null)
      setFormData(emptyForm)
      setWards([])
    } catch (err) {
      console.error('Failed to save address:', err)
      setError(err.response?.data?.detail || 'Failed to save address. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Are you sure you want to delete this address?')) return
    try {
      await deleteAddress(id)
      await fetchAddresses()
    } catch (err) {
      console.error('Failed to delete address:', err)
      setError('Failed to delete address.')
    }
  }

  async function handleSetDefault(id) {
    try {
      await updateAddress(id, { is_default: true })
      await fetchAddresses() // refresh list with new default
    } catch (err) {
      console.error('Failed to set default address:', err)
      setError('Failed to set default address.')
    }
  }

  return (
    <div className={styles.wrapper}>
      {error && <p className={styles.errorMsg}>{error}</p>}

      {loadingAddresses ? (
        <p className={styles.muted}>Loading addresses...</p>
      ) : addresses.length === 0 && !showForm ? (
        <p className={styles.muted}>No saved addresses yet.</p>
      ) : (
        <div className={styles.addressList}>
          {addresses.map(address => (
            <div
              key={address.user_address_id}
              className={`${styles.addressCard} ${address.is_default ? styles.defaultCard : ''}`}
            >
              <div className={styles.cardTop}>
                <span className={styles.cardLabel}>{address.label}</span>
                {address.is_default && <span className={styles.defaultBadge}>Default</span>}
              </div>
              <p className={styles.cardAddress}>{address.full_address}</p>
              <div className={styles.cardActions}>
                {!address.is_default && (
                  <button
                    className={styles.setDefaultBtn}
                    onClick={() => handleSetDefault(address.user_address_id)}
                  >
                    Set default
                  </button>
                )}
                <button className={styles.editBtn} onClick={() => handleEdit(address)}>
                  Edit
                </button>
                <button
                  className={styles.deleteBtn}
                  onClick={() => handleDelete(address.user_address_id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!showForm && (
        <button className={styles.addBtn} onClick={handleAddNew}>
          + Add new address
        </button>
      )}

      {showForm && (
        <form className={styles.form} onSubmit={handleSubmit}>
          <div>
            <label className={styles.formLabel}>Label</label>
            <input
              className={styles.input}
              type="text"
              placeholder="Home, Work, Other"
              value={formData.label}
              onChange={e => setFormData(prev => ({ ...prev, label: e.target.value }))}
            />
          </div>

          <div className={styles.formGrid}>
            <div>
              <label className={styles.formLabel}>Province</label>
              <select
                className={styles.select}
                value={formData.province_code}
                onChange={e => {
                  const selected = provinces.find(p => p.code === e.target.value)
                  handleProvinceChange(e.target.value, selected?.name || '')
                }}
              >
                <option value="">Select province</option>
                {provinces.map(p => (
                  <option key={p.code} value={p.code}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={styles.formLabel}>Ward</label>
              <select
                className={styles.select}
                value={formData.ward_code}
                disabled={!formData.province_code || loadingWards}
                onChange={e => {
                  const selected = wards.find(w => w.code === e.target.value)
                  handleWardChange(e.target.value, selected?.name || '')
                }}
              >
                <option value="">
                  {!formData.province_code
                    ? 'Select province first'
                    : loadingWards
                    ? 'Loading wards...'
                    : 'Select ward'}
                </option>
                {wards.map(w => (
                  <option key={w.code} value={w.code}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={styles.formLabel}>Street address</label>
            <input
              className={styles.input}
              type="text"
              placeholder="123 Nguyễn Huệ"
              value={formData.street_address}
              onChange={e => setFormData(prev => ({ ...prev, street_address: e.target.value }))}
            />
          </div>

          <div>
            <label className={styles.formLabel}>Postal code (optional)</label>
            <input
              className={styles.input}
              type="text"
              maxLength={6}
              inputMode="numeric"
              value={formData.postal_code}
              onChange={e => setFormData(prev => ({ ...prev, postal_code: e.target.value }))}
            />
          </div>

          <label className={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={formData.is_default}
              onChange={e => setFormData(prev => ({ ...prev, is_default: e.target.checked }))}
            />
            Set as default address
          </label>

          <div className={styles.formActions}>
            <button type="submit" className={styles.saveBtn} disabled={submitting}>
              {submitting ? 'Saving...' : editingAddress ? 'Save changes' : 'Add address'}
            </button>
            <button type="button" className={styles.cancelBtn} onClick={handleCancelForm}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  )
}