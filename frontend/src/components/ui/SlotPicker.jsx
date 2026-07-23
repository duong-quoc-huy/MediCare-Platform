import styles from './SlotPicker.module.css'

function getTodayDateString() {
  return new Date().toISOString().split('T')[0]
}

function getMaxDateString(days = 30) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().split('T')[0]
}

function convertJsDayToModelDay(dateString) {
  const jsDay = new Date(dateString).getDay()
  return jsDay === 0 ? 6 : jsDay - 1
}

function isDoctorWorkingOnDate(dateString, schedules = [], visitType = 'clinic') {
  if (!dateString) return true

  const modelDay = convertJsDayToModelDay(dateString)

  return schedules.some(
    schedule =>
      Number(schedule.day_of_week) === modelDay &&
      schedule.visit_type === visitType
  )
}

export default function SlotPicker({
  schedules = [],
  visitType = 'clinic',
  selectedDate,
  selectedSlot,
  slots = [],
  loadingSlots = false,
  onDateChange,
  onSlotSelect,
}) {
  const today = getTodayDateString()
  const maxDate = getMaxDateString(30)

  const isSelectedDateWorkingDay = isDoctorWorkingOnDate(
    selectedDate,
    schedules,
    visitType
  )

  function handleDateChange(event) {
    const date = event.target.value
    onDateChange(date)
  }

  return (
    <section className={styles.wrapper}>
      <div className={styles.header}>
        <h2>Select appointment time</h2>
        <p>
          Choose visit type, date, and one available time slot for this doctor.
        </p>
      </div>

      <div className={styles.dateBox}>
        <label htmlFor="appointment-date">Appointment date</label>

        <input
          id="appointment-date"
          type="date"
          min={today}
          max={maxDate}
          value={selectedDate}
          onChange={handleDateChange}
          className={styles.dateInput}
        />

        <p className={styles.hint}>
          You can book from today up to 30 days in advance.
        </p>
      </div>

      {selectedDate && !isSelectedDateWorkingDay && (
        <div className={styles.warning}>
          This doctor does not work for this visit type on the selected date.
          Please choose another date or visit type.
        </div>
      )}

      {selectedDate && isSelectedDateWorkingDay && (
        <div className={styles.slotSection}>
          <h3>Available slots</h3>

          {loadingSlots && (
            <p className={styles.empty}>Loading available slots...</p>
          )}

          {!loadingSlots && slots.length === 0 && (
            <p className={styles.empty}>
              {selectedDate === today
                ? 'No available slots left today. Please choose another date.'
                : 'No available slots for this date. Please try another date.'}
            </p>
          )}

          {!loadingSlots && slots.length > 0 && (
            <div className={styles.slotsGrid}>
              {slots.map(slot => (
                <button
                  key={slot}
                  type="button"
                  className={`${styles.slot} ${
                    selectedSlot === slot ? styles.selected : ''
                  }`}
                  onClick={() => onSlotSelect(slot)}
                >
                  {slot}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  )
}