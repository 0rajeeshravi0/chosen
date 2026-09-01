import { useState, useEffect, useCallback } from 'react'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
const DAY_LABELS = { monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday', thursday: 'Thursday', friday: 'Friday', saturday: 'Saturday', sunday: 'Sunday' }

const emptyForm = { name: '', specialisation: '', phone: '', email: '' }
const emptyWorkingHours = Object.fromEntries(DAYS.map(d => [d, []]))

export default function Doctors() {
  const { hasRole } = useAuth()
  const isAdmin = hasRole('admin')

  const [doctors, setDoctors] = useState([])
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  // Doctor form modal
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState(null)

  // Availability modal
  const [availDoctor, setAvailDoctor] = useState(null)
  const [workingHours, setWorkingHours] = useState(emptyWorkingHours)
  const [savingAvail, setSavingAvail] = useState(false)

  // Slot viewer
  const [slotDoctor, setSlotDoctor] = useState(null)
  const [slotDate, setSlotDate] = useState('')
  const [slots, setSlots] = useState(null)
  const [loadingSlots, setLoadingSlots] = useState(false)

  const fetchDoctors = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/doctors', { params: { page, limit: 10, search: search || undefined } })
      setDoctors(data.data)
      setPagination(data.pagination)
    } catch {
      toast.error('Failed to load doctors')
    } finally {
      setLoading(false)
    }
  }, [page, search])

  useEffect(() => { fetchDoctors() }, [fetchDoctors])

  // ── CRUD ──

  function openAdd() {
    setEditingId(null)
    setFormData(emptyForm)
    setShowForm(true)
  }

  function openEdit(doc) {
    setEditingId(doc._id || doc.id)
    setFormData({ name: doc.name, specialisation: doc.specialisation || '', phone: doc.phone || '', email: doc.email || '' })
    setShowForm(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      if (editingId) {
        await api.put(`/doctors/${editingId}`, formData)
        toast.success('Doctor updated')
      } else {
        await api.post('/doctors', formData)
        toast.success('Doctor added')
      }
      setShowForm(false)
      fetchDoctors()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await api.delete(`/doctors/${deleteTarget._id || deleteTarget.id}`)
      toast.success('Doctor deleted')
      setDeleteTarget(null)
      fetchDoctors()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed')
    }
  }

  // ── Availability ──

  function openAvailability(doc) {
    const id = doc._id || doc.id
    setAvailDoctor({ ...doc, id })
    const hours = { ...emptyWorkingHours }
    if (doc.workingHours) {
      for (const day of DAYS) {
        if (Array.isArray(doc.workingHours[day])) {
          hours[day] = doc.workingHours[day].map(b => ({ start: b.start, end: b.end }))
        }
      }
    }
    setWorkingHours(hours)
  }

  function addBlock(day) {
    setWorkingHours(prev => ({ ...prev, [day]: [...prev[day], { start: '09:00', end: '17:00' }] }))
  }

  function removeBlock(day, idx) {
    setWorkingHours(prev => ({ ...prev, [day]: prev[day].filter((_, i) => i !== idx) }))
  }

  function updateBlock(day, idx, field, value) {
    setWorkingHours(prev => ({
      ...prev,
      [day]: prev[day].map((b, i) => i === idx ? { ...b, [field]: value } : b)
    }))
  }

  async function saveAvailability() {
    setSavingAvail(true)
    try {
      await api.put(`/doctors/${availDoctor.id}/availability`, { workingHours })
      toast.success('Availability saved')
      setAvailDoctor(null)
      fetchDoctors()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save availability')
    } finally {
      setSavingAvail(false)
    }
  }

  // ── Slot viewer ──

  function openSlotViewer(doc) {
    setSlotDoctor(doc)
    setSlotDate('')
    setSlots(null)
  }

  async function fetchSlots(docId, date) {
    if (!date) return
    setLoadingSlots(true)
    try {
      const { data } = await api.get(`/doctors/${docId}/availability`, { params: { date } })
      setSlots(data.data?.slots || [])
    } catch {
      toast.error('Failed to fetch slots')
      setSlots([])
    } finally {
      setLoadingSlots(false)
    }
  }

  // ── Render ──

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-on-surface">Doctors</h1>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-xl">search</span>
            <input
              type="text"
              placeholder="Search doctors…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              className="pl-10 pr-4 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface placeholder:text-outline text-sm w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          {isAdmin && (
            <button onClick={openAdd} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-on-primary font-medium text-sm hover:opacity-90 transition-opacity">
              <span className="material-symbols-outlined text-xl">add</span>
              Add Doctor
            </button>
          )}
        </div>
      </div>

      {/* Table (desktop) / Cards (mobile) */}
      {loading ? (
        <div className="flex justify-center py-20">
          <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
        </div>
      ) : doctors.length === 0 ? (
        <div className="text-center py-20 text-outline">
          <span className="material-symbols-outlined text-5xl mb-2 block">medical_information</span>
          No doctors found.
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto rounded-xl border border-outline-variant">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-container text-on-surface-variant text-left">
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Specialisation</th>
                  <th className="px-4 py-3 font-semibold">Phone</th>
                  <th className="px-4 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {doctors.map(doc => (
                  <tr key={doc._id || doc.id} className="bg-surface-container-lowest hover:bg-surface-container-low transition-colors">
                    <td className="px-4 py-3 font-medium text-on-surface">{doc.name}</td>
                    <td className="px-4 py-3 text-on-surface-variant">{doc.specialisation}</td>
                    <td className="px-4 py-3 text-on-surface-variant">{doc.phone}</td>
                    <td className="px-4 py-3 text-on-surface-variant">{doc.email}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openSlotViewer(doc)} className="p-1.5 rounded-lg hover:bg-surface-container text-primary" title="View Slots">
                          <span className="material-symbols-outlined text-xl">event_available</span>
                        </button>
                        {isAdmin && (
                          <button onClick={() => openAvailability(doc)} className="p-1.5 rounded-lg hover:bg-surface-container text-primary" title="Set Availability">
                            <span className="material-symbols-outlined text-xl">schedule</span>
                          </button>
                        )}
                        <button onClick={() => openEdit(doc)} className="p-1.5 rounded-lg hover:bg-surface-container text-primary" title="Edit">
                          <span className="material-symbols-outlined text-xl">edit</span>
                        </button>
                        {isAdmin && (
                          <button onClick={() => setDeleteTarget(doc)} className="p-1.5 rounded-lg hover:bg-error-container text-error" title="Delete">
                            <span className="material-symbols-outlined text-xl">delete</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {doctors.map(doc => (
              <div key={doc._id || doc.id} className="bg-surface-container-lowest rounded-xl border border-outline-variant p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold text-on-surface">{doc.name}</p>
                    <p className="text-sm text-on-surface-variant">{doc.specialisation}</p>
                  </div>
                </div>
                <div className="text-sm text-on-surface-variant space-y-1 mb-3">
                  {doc.phone && <p className="flex items-center gap-1.5"><span className="material-symbols-outlined text-base">phone</span>{doc.phone}</p>}
                  {doc.email && <p className="flex items-center gap-1.5"><span className="material-symbols-outlined text-base">mail</span>{doc.email}</p>}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => openSlotViewer(doc)} className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-surface-container text-primary font-medium">
                    <span className="material-symbols-outlined text-base">event_available</span>View Slots
                  </button>
                  {isAdmin && (
                    <button onClick={() => openAvailability(doc)} className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-surface-container text-primary font-medium">
                      <span className="material-symbols-outlined text-base">schedule</span>Availability
                    </button>
                  )}
                  <button onClick={() => openEdit(doc)} className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-surface-container text-primary font-medium">
                    <span className="material-symbols-outlined text-base">edit</span>Edit
                  </button>
                  {isAdmin && (
                    <button onClick={() => setDeleteTarget(doc)} className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-error-container text-error font-medium">
                      <span className="material-symbols-outlined text-base">delete</span>Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {pagination && pagination.pages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="p-2 rounded-lg border border-outline-variant bg-surface-container-lowest disabled:opacity-40 hover:bg-surface-container-low transition-colors">
                <span className="material-symbols-outlined text-xl">chevron_left</span>
              </button>
              <span className="text-sm text-on-surface-variant px-3">Page {page} of {pagination.pages}</span>
              <button onClick={() => setPage(p => Math.min(pagination.pages, p + 1))} disabled={page >= pagination.pages} className="p-2 rounded-lg border border-outline-variant bg-surface-container-lowest disabled:opacity-40 hover:bg-surface-container-low transition-colors">
                <span className="material-symbols-outlined text-xl">chevron_right</span>
              </button>
            </div>
          )}
        </>
      )}

      {/* ── Add/Edit Modal ── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowForm(false)}>
          <div className="bg-surface-container-lowest rounded-2xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 pt-6 pb-2">
              <h2 className="text-lg font-bold text-on-surface">{editingId ? 'Edit Doctor' : 'Add Doctor'}</h2>
              <button onClick={() => setShowForm(false)} className="p-1 rounded-lg hover:bg-surface-container">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleSave} className="px-6 pb-6 space-y-4">
              {[
                { key: 'name', label: 'Name', type: 'text', required: true },
                { key: 'specialisation', label: 'Specialisation', type: 'text', required: true },
                { key: 'phone', label: 'Phone', type: 'tel', required: false },
                { key: 'email', label: 'Email', type: 'email', required: false },
              ].map(f => (
                <label key={f.key} className="block">
                  <span className="text-sm font-medium text-on-surface-variant">{f.label}</span>
                  <input
                    type={f.type}
                    required={f.required}
                    value={formData[f.key]}
                    onChange={e => setFormData(prev => ({ ...prev, [f.key]: e.target.value }))}
                    className="mt-1 block w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </label>
              ))}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm rounded-lg border border-outline-variant text-on-surface-variant hover:bg-surface-container-low transition-colors">Cancel</button>
                <button type="submit" disabled={saving} className="px-4 py-2 text-sm rounded-lg bg-primary text-on-primary font-medium hover:opacity-90 disabled:opacity-50 transition-opacity">
                  {saving ? 'Saving…' : editingId ? 'Update' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setDeleteTarget(null)}>
          <div className="bg-surface-container-lowest rounded-2xl shadow-xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <span className="material-symbols-outlined text-3xl text-error">warning</span>
              <h2 className="text-lg font-bold text-on-surface">Delete Doctor</h2>
            </div>
            <p className="text-sm text-on-surface-variant mb-6">
              Are you sure you want to delete <strong>{deleteTarget.name}</strong>? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-sm rounded-lg border border-outline-variant text-on-surface-variant hover:bg-surface-container-low transition-colors">Cancel</button>
              <button onClick={handleDelete} className="px-4 py-2 text-sm rounded-lg bg-error text-on-error font-medium hover:opacity-90 transition-opacity">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Availability Modal ── */}
      {availDoctor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setAvailDoctor(null)}>
          <div className="bg-surface-container-lowest rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 pt-6 pb-2 shrink-0">
              <h2 className="text-lg font-bold text-on-surface">Availability — {availDoctor.name}</h2>
              <button onClick={() => setAvailDoctor(null)} className="p-1 rounded-lg hover:bg-surface-container">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="px-6 pb-6 overflow-y-auto flex-1 space-y-4">
              {DAYS.map(day => (
                <div key={day} className="border border-outline-variant rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-sm text-on-surface">{DAY_LABELS[day]}</span>
                    <button type="button" onClick={() => addBlock(day)} className="inline-flex items-center gap-1 text-xs text-primary font-medium hover:opacity-80">
                      <span className="material-symbols-outlined text-base">add</span>Add block
                    </button>
                  </div>
                  {workingHours[day].length === 0 && (
                    <p className="text-xs text-outline italic">No time blocks — day off</p>
                  )}
                  <div className="space-y-2">
                    {workingHours[day].map((block, idx) => (
                      <div key={idx} className="flex items-center gap-2 flex-wrap">
                        <input
                          type="time"
                          value={block.start}
                          onChange={e => updateBlock(day, idx, 'start', e.target.value)}
                          className="rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-1.5 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                        <span className="text-on-surface-variant text-sm">to</span>
                        <input
                          type="time"
                          value={block.end}
                          onChange={e => updateBlock(day, idx, 'end', e.target.value)}
                          className="rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-1.5 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                        <button type="button" onClick={() => removeBlock(day, idx)} className="p-1 rounded-lg hover:bg-error-container text-error" title="Remove block">
                          <span className="material-symbols-outlined text-xl">remove_circle</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-3 px-6 pb-6 shrink-0">
              <button onClick={() => setAvailDoctor(null)} className="px-4 py-2 text-sm rounded-lg border border-outline-variant text-on-surface-variant hover:bg-surface-container-low transition-colors">Cancel</button>
              <button onClick={saveAvailability} disabled={savingAvail} className="px-4 py-2 text-sm rounded-lg bg-primary text-on-primary font-medium hover:opacity-90 disabled:opacity-50 transition-opacity">
                {savingAvail ? 'Saving…' : 'Save Availability'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Slot Viewer Modal ── */}
      {slotDoctor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setSlotDoctor(null)}>
          <div className="bg-surface-container-lowest rounded-2xl shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 pt-6 pb-2">
              <h2 className="text-lg font-bold text-on-surface">Slots — {slotDoctor.name}</h2>
              <button onClick={() => setSlotDoctor(null)} className="p-1 rounded-lg hover:bg-surface-container">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="px-6 pb-6 space-y-4">
              <label className="block">
                <span className="text-sm font-medium text-on-surface-variant">Select Date</span>
                <input
                  type="date"
                  value={slotDate}
                  onChange={e => {
                    setSlotDate(e.target.value)
                    fetchSlots(slotDoctor._id || slotDoctor.id, e.target.value)
                  }}
                  className="mt-1 block w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </label>
              {loadingSlots && (
                <div className="flex justify-center py-6">
                  <span className="material-symbols-outlined animate-spin text-2xl text-primary">progress_activity</span>
                </div>
              )}
              {slots !== null && !loadingSlots && (
                slots.length === 0 ? (
                  <p className="text-sm text-outline text-center py-4">No slots for this date.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {slots.map((slot, idx) => (
                      <span
                        key={idx}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
                          slot.available
                            ? 'bg-green-100 text-green-800 border border-green-300'
                            : 'bg-surface-container-high text-on-surface-variant border border-outline-variant'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${slot.available ? 'bg-green-500' : 'bg-outline'}`} />
                        {slot.start} – {slot.end}
                      </span>
                    ))}
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
