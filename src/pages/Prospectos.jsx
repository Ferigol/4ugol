import React, { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { PROSPECT_COLUMNS } from '../lib/constants'
import { messages } from '../lib/messages'
import KanbanBoard from '../components/KanbanBoard'
import KanbanCard from '../components/KanbanCard'
import Modal from '../components/Modal'
import Badge, { LangBadge } from '../components/Badge'
import { Plus, MessageSquare, Copy, Check, Loader2 } from 'lucide-react'

const MSG_DATE_FIELDS = { msg1: 'date_msg1', msg2: 'date_msg2', msg3: 'date_msg3' }

const MONTH_ABBR = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

const formatMsgDate = (ts) => {
  if (!ts) return null
  const d = new Date(ts)
  return `${d.getDate()} ${MONTH_ABBR[d.getMonth()]} ${d.getFullYear()}`
}

const STATUS_ORDER = ['nuevo','msg1','msg2','msg3','diagnostico','propuesta','cerrado']

// Convert timestamptz → YYYY-MM-DD for <input type="date">
const tsToDateInput = (ts) => ts ? new Date(ts).toISOString().split('T')[0] : ''
// Convert YYYY-MM-DD → ISO string (noon UTC to avoid timezone day-off issues)
const dateInputToTs = (d) => d ? new Date(d + 'T12:00:00Z').toISOString() : null

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
  const [initialStatus, setInitialStatus] = useState('nuevo')

  const fetchData = useCallback(async () => {
    const { data } = await supabase.from('prospects').select('*').order('created_at', { ascending: false })
    setItems(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const openAdd = (status = 'nuevo') => {
    setForm({ ...defaultForm, status })
    setInitialStatus(status)
    setSaveError('')
    setEditingId(null)
    setModalForm(true)
  }

  const openEdit = (item) => {
    setForm({
      name: item.name, club: item.club || '', email: item.email || '',
      phone: item.phone || '', role: item.role || '',
      lang: item.lang || 'es', status: item.status, notes: item.notes || '',
      // Store as YYYY-MM-DD strings for <input type="date">
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
      // Build a clean payload with only real DB columns (no stale date_ fields on create)
      const { date_msg1, date_msg2, date_msg3, ...formCore } = form
      const payload = { ...formCore, user_id: user.id }
      // Include date fields only when editing and they actually have a value
      if (editingId) {
        if (date_msg1) payload.date_msg1 = date_msg1
        if (date_msg2) payload.date_msg2 = date_msg2
        if (date_msg3) payload.date_msg3 = date_msg3
      }

      if (editingId) {
        // Convert YYYY-MM-DD strings → ISO (or null to clear)
        payload.date_msg1 = dateInputToTs(date_msg1)
        payload.date_msg2 = dateInputToTs(date_msg2)
        payload.date_msg3 = dateInputToTs(date_msg3)
        const { error } = await supabase.from('prospects').update(payload).eq('id', editingId)
        if (error) throw error
        setItems(prev => prev.map(i => i.id === editingId ? { ...i, ...payload } : i))
      } else {
        // Stamp date automatically if creating with a msg status
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
    // Only stamp the date if this field hasn't been set yet
    if (dateField) {
      const existing = items.find(i => i.id === id)
      if (!existing?.[dateField]) {
        updates[dateField] = now
      }
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

  const openMsg = (item) => {
    setModalMsg(item)
    setMsgLang(item.lang || 'es')
    setCopied(false)
  }

  const getMsg = (item, lang) => {
    if (!messages[item.status]) return null
    return messages[item.status][lang]?.(item.name || '', item.club || '')
  }

  const handleCopy = async () => {
    const text = getMsg(modalMsg, msgLang)
    if (text) {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const HAS_MSG_STATUSES = ['msg1', 'msg2', 'msg3', 'diagnostico', 'propuesta']

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <Loader2 className="animate-spin text-green-500" size={32} />
    </div>
  )

  return (
    <div className="flex flex-col p-6 gap-4">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Prospectos</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{items.length} total</p>
        </div>
        <button
          id="add-prospect-btn"
          onClick={() => openAdd()}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500 hover:bg-green-400 text-white text-sm font-semibold shadow-lg shadow-green-500/30 transition-all cursor-pointer"
        >
          <Plus size={16} />
          Nuevo prospecto
        </button>
      </div>

      {/* Kanban */}
      <div className="w-full">
        <KanbanBoard
          columns={PROSPECT_COLUMNS}
          items={items}
          onItemsChange={handleItemsChange}
          onStatusChange={handleStatusChange}
          onAddToColumn={openAdd}
          renderCard={(item, isOverlay) => (
            <KanbanCard
              key={item.id}
              id={item.id}
              onEdit={() => openEdit(item)}
              onDelete={() => handleDelete(item.id)}
            >
              <div className="mb-2">
                {/* Name + language badge on same line */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">{item.name}</p>
                  <LangBadge lang={item.lang} />
                </div>
                {item.club && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{item.club}</p>}
                {/* Msg dates */}
                {(item.date_msg1 || item.date_msg2 || item.date_msg3) && (
                  <div className="flex flex-col gap-0.5 mt-1">
                    {item.date_msg1 && (
                      <span className="text-[10px] text-gray-400 dark:text-gray-500">
                        Msg 1: {formatMsgDate(item.date_msg1)}
                      </span>
                    )}
                    {item.date_msg2 && (
                      <span className="text-[10px] text-gray-400 dark:text-gray-500">
                        Msg 2: {formatMsgDate(item.date_msg2)}
                      </span>
                    )}
                    {item.date_msg3 && (
                      <span className="text-[10px] text-gray-400 dark:text-gray-500">
                        Msg 3: {formatMsgDate(item.date_msg3)}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {item.notes && (
                <p className="text-xs text-gray-400 dark:text-gray-500 line-clamp-2 mb-2 leading-relaxed">
                  {item.notes}
                </p>
              )}

              {HAS_MSG_STATUSES.includes(item.status) && (
                <button
                  onClick={() => openMsg(item)}
                  className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400 hover:text-green-500 font-medium mt-1 cursor-pointer transition-colors"
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
      <Modal
        isOpen={modalForm}
        onClose={() => setModalForm(false)}
        title={editingId ? 'Editar prospecto' : 'Nuevo prospecto'}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre *</label>
              <input
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Nombre completo"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Club / Agencia</label>
              <input
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
                value={form.club}
                onChange={e => setForm(f => ({ ...f, club: e.target.value }))}
                placeholder="Real Madrid"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
              <input
                type="email"
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="contacto@club.com"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Teléfono</label>
              <input
                type="tel"
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="+34 600 000 000"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Rol</label>
              <input
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
                value={form.role}
                onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                placeholder="Director de Marketing"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Idioma</label>
              <select
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-green-500 cursor-pointer"
                value={form.lang}
                onChange={e => setForm(f => ({ ...f, lang: e.target.value }))}
              >
                <option value="es">ES 🇪🇸</option>
                <option value="en">EN 🇬🇧</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Estado</label>
            <select
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-green-500 cursor-pointer"
              value={form.status}
              onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
            >
              {PROSPECT_COLUMNS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>

          {/* Fecha Msg date pickers — only in edit mode, conditional on status progress */}
          {editingId && (() => {
            const idx = STATUS_ORDER.indexOf(form.status)
            const showMsg1 = idx >= STATUS_ORDER.indexOf('msg1') || !!form.date_msg1
            const showMsg2 = idx >= STATUS_ORDER.indexOf('msg2') || !!form.date_msg2
            const showMsg3 = idx >= STATUS_ORDER.indexOf('msg3') || !!form.date_msg3
            if (!showMsg1 && !showMsg2 && !showMsg3) return null
            return (
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Fechas de contacto</p>
                <div className="grid grid-cols-3 gap-2">
                  {showMsg1 && (
                    <div>
                      <label className="block text-[10px] font-medium text-gray-600 dark:text-gray-400 mb-1">Fecha Msg 1</label>
                      <input
                        type="date"
                        className="w-full px-2 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-green-500 cursor-pointer"
                        value={form.date_msg1 || ''}
                        onChange={e => setForm(f => ({ ...f, date_msg1: e.target.value }))}
                      />
                    </div>
                  )}
                  {showMsg2 && (
                    <div>
                      <label className="block text-[10px] font-medium text-gray-600 dark:text-gray-400 mb-1">Fecha Msg 2</label>
                      <input
                        type="date"
                        className="w-full px-2 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-green-500 cursor-pointer"
                        value={form.date_msg2 || ''}
                        onChange={e => setForm(f => ({ ...f, date_msg2: e.target.value }))}
                      />
                    </div>
                  )}
                  {showMsg3 && (
                    <div>
                      <label className="block text-[10px] font-medium text-gray-600 dark:text-gray-400 mb-1">Fecha Msg 3</label>
                      <input
                        type="date"
                        className="w-full px-2 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-green-500 cursor-pointer"
                        value={form.date_msg3 || ''}
                        onChange={e => setForm(f => ({ ...f, date_msg3: e.target.value }))}
                      />
                    </div>
                  )}
                </div>
              </div>
            )
          })()}

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Notas</label>
            <textarea
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 resize-none"
              rows={3}
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Notas adicionales..."
            />
          </div>

          {saveError && (
            <div className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/50 text-xs text-red-600 dark:text-red-400">
              {saveError}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setModalForm(false)}
              className="flex-1 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={!form.name || saving}
              className="flex-1 py-2.5 rounded-xl bg-green-500 hover:bg-green-400 text-white text-sm font-semibold transition-colors disabled:opacity-50 cursor-pointer"
            >
              {saving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Crear prospecto'}
            </button>
          </div>
        </div>
      </Modal>

      {/* LinkedIn Message Modal */}
      <Modal
        isOpen={!!modalMsg}
        onClose={() => setModalMsg(null)}
        title="Mensaje LinkedIn"
        size="md"
      >
        {modalMsg && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{modalMsg.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{modalMsg.club}</p>
              </div>
              <Badge type="prospect" value={modalMsg.status} />
            </div>

            {/* Lang toggle */}
            <div className="flex gap-2">
              {['es', 'en'].map(l => (
                <button
                  key={l}
                  onClick={() => setMsgLang(l)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    msgLang === l
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {l === 'es' ? 'ES 🇪🇸' : 'EN 🇬🇧'}
                </button>
              ))}
            </div>

            {/* Message text */}
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                {getMsg(modalMsg, msgLang) || 'No hay mensaje para este estado.'}
              </p>
            </div>

            {/* Copy button */}
            <button
              onClick={handleCopy}
              className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                copied
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                  : 'bg-green-500 hover:bg-green-400 text-white shadow-lg shadow-green-500/30'
              }`}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? '¡Copiado!' : 'Copiar mensaje'}
            </button>
          </div>
        )}
      </Modal>
    </div>
  )
}
