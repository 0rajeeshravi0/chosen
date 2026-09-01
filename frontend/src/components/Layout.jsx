import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const navItems = [
  { to: '/', icon: 'dashboard', label: 'Dashboard' },
  { to: '/patients', icon: 'person', label: 'Patients' },
  { to: '/doctors', icon: 'medical_services', label: 'Doctors' },
  { to: '/appointments', icon: 'event_note', label: 'Appointments' },
  { to: '/my-appointments', icon: 'calendar_today', label: 'My Appointments', roles: ['doctor'] },
]

export default function Layout() {
  const { user, logout, hasRole } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const filteredNav = navItems.filter(
    (item) => !item.roles || item.roles.some((r) => hasRole(r))
  )

  return (
    <div className="flex min-h-screen bg-background text-on-surface">
      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-full w-[260px] z-40 flex-col bg-surface-container-lowest border-r border-outline-variant
          ${sidebarOpen ? 'flex' : 'hidden'} md:flex`}
      >
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container">
            <span className="material-symbols-outlined">local_hospital</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-primary">Chosen</h1>
            <p className="text-xs text-on-surface-variant">Clinic Management</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-2 flex flex-col gap-1">
          {filteredNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2 rounded text-sm transition-all duration-150 ${
                  isActive
                    ? 'bg-secondary-container text-on-secondary-container border-l-4 border-primary rounded-r font-medium'
                    : 'text-on-surface-variant hover:bg-surface-container-high'
                }`
              }
            >
              <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-outline-variant">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container text-xs font-bold">
              {user?.name?.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.name}</p>
              <p className="text-xs text-on-surface-variant capitalize">{user?.role}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 min-w-0 md:ml-[260px] flex flex-col min-h-screen">
        {/* Header */}
        <header className="fixed top-0 right-0 left-0 md:left-[260px] h-16 flex items-center justify-between px-6 z-30 bg-surface-container-lowest border-b border-outline-variant">
          <div className="flex items-center gap-3">
            <button
              className="md:hidden p-1 text-on-surface-variant hover:bg-surface-container-high rounded transition-colors"
              onClick={() => setSidebarOpen(true)}
            >
              <span className="material-symbols-outlined">menu</span>
            </button>
            <span className="text-base font-semibold text-on-surface">Chosen Clinic</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 pl-3 border-l border-outline-variant">
              <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container text-xs font-bold">
                {user?.name?.charAt(0)}
              </div>
              <button
                onClick={logout}
                className="text-xs font-bold text-error hover:text-error/70 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 min-w-0 mt-16 p-4 sm:p-6">
          <div className="max-w-[1440px] mx-auto min-w-0">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
