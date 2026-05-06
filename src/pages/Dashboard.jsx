import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { PACK_PRICES, FOLLOW_UP_STATUSES, MRR_GOAL, PROSPECT_COLUMNS } from '../lib/constants'
import { ArrowRight, Loader2, CheckCircle2 } from 'lucide-react'

const DAY_NAMES   = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado']
const MONTH_NAMES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']

const NEXT_ACTION_LABEL = {
  msg1:        name => `Enviar MSG2 a ${name}`,
  msg2:        name => `Enviar MSG3 a ${name}`,
  msg3:        name => `Llamar a ${name}`,
  diagnostico: name => `Seguimiento diagnóstico con ${name}`,
  propuesta:   name => `Seguir propuesta con ${name}`,
}
const getNextAction = (p) =>
  (NEXT_ACTION_LABEL[p.status] || (name => `Contactar a ${name}`))(p.name || '—')

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

const MAX_VISIBLE = 10

const fireUrgentNotification = (count, onNavigate) => {
  const already = sessionStorage.getItem('4ugol-notif-urgentes')
  if (already) return
  const send = () => {
    sessionStorage.setItem('4ugol-notif-urgentes', '1')
    const notif = new Notification('4uGOL — Seguimiento pendiente', {
      body: `${count} prospecto${count !== 1 ? 's' : ''} con más de 7 días sin contacto`,
      icon: '/favicon.ico',
      tag: '4ugol-urgentes',
      requireInteraction: false,
    })
    notif.onclick = () => { window.focus(); onNavigate() }
  }
  if (!('Notification' in window)) return
  if (Notification.permission === 'granted') { send(); return }
  if (Notification.permission === 'default') {
    Notification.requestPermission().then(perm => { if (perm === 'granted') send() })
  }
}

function MrrLineChart({ data }) {
  if (!data || data.length < 2) {
    return (
      <div className="h-12 flex items-center justify-center">
        <span className="text-[10px] text-[#444]">Acumulando datos...</span>
      </div>
    )
  }

  const sorted = [...data].sort((a, b) => a.month.localeCompare(b.month))
  const amounts = sorted.map(s => Number(s.amount))
  const maxVal = Math.max(...amounts, 1)
  const minVal = Math.min(...amounts, 0)
  const range = maxVal - minVal || 1

  const W = 200, H = 48, padX = 6, padY = 6
  const innerW = W - padX * 2
  const innerH = H - padY * 2

  const points = sorted.map((s, i) => ({
    x: padX + (sorted.length > 1 ? (i / (sorted.length - 1)) * innerW : innerW / 2),
    y: H - padY - ((Number(s.amount) - minVal) / range) * innerH,
  }))

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
  const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${H} L ${points[0].x.toFixed(1)} ${H} Z`

  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="overflow-visible">
      <defs>
        <linearGradient id="mrrGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#E8410A" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#E8410A" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#mrrGrad)" />
      <path d={linePath} fill="none" stroke="#E8410A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => (
        <circle
          key={i}
          cx={p.x.toFixed(1)}
          cy={p.y.toFixed(1)}
          r={i === points.length - 1 ? 3 : 2}
          fill="#E8410A"
          fillOpacity={i === points.length - 1 ? 1 : 0.5}
        />
      ))}
    </svg>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [prospects, setProspects]   = useState([])
  const [clients, setClients]       = useState([])
  const [loading, setLoading]       = useState(true)
  const [mrrHistory, setMrrHistory] = useState([])

  useEffect(() => {
    async function load() {
      const [{ data: p }, { data: c }] = await Promise.all([
        supabase.from('prospects').select('*'),
        supabase.from('clients').select('*').order('created_at', { ascending: false }),
      ])
      const prosp = p || []
      const cli   = c || []
      setProspects(prosp)
      setClients(cli)

      const now = new Date()
      now.setDate(1)
      const monthKey = now.toISOString().split('T')[0]

      const { data: snaps } = await supabase
        .from('mrr_snapshots')
        .select('*')
        .order('month', { ascending: false })
        .limit(6)

      const hasCurrentMonth = snaps?.some(s => (s.month || '').slice(0, 7) === monthKey.slice(0, 7))

      if (!hasCurrentMonth) {
        const currentMrr = cli
          .filter(cl => cl.status !== 'pagado')
          .reduce((sum, cl) => sum + (cl.pack === 'otro' ? (Number(cl.custom_price) || 0) : (PACK_PRICES[cl.pack] || 0)), 0)
        const currentClientsCount = cli.filter(cl => cl.status !== 'pagado').length

        await supabase.from('mrr_snapshots').insert({
          user_id: 'fer',
          month: monthKey,
          amount: currentMrr,
          clients_count: currentClientsCount,
        })

        const { data: updatedSnaps } = await supabase
          .from('mrr_snapshots')
          .select('*')
          .order('month', { ascending: false })
          .limit(6)
        setMrrHistory(updatedSnaps || [])
      } else {
        setMrrHistory(snaps || [])
      }

      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    if (!prospects.length) return
    const urgentCount = prospects.filter(p => {
      if (p.status === 'archivado' || p.status === 'convertido') return false
      const d = daysSince(getLastContactDate(p))
      return d !== null && d > 7
    }).length
    if (urgentCount === 0) return
    fireUrgentNotification(urgentCount, () => navigate('/prospectos'))
  }, [prospects, navigate])

  const mrr = clients
    .filter(c => c.status !== 'pagado')
    .reduce((sum, c) =>
      sum + (c.pack === 'otro' ? (Number(c.custom_price) || 0) : (PACK_PRICES[c.pack] || 0)), 0)

  const mrrProgress   = Math.min((mrr / MRR_GOAL) * 100, 100)
  const remaining     = Math.max(MRR_GOAL - mrr, 0)
  const clientsNeeded = remaining > 0 ? Math.ceil(remaining / PACK_PRICES['4-3-3']) : 0
  const activeClients   = clients.filter(c => c.status !== 'pagado').length
  const activeProspects = prospects.filter(p => !['cerrado', 'convertido', 'archivado'].includes(p.status)).length

  const pendingFollowUps = prospects
    .filter(p => FOLLOW_UP_STATUSES.includes(p.status))
    .sort((a, b) => {
      const da = daysSince(getLastContactDate(a)) ?? -1
      const db = daysSince(getLastContactDate(b)) ?? -1
      return db - da
    })

  const urgentFollowUps    = pendingFollowUps.filter(p => { const d = daysSince(getLastContactDate(p)); return d !== null && d > 7 })
  const nonUrgentFollowUps = pendingFollowUps.filter(p => { const d = daysSince(getLastContactDate(p)); return d === null || d <= 7 })
  const urgentCount        = urgentFollowUps.length
  const slotsLeft          = Math.max(MAX_VISIBLE - urgentCount, 0)
  const fillerItems        = nonUrgentFollowUps.slice(0, slotsLeft)
  const fillerCount        = fillerItems.length
  const visibleFollowUps   = [...urgentFollowUps.slice(0, MAX_VISIBLE), ...fillerItems]
  const hiddenCount        = Math.max(urgentCount - MAX_VISIBLE, 0)

  const pipeline = PROSPECT_COLUMNS
    .filter(col => FOLLOW_UP_STATUSES.includes(col.id))
    .map(col => ({ ...col, count: prospects.filter(p => p.status === col.id).length }))

  const recentClients = clients
    .filter((c, i, arr) => arr.findIndex(x => x.id === c.id) === i)
    .slice(0, 3)

  const todayLocal = (() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })()

  const todayFollowups = prospects.filter(p =>
    p.followup_date &&
    p.followup_date <= todayLocal &&
    p.status !== 'cerrado' &&
    p.status !== 'convertido' &&
    p.status !== 'archivado'
  )

  const now = new Date()
  const dateStr = `${DAY_NAMES[now.getDay()]} ${now.getDate()} de ${MONTH_NAMES[now.getMonth()]} · ${now.getFullYear()}`

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-[#0a0a0a]">
      <Loader2 className="animate-spin text-[#E8410A]" size={28} />
    </div>
  )

  return (
    <div className="flex flex-col px-4 py-4 gap-4 max-w-5xl mx-auto w-full">

      {/* Header */}
      <div className="shrink-0">
        <h1 className="text-2xl text-white font-gilroy tracking-tight">{getGreeting()}, Fer</h1>
        <p className="text-[11px] text-[#555] mt-0.5 capitalize">{dateStr}</p>
      </div>

      {/* KPIs — igual altura con items-stretch */}
      <div className="shrink-0 grid grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">

        <Link to="/clientes"
          className="bg-[#161616] rounded-[10px] border border-[#2a2a2a] p-4 hover:border-[#333] transition-colors flex flex-col"
        >
          <p className="text-[10px] font-semibold text-[#666] uppercase tracking-widest mb-2">MRR actual</p>
          <p className="text-[22px] font-bold text-white tracking-tight">${mrr.toLocaleString()}</p>
          <p className="text-[11px] text-[#555] mt-1">{mrrProgress.toFixed(0)}% de ${MRR_GOAL.toLocaleString()}</p>
        </Link>

        <Link to="/clientes"
          className="bg-[#161616] rounded-[10px] border border-[#2a2a2a] p-4 hover:border-[#333] transition-colors flex flex-col"
        >
          <p className="text-[10px] font-semibold text-[#666] uppercase tracking-widest mb-2">Clientes activos</p>
          <p className="text-[22px] font-bold text-white tracking-tight">{activeClients}</p>
          <p className="text-[11px] text-[#1D9E75] mt-1">En progreso</p>
        </Link>

        <Link to="/prospectos"
          className="bg-[#161616] rounded-[10px] border border-[#2a2a2a] p-4 hover:border-[#333] transition-colors flex flex-col"
        >
          <p className="text-[10px] font-semibold text-[#666] uppercase tracking-widest mb-2">Prospectos activos</p>
          <p className="text-[22px] font-bold text-white tracking-tight">{activeProspects}</p>
          <p className="text-[11px] text-[#555] mt-1">Sin cerrar</p>
        </Link>

        <Link to="/prospectos"
          className="bg-[#1a0b08] rounded-[10px] border border-[#E8410A44] p-4 hover:border-[#E8410A]/40 transition-colors flex flex-col"
        >
          <p className="text-[10px] font-semibold text-[#666] uppercase tracking-widest mb-2">Urgentes</p>
          <p className={`text-[22px] font-bold tracking-tight ${urgentCount > 0 ? 'text-[#E8410A]' : 'text-white'}`}>
            {urgentCount}
          </p>
          <p className="text-[11px] text-[#555] mt-1">+7 días sin contacto</p>
        </Link>

      </div>

      {/* Seguimientos programados hoy */}
      {todayFollowups.length > 0 && (
        <div className="shrink-0 bg-[#161616] rounded-[10px] border border-red-900/40 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#2a2a2a]">
            <p className="text-[10px] font-semibold text-[#666] uppercase tracking-widest">Seguimientos programados hoy</p>
            <span className="text-[11px] font-bold text-red-400 bg-red-950 px-1.5 py-0.5 rounded-md">{todayFollowups.length}</span>
          </div>
          <div className="flex flex-col">
            {todayFollowups.map((p, idx) => (
              <Link
                key={p.id}
                to={`/prospectos?id=${p.id}`}
                className="flex items-center justify-between px-4 py-2.5 hover:bg-[#1c1c1c] transition-colors group"
                style={{ borderTop: idx > 0 ? '0.5px solid #222' : 'none' }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-6 h-6 rounded-full bg-[#1a0505] border border-red-900/40 flex items-center justify-center text-red-400 text-[10px] font-bold shrink-0">
                    {p.name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <p className="text-sm font-semibold text-white truncate">{p.name}</p>
                  {p.club && <p className="text-[11px] text-[#555] truncate hidden sm:block">{p.club}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-red-950 text-red-400 whitespace-nowrap">
                    SEGUIMIENTO HOY
                  </span>
                  <ArrowRight size={11} className="text-[#333] group-hover:text-[#E8410A] transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Dos columnas */}
      <div className="flex gap-4 items-stretch">

        {/* Izquierda — Acción de hoy (60%) */}
        <div className="w-3/5 flex flex-col">
          <div className="h-full bg-[#161616] rounded-[10px] border border-[#2a2a2a] flex flex-col overflow-hidden">

            <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-[#2a2a2a]">
              <div>
                <h2 className="text-sm font-semibold text-white">Acción de hoy</h2>
                <p className="text-[11px] text-[#555] mt-0.5">
                  {urgentCount === 0 && fillerCount === 0
                    ? 'Todo al día'
                    : [
                        urgentCount > 0 && `${urgentCount} urgente${urgentCount !== 1 ? 's' : ''}`,
                        fillerCount  > 0 && `${fillerCount} en seguimiento`,
                      ].filter(Boolean).join(' · ')}
                </p>
              </div>
              <Link to="/prospectos"
                className="text-[11px] text-[#555] hover:text-white flex items-center gap-1 transition-colors"
              >
                Ver todos <ArrowRight size={11} />
              </Link>
            </div>

            {visibleFollowUps.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3">
                <CheckCircle2 size={28} className="text-[#1D9E75]" />
                <p className="text-sm font-semibold text-white">Todo al día</p>
                <p className="text-[11px] text-[#555]">No hay prospectos pendientes</p>
              </div>
            ) : (
              <div className="flex flex-col">
                {visibleFollowUps.map((p) => {
                  const days = daysSince(getLastContactDate(p))
                  const isCritical = days !== null && days > 14
                  const isUrgent   = days !== null && days > 7
                  return (
                    <Link
                      key={p.id}
                      to={`/prospectos?id=${p.id}`}
                      className="shrink-0 py-3 flex items-center justify-between px-4 hover:bg-[#1c1c1c] transition-colors group"
                      style={{ borderBottom: '0.5px solid #222' }}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-[#111] border border-[#2a2a2a] flex items-center justify-center text-white text-xs font-bold shrink-0 group-hover:border-[#E8410A]/30 transition-colors">
                          {p.name?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white truncate leading-tight">{p.name}</p>
                          <p className="text-[11px] text-[#E8410A] truncate leading-tight font-medium mt-0.5">
                            {getNextAction(p)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-3">
                        {days !== null && (
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md min-w-[34px] text-center ${
                            isCritical ? 'bg-red-950 text-red-400'
                            : isUrgent  ? 'bg-[#2a1810] text-[#E8410A]'
                            : 'bg-[#111] text-[#555]'
                          }`}>
                            {days}d
                          </span>
                        )}
                        <ArrowRight size={12} className="text-[#333] group-hover:text-[#E8410A] transition-colors" />
                      </div>
                    </Link>
                  )
                })}
                {hiddenCount > 0 && (
                  <Link
                    to="/prospectos"
                    className="shrink-0 flex items-center gap-1.5 px-4 py-3 text-[11px] text-[#555] hover:text-white transition-colors border-t border-[#222]"
                  >
                    <ArrowRight size={11} />
                    Ver {hiddenCount} prospecto{hiddenCount !== 1 ? 's' : ''} más
                  </Link>
                )}
              </div>
            )}

          </div>
        </div>

        {/* Derecha — Métricas (40%) */}
        <div className="w-2/5 flex flex-col gap-4">

          {/* Pipeline */}
          <div className="bg-[#161616] rounded-[10px] border border-[#2a2a2a] p-4 flex flex-col">
            <p className="text-[10px] font-semibold text-[#666] uppercase tracking-widest mb-3 shrink-0">Pipeline</p>
            <div className="flex flex-col gap-3">
              {pipeline.map(col => {
                const pct = activeProspects > 0 ? (col.count / activeProspects) * 100 : 0
                return (
                  <div key={col.id}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] text-[#555]">{col.label}</span>
                      <span className="text-[11px] font-bold text-white">{col.count}</span>
                    </div>
                    <div className="w-full h-[4px] bg-[#222] rounded-full overflow-hidden">
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

          {/* Meta MRR + gráfico histórico */}
          <div className="shrink-0 bg-[#161616] rounded-[10px] border border-[#2a2a2a] p-4">
            <p className="text-[10px] font-semibold text-[#666] uppercase tracking-widest mb-3">Meta MRR</p>
            <div className="flex items-end justify-between mb-2">
              <span className="text-[22px] font-bold text-white">${mrr.toLocaleString()}</span>
              <span className="text-[11px] font-bold text-[#444]">${MRR_GOAL.toLocaleString()}</span>
            </div>
            <div className="w-full h-1 bg-[#222] rounded-full overflow-hidden mb-3">
              <div
                className="h-full bg-[#E8410A] rounded-full transition-all duration-700"
                style={{ width: `${mrrProgress}%` }}
              />
            </div>
            <MrrLineChart data={mrrHistory} />
            <p className={`text-[11px] mt-2 ${clientsNeeded > 0 ? 'text-[#555]' : 'text-[#1D9E75]'}`}>
              {clientsNeeded > 0 ? `Faltan ~${clientsNeeded} pack 4-3-3` : '¡Meta superada!'}
            </p>
          </div>

          {/* Clientes recientes */}
          <div className="bg-[#161616] rounded-[10px] border border-[#2a2a2a] p-4 flex flex-col">
            <div className="shrink-0 flex items-center justify-between mb-3">
              <p className="text-[10px] font-semibold text-[#666] uppercase tracking-widest">Clientes recientes</p>
              <Link to="/clientes" className="text-[11px] text-[#555] hover:text-white transition-colors">
                Ver todos
              </Link>
            </div>
            {recentClients.length === 0 ? (
              <div className="py-4 flex items-center justify-center">
                <p className="text-[11px] text-[#444]">Sin clientes aún</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {recentClients.map(c => (
                  <div key={c.id} className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-[#0f2a1f] border border-[#1D9E75]/20 flex items-center justify-center text-[#1D9E75] text-xs font-bold shrink-0">
                      {c.name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold text-white truncate">{c.name}</p>
                      <p className="text-[10px] text-[#555] truncate">
                        {c.pack === 'otro'
                          ? (c.custom_price ? `$${Number(c.custom_price).toLocaleString()}/mes` : '—')
                          : (c.pack || '—')}
                      </p>
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
    </div>
  )
}
