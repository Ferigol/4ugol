import React, { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Users, Briefcase, LogOut, Menu } from 'lucide-react'
import { supabase } from '../lib/supabase'

const NAV_LINKS = [
  { to: '/',           label: 'Dashboard',  icon: LayoutDashboard },
  { to: '/prospectos', label: 'Prospectos', icon: Users },
  { to: '/clientes',   label: 'Clientes',   icon: Briefcase },
]

export default function Layout({ children }) {
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const Sidebar = ({ mobile = false }) => (
    <aside
      className={`
        ${mobile ? 'fixed inset-y-0 left-0 z-40 w-64' : 'hidden lg:flex flex-col'}
        ${!mobile && collapsed ? 'w-16' : 'w-64'}
        bg-[#0a0a0a] flex flex-col transition-all duration-200 shrink-0
      `}
    >
      {/* Logo */}
      <div className={`flex items-center gap-3 px-4 py-5 border-b border-white/10 ${collapsed && !mobile ? 'justify-center px-0' : ''}`}>
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#eb5c37] shrink-0">
          <span className="text-white text-lg">⚽</span>
        </div>
        {(!collapsed || mobile) && (
          <div>
            <span className="text-lg font-bold text-white tracking-tight">4uGOL</span>
            <p className="text-[10px] text-white/30 leading-none">CRM</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-0.5">
        {NAV_LINKS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150
              ${isActive
                ? 'bg-[#eb5c37] text-white'
                : 'text-white/50 hover:text-white hover:bg-white/8'
              }
              ${collapsed && !mobile ? 'justify-center' : ''}
              `
            }
          >
            <Icon size={18} className="shrink-0" />
            {(!collapsed || mobile) && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Bottom controls */}
      <div className={`px-2 py-4 border-t border-white/10 space-y-0.5 ${collapsed && !mobile ? 'px-1' : ''}`}>
        {!mobile && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={`hidden lg:flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-white/50 hover:text-white hover:bg-white/8 transition-all cursor-pointer ${collapsed ? 'justify-center' : ''}`}
          >
            <Menu size={18} />
            {!collapsed && <span>Colapsar</span>}
          </button>
        )}

        <button
          onClick={handleLogout}
          className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-white/50 hover:text-red-400 hover:bg-white/8 transition-all cursor-pointer ${collapsed && !mobile ? 'justify-center' : ''}`}
        >
          <LogOut size={18} />
          {(!collapsed || mobile) && <span>Cerrar sesión</span>}
        </button>
      </div>
    </aside>
  )

  return (
    <div className="flex h-screen bg-[#f5f5f5] overflow-hidden">
      <Sidebar />

      {mobileOpen && (
        <div className="lg:hidden">
          <div
            className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <Sidebar mobile />
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-[#0a0a0a]">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/10 cursor-pointer"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-lg">⚽</span>
            <span className="font-bold text-white">4uGOL</span>
          </div>
          <div className="w-9" />
        </div>

        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
