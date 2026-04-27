import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { PACK_PRICES, FOLLOW_UP_STATUSES, MRR_GOAL } from '../lib/constants'
import { Bell, ArrowRight, Loader2, Search } from 'lucide-react'

const MONTH_ABBR = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
const DAY_NAMES  = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']

const STATUS_LABELS = { msg1: 'Msg 1', msg2: 'Msg 2', diagnostico: 'Diagnóstico' }

// SVG line chart — generates a smooth path from data points
function MiniLineChart({ values, width = 280, height = 90 }) {
  const max = Math.max(...values, 1)
  const pts = values.map((v, i) => ({
    x: (i / (values.length - 1)) * width,
    y: height - 8 - ((v / max) * (height - 16)),
  }))

  // Build smooth cubic bezier path
  let d = `M ${pts[0].x} ${pts[0].y}`
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1]
    const curr = pts[i]
    const cx = (prev.x + curr.x) / 2
    d += ` C ${cx} ${prev.y}, ${cx} ${curr.y}, ${curr.x} ${curr.y}`
  }

  // Area fill path
  let fill = `${d} L ${pts[pts.length - 1].x} ${height} L ${pts[0].x} ${height} Z`

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#E8410A" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#E8410A" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fill} fill="url(#chartFill)" />
      <path d={d} fill="none" stroke="#E8410A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {/* Last point dot */}
      <circle
        cx={pts[pts.length - 1].x}
        cy={pts[pts.length - 1].y}
        r="4"
        fill="#E8410A"
        stroke="#0a0a0a"
        strokeWidth="2"
      />
    </svg>
  )
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

  const activeProspects = prospects.filter(p => p.status !== 'cerrado').length
  const activeClients   = clients.filter(c => c.status !== 'pagado').length
  const mrr = clients.reduce((sum, c) =>
    sum + (c.pack === 'otro' ? (Number(c.custom_price) || 0) : (PACK_PRICES[c.pack] || 0)), 0)
  const pendingFollowUps = prospects.filter(p => FOLLOW_UP_STATUSES.includes(p.status))
  const mrrProgress  = Math.min((mrr / MRR_GOAL) * 100, 100)
  const remaining    = Math.max(MRR_GOAL - mrr, 0)
  const clientsNeeded = remaining > 0 ? Math.ceil(remaining / PACK_PRICES['4-3-3']) : 0

  // Chart data: 6-point progression ending at current MRR
  const chartValues = useMemo(() => {
    const base = mrr || 780
    return [
      Math.round(base * 0.08),
      Math.round(base * 0.22),
      Math.round(base * 0.41),
      Math.round(base * 0.62),
      Math.round(base * 0.81),
      base,
    ]
  }, [mrr])

  const chartMonths = useMemo(() => {
    const now = new Date()
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)
      return MONTH_ABBR[d.getMonth()]
    })
  }, [])

  const now = new Date()
  const dateStr = `${DAY_NAMES[now.getDay()]} ${now.getDate()} ${MONTH_ABBR[now.getMonth()]} ${now.getFullYear()}`

  const metricCards = [
    { id: 'active-prospects', label: 'Prospectos activos',     value: activeProspects,            link: '/prospectos', dark: true },
    { id: 'active-clients',   label: 'Clientes activos',        value: activeClients,              link: '/clientes',   dark: false },
    { id: 'current-mrr',      label: 'MRR actual',              value: `$${mrr.toLocaleString()}`, link: '/clientes',   dark: true },
    { id: 'pending-followups',label: 'Seguimientos pendientes', value: pendingFollowUps.length,    link: '/prospectos', dark: false },
  ]

  if (loading) return (
    <div className="flex items-center justify-center h-full bg-[#0a0a0a]">
      <Loader2 className="animate-spin text-[#E8410A]" size={28} />
    </div>
  )

  return (
    <div className="flex flex-col bg-[#0a0a0a] overflow-x-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-8 pt-7 pb-0 shrink-0">
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#111] border border-[#222] text-[#555] w-64">
          <Search size={14} />
          <span className="text-xs">Buscar...</span>
        </div>
        <span className="text-xs text-[#444] font-medium capitalize">{dateStr}</span>
      </div>

      <div className="px-8 py-7 space-y-5 max-w-5xl w-full mx-auto">
        {/* Greeting */}
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Hola Fer 👋</h1>
          <p className="text-[#444] text-sm mt-1">Aquí está el resumen de hoy</p>
        </div>

        {/* Metric cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {metricCards.map((card) => (
            <Link
              key={card.id}
              id={card.id}
              to={card.link}
              className={`group rounded-2xl p-5 flex flex-col gap-1 border transition-all duration-200 hover:-translate-y-0.5 cursor-pointer
                ${card.dark
                  ? 'bg-[#111] border-[#222] hover:border-[#333]'
                  : 'bg-[#E8410A] border-[#E8410A] hover:bg-[#d03a09]'
                }
              `}
            >
              <span className={`text-3xl font-black tracking-tight ${card.dark ? 'text-white' : 'text-white'}`}>
                {card.value}
              </span>
              <span className={`text-xs font-medium leading-tight ${card.dark ? 'text-[#555]' : 'text-white/70'}`}>
                {card.label}
              </span>
              <ArrowRight size={14} className={`mt-1 opacity-0 group-hover:opacity-100 transition-opacity ${card.dark ? 'text-[#E8410A]' : 'text-white'}`} />
            </Link>
          ))}
        </div>

        {/* MRR Progress — orange card */}
        <div className="rounded-2xl bg-[#E8410A] p-6 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10"
            style={{ background: 'radial-gradient(circle at top right, #fff 0%, transparent 60%)' }} />
          <div className="relative">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-white/70 text-xs font-medium uppercase tracking-wider mb-1">Meta mensual</p>
                <p className="text-2xl font-black text-white">
                  ${mrr.toLocaleString()} <span className="text-white/50 text-base font-medium">de ${MRR_GOAL.toLocaleString()}</span>
                </p>
              </div>
              <span className="text-4xl font-black text-white">{mrrProgress.toFixed(0)}%</span>
            </div>

            {/* Progress bar */}
            <div className="w-full h-2 bg-white/20 rounded-full overflow-visible relative">
              <div
                className="h-full bg-white rounded-full transition-all duration-700 relative"
                style={{ width: `${mrrProgress}%` }}
              >
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 border-[#E8410A] shadow-lg translate-x-1/2" />
              </div>
            </div>

            <p className="text-white/60 text-xs mt-4">
              {clientsNeeded > 0
                ? `~${clientsNeeded} cliente${clientsNeeded !== 1 ? 's' : ''} más (pack 4-3-3) para llegar al objetivo`
                : '¡Meta superada! 🎉'}
            </p>
          </div>
        </div>

        {/* Bottom 2 columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Seguimientos pendientes */}
          <div className="bg-[#111] rounded-2xl border border-[#222] p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-white">Seguimientos</h2>
              <Link
                to="/prospectos"
                className="text-xs text-[#E8410A] hover:text-[#FF5A1F] font-medium flex items-center gap-1 transition-colors"
              >
                Ver todos <ArrowRight size={11} />
              </Link>
            </div>

            {pendingFollowUps.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-[#333]">
                <Bell size={24} className="mb-2" />
                <p className="text-xs">Sin seguimientos pendientes</p>
              </div>
            ) : (
              <div className="space-y-1">
                {pendingFollowUps.slice(0, 7).map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between py-2 px-2 rounded-xl hover:bg-[#1a1a1a] transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-[#E8410A]/10 border border-[#E8410A]/20 flex items-center justify-center text-[#E8410A] text-xs font-bold shrink-0">
                        {p.name?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-white truncate">{p.name}</p>
                        <p className="text-[10px] text-[#444] truncate">{p.club || '—'}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-950 text-amber-400 shrink-0 ml-2">
                      {STATUS_LABELS[p.status] || p.status}
                    </span>
                  </div>
                ))}
                {pendingFollowUps.length > 7 && (
                  <p className="text-center text-[10px] text-[#444] pt-2">
                    +{pendingFollowUps.length - 7} más
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Revenue chart */}
          <div className="bg-[#111] rounded-2xl border border-[#222] p-5">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-sm font-semibold text-white">Evolución MRR</h2>
              <span className="text-xs text-[#1D9E75] font-semibold bg-[#0f2a1f] px-2 py-0.5 rounded-full">
                +{mrrProgress.toFixed(0)}%
              </span>
            </div>
            <p className="text-[10px] text-[#444] mb-4">Últimos 6 meses</p>

            <div className="w-full">
              <MiniLineChart values={chartValues} />
            </div>

            {/* X-axis labels */}
            <div className="flex justify-between mt-1 px-0.5">
              {chartMonths.map((m) => (
                <span key={m} className="text-[9px] text-[#333]">{m}</span>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-[#1a1a1a] flex items-center justify-between">
              <div>
                <p className="text-[10px] text-[#444]">MRR actual</p>
                <p className="text-base font-black text-white">${mrr.toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-[#444]">Objetivo</p>
                <p className="text-base font-black text-[#555]">${MRR_GOAL.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
