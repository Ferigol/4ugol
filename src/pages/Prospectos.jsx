import React, { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { PROSPECT_COLUMNS } from '../lib/constants'
import { messages } from '../lib/messages'
import KanbanBoard from '../components/KanbanBoard'
import KanbanCard from '../components/KanbanCard'
import Modal from '../components/Modal'
import Badge, { LangBadge } from '../components/Badge'
import { Plus, MessageSquare, Copy, Check, Loader2, Download, ArrowLeft, Search, X } from 'lucide-react'
import { downloadProspectFichas } from '../lib/downloadFichas'

const MSG_DATE_FIELDS = { msg1: 'date_msg1', msg2: 'date_msg2', msg3: 'date_msg3' }
const MONTH_ABBR = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
const formatMsgDate = (ts) => { if (!ts) return null; const d = new Date(ts); return `${d.getDate()} ${MONTH_ABBR[d.getMonth()]} ${d.getFullYear()}` }
const STATUS_ORDER = ['nuevo','msg1','msg2','msg3','diagnostico','propuesta','cerrado']
const tsToDateInput = (ts) => ts ? new Date(ts).toISOString().split('T')[0] : ''
const dateInputToTs = (d) => d ? new Date(d + 'T12:00:00Z').toISOString() : null

const INP = 'w-full px-3 py-2.5 text-sm rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] text-white placeholder-[#444] focus:outline-none focus:border-[#E8410A] focus:ring-1 focus:ring-[#E8410A]/20 transition-all'
const SEL = 'w-full px-3 py-2.5 text-sm rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] text-white focus:outline-none focus:border-[#E8410A] cursor-pointer transition-all'
const LBL = 'block text-xs font-medium text-[#666] mb-1.5'

const defaultForm = {
  name: '', club: '', email: '', phone: '', role: '', lang: 'es', status: 'nuevo', notes: '',
}

export default function Prospectos() {
  const navigate = useNavigate()
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
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const searchRef = useRef(null)

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus()
  }, [searchOpen])

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') { setSearchOpen(false); setSearchQuery('') } }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  const filteredItems = searchQuery.trim()
    ? items.filter(i => i.name?.toLowerCase().includes(searchQuery.toLowerCase()))
    : items

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
    <div className="flex items-center justify-center h-full bg-[#0a0a0a]">
      <Loader2 className="animate-spin text-[#E8410A]" size={28} />
    </div>
  )

  return (
    <div className="flex flex-col p-6 gap-4 bg-[#0a0a0a] min-h-full">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0 gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded-xl bg-[#111] border border-[#222] text-[#555] hover:text-white hover:border-[#333] transition-all cursor-pointer"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-xl font-black text-white tracking-tight">Prospectos</h1>
            <p className="text-xs text-[#444] mt-0.5">
            {searchQuery.trim() ? `${filteredItems.length} resultado${filteredItems.length !== 1 ? 's' : ''}` : `${items.length} total`}
          </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {searchOpen ? (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#111] border border-white/30 w-56 transition-all">
              <Search size={14} className="text-[#555] shrink-0" />
              <input
                ref={searchRef}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Buscar prospecto..."
                className="flex-1 bg-transparent text-sm text-white placeholder-[#444] focus:outline-none min-w-0"
              />
              <button onClick={() => { setSearchOpen(false); setSearchQuery('') }} className="text-[#555] hover:text-white cursor-pointer shrink-0">
                <X size={14} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setSearchOpen(true)}
              className="p-2 rounded-xl bg-[#111] border border-[#222] text-[#555] hover:text-white hover:border-[#333] transition-all cursor-pointer"
            >
              <Search size={16} />
            </button>
          )}
          <button
            onClick={() => downloadProspectFichas(items)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#333] bg-transparent text-[#888] hover:text-white hover:border-[#555] text-sm font-medium transition-all cursor-pointer"
          >
            <Download size={14} />
            Descargar fichas
          </button>
          <button
            id="add-prospect-btn"
            onClick={() => openAdd()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#E8410A] hover:bg-[#c93500] text-white text-sm font-semibold shadow-lg shadow-[#E8410A]/20 transition-all cursor-pointer"
          >
            <Plus size={15} />
            Nuevo prospecto
          </button>
        </div>
      </div>

      <div className="w-full">
        <KanbanBoard
          columns={PROSPECT_COLUMNS}
          items={filteredItems}
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
                <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                  <LangBadge lang={item.lang} />
                </div>
                <p className="text-sm font-bold text-white leading-tight mt-1">{item.name}</p>
                {item.club && <p className="text-xs text-[#555] mt-0.5">{item.club}</p>}
                {(item.date_msg1 || item.date_msg2 || item.date_msg3) && (
                  <div className="flex flex-col gap-0.5 mt-1.5">
                    {item.date_msg1 && <span className="text-[10px] text-[#444]">MSJ 1: {formatMsgDate(item.date_msg1)}</span>}
                    {item.date_msg2 && <span className="text-[10px] text-[#444]">MSJ 2: {formatMsgDate(item.date_msg2)}</span>}
                    {item.date_msg3 && <span className="text-[10px] text-[#444]">MSJ 3: {formatMsgDate(item.date_msg3)}</span>}
                  </div>
                )}
              </div>

              {item.notes && (
                <p className="text-xs text-[#444] line-clamp-2 mb-2 leading-relaxed">{item.notes}</p>
              )}

              {HAS_MSG_STATUSES.includes(item.status) && (
                <button
                  onClick={() => openMsg(item)}
                  className="flex items-center gap-1.5 text-xs text-[#1D9E75] hover:text-[#22c58a] font-medium mt-1 cursor-pointer transition-colors border border-[#1D9E75]/30 hover:border-[#1D9E75]/60 px-2 py-1 rounded-lg"
                >
                  <MessageSquare size={11} />
                  Ver mensaje
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
              <label className={LBL}>Nombre *</label>
              <input className={INP} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nombre completo" />
            </div>
            <div>
              <label className={LBL}>Club / Agencia</label>
              <input className={INP} value={form.club} onChange={e => setForm(f => ({ ...f, club: e.target.value }))} placeholder="Real Madrid" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LBL}>Email</label>
              <input type="email" className={INP} value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="contacto@club.com" />
            </div>
            <div>
              <label className={LBL}>Teléfono</label>
              <input type="tel" className={INP} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+34 600 000 000" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LBL}>Rol</label>
              <input className={INP} value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} placeholder="Director de Marketing" />
            </div>
            <div>
              <label className={LBL}>Idioma</label>
              <select className={SEL} value={form.lang} onChange={e => setForm(f => ({ ...f, lang: e.target.value }))}>
                <option value="es">ES 🇪🇸</option>
                <option value="en">EN 🇬🇧</option>
              </select>
            </div>
          </div>

          <div>
            <label className={LBL}>Estado</label>
            <select className={SEL} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
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
                <p className="text-xs font-medium text-[#555] mb-1.5">Fechas de contacto</p>
                <div className="grid grid-cols-3 gap-2">
                  {showMsg1 && <div><label className="block text-[10px] font-medium text-[#555] mb-1">Fecha Msg 1</label><input type="date" className="w-full px-2 py-2 text-xs rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] text-white focus:outline-none focus:border-[#E8410A] cursor-pointer" value={form.date_msg1 || ''} onChange={e => setForm(f => ({ ...f, date_msg1: e.target.value }))} /></div>}
                  {showMsg2 && <div><label className="block text-[10px] font-medium text-[#555] mb-1">Fecha Msg 2</label><input type="date" className="w-full px-2 py-2 text-xs rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] text-white focus:outline-none focus:border-[#E8410A] cursor-pointer" value={form.date_msg2 || ''} onChange={e => setForm(f => ({ ...f, date_msg2: e.target.value }))} /></div>}
                  {showMsg3 && <div><label className="block text-[10px] font-medium text-[#555] mb-1">Fecha Msg 3</label><input type="date" className="w-full px-2 py-2 text-xs rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] text-white focus:outline-none focus:border-[#E8410A] cursor-pointer" value={form.date_msg3 || ''} onChange={e => setForm(f => ({ ...f, date_msg3: e.target.value }))} /></div>}
                </div>
              </div>
            )
          })()}

          <div>
            <label className={LBL}>Notas</label>
            <textarea className={`${INP} resize-none`} rows={3} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Notas adicionales..." />
          </div>

          {saveError && (
            <div className="px-3 py-2.5 rounded-xl bg-red-950/50 border border-red-800/50 text-xs text-red-400">{saveError}</div>
          )}

          <div className="flex gap-3 pt-1">
            <button onClick={() => setModalForm(false)} className="flex-1 py-2.5 rounded-xl border border-[#2a2a2a] text-sm font-medium text-[#666] hover:bg-[#1a1a1a] hover:text-white transition-colors cursor-pointer">
              Cancelar
            </button>
            <button onClick={handleSave} disabled={!form.name || saving} className="flex-1 py-2.5 rounded-xl bg-[#E8410A] hover:bg-[#c93500] text-white text-sm font-semibold transition-colors disabled:opacity-40 cursor-pointer">
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
                <p className="text-sm font-semibold text-white">{modalMsg.name}</p>
                <p className="text-xs text-[#555]">{modalMsg.club}</p>
              </div>
              <Badge type="prospect" value={modalMsg.status} />
            </div>

            <div className="flex gap-2">
              {['es', 'en'].map(l => (
                <button key={l} onClick={() => setMsgLang(l)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${msgLang === l ? 'bg-[#E8410A] text-white' : 'bg-[#1a1a1a] text-[#666] hover:text-white border border-[#2a2a2a]'}`}>
                  {l === 'es' ? 'ES 🇪🇸' : 'EN 🇬🇧'}
                </button>
              ))}
            </div>

            <div className="p-4 rounded-xl bg-[#1a1a1a] border border-[#222]">
              <p className="text-sm text-[#ccc] leading-relaxed whitespace-pre-wrap">
                {getMsg(modalMsg, msgLang) || 'No hay mensaje para este estado.'}
              </p>
            </div>

            <button onClick={handleCopy}
              className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                copied
                  ? 'bg-[#0f2a1f] text-[#1D9E75] border border-[#1D9E75]/30'
                  : 'bg-[#E8410A] hover:bg-[#c93500] text-white shadow-lg shadow-[#E8410A]/20'
              }`}>
              {copied ? <Check size={15} /> : <Copy size={15} />}
              {copied ? '¡Copiado!' : 'Copiar mensaje'}
            </button>
          </div>
        )}
      </Modal>
    </div>
  )
}
