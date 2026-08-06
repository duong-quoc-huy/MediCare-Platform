import { useEffect, useState } from 'react'
import { ArrowLeft, CalendarClock, Pencil, Plus, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { createMyDoctorSchedule, deleteMyDoctorSchedule, getMyDoctorSchedules, updateMyDoctorSchedule } from '../../services/doctorService'
import styles from './DoctorSchedulePage.module.css'
const DAYS=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']
const EMPTY={day_of_week:0,start_time:'09:00',end_time:'17:00',visit_type:'clinic',slot_duration_minutes:30}
const normalize=d=>Array.isArray(d)?d:d?.results||[]
const msg=e=>e.response?.data?.detail||e.response?.data?.non_field_errors?.[0]||Object.values(e.response?.data||{}).flat()[0]||'Schedule operation failed.'
export default function DoctorSchedulePage(){
 const [rows,setRows]=useState([]),[form,setForm]=useState(EMPTY),[editing,setEditing]=useState(null),[error,setError]=useState(''),[saving,setSaving]=useState(false)
 async function load(){try{setError('');setRows(normalize(await getMyDoctorSchedules()))}catch(e){setError(msg(e))}}
 useEffect(()=>{load()},[])
 function edit(r){setEditing(r);setForm({day_of_week:r.day_of_week,start_time:r.start_time.slice(0,5),end_time:r.end_time.slice(0,5),visit_type:r.visit_type,slot_duration_minutes:r.slot_duration_minutes})}
 function reset(){setEditing(null);setForm(EMPTY);setError('')}
 async function submit(e){e.preventDefault();setSaving(true);setError('');try{const p={...form,day_of_week:Number(form.day_of_week),slot_duration_minutes:Number(form.slot_duration_minutes)};editing?await updateMyDoctorSchedule(editing.id,p):await createMyDoctorSchedule(p);reset();await load()}catch(err){setError(msg(err))}finally{setSaving(false)}}
 async function remove(r){if(!confirm('Delete this working block?'))return;try{await deleteMyDoctorSchedule(r.id);await load()}catch(e){setError(msg(e))}}
 return <main className={styles.page}>
  <Link to="/doctor/dashboard" className={styles.back}><ArrowLeft size={18}/>Dashboard</Link>
  <header><div><span>Doctor portal</span><h1>My working schedule</h1><p>Create recurring weekly blocks. Different visit types may share a day only when their times do not overlap.</p></div><CalendarClock size={42}/></header>
  {error&&<div className={styles.error}>{error}</div>}
  <form className={styles.form} onSubmit={submit}>
   <label><span>Weekday</span><select value={form.day_of_week} onChange={e=>setForm({...form,day_of_week:e.target.value})}>{DAYS.map((d,i)=><option value={i} key={d}>{d}</option>)}</select></label>
   <label><span>Start</span><input type="time" value={form.start_time} onChange={e=>setForm({...form,start_time:e.target.value})}/></label>
   <label><span>End</span><input type="time" value={form.end_time} onChange={e=>setForm({...form,end_time:e.target.value})}/></label>
   <label><span>Visit type</span><select value={form.visit_type} onChange={e=>setForm({...form,visit_type:e.target.value})}><option value="clinic">Clinic</option><option value="home_visit">Home visit</option></select></label>
   <label><span>Slot duration</span><input type="number" min="5" step="5" value={form.slot_duration_minutes} onChange={e=>setForm({...form,slot_duration_minutes:e.target.value})}/></label>
   <div className={styles.actions}><button type="button" onClick={reset}>Reset</button><button disabled={saving}><Plus size={17}/>{editing?'Update block':'Add block'}</button></div>
  </form>
  <section className={styles.list}>{rows.length===0?<div className={styles.empty}>No working schedule configured.</div>:rows.map(r=><article key={r.id}><CalendarClock/><div><strong>{r.day_of_week_display}</strong><span>{r.start_time.slice(0,5)}–{r.end_time.slice(0,5)} · {r.visit_type_display} · {r.slot_duration_minutes} minutes</span></div><button onClick={()=>edit(r)}><Pencil size={17}/></button><button className={styles.delete} onClick={()=>remove(r)}><Trash2 size={17}/></button></article>)}</section>
 </main>
}
