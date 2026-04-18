// Prospect Kanban columns
export const PROSPECT_COLUMNS = [
  { id: 'nuevo',       label: 'Nuevo',       color: 'bg-slate-400' },
  { id: 'msg1',        label: 'Msg 1',        color: 'bg-blue-400' },
  { id: 'msg2',        label: 'Msg 2',        color: 'bg-indigo-400' },
  { id: 'msg3',        label: 'Msg 3',        color: 'bg-violet-400' },
  { id: 'diagnostico', label: 'Diagnóstico',  color: 'bg-amber-400' },
  { id: 'propuesta',   label: 'Propuesta',    color: 'bg-[#eb5c37]' },
  { id: 'cerrado',     label: 'Cerrado',      color: 'bg-[#4fa052]' },
]

// Client Kanban columns
export const CLIENT_COLUMNS = [
  { id: 'brief',   label: 'Brief',   color: 'bg-blue-400' },
  { id: 'boceto',  label: 'Boceto',  color: 'bg-violet-400' },
  { id: 'vector',  label: 'Vector',  color: 'bg-amber-400' },
  { id: 'entrega', label: 'Entrega', color: 'bg-[#eb5c37]' },
  { id: 'factura', label: 'Factura', color: 'bg-pink-400' },
  { id: 'pagado',  label: 'Pagado',  color: 'bg-[#4fa052]' },
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

export const FOLLOW_UP_STATUSES = ['msg1', 'msg2', 'diagnostico']

export const LANGUAGES = [
  { id: 'es', label: 'ES 🇪🇸' },
  { id: 'en', label: 'EN 🇬🇧' },
]

export const PROSPECT_STATUS_COLORS = {
  nuevo:       { bg: 'bg-slate-100',   text: 'text-slate-600' },
  msg1:        { bg: 'bg-blue-100',    text: 'text-blue-600' },
  msg2:        { bg: 'bg-indigo-100',  text: 'text-indigo-600' },
  msg3:        { bg: 'bg-violet-100',  text: 'text-violet-600' },
  diagnostico: { bg: 'bg-amber-100',   text: 'text-amber-600' },
  propuesta:   { bg: 'bg-orange-100',  text: 'text-[#eb5c37]' },
  cerrado:     { bg: 'bg-green-100',   text: 'text-[#4fa052]' },
}

export const CLIENT_STATUS_COLORS = {
  brief:   { bg: 'bg-blue-100',   text: 'text-blue-600' },
  boceto:  { bg: 'bg-violet-100', text: 'text-violet-600' },
  vector:  { bg: 'bg-amber-100',  text: 'text-amber-600' },
  entrega: { bg: 'bg-orange-100', text: 'text-[#eb5c37]' },
  factura: { bg: 'bg-pink-100',   text: 'text-pink-600' },
  pagado:  { bg: 'bg-green-100',  text: 'text-[#4fa052]' },
}
