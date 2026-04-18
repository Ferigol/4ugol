import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
      if (authError) throw authError
    } catch (err) {
      setError(err.message || 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(235,92,55,0.08), transparent)' }} />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(79,160,82,0.06), transparent)' }} />
      </div>

      <div className="relative w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-[#eb5c37] shadow-lg mb-4">
              <span className="text-3xl">⚽</span>
            </div>
            <h1 className="text-3xl font-black text-[#0a0a0a] tracking-tight">4uGOL</h1>
            <p className="text-[#6b6b6b] text-sm mt-1">Football Artist CRM</p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#0a0a0a] mb-1.5">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
                className="w-full px-4 py-3 rounded-xl bg-[#f5f5f5] border border-[#e5e5e5] text-[#0a0a0a] placeholder-[#b0b0b0] focus:outline-none focus:border-[#eb5c37] focus:ring-2 focus:ring-[#eb5c37]/20 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#0a0a0a] mb-1.5">Contraseña</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-4 py-3 rounded-xl bg-[#f5f5f5] border border-[#e5e5e5] text-[#0a0a0a] placeholder-[#b0b0b0] focus:outline-none focus:border-[#eb5c37] focus:ring-2 focus:ring-[#eb5c37]/20 transition-all"
              />
            </div>

            {error && (
              <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
                {error}
              </div>
            )}

            <button
              id="login-btn"
              type="submit"
              disabled={loading}
              className="w-full py-3 px-6 rounded-xl font-semibold text-sm bg-[#eb5c37] hover:bg-[#d44d2c] text-white shadow-lg transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Entrando...
                </span>
              ) : 'Iniciar sesión'}
            </button>
          </form>

          <p className="text-center text-xs text-[#b0b0b0] mt-6">
            Las cuentas son creadas por el administrador
          </p>
        </div>
      </div>
    </div>
  )
}
