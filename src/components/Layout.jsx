import React, { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { LogOut, Menu } from 'lucide-react'
import Logo from './Logo'
import { supabase } from '../lib/supabase'

const NAV_LINKS = [
  { to: '/',           label: 'Dashboard',  dot: 'bg-blue-500' },
  { to: '/prospectos', label: 'Prospectos', dot: 'bg-amber-500' },
  { to: '/clientes',   label: 'Clientes',   dot: 'bg-[#1D9E75]' },
]

export default function Layout({ children }) {
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const Sidebar = ({ mobile = false }) => (
    <aside className={`
      ${mobile ? 'fixed inset-y-0 left-0 z-40 w-[200px]' : 'hidden lg:flex min-w-[180px] max-w-[180px] sticky top-0 h-screen'}
      bg-[#111111] flex flex-col shrink-0 border-r border-[#1a1a1a] overflow-hidden
    `}>
      {/* Logo */}
      <div className="flex items-center px-5 py-5 border-b border-[#1a1a1a]">
        <Logo width={80} height={22} className="text-white ml-5" />
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-5 space-y-0.5">
        {NAV_LINKS.map(({ to, label, dot }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer
              ${isActive
                ? 'bg-[#1a1a1a] text-white'
                : 'text-[#555] hover:text-[#888] hover:bg-[#161616]'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className={`w-2 h-2 rounded-full shrink-0 ${isActive ? 'bg-[#E8410A]' : dot} ${isActive ? '' : 'opacity-50'}`} />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-4 border-t border-[#1a1a1a] space-y-3">
        {/* Avatar circles */}
        <div className="flex items-center gap-2 px-2">
          <div className="w-8 h-8 rounded-full bg-[#E8410A] flex items-center justify-center text-white text-xs font-bold shrink-0">
            F
          </div>
          <div className="w-8 h-8 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center text-[#444] text-xs font-bold shrink-0">
            ?
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-sm font-medium text-[#444] hover:text-red-400 hover:bg-[#1a1a1a] transition-all cursor-pointer"
        >
          <LogOut size={15} />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  )

  return (
    <div className="flex h-screen bg-[#0a0a0a]">
      <Sidebar />

      {mobileOpen && (
        <div className="lg:hidden">
          <div
            className="fixed inset-0 z-30 bg-black/70 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <Sidebar mobile />
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-[#111111] border-b border-[#1a1a1a] sticky top-0 z-20">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-lg text-[#555] hover:text-white hover:bg-[#1a1a1a] cursor-pointer"
          >
            <Menu size={18} />
          </button>
          <Logo width={72} height={20} className="text-white" />
          <div className="w-9" />
        </div>

        <main className="flex-1 overflow-y-scroll overflow-x-hidden flex flex-col">
          {children}
        </main>
      </div>
    </div>
  )
}
