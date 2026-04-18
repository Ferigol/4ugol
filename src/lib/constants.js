// Prospect Kanban columns
export const PROSPECT_COLUMNS = [
  { id: 'nuevo',       label: 'Nuevo',       color: 'bg-slate-500' },
  { id: 'msg1',        label: 'Msg 1',        color: 'bg-blue-500' },
  { id: 'msg2',        label: 'Msg 2',        color: 'bg-indigo-500' },
  { id: 'msg3',        label: 'Msg 3',        color: 'bg-violet-500' },
  { id: 'diagnostico', label: 'Diagnóstico',  color: 'bg-amber-500' },
  { id: 'propuesta',   label: 'Propuesta',    color: 'bg-orange-500' },
  { id: 'cerrado',     label: 'Cerrado',      color: 'bg-green-500' },
]

// Client Kanban columns
export const CLIENT_COLUMNS = [
  { id: 'brief',    label: 'Brief',    color: 'bg-blue-500' },
  { id: 'boceto',   label: 'Boceto',   color: 'bg-violet-500' },
  { id: 'vector',   label: 'Vector',   color: 'bg-amber-500' },
  { id: 'entrega',  label: 'Entrega',  color: 'bg-orange-500' },
  { id: 'factura',  label: 'Factura',  color: 'bg-pink-500' },
  { id: 'pagado',   label: 'Pagado',   color: 'bg-green-500' },
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

// MRR goal
export const MRR_GOAL = 10000

// Prospect statuses that need follow-up
export const FOLLOW_UP_STATUSES = ['msg1', 'msg2', 'diagnostico']

// Language options
export const LANGUAGES = [
  { id: 'es', label: 'ES 🇪🇸' },
  { id: 'en', label: 'EN 🇬🇧' },
]

// Status colors for badges
export const PROSPECT_STATUS_COLORS = {
  nuevo:       { bg: 'bg-slate-100 dark:bg-slate-800',   text: 'text-slate-600 dark:text-slate-300' },
  msg1:        { bg: 'bg-blue-100 dark:bg-blue-900/40',   text: 'text-blue-600 dark:text-blue-300' },
  msg2:        { bg: 'bg-indigo-100 dark:bg-indigo-900/40', text: 'text-indigo-600 dark:text-indigo-300' },
  msg3:        { bg: 'bg-violet-100 dark:bg-violet-900/40', text: 'text-violet-600 dark:text-violet-300' },
  diagnostico: { bg: 'bg-amber-100 dark:bg-amber-900/40',  text: 'text-amber-600 dark:text-amber-300' },
  propuesta:   { bg: 'bg-orange-100 dark:bg-orange-900/40', text: 'text-orange-600 dark:text-orange-300' },
  cerrado:     { bg: 'bg-green-100 dark:bg-green-900/40',  text: 'text-green-600 dark:text-green-300' },
}

export const CLIENT_STATUS_COLORS = {
  brief:   { bg: 'bg-blue-100 dark:bg-blue-900/40',   text: 'text-blue-600 dark:text-blue-300' },
  boceto:  { bg: 'bg-violet-100 dark:bg-violet-900/40', text: 'text-violet-600 dark:text-violet-300' },
  vector:  { bg: 'bg-amber-100 dark:bg-amber-900/40',  text: 'text-amber-600 dark:text-amber-300' },
  entrega: { bg: 'bg-orange-100 dark:bg-orange-900/40', text: 'text-orange-600 dark:text-orange-300' },
  factura: { bg: 'bg-pink-100 dark:bg-pink-900/40',    text: 'text-pink-600 dark:text-pink-300' },
  pagado:  { bg: 'bg-green-100 dark:bg-green-900/40',  text: 'text-green-600 dark:text-green-300' },
}
