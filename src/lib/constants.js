// Prospect Kanban columns
export const PROSPECT_COLUMNS = [
  { id: 'nuevo',       label: 'Nuevo',       color: 'bg-slate-500' },
  { id: 'msg1',        label: 'Msg 1',        color: 'bg-blue-500' },
  { id: 'msg2',        label: 'Msg 2',        color: 'bg-indigo-500' },
  { id: 'msg3',        label: 'Msg 3',        color: 'bg-violet-500' },
  { id: 'diagnostico', label: 'Diagnóstico',  color: 'bg-amber-500' },
  { id: 'propuesta',   label: 'Propuesta',    color: 'bg-[#E8410A]' },
  { id: 'cerrado',     label: 'Cerrado',      color: 'bg-[#1D9E75]' },
]

// Client Kanban columns
export const CLIENT_COLUMNS = [
  { id: 'brief',   label: 'Brief',   color: 'bg-blue-500' },
  { id: 'boceto',  label: 'Boceto',  color: 'bg-violet-500' },
  { id: 'vector',  label: 'Vector',  color: 'bg-amber-500' },
  { id: 'entrega', label: 'Entrega', color: 'bg-[#E8410A]' },
  { id: 'factura', label: 'Factura', color: 'bg-pink-500' },
  { id: 'pagado',  label: 'Pagado',  color: 'bg-[#1D9E75]' },
]

// Pack options with prices
export const PACKS = [
  { id: '4-3-3', label: '4-3-3', price: 780 },
  { id: '4-4-2', label: '4-4-2', price: 1030 },
  { id: '5-3-2', label: '5-3-2', price: 1165 },
  { id: 'otro',  label: 'Otro',  price: 0 },
]

export const PACK_PRICES = {
  '4-3-3': 780,
  '4-4-2': 1030,
  '5-3-2': 1165,
  'otro': 0,
}

export const MRR_GOAL = 10000

export const FOLLOW_UP_STATUSES = ['msg1', 'msg2', 'msg3', 'diagnostico', 'propuesta']

export const LANGUAGES = [
  { id: 'es', label: 'ES 🇪🇸' },
  { id: 'en', label: 'EN 🇬🇧' },
]

export const PROSPECT_STATUS_COLORS = {
  nuevo:       { bg: 'bg-slate-800',    text: 'text-slate-300' },
  msg1:        { bg: 'bg-blue-950',     text: 'text-blue-400' },
  msg2:        { bg: 'bg-indigo-950',   text: 'text-indigo-400' },
  msg3:        { bg: 'bg-violet-950',   text: 'text-violet-400' },
  diagnostico: { bg: 'bg-amber-950',    text: 'text-amber-400' },
  propuesta:   { bg: 'bg-[#2a1810]',   text: 'text-[#FF5A1F]' },
  cerrado:     { bg: 'bg-[#0f2a1f]',   text: 'text-[#1D9E75]' },
  convertido:  { bg: 'bg-[#0e1f3a]',   text: 'text-[#3B82F6]' },
  archivado:   { bg: 'bg-[#1a1a1a]',   text: 'text-[#555]' },
}

export const CLIENT_STATUS_COLORS = {
  brief:   { bg: 'bg-blue-950',     text: 'text-blue-400' },
  boceto:  { bg: 'bg-violet-950',   text: 'text-violet-400' },
  vector:  { bg: 'bg-amber-950',    text: 'text-amber-400' },
  entrega: { bg: 'bg-[#2a1810]',   text: 'text-[#FF5A1F]' },
  factura: { bg: 'bg-pink-950',     text: 'text-pink-400' },
  pagado:  { bg: 'bg-[#0f2a1f]',   text: 'text-[#1D9E75]' },
}
