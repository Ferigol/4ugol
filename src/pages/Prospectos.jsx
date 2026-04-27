import React, { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { PROSPECT_COLUMNS } from '../lib/constants'
import { messages } from '../lib/messages'
import KanbanBoard from '../components/KanbanBoard'
import KanbanCard from '../components/KanbanCard'
import Modal from '../components/Modal'
import Badge, { LangBadge } from '../components/Badge'
import { Plus, MessageSquare, Copy, Check, Loader2, Download } from 'lucide-react'
import { downloadProspectFichas } from '../lib/downloadFichas'

const MSG_DATE_FIELDS = { msg1: 'date_msg1', msg2: 'date_msg2', msg3: 'date_msg3' }
const MONTH_ABBR = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
const formatMsgDate = (ts) => { if (!ts) return null; const d = new Date(ts); return `${d.getDate()} ${MONTH_ABBR[d.getMonth()]} ${d.getFullYear()}` }
const STATUS_ORDER = ['nuevo','msg1','msg2','msg3','diagnostico','propuesta','cerrado']
const tsToDateInput = (ts) => ts ? new Date(ts).toISOString().split('T')[0] : ''
const dateInputToTs = (d) => d ? new Date(d + 'T12:00:00Z').toISOString() : null

const INPUT = 'w-full px-3 py-2 text-sm rounded-lg border border-[#e5e5e5] bg-white text-[#0a0a0a] placeholder-[#b0b0b0] focus:outline-none focus:border-[#eb5c37] focus:ring-1 focus:ring-[#eb5c37]/30'
const SELECT = 'w-full px-3 py-2 text-sm rounded-lg border border-[#e5e5e5] bg-white text-[#0a0a0a] focus:outline-none focus:border-[#eb5c37] cursor-pointer'
const LABEL = 'block text-xs font-medium text-[#0a0a0a] mb-1'

const defaultForm = {
  name: '', club: '', email: '', phone: '', role: '', lang: 'es', status: 'nuevo', notes: '',
}

export default function Prospectos() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalForm, setModalForm] = useState(false)
  const [modalMsg, setModalMsg] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(defaultForm)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [msgLang, setMsgLang] = useState('es')
  const [copied, setCopied] = useState(false)

  const fetchData = useCallback(async () => {
    const { data } = await supabase.from('prospects').select('*').order('created_at', { ascending: false })
    setItems(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const openAdd = (status = 'nuevo') => {
    setForm({ ...defaultForm, status })
    setSaveError('')
    setEditingId(null)
    setModalForm(true)
  }

  const openEdit = (item) => {
    setForm({
      name: item.name, club: item.club || '', email: item.email || '',
      phone: item.phone || '', role: item.role || '',
      lang: item.lang || 'es', status: item.status, notes: item.notes || '',
      date_msg1: tsToDateInput(item.date_msg1),
      date_msg2: tsToDateInput(item.date_msg2),
      date_msg3: tsToDateInput(item.date_msg3),
    })
    setSaveError('')
    setEditingId(item.id)
    setModalForm(true)
  }

  const handleSave = async () => {
    setSaving(true)
    setSaveError('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { date_msg1, date_msg2, date_msg3, ...formCore } = form
      const payload = { ...formCore, user_id: user.id }
      if (editingId) {
        payload.date_msg1 = dateInputToTs(date_msg1)
        payload.date_msg2 = dateInputToTs(date_msg2)
        payload.date_msg3 = dateInputToTs(date_msg3)
        const { error } = await supabase.from('prospects').update(payload).eq('id', editingId)
        if (error) throw error
        setItems(prev => prev.map(i => i.id === editingId ? { ...i, ...payload } : i))
      } else {
        const dateField = MSG_DATE_FIELDS[payload.status]
        if (dateField) payload[dateField] = new Date().toISOString()
        const { data, error } = await supabase.from('prospects').insert(payload).select().single()
        if (error) throw error
        setItems(prev => [data, ...prev])
      }
      setModalForm(false)
    } catch (err) {
      setSaveError(err.message || 'Error al guardar. Intenta de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este prospecto?')) return
    await supabase.from('prospects').delete().eq('id', id)
    setItems(prev => prev.filter(i => i.id !== id))
  }

  const handleStatusChange = async (id, newStatus) => {
    const dateField = MSG_DATE_FIELDS[newStatus]
    const now = new Date().toISOString()
    const updates = { status: newStatus }
    if (dateField) {
      const existing = items.find(i => i.id === id)
      if (!existing?.[dateField]) updates[dateField] = now
    }
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i))
    await supabase.from('prospects').update(updates).eq('id', id)
  }

  const handleItemsChange = (colId, reordered) => {
    setItems(prev => {
      const rest = prev.filter(i => i.status !== colId)
      return [...rest, ...reordered]
    })
  }

  const openMsg = (item) => { setModalMsg(item); setMsgLang(item.lang || 'es'); setCopied(false) }
  const getMsg = (item, lang) => messages[item.status]?.[lang]?.(item.name || '', item.club || '')
  const handleCopy = async () => {
    const text = getMsg(modalMsg, msgLang)
    if (text) { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }
  }

  const HAS_MSG_STATUSES = ['msg1', 'msg2', 'msg3', 'diagnostico', 'propuesta']

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <Loader2 className="animate-spin text-[#eb5c37]" size={32} />
    </div>
  )

  return (
    <div className="flex flex-col p-6 gap-4">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-[#0a0a0a]">Prospectos</h1>
          <p className="text-sm text-[#6b6b6b] mt-0.5">{items.length} total</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => downloadProspectFichas(items)}
            title="Descargar Excel"
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#e5e5e5] bg-white hover:bg-[#f5f5f5] text-[#0a0a0a] text-sm font-semibold transition-all cursor-pointer"
          >
            <Download size={16} />
            Descargar fichas
          </button>
          <button
            id="add-prospect-btn"
            onClick={() => openAdd()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#eb5c37] hover:bg-[#d44d2c] text-white text-sm font-semibold shadow-lg shadow-[#eb5c37]/25 transition-all cursor-pointer"
          >
            <Plus size={16} />
            Nuevo prospecto
          </button>
        </div>
      </div>

      <div className="w-full">
        <KanbanBoard
          columns={PROSPECT_COLUMNS}
          items={items}
          onItemsChange={handleItemsChange}
          onStatusChange={handleStatusChange}
          onAddToColumn={openAdd}
          renderCard={(item) => (
            <KanbanCard
              key={item.id}
              id={item.id}
              onEdit={() => openEdit(item)}
              onDelete={() => handleDelete(item.id)}
            >
              <div className="mb-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="text-sm font-semibold text-[#0a0a0a] leading-tight">{item.name}</p>
                  <LangBadge lang={item.lang} />
                </div>
                {item.club && <p className="text-xs text-[#6b6b6b] mt-0.5">{item.club}</p>}
                {(item.date_msg1 || item.date_msg2 || item.date_msg3) && (
                  <div className="flex flex-col gap-0.5 mt-1">
                    {item.date_msg1 && <span className="text-[10px] text-[#b0b0b0]">Msg 1: {formatMsgDate(item.date_msg1)}</span>}
                    {item.date_msg2 && <span className="text-[10px] text-[#b0b0b0]">Msg 2: {formatMsgDate(item.date_msg2)}</span>}
                    {item.date_msg3 && <span className="text-[10px] text-[#b0b0b0]">Msg 3: {formatMsgDate(item.date_msg3)}</span>}
                  </div>
                )}
              </div>

              {item.notes && (
                <p className="text-xs text-[#b0b0b0] line-clamp-2 mb-2 leading-relaxed">{item.notes}</p>
              )}

              {HAS_MSG_STATUSES.includes(item.status) && (
                <button
                  onClick={() => openMsg(item)}
                  className="flex items-center gap-1.5 text-xs text-[#eb5c37] hover:text-[#d44d2c] font-medium mt-1 cursor-pointer transition-colors"
                >
                  <MessageSquare size={12} />
                  Ver mensaje LinkedIn
                </button>
              )}
            </KanbanCard>
          )}
        />
      </div>

      {/* Add/Edit Modal */}
      <Modal isOpen={modalForm} onClose={() => setModalForm(false)} title={editingId ? 'Editar prospecto' : 'Nuevo prospecto'}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Nombre *</label>
              <input className={INPUT} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nombre completo" />
            </div>
            <div>
              <label className={LABEL}>Club / Agencia</label>
              <input className={INPUT} value={form.club} onChange={e => setForm(f => ({ ...f, club: e.target.value }))} placeholder="Real Madrid" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Email</label>
              <input type="email" className={INPUT} value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="contacto@club.com" />
            </div>
            <div>
              <label className={LABEL}>Teléfono</label>
              <input type="tel" className={INPUT} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+34 600 000 000" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Rol</label>
              <input className={INPUT} value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} placeholder="Director de Marketing" />
            </div>
            <div>
              <label className={LABEL}>Idioma</label>
              <select className={SELECT} value={form.lang} onChange={e => setForm(f => ({ ...f, lang: e.target.value }))}>
                <option value="es">ES 🇪🇸</option>
                <option value="en">EN 🇬🇧</option>
              </select>
            </div>
          </div>

          <div>
            <label className={LABEL}>Estado</label>
            <select className={SELECT} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
              {PROSPECT_COLUMNS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>

          {editingId && (() => {
            const idx = STATUS_ORDER.indexOf(form.status)
            const showMsg1 = idx >= STATUS_ORDER.indexOf('msg1') || !!form.date_msg1
            const showMsg2 = idx >= STATUS_ORDER.indexOf('msg2') || !!form.date_msg2
            const showMsg3 = idx >= STATUS_ORDER.indexOf('msg3') || !!form.date_msg3
            if (!showMsg1 && !showMsg2 && !showMsg3) return null
            return (
              <div>
                <p className="text-xs font-medium text-[#6b6b6b] mb-1.5">Fechas de contacto</p>
                <div className="grid grid-cols-3 gap-2">
                  {showMsg1 && <div><label className="block text-[10px] font-medium text-[#6b6b6b] mb-1">Fecha Msg 1</label><input type="date" className="w-full px-2 py-1.5 text-xs rounded-lg border border-[#e5e5e5] bg-white text-[#0a0a0a] focus:outline-none focus:border-[#eb5c37] cursor-pointer" value={form.date_msg1 || ''} onChange={e => setForm(f => ({ ...f, date_msg1: e.target.value }))} /></div>}
                  {showMsg2 && <div><label className="block text-[10px] font-medium text-[#6b6b6b] mb-1">Fecha Msg 2</label><input type="date" className="w-full px-2 py-1.5 text-xs rounded-lg border border-[#e5e5e5] bg-white text-[#0a0a0a] focus:outline-none focus:border-[#eb5c37] cursor-pointer" value={form.date_msg2 || ''} onChange={e => setForm(f => ({ ...f, date_msg2: e.target.value }))} /></div>}
                  {showMsg3 && <div><label className="block text-[10px] font-medium text-[#6b6b6b] mb-1">Fecha Msg 3</label><input type="date" className="w-full px-2 py-1.5 text-xs rounded-lg border border-[#e5e5e5] bg-white text-[#0a0a0a] focus:outline-none focus:border-[#eb5c37] cursor-pointer" value={form.date_msg3 || ''} onChange={e => setForm(f => ({ ...f, date_msg3: e.target.value }))} /></div>}
                </div>
              </div>
            )
          })()}

          <div>
            <label className={LABEL}>Notas</label>
            <textarea className={`${INPUT} resize-none`} rows={3} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Notas adicionales..." />
          </div>

          {saveError && (
            <div className="px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600">{saveError}</div>
          )}

          <div className="flex gap-3 pt-2">
            <button onClick={() => setModalForm(false)} className="flex-1 py-2.5 rounded-xl border border-[#e5e5e5] text-sm font-medium text-[#6b6b6b] hover:bg-[#f5f5f5] transition-colors cursor-pointer">
              Cancelar
            </button>
            <button onClick={handleSave} disabled={!form.name || saving} className="flex-1 py-2.5 rounded-xl bg-[#eb5c37] hover:bg-[#d44d2c] text-white text-sm font-semibold transition-colors disabled:opacity-50 cursor-pointer">
              {saving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Crear prospecto'}
            </button>
          </div>
        </div>
      </Modal>

      {/* LinkedIn Message Modal */}
      <Modal isOpen={!!modalMsg} onClose={() => setModalMsg(null)} title="Mensaje LinkedIn" size="md">
        {modalMsg && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-[#0a0a0a]">{modalMsg.name}</p>
                <p className="text-xs text-[#6b6b6b]">{modalMsg.club}</p>
              </div>
              <Badge type="prospect" value={modalMsg.status} />
            </div>

            <div className="flex gap-2">
              {['es', 'en'].map(l => (
                <button key={l} onClick={() => setMsgLang(l)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${msgLang === l ? 'bg-[#eb5c37] text-white' : 'bg-[#f5f5f5] text-[#6b6b6b] hover:bg-[#ebebeb]'}`}>
                  {l === 'es' ? 'ES 🇪🇸' : 'EN 🇬🇧'}
                </button>
              ))}
            </div>

            <div className="p-4 rounded-xl bg-[#f5f5f5] border border-[#e5e5e5]">
              <p className="text-sm text-[#0a0a0a] leading-relaxed">
                {getMsg(modalMsg, msgLang) || 'No hay mensaje para este estado.'}
              </p>
            </div>

            <button onClick={handleCopy}
              className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                copied ? 'bg-green-100 text-[#4fa052]' : 'bg-[#eb5c37] hover:bg-[#d44d2c] text-white shadow-lg shadow-[#eb5c37]/25'
              }`}>
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? '¡Copiado!' : 'Copiar mensaje'}
            </button>
          </div>
        )}
      </Modal>
    </div>
  )
}
