import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

const today = () => {
  const d = new Date()
  return d.toISOString().split('T')[0]
}

const formatDate = () =>
  new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

const formatTime = (t) => {
  if (!t) return '—'
  const [h, m] = t.split(':')
  const hour = parseInt(h, 10)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  return `${hour % 12 || 12}:${m} ${ampm}`
}

const statusColor = {
  scheduled: 'bg-blue-100 text-blue-800',
  confirmed: 'bg-green-100 text-green-800',
  completed: 'bg-gray-100 text-gray-700',
  cancelled: 'bg-red-100 text-red-800',
  no_show: 'bg-amber-100 text-amber-800',
}

function StatCard({ icon, label, value, loading }) {
  return (
    <div className="glass-card rounded-2xl p-6 flex items-center gap-4">
      <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary shrink-0">
        <span className="material-symbols-outlined text-[28px]">{icon}</span>
      </div>
      <div className="min-w-0">
        <p className="text-sm text-on-surface-variant truncate">{label}</p>
        {loading ? (
          <div className="mt-1 h-7 w-16 rounded bg-surface-container-high animate-pulse" />
        ) : (
          <p className="text-2xl font-semibold text-on-surface">{value}</p>
        )}
      </div>
    </div>
  )
}

function SkeletonRow() {
  return (
    <tr>
      {[...Array(4)].map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 w-24 rounded bg-surface-container-high animate-pulse" />
        </td>
      ))}
    </tr>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [stats, setStats] = useState({
    patients: null,
    doctors: null,
    todayAppts: null,
    allAppts: null,
  })
  const [upcoming, setUpcoming] = useState([])
  const [loadingStats, setLoadingStats] = useState(true)
  const [loadingTable, setLoadingTable] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [patients, doctors, todayAppts, allAppts] = await Promise.all([
          api.get('/patients?limit=1'),
          api.get('/doctors?limit=1'),
          api.get(`/appointments?date=${today()}&limit=1`),
          api.get('/appointments?limit=1'),
        ])
        setStats({
          patients: patients.data.pagination?.total ?? 0,
          doctors: doctors.data.pagination?.total ?? 0,
          todayAppts: todayAppts.data.pagination?.total ?? 0,
          allAppts: allAppts.data.pagination?.total ?? 0,
        })
      } catch {
        toast.error('Failed to load dashboard stats')
      } finally {
        setLoadingStats(false)
      }
    }

    const loadUpcoming = async () => {
      try {
        const { data } = await api.get('/appointments?limit=5&status=scheduled')
        setUpcoming(data.data || [])
      } catch {
        toast.error('Failed to load upcoming appointments')
      } finally {
        setLoadingTable(false)
      }
    }

    load()
    loadUpcoming()
  }, [])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">
            Welcome back, {user?.name ?? 'User'}
          </h1>
          <p className="text-sm text-on-surface-variant mt-1">{formatDate()}</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => navigate('/patients')}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-on-primary font-medium text-sm hover:bg-primary-container transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">person_add</span>
            New Patient
          </button>
          <button
            onClick={() => navigate('/appointments')}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-outline-variant text-on-surface font-medium text-sm hover:bg-surface-container-high transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">edit_calendar</span>
            New Appointment
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon="people"
          label="Total Patients"
          value={stats.patients}
          loading={loadingStats}
        />
        <StatCard
          icon="medical_services"
          label="Total Doctors"
          value={stats.doctors}
          loading={loadingStats}
        />
        <StatCard
          icon="event"
          label="Today's Appointments"
          value={stats.todayAppts}
          loading={loadingStats}
        />
        <StatCard
          icon="calendar_month"
          label="All Appointments"
          value={stats.allAppts}
          loading={loadingStats}
        />
      </div>

      {/* Upcoming appointments table */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-outline-variant">
          <h2 className="text-lg font-semibold text-on-surface">Next 5 Appointments</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-container-low">
                <th className="px-4 py-3 font-medium text-on-surface-variant">Patient</th>
                <th className="px-4 py-3 font-medium text-on-surface-variant">Doctor</th>
                <th className="px-4 py-3 font-medium text-on-surface-variant">Time</th>
                <th className="px-4 py-3 font-medium text-on-surface-variant">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {loadingTable ? (
                <>
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                </>
              ) : upcoming.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-10 text-center text-on-surface-variant"
                  >
                    No scheduled appointments
                  </td>
                </tr>
              ) : (
                upcoming.map((appt) => (
                  <tr key={appt.id} className="hover:bg-surface-container-low transition-colors">
                    <td className="px-4 py-3 text-on-surface whitespace-nowrap">
                      {appt.patient?.name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-on-surface whitespace-nowrap">
                      {appt.doctor?.name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-on-surface whitespace-nowrap">
                      {formatTime(appt.startTime)}
                      {appt.endTime ? ` – ${formatTime(appt.endTime)}` : ''}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${statusColor[appt.status] ?? 'bg-gray-100 text-gray-700'}`}
                      >
                        {appt.status?.replace('_', ' ') ?? '—'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
