import React from 'react'
import { PROSPECT_STATUS_COLORS, CLIENT_STATUS_COLORS } from '../lib/constants'

const PROSPECT_LABELS = {
  nuevo: 'Nuevo', msg1: 'Msg 1', msg2: 'Msg 2', msg3: 'Msg 3',
  diagnostico: 'Diagnóstico', propuesta: 'Propuesta', cerrado: 'Cerrado',
}

const CLIENT_LABELS = {
  brief: 'Brief', boceto: 'Boceto', vector: 'Vector',
  entrega: 'Entrega', factura: 'Factura', pagado: 'Pagado',
}

export default function Badge({ type = 'prospect', value, className = '' }) {
  const isProspect = type === 'prospect'
  const colors = isProspect ? PROSPECT_STATUS_COLORS : CLIENT_STATUS_COLORS
  const labels = isProspect ? PROSPECT_LABELS : CLIENT_LABELS
  const color = colors[value] || { bg: 'bg-[#1a1a1a]', text: 'text-[#888]' }
  const label = labels[value] || value

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${color.bg} ${color.text} ${className}`}>
      {label}
    </span>
  )
}

export function LangBadge({ lang }) {
  const isES = lang === 'es'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold tracking-wide ${
      isES
        ? 'bg-[#2a1a1a] text-[#FF5A1F]'
        : 'bg-[#1a3a2a] text-[#1D9E75]'
    }`}>
      {isES ? 'ES' : 'EN'}
    </span>
  )
}

export function PackBadge({ pack, price }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-[#0f2a1f] text-[#1D9E75]">
      <span>{pack}</span>
      <span className="opacity-70">${price}</span>
    </span>
  )
}
