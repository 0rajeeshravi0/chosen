import { useState, useEffect, useCallback } from 'react'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

const STATUS_OPTIONS = ['scheduled', 'confirmed', 'completed', 'cancelled', 'no_show']

const STATUS_STYLES = {
  scheduled: 'bg-gray-100 text-gray-700',
  confirmed: 'bg-green-100 text-green-700',
  completed: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-red-100 text-red-700',
  no_show: 'bg-orange-100 text-orange-700',
}

const STATUS_LABEL = {
  scheduled: 'Scheduled',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No Show',
}

function StatusBadge({ status }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[status] || 'bg-gray-100 text-gray-700'}`}>
      {STATUS_LABEL[status] || status}
    </span>
  )
}

function Modal({ open, onClose, title, children }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-surface-container-lowest p-6 shadow-xl mx-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-on-surface">{title}</h2>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-surface-container-high transition-colors">
            <span className="material-symbols-outlined text-on-surface-variant">close</span>
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function BookAppointmentModal({ open, onClose, onBooked }) {
  const [doctors, setDoctors] = useState([])
  const [patients, setPatients] = useState([])
  const [patientSearch, setPatientSearch] = useState('')
  const [doctorId, setDoctorId] = useState('')
  const [date, setDate] = useState('')
  const [slots, setSlots] = useState([])
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [patientId, setPatientId] = useState('')
  const [reason, setReason] = useState('')
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setDoctorId('')
    setDate('')
    setSlots([])
    setSelectedSlot(null)
    setPatientId('')
    setPatientSearch('')
    setReason('')
    api.get('/doctors?limit=100').then(r => setDoctors(r.data.data)).catch(() => {})
    api.get('/patients?limit=100').then(r => setPatients(r.data.data)).catch(() => {})
  }, [open])

  useEffect(() => {
    if (!doctorId || !date) { setSlots([]); setSelectedSlot(null); return }
    setLoadingSlots(true)
    setSelectedSlot(null)
    api.get(`/doctors/${doctorId}/availability?date=${date}`)
      .then(r => setSlots(r.data.data?.slots || []))
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false))
  }, [doctorId, date])

  useEffect(() => {
    if (!patientSearch) return
    const t = setTimeout(() => {
      api.get(`/patients?limit=20&search=${encodeURIComponent(patientSearch)}`)
        .then(r => setPatients(r.data.data))
        .catch(() => {})
    }, 300)
    return () => clearTimeout(t)
  }, [patientSearch])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!patientId || !doctorId || !date || !selectedSlot) {
      toast.error('Please fill all required fields and select a time slot')
      return
    }
    setSubmitting(true)
    try {
      await api.post('/appointments', {
        patientId,
        doctorId,
        appointmentDate: date,
        startTime: selectedSlot.start,
        endTime: selectedSlot.end,
        reason,
      })
      toast.success('Appointment booked successfully')
      onBooked()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to book appointment')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Book Appointment">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Doctor */}
        <div>
          <label className="mb-1 block text-sm font-medium text-on-surface-variant">Doctor *</label>
          <select
            value={doctorId}
            onChange={e => setDoctorId(e.target.value)}
            className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none"
            required
          >
            <option value="">Select a doctor</option>
            {doctors.map(d => (
              <option key={d.id || d._id} value={d.id || d._id}>{d.name} — {d.specialisation}</option>
            ))}
          </select>
        </div>

        {/* Date */}
        <div>
          <label className="mb-1 block text-sm font-medium text-on-surface-variant">Date *</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none"
            required
          />
        </div>

        {/* Time slots */}
        {doctorId && date && (
          <div>
            <label className="mb-1 block text-sm font-medium text-on-surface-variant">Available Slots *</label>
            {loadingSlots ? (
              <p className="text-sm text-on-surface-variant">Loading slots…</p>
            ) : slots.length === 0 ? (
              <p className="text-sm text-on-surface-variant">No slots available for this date.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {slots.map((slot, i) => {
                  const isSelected = selectedSlot?.start === slot.start && selectedSlot?.end === slot.end
                  return (
                    <button
                      key={i}
                      type="button"
                      disabled={!slot.available}
                      onClick={() => setSelectedSlot(slot)}
                      className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                        !slot.available
                          ? 'cursor-not-allowed bg-surface-container-high text-outline line-through'
                          : isSelected
                            ? 'bg-primary text-on-primary'
                            : 'bg-surface-container-high text-on-surface hover:bg-primary-fixed-dim'
                      }`}
                    >
                      {slot.start} – {slot.end}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Patient (searchable) */}
        <div>
          <label className="mb-1 block text-sm font-medium text-on-surface-variant">Patient *</label>
          <input
            type="text"
            placeholder="Search patients…"
            value={patientSearch}
            onChange={e => { setPatientSearch(e.target.value); setPatientId('') }}
            className="mb-1 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none"
          />
          <select
            value={patientId}
            onChange={e => setPatientId(e.target.value)}
            className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none"
            required
          >
            <option value="">Select a patient</option>
            {patients.map(p => (
              <option key={p.id || p._id} value={p.id || p._id}>
                {p.firstName} {p.lastName} — {p.phone}
              </option>
            ))}
          </select>
        </div>

        {/* Reason */}
        <div>
          <label className="mb-1 block text-sm font-medium text-on-surface-variant">Reason</label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none resize-none"
            placeholder="Reason for visit…"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-outline-variant px-4 py-2 text-sm font-medium text-on-surface hover:bg-surface-container-high transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-on-primary hover:bg-primary-container transition-colors disabled:opacity-50"
          >
            {submitting ? 'Booking…' : 'Book Appointment'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function AppointmentDetailModal({ open, onClose, appointment, onStatusChange }) {
  const [updating, setUpdating] = useState('')

  if (!appointment) return null

  const transitions = {
    scheduled: [
      { label: 'Confirm', status: 'confirmed', style: 'bg-green-600 text-white hover:bg-green-700' },
      { label: 'Cancel', status: 'cancelled', style: 'bg-red-600 text-white hover:bg-red-700' },
    ],
    confirmed: [
      { label: 'Complete', status: 'completed', style: 'bg-blue-600 text-white hover:bg-blue-700' },
      { label: 'Cancel', status: 'cancelled', style: 'bg-red-600 text-white hover:bg-red-700' },
      { label: 'No Show', status: 'no_show', style: 'bg-orange-600 text-white hover:bg-orange-700' },
    ],
  }

  const available = transitions[appointment.status] || []

  const handleTransition = async (newStatus) => {
    setUpdating(newStatus)
    try {
      await api.put(`/appointments/${appointment.id || appointment._id}`, { status: newStatus })
      toast.success(`Appointment ${STATUS_LABEL[newStatus].toLowerCase()}`)
      onStatusChange()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status')
    } finally {
      setUpdating('')
    }
  }

  const patientName = appointment.patient?.name || appointment.patientId
  const doctorName = appointment.doctor?.name || appointment.doctorId

  return (
    <Modal open={open} onClose={onClose} title="Appointment Details">
      <div className="space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="text-on-surface-variant">Status</span>
          <StatusBadge status={appointment.status} />
        </div>
        <div className="flex justify-between">
          <span className="text-on-surface-variant">Patient</span>
          <span className="font-medium text-on-surface">{patientName}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-on-surface-variant">Doctor</span>
          <span className="font-medium text-on-surface">{doctorName}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-on-surface-variant">Date</span>
          <span className="font-medium text-on-surface">
            {new Date(appointment.appointmentDate).toLocaleDateString()}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-on-surface-variant">Time</span>
          <span className="font-medium text-on-surface">{appointment.startTime} – {appointment.endTime}</span>
        </div>
        {appointment.reason && (
          <div>
            <span className="text-on-surface-variant">Reason</span>
            <p className="mt-1 rounded-lg bg-surface-container p-3 text-on-surface">{appointment.reason}</p>
          </div>
        )}
      </div>

      {available.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-2">
          {available.map(t => (
            <button
              key={t.status}
              onClick={() => handleTransition(t.status)}
              disabled={!!updating}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${t.style}`}
            >
              {updating === t.status ? 'Updating…' : t.label}
            </button>
          ))}
        </div>
      )}
    </Modal>
  )
}

export default function Appointments() {
  const { hasRole } = useAuth()
  const canBook = hasRole('admin', 'receptionist')

  const [appointments, setAppointments] = useState([])
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 })
  const [loading, setLoading] = useState(true)

  // Filters
  const [filterDoctor, setFilterDoctor] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterDate, setFilterDate] = useState('')
  const [doctors, setDoctors] = useState([])
  const [page, setPage] = useState(1)

  // Modals
  const [bookOpen, setBookOpen] = useState(false)
  const [selectedAppt, setSelectedAppt] = useState(null)

  useEffect(() => {
    api.get('/doctors?limit=100').then(r => setDoctors(r.data.data)).catch(() => {})
  }, [])

  const fetchAppointments = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', page)
      params.set('limit', '10')
      if (filterDoctor) params.set('doctorId', filterDoctor)
      if (filterStatus) params.set('status', filterStatus)
      if (filterDate) params.set('date', filterDate)
      const { data } = await api.get(`/appointments?${params.toString()}`)
      setAppointments(data.data)
      setPagination(data.pagination || { page: 1, pages: 1, total: 0 })
    } catch {
      toast.error('Failed to load appointments')
    } finally {
      setLoading(false)
    }
  }, [page, filterDoctor, filterStatus, filterDate])

  useEffect(() => { fetchAppointments() }, [fetchAppointments])

  // Reset page when filters change
  useEffect(() => { setPage(1) }, [filterDoctor, filterStatus, filterDate])

  const handleDelete = async (id, e) => {
    e.stopPropagation()
    if (!window.confirm('Cancel this appointment?')) return
    try {
      await api.delete(`/appointments/${id}`)
      toast.success('Appointment cancelled')
      fetchAppointments()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel appointment')
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-on-surface">Appointments</h1>
        {canBook && (
          <button
            onClick={() => setBookOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-on-primary hover:bg-primary-container transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
            Book Appointment
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <select
          value={filterDoctor}
          onChange={e => setFilterDoctor(e.target.value)}
          className="rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none"
        >
          <option value="">All Doctors</option>
          {doctors.map(d => (
            <option key={d.id || d._id} value={d.id || d._id}>{d.name}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none"
        >
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.map(s => (
            <option key={s} value={s}>{STATUS_LABEL[s]}</option>
          ))}
        </select>
        <input
          type="date"
          value={filterDate}
          onChange={e => setFilterDate(e.target.value)}
          className="rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-outline-variant bg-surface-container-lowest">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-outline-variant bg-surface-container-low">
              <th className="whitespace-nowrap px-4 py-3 font-medium text-on-surface-variant">Date</th>
              <th className="whitespace-nowrap px-4 py-3 font-medium text-on-surface-variant">Time</th>
              <th className="whitespace-nowrap px-4 py-3 font-medium text-on-surface-variant">Patient</th>
              <th className="whitespace-nowrap px-4 py-3 font-medium text-on-surface-variant">Doctor</th>
              <th className="whitespace-nowrap px-4 py-3 font-medium text-on-surface-variant">Status</th>
              <th className="whitespace-nowrap px-4 py-3 font-medium text-on-surface-variant">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-on-surface-variant">Loading…</td>
              </tr>
            ) : appointments.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-on-surface-variant">No appointments found.</td>
              </tr>
            ) : (
              appointments.map(appt => {
                const id = appt.id || appt._id
                const patientName = appt.patient?.name || appt.patientId
                const doctorName = appt.doctor?.name || appt.doctorId
                return (
                  <tr
                    key={id}
                    onClick={() => setSelectedAppt(appt)}
                    className="cursor-pointer border-b border-outline-variant last:border-b-0 hover:bg-surface-container-low transition-colors"
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-on-surface">
                      {new Date(appt.appointmentDate).toLocaleDateString()}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-on-surface">
                      {appt.startTime} – {appt.endTime}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-on-surface">{patientName}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-on-surface">{doctorName}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <StatusBadge status={appt.status} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {(appt.status === 'scheduled' || appt.status === 'confirmed') && (
                        <button
                          onClick={e => handleDelete(id, e)}
                          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-error hover:bg-error-container transition-colors"
                        >
                          <span className="material-symbols-outlined text-[16px]">cancel</span>
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-on-surface-variant">
            Page {pagination.page} of {pagination.pages} ({pagination.total} total)
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-lg border border-outline-variant px-3 py-1.5 text-sm text-on-surface hover:bg-surface-container-high disabled:opacity-40 transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
              disabled={page >= pagination.pages}
              className="rounded-lg border border-outline-variant px-3 py-1.5 text-sm text-on-surface hover:bg-surface-container-high disabled:opacity-40 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      <BookAppointmentModal open={bookOpen} onClose={() => setBookOpen(false)} onBooked={fetchAppointments} />
      <AppointmentDetailModal
        open={!!selectedAppt}
        onClose={() => setSelectedAppt(null)}
        appointment={selectedAppt}
        onStatusChange={fetchAppointments}
      />
    </div>
  )
}
