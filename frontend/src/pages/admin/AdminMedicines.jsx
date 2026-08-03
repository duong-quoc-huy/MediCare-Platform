import { useEffect, useState } from 'react'
import { ImagePlus, Plus, Trash2, X } from 'lucide-react'
import AdminPage from '../../components/admin/AdminPage'
import {
  createAdminMedicine,
  getAdminMedicines,
  getMedicineCategories,
  getMedicineManufacturers,
  updateAdminMedicine,
} from '../../services/adminService'
import common from './adminCommon.module.css'

const normalize = data => Array.isArray(data) ? data : data?.results || []
const EMPTY = {
  medicine_name: '', generic_name: '', medicine_category: '',
  medicine_manufacturer: '', medicine_description: '',
  dosage: '', unit_type: '', package_size: '', expiry_date: '',
  storage_instructions: '', usage_instructions: '',
  side_effects: '', active_ingredients: '',
  medicine_stock: 0, shipping_weight_grams: 100,
  medicine_price: '', medicine_requires_prescription: false,
  medicine_is_active: true,
}

export default function AdminMedicines() {
  const [rows, setRows] = useState([])
  const [categories, setCategories] = useState([])
  const [manufacturers, setManufacturers] = useState([])
  const [search, setSearch] = useState('')
  const [lowStock, setLowStock] = useState('')
  const [form, setForm] = useState(EMPTY)
  const [editing, setEditing] = useState(null)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState('')
  const [removeImage, setRemoveImage] = useState(false)

  async function load() {
    try {
      const [medicineData, categoryData, manufacturerData] = await Promise.all([
        getAdminMedicines({
          search: search || undefined,
          low_stock: lowStock || undefined,
        }),
        getMedicineCategories(),
        getMedicineManufacturers(),
      ])
      setRows(normalize(medicineData))
      setCategories(normalize(categoryData))
      setManufacturers(normalize(manufacturerData))
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not load medicines.')
    }
  }

  useEffect(() => {
    const timeout = window.setTimeout(load, 250)
    return () => window.clearTimeout(timeout)
  }, [search, lowStock])

  function resetImageEditor() {
    if (imagePreview.startsWith('blob:')) URL.revokeObjectURL(imagePreview)
    setImageFile(null)
    setImagePreview('')
    setRemoveImage(false)
  }

  function openCreate() {
    resetImageEditor()
    setEditing(null)
    setForm(EMPTY)
    setError('')
    setOpen(true)
  }

  function closeEditor() {
    setOpen(false)
    resetImageEditor()
  }

  function handleImageChange(event) {
    const file = event.target.files?.[0]
    if (!file) return

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Medicine image must be JPG, PNG, or WebP.')
      event.target.value = ''
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Medicine image must be 5 MB or smaller.')
      event.target.value = ''
      return
    }

    if (imagePreview.startsWith('blob:')) URL.revokeObjectURL(imagePreview)
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
    setRemoveImage(false)
    setError('')
  }

  function handleRemoveImage() {
    if (imagePreview.startsWith('blob:')) URL.revokeObjectURL(imagePreview)
    setImageFile(null)
    setImagePreview('')
    setRemoveImage(true)
  }

  function edit(row) {
    resetImageEditor()
    setEditing(row)
    setForm({
      ...EMPTY,
      ...row,
      medicine_category: row.medicine_category || '',
      medicine_manufacturer: row.medicine_manufacturer || '',
      expiry_date: row.expiry_date || '',
    })
    setImagePreview(row.medicine_image || '')
    setOpen(true)
  }

  async function submit(event) {
    event.preventDefault()

    try {
      setSaving(true)
      setError('')

      const payload = new FormData()

      Object.entries(form).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          payload.append(key, String(value))
        }
      })

      if (imageFile) payload.append('medicine_image', imageFile)
      payload.append('remove_medicine_image', String(removeImage))

      if (editing) {
        await updateAdminMedicine(editing.medicine_id, payload)
      } else {
        await createAdminMedicine(payload)
      }

      closeEditor()
      setEditing(null)
      setForm(EMPTY)
      await load()
    } catch (err) {
      const data = err.response?.data
      setError(
        data?.detail ||
        Object.values(data || {}).flat().join(' ') ||
        'Could not save medicine.'
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
          <h1>Medicine and stock</h1>
          <p>Manage sellable medicines, prices, stock, expiry dates, and shipping weight.</p>
        </div>
        <button className={common.primary} onClick={() => {
          openCreate()
        }}><Plus size={18} />Add medicine</button>
      </header>

      {error && <div className={common.error}>{error}</div>}

      <section className={common.toolbar}>
        <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search medicine or ingredient" />
        <select value={lowStock} onChange={event => setLowStock(event.target.value)}>
          <option value="">All stock levels</option>
          <option value="true">Low stock (10 or fewer)</option>
        </select>
        <button className={common.primary} onClick={load}>Refresh</button>
      </section>

      <section className={common.grid}>
        {rows.map(row => (
          <article className={common.card} key={row.medicine_id}>
            {row.medicine_image ? (
              <img src={row.medicine_image} alt={row.medicine_name} className={common.medicineCardImage} />
            ) : (
              <div className={common.medicineCardImageFallback}><ImagePlus size={28} /><span>No image</span></div>
            )}
            <span className={common.badge}>{row.medicine_is_active ? 'active' : 'inactive'}</span>
            <h2>{row.medicine_name}</h2>
            <p>{row.generic_name || row.category_name || 'Medicine'}</p>
            <div className={common.meta}>
              <div><span>Stock</span><strong>{row.medicine_stock}</strong></div>
              <div><span>Price</span><strong>{Number(row.medicine_price).toLocaleString('vi-VN')} VND</strong></div>
              <div><span>Weight</span><strong>{row.shipping_weight_grams || 0} g</strong></div>
              <div><span>Expiry</span><strong>{row.expiry_date || 'Not set'}</strong></div>
            </div>
            <div className={common.actions}>
              <button className={common.secondary} onClick={() => edit(row)}>Edit</button>
            </div>
          </article>
        ))}
      </section>

      {open && (
        <div className={common.modalBackdrop} onMouseDown={closeEditor}>
          <section className={common.modal} onMouseDown={event => event.stopPropagation()}>
            <div className={common.modalHeader}>
              <div><h2>{editing ? 'Edit medicine' : 'Create medicine'}</h2></div>
              <button type="button" onClick={closeEditor}><X size={20} /></button>
            </div>
            <form className={common.form} onSubmit={submit}>
              <div className={`${common.full} ${common.imageEditor}`}>
                <div className={common.imagePreview}>
                  {imagePreview ? <img src={imagePreview} alt="Medicine preview" /> : <ImagePlus size={32} />}
                </div>
                <div className={common.imageEditorActions}>
                  <strong>Medicine image</strong>
                  <input className={common.fileInput} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageChange} />
                  {imagePreview && (
                    <button type="button" className={common.danger} onClick={handleRemoveImage}>
                      <Trash2 size={16} /> Remove image
                    </button>
                  )}
                  <small>JPG, PNG, or WebP. Maximum 5 MB.</small>
                </div>
              </div>
              {[
                ['medicine_name', 'Medicine name', 'text'],
                ['generic_name', 'Generic name', 'text'],
                ['dosage', 'Dosage', 'text'],
                ['unit_type', 'Unit type', 'text'],
                ['package_size', 'Package size', 'text'],
                ['expiry_date', 'Expiry date', 'date'],
                ['medicine_stock', 'Stock', 'number'],
                ['shipping_weight_grams', 'Shipping weight (g)', 'number'],
                ['medicine_price', 'Price', 'number'],
              ].map(([key, label, type]) => (
                <label key={key}>
                  <span>{label}</span>
                  <input
                    type={type}
                    required={['medicine_name', 'medicine_price', 'medicine_stock'].includes(key)}
                    value={form[key] ?? ''}
                    onChange={event => setForm(previous => ({
                      ...previous,
                      [key]: event.target.value,
                    }))}
                  />
                </label>
              ))}
              <label>
                <span>Category</span>
                <select value={form.medicine_category || ''} onChange={event => setForm(previous => ({ ...previous, medicine_category: event.target.value }))}>
                  <option value="">No category</option>
                  {categories.map(item => <option key={item.category_id} value={item.category_id}>{item.category_name}</option>)}
                </select>
              </label>
              <label>
                <span>Manufacturer</span>
                <select value={form.medicine_manufacturer || ''} onChange={event => setForm(previous => ({ ...previous, medicine_manufacturer: event.target.value }))}>
                  <option value="">No manufacturer</option>
                  {manufacturers.map(item => <option key={item.manufacturer_id} value={item.manufacturer_id}>{item.manufacturer_name}</option>)}
                </select>
              </label>
              <label className={common.full}>
                <span>Description</span>
                <textarea rows={4} value={form.medicine_description} onChange={event => setForm(previous => ({ ...previous, medicine_description: event.target.value }))} />
              </label>
              <label>
                <span>Prescription required</span>
                <select value={String(form.medicine_requires_prescription)} onChange={event => setForm(previous => ({ ...previous, medicine_requires_prescription: event.target.value === 'true' }))}>
                  <option value="false">No</option>
                  <option value="true">Yes</option>
                </select>
              </label>
              <label>
                <span>State</span>
                <select value={String(form.medicine_is_active)} onChange={event => setForm(previous => ({ ...previous, medicine_is_active: event.target.value === 'true' }))}>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </label>
              <div className={common.formActions}>
                <button type="button" className={common.secondary} onClick={closeEditor} disabled={saving}>Cancel</button>
                <button className={common.primary} disabled={saving}>{saving ? 'Saving...' : 'Save medicine'}</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </AdminPage>
  )
}
