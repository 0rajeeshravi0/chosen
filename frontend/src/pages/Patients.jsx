import { useState, useEffect, useCallback, useRef } from 'react'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

const GENDERS = ['male', 'female', 'other']
const EMPTY_FORM = { firstName: '', lastName: '', phone: '', email: '', dateOfBirth: '', gender: '' }

export default function Patients() {
  const { hasRole } = useAuth()
  const canEdit = hasRole('admin', 'receptionist')

  const [patients, setPatients] = useState([])
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 })
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const debounceRef = useRef(null)

  // Debounce search input
  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(debounceRef.current)
  }, [search])

  const fetchPatients = useCallback(async (page = 1) => {
    setLoading(true)
    try {
      const { data } = await api.get('/patients', {
        params: { page, limit: 10, search: debouncedSearch || undefined },
      })
      setPatients(data.data)
      setPagination(data.pagination)
    } catch {
      toast.error('Failed to load patients')
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch])

  useEffect(() => {
    fetchPatients(1)
  }, [fetchPatients])

  // Modal helpers
  const openAdd = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setModalOpen(true)
  }

  const openEdit = (p) => {
    setEditing(p)
    setForm({
      firstName: p.firstName,
      lastName: p.lastName,
      phone: p.phone,
      email: p.email || '',
      dateOfBirth: p.dateOfBirth ? p.dateOfBirth.slice(0, 10) : '',
      gender: p.gender || '',
    })
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditing(null)
    setForm(EMPTY_FORM)
  }

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (editing) {
        await api.put(`/patients/${editing.id || editing._id}`, form)
        toast.success('Patient updated')
      } else {
        await api.post('/patients', form)
        toast.success('Patient created')
      }
      closeModal()
      fetchPatients(editing ? pagination.page : 1)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save patient')
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    setDeleting(true)
    try {
      await api.delete(`/patients/${deleteTarget.id || deleteTarget._id}`)
      toast.success('Patient deleted')
      setDeleteTarget(null)
      fetchPatients(pagination.page)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete patient')
    } finally {
      setDeleting(false)
    }
  }

  const goToPage = (p) => {
    if (p >= 1 && p <= pagination.pages) fetchPatients(p)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-on-surface">Patients</h1>
        {canEdit && (
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-on-primary rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            <span className="material-symbols-outlined text-[20px]">person_add</span>
            Add Patient
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">
          search
        </span>
        <input
          type="text"
          placeholder="Search by name, phone or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-lg text-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
        />
      </div>

      {/* Table */}
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-container-low">
                <th className="text-left px-4 py-3 font-semibold text-on-surface-variant whitespace-nowrap">Name</th>
                <th className="text-left px-4 py-3 font-semibold text-on-surface-variant whitespace-nowrap">Contact</th>
                <th className="text-left px-4 py-3 font-semibold text-on-surface-variant whitespace-nowrap">Date of Birth</th>
                <th className="text-left px-4 py-3 font-semibold text-on-surface-variant whitespace-nowrap">Gender</th>
                {canEdit && (
                  <th className="text-right px-4 py-3 font-semibold text-on-surface-variant whitespace-nowrap">Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={canEdit ? 5 : 4} className="text-center py-16">
                    <span className="material-symbols-outlined text-4xl text-outline animate-spin">progress_activity</span>
                    <p className="mt-2 text-on-surface-variant text-sm">Loading patients…</p>
                  </td>
                </tr>
              ) : patients.length === 0 ? (
                <tr>
                  <td colSpan={canEdit ? 5 : 4} className="text-center py-16">
                    <span className="material-symbols-outlined text-5xl text-outline">person_off</span>
                    <p className="mt-2 text-on-surface-variant">No patients found</p>
                  </td>
                </tr>
              ) : (
                patients.map((p) => (
                  <tr
                    key={p.id || p._id}
                    className="border-b border-outline-variant last:border-b-0 hover:bg-surface-container-low/60 transition-colors group"
                  >
                    <td className="px-4 py-3 whitespace-nowrap font-medium text-on-surface">
                      {p.firstName} {p.lastName}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-on-surface">{p.phone}</div>
                      {p.email && <div className="text-xs text-on-surface-variant">{p.email}</div>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-on-surface-variant">
                      {p.dateOfBirth ? new Date(p.dateOfBirth).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap capitalize text-on-surface-variant">
                      {p.gender || '—'}
                    </td>
                    {canEdit && (
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <div className="inline-flex gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => openEdit(p)}
                            className="p-1.5 rounded-lg text-primary hover:bg-primary/10 transition-colors"
                            title="Edit"
                          >
                            <span className="material-symbols-outlined text-[20px]">edit</span>
                          </button>
                          <button
                            onClick={() => setDeleteTarget(p)}
                            className="p-1.5 rounded-lg text-error hover:bg-error/10 transition-colors"
                            title="Delete"
                          >
                            <span className="material-symbols-outlined text-[20px]">delete</span>
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && pagination.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-outline-variant">
            <span className="text-xs text-on-surface-variant">
              Page {pagination.page} of {pagination.pages} · {pagination.total} patients
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => goToPage(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container-high disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">chevron_left</span>
              </button>
              {Array.from({ length: pagination.pages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === pagination.pages || Math.abs(p - pagination.page) <= 1)
                .reduce((acc, p, i, arr) => {
                  if (i > 0 && p - arr[i - 1] > 1) acc.push('...')
                  acc.push(p)
                  return acc
                }, [])
                .map((p, i) =>
                  p === '...' ? (
                    <span key={`e${i}`} className="px-2 py-1 text-xs text-on-surface-variant">…</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => goToPage(p)}
                      className={`min-w-[32px] h-8 rounded-lg text-xs font-medium transition-colors ${
                        p === pagination.page
                          ? 'bg-primary text-on-primary'
                          : 'text-on-surface-variant hover:bg-surface-container-high'
                      }`}
                    >
                      {p}
                    </button>
                  )
                )}
              <button
                onClick={() => goToPage(pagination.page + 1)}
                disabled={pagination.page >= pagination.pages}
                className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container-high disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">chevron_right</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={closeModal} />
          <div className="relative bg-surface-container-lowest rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-outline-variant">
              <h2 className="text-lg font-semibold text-on-surface">
                {editing ? 'Edit Patient' : 'Add Patient'}
              </h2>
              <button onClick={closeModal} className="p-1 rounded-lg hover:bg-surface-container-high transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="First Name" name="firstName" value={form.firstName} onChange={handleChange} required />
                <Field label="Last Name" name="lastName" value={form.lastName} onChange={handleChange} required />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Phone" name="phone" type="tel" value={form.phone} onChange={handleChange} required />
                <Field label="Email" name="email" type="email" value={form.email} onChange={handleChange} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Date of Birth" name="dateOfBirth" type="date" value={form.dateOfBirth} onChange={handleChange} />
                <div>
                  <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Gender</label>
                  <select
                    name="gender"
                    value={form.gender}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-lg text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
                  >
                    <option value="">Select…</option>
                    {GENDERS.map((g) => (
                      <option key={g} value={g} className="capitalize">{g.charAt(0).toUpperCase() + g.slice(1)}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2.5 rounded-lg text-sm font-medium text-on-surface-variant hover:bg-surface-container-high transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 rounded-lg text-sm font-medium bg-primary text-on-primary hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {saving ? 'Saving…' : editing ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => !deleting && setDeleteTarget(null)} />
          <div className="relative bg-surface-container-lowest rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-error-container flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-on-error-container">warning</span>
              </div>
              <h3 className="text-lg font-semibold text-on-surface mb-2">Delete Patient</h3>
              <p className="text-sm text-on-surface-variant">
                Are you sure you want to delete{' '}
                <span className="font-medium text-on-surface">
                  {deleteTarget.firstName} {deleteTarget.lastName}
                </span>
                ? This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-on-surface-variant hover:bg-surface-container-high transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium bg-error text-on-error hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, name, type = 'text', value, onChange, required }) {
  return (
    <div>
      <label className="block text-xs font-medium text-on-surface-variant mb-1.5">{label}</label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        className="w-full px-3 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-lg text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
      />
    </div>
  )
}
