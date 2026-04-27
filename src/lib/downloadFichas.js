import { PACK_PRICES } from './constants'

const MONTH = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
const fmtDate = (ts) => { if (!ts) return ''; const d = new Date(ts); return `${d.getDate()} ${MONTH[d.getMonth()]} ${d.getFullYear()}` }
const isoToday = () => new Date().toISOString().split('T')[0]

function escapeCell(val) {
  const str = String(val ?? '')
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function buildCSV(headers, rows) {
  const lines = [headers, ...rows].map(row => row.map(escapeCell).join(','))
  return '\uFEFF' + lines.join('\r\n') // UTF-8 BOM for Excel
}

function triggerDownload(content, filename) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function downloadClientFichas(items) {
  const headers = [
    'Nombre', 'Club / Agencia', 'Email', 'Teléfono', 'Puesto',
    'Proyecto', 'Pack', 'Precio', 'Tipo de pago', 'Idioma',
    'Estado', 'Fecha inicio', 'Fecha cierre', 'Notas',
  ]

  const rows = items.map(item => {
    const price = item.pack === 'otro'
      ? (Number(item.custom_price) || 0)
      : (PACK_PRICES[item.pack] || 0)
    const paymentType = item.pack === 'otro'
      ? (item.payment_type === 'unico' ? 'Pago único' : 'Mensual')
      : 'Mensual'

    return [
      item.name        || '',
      item.club        || '',
      item.email       || '',
      item.telefono    || '',
      item.puesto      || '',
      item.project_name || '',
      item.pack        || '',
      price ? `$${price}` : '',
      paymentType,
      item.lang === 'en' ? 'English' : 'Español',
      item.status      || '',
      item.start_date  ? fmtDate(item.start_date + 'T00:00:00') : '',
      item.end_date    ? fmtDate(item.end_date   + 'T00:00:00') : '',
      item.notes       || '',
    ]
  })

  triggerDownload(buildCSV(headers, rows), `clientes-${isoToday()}.csv`)
}

export function downloadProspectFichas(items) {
  const headers = [
    'Nombre', 'Club / Agencia', 'Email', 'Teléfono', 'Rol',
    'Idioma', 'Estado', 'Fecha Msg 1', 'Fecha Msg 2', 'Fecha Msg 3', 'Notas',
  ]

  const rows = items.map(item => [
    item.name   || '',
    item.club   || '',
    item.email  || '',
    item.phone  || '',
    item.role   || '',
    item.lang === 'en' ? 'English' : 'Español',
    item.status || '',
    fmtDate(item.date_msg1),
    fmtDate(item.date_msg2),
    fmtDate(item.date_msg3),
    item.notes  || '',
  ])

  triggerDownload(buildCSV(headers, rows), `prospectos-${isoToday()}.csv`)
}
