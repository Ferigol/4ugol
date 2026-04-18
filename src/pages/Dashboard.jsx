import React, { useEffect, useState } from 'react'
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
  const clientsNeeded = remaining > 0
    ? Math.ceil(remaining / PACK_PRICES['4-3-3'])
    : 0

  const today = new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const metricCards = [
    {
      id: 'active-prospects',
      icon: Users,
      label: 'Prospectos activos',
      value: activeProspects,
      color: 'text-blue-500',
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      link: '/prospectos',
    },
    {
      id: 'active-clients',
      icon: Briefcase,
      label: 'Clientes activos',
      value: activeClients,
      color: 'text-violet-500',
      bg: 'bg-violet-50 dark:bg-violet-900/20',
      link: '/clientes',
    },
    {
      id: 'current-mrr',
      icon: TrendingUp,
      label: 'MRR actual',
      value: `$${mrr.toLocaleString()}`,
      color: 'text-green-500',
      bg: 'bg-green-50 dark:bg-green-900/20',
      link: '/clientes',
    },
    {
      id: 'pending-followups',
      icon: Bell,
      label: 'Seguimientos pendientes',
      value: pendingFollowUps.length,
      color: 'text-amber-500',
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      link: '/prospectos',
    },
  ]

  const STATUS_LABELS = {
    msg1: 'Msg 1', msg2: 'Msg 2', diagnostico: 'Diagnóstico',
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="animate-spin text-green-500" size={32} />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">¡Bienvenido! 👋</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1 capitalize">{today}</p>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metricCards.map((card) => (
          <Link
            key={card.id}
            id={card.id}
            to={card.link}
            className="group bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
          >
            <div className={`inline-flex p-2.5 rounded-xl ${card.bg} mb-3`}>
              <card.icon size={20} className={card.color} />
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{card.value}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium">{card.label}</div>
            <div className="flex items-center gap-1 mt-2 text-xs text-gray-400 group-hover:text-green-500 transition-colors">
              Ver <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>
        ))}
      </div>

      {/* MRR Progress */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Meta mensual</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Objetivo: <span className="font-semibold text-green-500">${MRR_GOAL.toLocaleString()}/mes</span>
            </p>
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold text-gray-900 dark:text-white">{mrrProgress.toFixed(0)}%</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all duration-700"
            style={{ width: `${mrrProgress}%` }}
          />
        </div>

        <div className="flex items-center justify-between mt-3 text-sm">
          <span className="text-gray-500 dark:text-gray-400">
            ${mrr.toLocaleString()} de ${MRR_GOAL.toLocaleString()}
          </span>
          {clientsNeeded > 0 ? (
            <span className="text-amber-500 font-medium">
              💡 Te faltan ~{clientsNeeded} cliente{clientsNeeded !== 1 ? 's' : ''} más (4-3-3)
            </span>
          ) : (
            <span className="text-green-500 font-medium">🎉 ¡Meta superada!</span>
          )}
        </div>
      </div>

      {/* Pending follow-ups */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Seguimientos pendientes</h2>
          <Link
            to="/prospectos"
            className="text-xs text-green-500 hover:text-green-400 font-medium flex items-center gap-1"
          >
            Ver todos <ArrowRight size={12} />
          </Link>
        </div>

        {pendingFollowUps.length === 0 ? (
          <div className="text-center py-8 text-gray-400 dark:text-gray-600">
            <Bell size={28} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">¡Sin seguimientos pendientes!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {pendingFollowUps.slice(0, 8).map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-white text-xs font-bold">
                    {p.name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{p.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{p.club || '—'}</p>
                  </div>
                </div>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                  {STATUS_LABELS[p.status] || p.status}
                </span>
              </div>
            ))}
            {pendingFollowUps.length > 8 && (
              <p className="text-center text-xs text-gray-400 pt-1">
                +{pendingFollowUps.length - 8} más
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
