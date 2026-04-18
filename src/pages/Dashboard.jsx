import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { PACK_PRICES, FOLLOW_UP_STATUSES, MRR_GOAL } from '../lib/constants'
import { Users, Briefcase, TrendingUp, Bell, ArrowRight, Loader2 } from 'lucide-react'

export default function Dashboard() {
  const [prospects, setProspects] = useState([])
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      supabase.from('prospects').select('*'),
      supabase.from('clients').select('*'),
    ]).then(([{ data: p }, { data: c }]) => {
      setProspects(p || [])
      setClients(c || [])
      setLoading(false)
    })
  }, [])

  const activeProspects = prospects.filter(p => p.status !== 'cerrado').length
  const activeClients = clients.filter(c => c.status !== 'pagado').length
  const mrr = clients.reduce((sum, c) => sum + (c.pack === 'otro' ? (Number(c.custom_price) || 0) : (PACK_PRICES[c.pack] || 0)), 0)
  const pendingFollowUps = prospects.filter(p => FOLLOW_UP_STATUSES.includes(p.status))
  const mrrProgress = Math.min((mrr / MRR_GOAL) * 100, 100)
  const remaining = MRR_GOAL - mrr
  const clientsNeeded = remaining > 0 ? Math.ceil(remaining / PACK_PRICES['4-3-3']) : 0

  const today = new Date().toLocaleDateString('es-ES', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  const metricCards = [
    { id: 'active-prospects', icon: Users,      label: 'Prospectos activos',       value: activeProspects,             link: '/prospectos' },
    { id: 'active-clients',   icon: Briefcase,  label: 'Clientes activos',          value: activeClients,               link: '/clientes' },
    { id: 'current-mrr',      icon: TrendingUp, label: 'MRR actual',                value: `$${mrr.toLocaleString()}`,  link: '/clientes' },
    { id: 'pending-followups',icon: Bell,       label: 'Seguimientos pendientes',   value: pendingFollowUps.length,     link: '/prospectos' },
  ]

  const STATUS_LABELS = { msg1: 'Msg 1', msg2: 'Msg 2', diagnostico: 'Diagnóstico' }

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <Loader2 className="animate-spin text-[#eb5c37]" size={32} />
    </div>
  )

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#0a0a0a]">¡Bienvenido! 👋</h1>
        <p className="text-[#6b6b6b] text-sm mt-1 capitalize">{today}</p>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metricCards.map((card) => (
          <Link
            key={card.id}
            id={card.id}
            to={card.link}
            className="group bg-white rounded-2xl border border-[#e5e5e5] p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
          >
            <div className="inline-flex p-2.5 rounded-xl bg-[#eb5c37]/10 mb-3">
              <card.icon size={20} className="text-[#eb5c37]" />
            </div>
            <div className="text-2xl font-bold text-[#eb5c37]">{card.value}</div>
            <div className="text-xs text-[#6b6b6b] mt-1 font-medium">{card.label}</div>
            <div className="flex items-center gap-1 mt-2 text-xs text-[#c0c0c0] group-hover:text-[#eb5c37] transition-colors">
              Ver <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>
        ))}
      </div>

      {/* MRR Progress */}
      <div className="bg-white rounded-2xl border border-[#e5e5e5] p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-[#0a0a0a]">Meta mensual</h2>
            <p className="text-sm text-[#6b6b6b] mt-0.5">
              Objetivo: <span className="font-semibold text-[#4fa052]">${MRR_GOAL.toLocaleString()}/mes</span>
            </p>
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold text-[#eb5c37]">{mrrProgress.toFixed(0)}%</span>
          </div>
        </div>

        <div className="w-full h-2.5 bg-[#f0f0f0] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${mrrProgress}%`,
              background: 'linear-gradient(90deg, #eb5c37, #f57c5f)',
            }}
          />
        </div>

        <div className="flex items-center justify-between mt-3 text-sm">
          <span className="text-[#6b6b6b]">
            ${mrr.toLocaleString()} de ${MRR_GOAL.toLocaleString()}
          </span>
          {clientsNeeded > 0 ? (
            <span className="text-amber-500 font-medium">
              💡 ~{clientsNeeded} cliente{clientsNeeded !== 1 ? 's' : ''} más (4-3-3)
            </span>
          ) : (
            <span className="text-[#4fa052] font-medium">🎉 ¡Meta superada!</span>
          )}
        </div>
      </div>

      {/* Pending follow-ups */}
      <div className="bg-white rounded-2xl border border-[#e5e5e5] p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-[#0a0a0a]">Seguimientos pendientes</h2>
          <Link
            to="/prospectos"
            className="text-xs text-[#eb5c37] hover:text-[#d44d2c] font-medium flex items-center gap-1"
          >
            Ver todos <ArrowRight size={12} />
          </Link>
        </div>

        {pendingFollowUps.length === 0 ? (
          <div className="text-center py-8 text-[#c0c0c0]">
            <Bell size={28} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">¡Sin seguimientos pendientes!</p>
          </div>
        ) : (
          <div className="divide-y divide-[#f0f0f0]">
            {pendingFollowUps.slice(0, 8).map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between py-3 px-2 hover:bg-[#fef8f6] rounded-xl transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                    style={{ background: 'linear-gradient(135deg, #eb5c37, #f57c5f)' }}
                  >
                    {p.name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#0a0a0a]">{p.name}</p>
                    <p className="text-xs text-[#6b6b6b]">{p.club || '—'}</p>
                  </div>
                </div>
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-amber-50 text-amber-600">
                  {STATUS_LABELS[p.status] || p.status}
                </span>
              </div>
            ))}
            {pendingFollowUps.length > 8 && (
              <p className="text-center text-xs text-[#6b6b6b] pt-3">
                +{pendingFollowUps.length - 8} más
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
