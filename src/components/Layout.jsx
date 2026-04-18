import React, { useState, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  Briefcase,
  LogOut,
  Sun,
  Moon,
  Menu,
  X,
  Zap,
} from 'lucide-react'
import { supabase } from '../lib/supabase'

const NAV_LINKS = [
  { to: '/',            label: 'Dashboard',   icon: LayoutDashboard },
  { to: '/prospectos',  label: 'Prospectos',  icon: Users },
  { to: '/clientes',    label: 'Clientes',    icon: Briefcase },
]

export default function Layout({ children, theme, onToggleTheme }) {
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
        bg-white dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800
        flex flex-col transition-all duration-200 shrink-0
      `}
    >
      {/* Logo */}
      <div className={`flex items-center gap-3 px-4 py-5 border-b border-gray-200 dark:border-gray-800 ${collapsed && !mobile ? 'justify-center px-0' : ''}`}>
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-green-500 shadow-lg shadow-green-500/30 shrink-0">
          <span className="text-white text-lg">⚽</span>
        </div>
        {(!collapsed || mobile) && (
          <div>
            <span className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">4uGOL</span>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 leading-none">CRM</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-1">
        {NAV_LINKS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group
              ${isActive
                ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
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
      <div className={`px-2 py-4 border-t border-gray-200 dark:border-gray-800 space-y-1 ${collapsed && !mobile ? 'px-1' : ''}`}>
        {/* Theme toggle */}
        <button
          onClick={onToggleTheme}
          className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-all cursor-pointer ${collapsed && !mobile ? 'justify-center' : ''}`}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          {(!collapsed || mobile) && <span>{theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}</span>}
        </button>

        {/* Collapse button (desktop only) */}
        {!mobile && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={`hidden lg:flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all cursor-pointer ${collapsed ? 'justify-center' : ''}`}
          >
            <Menu size={18} />
            {!collapsed && <span>Colapsar</span>}
          </button>
        )}

        {/* Logout */}
        <button
          onClick={handleLogout}
          className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all cursor-pointer ${collapsed && !mobile ? 'justify-center' : ''}`}
        >
          <LogOut size={18} />
          {(!collapsed || mobile) && <span>Cerrar sesión</span>}
        </button>
      </div>
    </aside>
  )

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden">
      {/* Desktop sidebar */}
      <Sidebar />

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="lg:hidden">
          <div
            className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <Sidebar mobile />
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-lg">⚽</span>
            <span className="font-bold text-gray-900 dark:text-white">4uGOL</span>
          </div>
          <button
            onClick={onToggleTheme}
            className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
