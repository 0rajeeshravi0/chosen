import { useState, useEffect, useCallback } from 'react'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

const STATUS_STYLES = {
  scheduled: 'bg-gray-100 text-gray-700',
  confirmed: 'bg-green-100 text-green-700',
  completed: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-red-100 text-red-700',
  no_show: 'bg-orange-100 text-orange-700',
}

const STATUS_LABELS = {
  scheduled: 'Scheduled',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No Show',
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function formatTime(t) {
  if (!t) return ''
  const [h, m] = t.split(':')
  const hour = parseInt(h, 10)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  return `${hour % 12 || 12}:${m} ${ampm}`
}

function todayISO() {
  const d = new Date()
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0')
}

function StatusBadge({ status }) {
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[status] || 'bg-gray-100 text-gray-700'}`}>
      {STATUS_LABELS[status] || status}
    </span>
  )
}

function ActionButtons({ appointment, onUpdate }) {
  const { status, id } = appointment
  const buttons = []

  if (status === 'scheduled') {
    buttons.push({ label: 'Confirm', next: 'confirmed', icon: 'check_circle', color: 'bg-green-600 hover:bg-green-700 text-white' })
  }
  if (status === 'confirmed') {
    buttons.push({ label: 'Complete', next: 'completed', icon: 'task_alt', color: 'bg-blue-600 hover:bg-blue-700 text-white' })
    buttons.push({ label: 'No Show', next: 'no_show', icon: 'person_off', color: 'bg-orange-600 hover:bg-orange-700 text-white' })
  }

  if (buttons.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2">
      {buttons.map((btn) => (
        <button
          key={btn.next}
          onClick={() => onUpdate(id, btn.next)}
          className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${btn.color}`}
        >
          <span className="material-symbols-outlined text-sm">{btn.icon}</span>
          {btn.label}
        </button>
      ))}
    </div>
  )
}

export default function MyAppointments() {
  const { hasRole } = useAuth()
  const [todayAppts, setTodayAppts] = useState([])
  const [upcomingAppts, setUpcomingAppts] = useState([])
  const [loading, setLoading] = useState(true)

  const today = todayISO()

  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true)
      const [todayRes, allRes] = await Promise.all([
        api.get('/appointments', { params: { date: today } }),
        api.get('/appointments', { params: { limit: 100 } }),
      ])

      setTodayAppts(todayRes.data.data || [])

      const future = (allRes.data.data || []).filter(
        (a) => a.appointmentDate > today && a.status !== 'cancelled'
      )
      future.sort((a, b) => {
        if (a.appointmentDate !== b.appointmentDate) return a.appointmentDate < b.appointmentDate ? -1 : 1
        return (a.startTime || '') < (b.startTime || '') ? -1 : 1
      })
      setUpcomingAppts(future)
    } catch {
      toast.error('Failed to load appointments')
    } finally {
      setLoading(false)
    }
  }, [today])

  useEffect(() => {
    if (hasRole('doctor')) fetchAppointments()
  }, [hasRole, fetchAppointments])

  const handleStatusUpdate = async (id, newStatus) => {
    try {
      await api.put(`/appointments/${id}`, { status: newStatus })
      toast.success(`Appointment ${STATUS_LABELS[newStatus].toLowerCase()}`)
      fetchAppointments()
    } catch {
      toast.error('Failed to update appointment status')
    }
  }

  if (!hasRole('doctor')) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant p-8 text-center max-w-md">
          <span className="material-symbols-outlined text-5xl text-outline mb-4">lock</span>
          <h2 className="text-xl font-semibold text-on-surface mb-2">Access Restricted</h2>
          <p className="text-on-surface-variant">This page is for doctors only.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">My Appointments</h1>
          <p className="text-on-surface-variant mt-1">{formatDate(today)}</p>
        </div>
        <button
          onClick={fetchAppointments}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-outline-variant text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer self-start"
        >
          <span className="material-symbols-outlined text-lg">refresh</span>
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <>
          {/* Today's Appointments */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-primary">today</span>
              <h2 className="text-lg font-semibold text-on-surface">Today</h2>
              <span className="ml-1 text-sm text-on-surface-variant">({todayAppts.length})</span>
            </div>

            {todayAppts.length === 0 ? (
              <div className="bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant p-8 text-center">
                <span className="material-symbols-outlined text-4xl text-outline mb-2">event_available</span>
                <p className="text-on-surface-variant">No appointments for today.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {todayAppts.map((appt) => (
                  <div
                    key={appt.id}
                    className="bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant p-5 flex flex-col gap-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center">
                          <span className="material-symbols-outlined text-on-primary-fixed text-xl">person</span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-on-surface truncate">
                            {appt.patient?.name}
                          </p>
                          {appt.patient?.phone && (
                            <p className="text-xs text-on-surface-variant">{appt.patient.phone}</p>
                          )}
                        </div>
                      </div>
                      <StatusBadge status={appt.status} />
                    </div>

                    <div className="flex items-center gap-4 text-sm text-on-surface-variant">
                      <div className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-base">schedule</span>
                        {formatTime(appt.startTime)}
                        {appt.endTime && ` – ${formatTime(appt.endTime)}`}
                      </div>
                    </div>

                    {appt.reason && (
                      <p className="text-sm text-on-surface-variant bg-surface-container rounded-lg px-3 py-2">
                        {appt.reason}
                      </p>
                    )}

                    <ActionButtons appointment={appt} onUpdate={handleStatusUpdate} />
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Upcoming Appointments */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-primary">upcoming</span>
              <h2 className="text-lg font-semibold text-on-surface">Upcoming</h2>
              <span className="ml-1 text-sm text-on-surface-variant">({upcomingAppts.length})</span>
            </div>

            {upcomingAppts.length === 0 ? (
              <div className="bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant p-8 text-center">
                <span className="material-symbols-outlined text-4xl text-outline mb-2">calendar_month</span>
                <p className="text-on-surface-variant">No upcoming appointments.</p>
              </div>
            ) : (
              <div className="bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-outline-variant bg-surface-container-low">
                        <th className="text-left px-4 py-3 font-medium text-on-surface-variant">Date</th>
                        <th className="text-left px-4 py-3 font-medium text-on-surface-variant">Time</th>
                        <th className="text-left px-4 py-3 font-medium text-on-surface-variant">Patient</th>
                        <th className="text-left px-4 py-3 font-medium text-on-surface-variant">Reason</th>
                        <th className="text-left px-4 py-3 font-medium text-on-surface-variant">Status</th>
                        <th className="text-left px-4 py-3 font-medium text-on-surface-variant">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant">
                      {upcomingAppts.map((appt) => (
                        <tr key={appt.id} className="hover:bg-surface-container-low transition-colors">
                          <td className="px-4 py-3 whitespace-nowrap text-on-surface">
                            {new Date(appt.appointmentDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-on-surface-variant">
                            {formatTime(appt.startTime)}
                            {appt.endTime && ` – ${formatTime(appt.endTime)}`}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-on-surface font-medium">
                            {appt.patient?.name}
                          </td>
                          <td className="px-4 py-3 text-on-surface-variant max-w-[200px] truncate">
                            {appt.reason || '—'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <StatusBadge status={appt.status} />
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <ActionButtons appointment={appt} onUpdate={handleStatusUpdate} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}
