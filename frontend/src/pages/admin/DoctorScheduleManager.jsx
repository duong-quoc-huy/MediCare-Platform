import { useEffect, useState } from 'react'
import { CalendarClock, Pencil, Plus, Trash2, X } from 'lucide-react'
import {
  createDoctorSchedule,
  deleteDoctorSchedule,
  getDoctorSchedules,
  updateDoctorSchedule,
} from '../../services/adminService'
import common from './adminCommon.module.css'

const EMPTY = { day_of_week: 0, start_time: '09:00', end_time: '17:00', visit_type: 'clinic', slot_duration_minutes: 30 }
const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']
const normalize = data => Array.isArray(data) ? data : data?.results || []
const message = err => err.response?.data?.detail || err.response?.data?.non_field_errors?.[0] || Object.values(err.response?.data || {}).flat()[0] || 'Schedule operation failed.'

export default function DoctorScheduleManager({ doctor, onClose }) {
  const [rows, setRows] = useState([])
  const [form, setForm] = useState(EMPTY)
  const [editing, setEditing] = useState(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function load() {
    try { setError(''); setRows(normalize(await getDoctorSchedules(doctor.id))) }
    catch (err) { setError(message(err)) }
  }
  useEffect(() => { load() }, [doctor.id])

  function beginEdit(row) {
    setEditing(row)
    setForm({ day_of_week: row.day_of_week, start_time: row.start_time.slice(0,5), end_time: row.end_time.slice(0,5), visit_type: row.visit_type, slot_duration_minutes: row.slot_duration_minutes })
  }
  function reset() { setEditing(null); setForm(EMPTY); setError('') }
  async function submit(event) {
    event.preventDefault(); setSaving(true); setError('')
    try {
      const payload = { ...form, day_of_week: Number(form.day_of_week), slot_duration_minutes: Number(form.slot_duration_minutes) }
      if (editing) await updateDoctorSchedule(doctor.id, editing.id, payload)
      else await createDoctorSchedule(doctor.id, payload)
      reset(); await load()
    } catch (err) { setError(message(err)) } finally { setSaving(false) }
  }
  async function remove(row) {
    if (!window.confirm(`Delete ${row.day_of_week_display} ${row.start_time.slice(0,5)}–${row.end_time.slice(0,5)}?`)) return
    try { setError(''); await deleteDoctorSchedule(doctor.id, row.id); await load() }
    catch (err) { setError(message(err)) }
  }

  return <div className={common.modalBackdrop} onMouseDown={onClose}>
    <section className={`${common.modal} ${common.scheduleModal}`} onMouseDown={e => e.stopPropagation()}>
      <div className={common.modalHeader}>
        <div><h2>Working schedule</h2><p>Dr. {doctor.full_name} · Multiple non-overlapping blocks are allowed.</p></div>
        <button type="button" onClick={onClose}><X size={20}/></button>
      </div>
      {error && <div className={common.error}>{error}</div>}
      <form className={common.scheduleForm} onSubmit={submit}>
        <label><span>Weekday</span><select value={form.day_of_week} onChange={e=>setForm({...form,day_of_week:e.target.value})}>{DAYS.map((d,i)=><option key={d} value={i}>{d}</option>)}</select></label>
        <label><span>Start</span><input type="time" required value={form.start_time} onChange={e=>setForm({...form,start_time:e.target.value})}/></label>
        <label><span>End</span><input type="time" required value={form.end_time} onChange={e=>setForm({...form,end_time:e.target.value})}/></label>
        <label><span>Visit type</span><select value={form.visit_type} onChange={e=>setForm({...form,visit_type:e.target.value})}><option value="clinic">Clinic</option><option value="home_visit">Home visit</option></select></label>
        <label><span>Slot minutes</span><input type="number" min="5" step="5" required value={form.slot_duration_minutes} onChange={e=>setForm({...form,slot_duration_minutes:e.target.value})}/></label>
        <div className={common.scheduleFormActions}><button type="button" className={common.secondary} onClick={reset}>Reset</button><button className={common.primary} disabled={saving}>{editing ? 'Update block' : 'Add block'}</button></div>
      </form>
      <div className={common.scheduleList}>
        {rows.length === 0 ? <div className={common.empty}>No working blocks configured.</div> : rows.map(row => <article key={row.id} className={common.scheduleRow}>
          <CalendarClock size={20}/><div><strong>{row.day_of_week_display}</strong><span>{row.start_time.slice(0,5)}–{row.end_time.slice(0,5)} · {row.visit_type_display} · {row.slot_duration_minutes} min</span></div>
          <button className={common.secondary} onClick={()=>beginEdit(row)}><Pencil size={16}/></button>
          <button className={common.danger} onClick={()=>remove(row)}><Trash2 size={16}/></button>
        </article>)}
      </div>
    </section>
  </div>
}
