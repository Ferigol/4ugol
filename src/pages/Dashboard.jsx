import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { PACK_PRICES, FOLLOW_UP_STATUSES, MRR_GOAL, PROSPECT_COLUMNS } from '../lib/constants'
import { ArrowRight, Loader2, CheckCircle2 } from 'lucide-react'

const DAY_NAMES   = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado']
const MONTH_NAMES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']

const STATUS_LABELS = {
  msg1: 'Msg 1', msg2: 'Msg 2', msg3: 'Msg 3',
  diagnostico: 'Diagnóstico', propuesta: 'Propuesta',
}

const daysSince = (dateStr) => {
  if (!dateStr) return null
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
}

const getLastContactDate = (prospect) => {
  const map = {
    msg1:        prospect.msg1_fecha,
    msg2:        prospect.msg2_fecha,
    msg3:        prospect.msg3_fecha,
    diagnostico: prospect.msg3_fecha || prospect.msg2_fecha || prospect.msg1_fecha,
    propuesta:   prospect.msg3_fecha || prospect.msg2_fecha || prospect.msg1_fecha,
  }
  return map[prospect.status] || null
}

const getGreeting = () => {
  const h = new Date().getHours()
  if (h >= 6 && h < 13) return 'Buenos días'
  if (h >= 13 && h < 20) return 'Buenas tardes'
  return 'Buenas noches'
}

export default function Dashboard() {
  const [prospects, setProspects] = useState([])
  const [clients, setClients]     = useState([])
  const [loading, setLoading]     = useState(true)

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

  const mrr = clients
    .filter(c => c.status !== 'pagado')
    .reduce((sum, c) =>
      sum + (c.pack === 'otro' ? (Number(c.custom_price) || 0) : (PACK_PRICES[c.pack] || 0)), 0)

  const mrrProgress   = Math.min((mrr / MRR_GOAL) * 100, 100)
  const remaining     = Math.max(MRR_GOAL - mrr, 0)
  const clientsNeeded = remaining > 0 ? Math.ceil(remaining / PACK_PRICES['4-3-3']) : 0
  const activeClients   = clients.filter(c => c.status !== 'pagado').length
  const activeProspects = prospects.filter(p => p.status !== 'cerrado').length

  const pendingFollowUps = prospects
    .filter(p => FOLLOW_UP_STATUSES.includes(p.status))
    .sort((a, b) => {
      const da = daysSince(getLastContactDate(a)) ?? -1
      const db = daysSince(getLastContactDate(b)) ?? -1
      return db - da
    })

  const urgentCount = pendingFollowUps.filter(p => {
    const d = daysSince(getLastContactDate(p))
    return d !== null && d > 7
  }).length

  const pipeline = PROSPECT_COLUMNS
    .filter(col => FOLLOW_UP_STATUSES.includes(col.id))
    .map(col => ({
      ...col,
      count: prospects.filter(p => p.status === col.id).length,
    }))

  const recentClients = [...clients]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 3)

  const now = new Date()
  const dateStr = `${DAY_NAMES[now.getDay()]} ${now.getDate()} de ${MONTH_NAMES[now.getMonth()]} · ${now.getFullYear()}`

  if (loading) return (
    <div className="flex items-center justify-center h-full bg-[#0a0a0a]">
      <Loader2 className="animate-spin text-[#E8410A]" size={28} />
    </div>
  )

  return (
    <div className="bg-[#0a0a0a] min-h-full px-8 py-8 max-w-5xl mx-auto space-y-8">

      {/* ── ZONA 1: Header ── */}
      <div>
        <h1 className="text-3xl text-white font-gilroy tracking-tight">
          {getGreeting()}, Fer
        </h1>
        <p className="text-sm text-[#666] mt-1 capitalize">{dateStr}</p>
      </div>

      {/* ── ZONA 2: KPIs ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">

        <Link
          to="/clientes"
          className="bg-[#161616] rounded-2xl border border-[#2a2a2a] p-5 hover:border-[#333] transition-colors"
        >
          <p className="text-[11px] font-semibold text-[#666] uppercase tracking-widest mb-2">MRR actual</p>
          <p className="text-3xl font-black text-white tracking-tight">${mrr.toLocaleString()}</p>
          <p className="text-xs text-[#666] mt-1.5">{mrrProgress.toFixed(0)}% de ${MRR_GOAL.toLocaleString()}</p>
        </Link>

        <Link
          to="/clientes"
          className="bg-[#161616] rounded-2xl border border-[#2a2a2a] p-5 hover:border-[#333] transition-colors"
        >
          <p className="text-[11px] font-semibold text-[#666] uppercase tracking-widest mb-2">Clientes activos</p>
          <p className="text-3xl font-black text-white tracking-tight">{activeClients}</p>
          <p className="text-xs text-[#1D9E75] mt-1.5">En progreso</p>
        </Link>

        <Link
          to="/prospectos"
          className="bg-[#161616] rounded-2xl border border-[#2a2a2a] p-5 hover:border-[#333] transition-colors"
        >
          <p className="text-[11px] font-semibold text-[#666] uppercase tracking-widest mb-2">Prospectos activos</p>
          <p className="text-3xl font-black text-white tracking-tight">{activeProspects}</p>
          <p className="text-xs text-[#666] mt-1.5">Sin cerrar</p>
        </Link>

        {/* Tarjeta urgentes — fondo y borde especial para que destaque */}
        <Link
          to="/prospectos"
          className="bg-[#1a0b08] rounded-2xl border border-[#E8410A44] p-5 hover:border-[#E8410A]/40 transition-colors"
        >
          <p className="text-[11px] font-semibold text-[#666] uppercase tracking-widest mb-2">Urgentes</p>
          <p className={`text-3xl font-black tracking-tight ${urgentCount > 0 ? 'text-[#E8410A]' : 'text-white'}`}>
            {urgentCount}
          </p>
          <p className="text-xs text-[#666] mt-1.5">+7 días sin contacto</p>
        </Link>

      </div>

      {/* ── ZONA 3: Acción de hoy ── */}
      <div className="bg-[#161616] rounded-2xl border border-[#2a2a2a]">

        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[#2a2a2a]">
          <div>
            <h2 className="text-sm font-semibold text-white">Acción de hoy</h2>
            <p className="text-xs text-[#666] mt-0.5">
              {pendingFollowUps.length > 0
                ? `${pendingFollowUps.length} prospecto${pendingFollowUps.length !== 1 ? 's' : ''} pendiente${pendingFollowUps.length !== 1 ? 's' : ''}`
                : 'Todo al día'}
            </p>
          </div>
          <Link
            to="/prospectos"
            className="text-xs text-[#666] hover:text-white flex items-center gap-1 transition-colors"
          >
            Ver todos <ArrowRight size={11} />
          </Link>
        </div>

        {pendingFollowUps.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <CheckCircle2 size={32} className="text-[#1D9E75]" />
            <p className="text-sm font-semibold text-white">Todo al día</p>
            <p className="text-xs text-[#666]">No hay prospectos pendientes de contacto</p>
          </div>
        ) : (
          <div>
            {pendingFollowUps.map((p) => {
              const days = daysSince(getLastContactDate(p))
              const isCritical = days !== null && days > 14
              const isUrgent   = days !== null && days > 7
              return (
                <Link
                  key={p.id}
                  to={`/prospectos?id=${p.id}`}
                  className="flex items-center justify-between px-6 py-3.5 hover:bg-[#1c1c1c] transition-colors group"
                  style={{ borderBottom: '0.5px solid #222' }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-[#111] border border-[#2a2a2a] flex items-center justify-center text-white text-xs font-bold shrink-0 group-hover:border-[#E8410A]/30 transition-colors">
                      {p.name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{p.name}</p>
                      <p className="text-xs text-[#666] truncate">{p.club || '—'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-4">
                    <span className="text-[11px] font-medium text-[#555] px-2 py-0.5 rounded-md bg-[#111]">
                      {STATUS_LABELS[p.status] || p.status}
                    </span>
                    {days !== null && (
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md min-w-[36px] text-center ${
                        isCritical
                          ? 'bg-red-950 text-red-400'
                          : isUrgent
                            ? 'bg-[#2a1810] text-[#E8410A]'
                            : 'bg-[#111] text-[#555]'
                      }`}>
                        {days}d
                      </span>
                    )}
                    <ArrowRight size={13} className="text-[#333] group-hover:text-[#E8410A] transition-colors" />
                  </div>
                </Link>
              )
            })}
          </div>
        )}

      </div>

      {/* ── ZONA 4: Métricas secundarias ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* 4a · Meta MRR */}
        <div className="bg-[#161616] rounded-2xl border border-[#2a2a2a] p-5">
          <p className="text-[11px] font-semibold text-[#666] uppercase tracking-widest mb-4">Meta MRR</p>
          <div className="flex items-end justify-between mb-3">
            <span className="text-2xl font-black text-white">${mrr.toLocaleString()}</span>
            <span className="text-sm font-bold text-[#444]">${MRR_GOAL.toLocaleString()}</span>
          </div>
          <div className="w-full h-1.5 bg-[#222] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#E8410A] rounded-full transition-all duration-700"
              style={{ width: `${mrrProgress}%` }}
            />
          </div>
          <p className={`text-xs mt-3 ${clientsNeeded > 0 ? 'text-[#666]' : 'text-[#1D9E75]'}`}>
            {clientsNeeded > 0
              ? `Faltan ~${clientsNeeded} cliente${clientsNeeded !== 1 ? 's' : ''} pack 4-3-3`
              : '¡Meta superada!'}
          </p>
        </div>

        {/* 4b · Pipeline */}
        <div className="bg-[#161616] rounded-2xl border border-[#2a2a2a] p-5">
          <p className="text-[11px] font-semibold text-[#666] uppercase tracking-widest mb-4">Pipeline</p>
          <div className="space-y-3">
            {pipeline.map(col => {
              const pct = activeProspects > 0 ? (col.count / activeProspects) * 100 : 0
              return (
                <div key={col.id}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-[#666]">{col.label}</span>
                    <span className="text-xs font-semibold text-white">{col.count}</span>
                  </div>
                  <div className="w-full h-1 bg-[#222] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#E8410A]/50 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* 4c · Clientes recientes */}
        <div className="bg-[#161616] rounded-2xl border border-[#2a2a2a] p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[11px] font-semibold text-[#666] uppercase tracking-widest">Clientes recientes</p>
            <Link to="/clientes" className="text-[11px] text-[#666] hover:text-white transition-colors">
              Ver todos
            </Link>
          </div>
          {recentClients.length === 0 ? (
            <p className="text-xs text-[#444] py-6 text-center">Sin clientes aún</p>
          ) : (
            <div className="space-y-3">
              {recentClients.map(c => (
                <div key={c.id} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-[#0f2a1f] border border-[#1D9E75]/20 flex items-center justify-center text-[#1D9E75] text-xs font-bold shrink-0">
                    {c.name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{c.name}</p>
                    <p className="text-[10px] text-[#666] truncate">{c.pack || '—'}</p>
                  </div>
                  <span className="text-[10px] font-semibold text-[#1D9E75] bg-[#0f2a1f] px-1.5 py-0.5 rounded ml-auto shrink-0">
                    {c.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
