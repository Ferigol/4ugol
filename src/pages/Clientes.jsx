import React, { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { CLIENT_COLUMNS, PACKS, PACK_PRICES } from '../lib/constants'
import { stageNotes } from '../lib/messages'
import KanbanBoard from '../components/KanbanBoard'
import KanbanCard from '../components/KanbanCard'
import Modal from '../components/Modal'
import Badge, { LangBadge, PackBadge } from '../components/Badge'
import { Plus, FileText, Copy, Check, Loader2, Download, ArrowLeft, Search, X } from 'lucide-react'
import { downloadClientFichas } from '../lib/downloadFichas'

const INP = 'w-full px-3 py-2.5 text-sm rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] text-white placeholder-[#444] focus:outline-none focus:border-[#E8410A] focus:ring-1 focus:ring-[#E8410A]/20 transition-all'
const SEL = 'w-full px-3 py-2.5 text-sm rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] text-white focus:outline-none focus:border-[#E8410A] cursor-pointer transition-all'
const LBL = 'block text-xs font-medium text-[#666] mb-1.5'

const defaultForm = {
  name: '', club: '', email: '', telefono: '', puesto: '', project_name: '',
  pack: '4-3-3', custom_price: '', payment_type: 'mensual', lang: 'es',
  start_date: '', end_date: '', status: 'brief', notes: '',
}

export default function Clientes() {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalForm, setModalForm] = useState(false)
  const [modalNote, setModalNote] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(defaultForm)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [noteLang, setNoteLang] = useState('es')
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
    const { data } = await supabase.from('clients').select('*').order('created_at', { ascending: false })
    setItems(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const openAdd = (status = 'brief') => {
    setForm({ ...defaultForm, status })
    setEditingId(null)
    setSaveError(null)
    setModalForm(true)
  }

  const openEdit = (item) => {
    setSaveError(null)
    setForm({
      name:         item.name         ?? '',
      club:         item.club         ?? '',
      email:        item.email        ?? '',
      telefono:     item.telefono     ?? '',
      puesto:       item.puesto       ?? '',
      project_name: item.project_name ?? '',
      pack:         item.pack         ?? '4-3-3',
      custom_price: item.custom_price != null ? String(item.custom_price) : '',
      payment_type: item.payment_type ?? 'mensual',
      lang:         item.lang         ?? 'es',
      start_date:   item.start_date   ?? '',
      end_date:     item.end_date     ?? '',
      status:       item.status,
      notes:        item.notes        ?? '',
    })
    setEditingId(item.id)
    setModalForm(true)
  }

  const handleSave = async () => {
    setSaving(true)
    setSaveError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const payload = {
        user_id:      user.id,
        name:         form.name,
        club:         form.club,
        email:        form.email,
        telefono:     form.telefono,
        puesto:       form.puesto,
        project_name: form.project_name,
        pack:         form.pack,
        custom_price: form.pack === 'otro' ? (Number(form.custom_price) || null) : null,
        payment_type: form.pack === 'otro' ? form.payment_type : 'mensual',
        lang:         form.lang,
        start_date:   form.start_date || null,
        end_date:     form.end_date || null,
        status:       form.status,
        notes:        form.notes,
      }
      if (editingId) {
        const { data: updated, error } = await supabase
          .from('clients').update(payload).eq('id', editingId).select().single()
        if (error) throw error
        setItems(prev => prev.map(i => i.id === editingId ? updated : i))
      } else {
        const { data, error } = await supabase.from('clients').insert(payload).select().single()
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
    if (!confirm('¿Eliminar este cliente?')) return
    await supabase.from('clients').delete().eq('id', id)
    setItems(prev => prev.filter(i => i.id !== id))
  }

  const handleStatusChange = async (id, newStatus) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, status: newStatus } : i))
    await supabase.from('clients').update({ status: newStatus }).eq('id', id)
  }

  const handleItemsChange = (colId, reordered) => {
    setItems(prev => {
      const rest = prev.filter(i => i.status !== colId)
      return [...rest, ...reordered]
    })
  }

  const openNote = (item) => { setModalNote(item); setNoteLang(item.lang || 'es'); setCopied(false) }
  const getNoteText = (item, lang) => stageNotes[item.status]?.[lang] || ''
  const handleCopy = async () => {
    const text = getNoteText(modalNote, noteLang)
    if (text) { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }
  }

  const mrr = items.reduce((s, c) => s + (c.pack === 'otro' ? (Number(c.custom_price) || 0) : (PACK_PRICES[c.pack] || 0)), 0)

  if (loading) return (
    <div className="flex items-center justify-center h-full bg-[#0a0a0a]">
      <Loader2 className="animate-spin text-[#E8410A]" size={28} />
    </div>
  )

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#0a0a0a]">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between gap-4 px-6 pt-6 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded-xl bg-[#111] border border-[#222] text-[#555] hover:text-white hover:border-[#333] transition-all cursor-pointer"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-xl text-white tracking-tight font-gilroy">Clientes</h1>
            <p className="text-xs text-[#444] mt-0.5">
              {searchQuery.trim() ? `${filteredItems.length} resultado${filteredItems.length !== 1 ? 's' : ''}` : `${items.length} total · MRR: $${mrr.toLocaleString()}`}
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
                placeholder="Buscar cliente..."
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
            onClick={() => downloadClientFichas(items)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#333] bg-transparent text-[#888] hover:text-white hover:border-[#555] text-sm font-medium transition-all cursor-pointer"
          >
            <Download size={14} />
            Descargar fichas
          </button>
          <button
            id="add-client-btn"
            onClick={() => openAdd()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#E8410A] hover:bg-[#c93500] text-white text-sm font-semibold shadow-lg shadow-[#E8410A]/20 transition-all cursor-pointer"
          >
            <Plus size={15} />
            Nuevo cliente
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden px-6 pb-6">
        <KanbanBoard
          columns={CLIENT_COLUMNS}
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
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white leading-tight">{item.name}</p>
                  {item.club && <p className="text-xs text-[#555] mt-0.5">{item.club}</p>}
                </div>
                <LangBadge lang={item.lang} />
              </div>

              <div className="mb-2">
                <PackBadge pack={item.pack} price={item.pack === 'otro' ? (Number(item.custom_price) || 0) : PACK_PRICES[item.pack]} />
              </div>

              {item.notes && (
                <p className="text-xs text-[#444] line-clamp-2 mb-2 leading-relaxed">
                  {item.notes}
                </p>
              )}

              <button
                onClick={() => openNote(item)}
                className="flex items-center gap-1.5 text-xs text-[#E8410A] hover:text-[#FF5A1F] font-medium mt-1 cursor-pointer transition-colors"
              >
                <FileText size={11} />
                Ver nota de etapa
              </button>
            </KanbanCard>
          )}
        />
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={modalForm}
        onClose={() => setModalForm(false)}
        title={editingId ? 'Editar cliente' : 'Nuevo cliente'}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LBL}>Nombre *</label>
              <input className={INP} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nombre del cliente" />
            </div>
            <div>
              <label className={LBL}>Club / Agencia</label>
              <input className={INP} value={form.club} onChange={e => setForm(f => ({ ...f, club: e.target.value }))} placeholder="Barcelona FC" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LBL}>Email</label>
              <input type="email" className={INP} value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="cliente@club.com" />
            </div>
            <div>
              <label className={LBL}>Teléfono</label>
              <input type="tel" className={INP} value={form.telefono} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} placeholder="+34 600 000 000" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LBL}>Puesto</label>
              <input className={INP} value={form.puesto} onChange={e => setForm(f => ({ ...f, puesto: e.target.value }))} placeholder="Director deportivo" />
            </div>
            <div>
              <label className={LBL}>Nombre del proyecto</label>
              <input className={INP} value={form.project_name} onChange={e => setForm(f => ({ ...f, project_name: e.target.value }))} placeholder="Nombre del proyecto" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LBL}>Fecha inicio</label>
              <input type="date" className={INP} value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
            </div>
            <div>
              <label className={LBL}>Fecha cierre</label>
              <input type="date" className={INP} value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LBL}>Pack</label>
              <select className={SEL} value={form.pack} onChange={e => setForm(f => ({ ...f, pack: e.target.value, custom_price: '' }))}>
                {PACKS.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.id === 'otro' ? 'Otro — precio personalizado' : `${p.label} — $${p.price}/mes`}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={LBL}>Idioma</label>
              <select className={SEL} value={form.lang} onChange={e => setForm(f => ({ ...f, lang: e.target.value }))}>
                <option value="es">ES 🇪🇸</option>
                <option value="en">EN 🇬🇧</option>
              </select>
            </div>
          </div>

          {form.pack === 'otro' && (
            <div className="space-y-2">
              <div>
                <label className={LBL}>
                  Precio personalizado ({form.payment_type === 'unico' ? 'pago único' : '$/mes'})
                </label>
                <input
                  type="number" min="0" className={INP}
                  value={form.custom_price}
                  onChange={e => setForm(f => ({ ...f, custom_price: e.target.value }))}
                  placeholder="Ej. 1500"
                />
              </div>
              <div className="flex gap-2">
                {[['mensual', 'Mensual'], ['unico', 'Pago único']].map(([val, label]) => (
                  <button
                    key={val} type="button"
                    onClick={() => setForm(f => ({ ...f, payment_type: val }))}
                    className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                      form.payment_type === val
                        ? 'bg-[#E8410A] text-white border-[#E8410A]'
                        : 'bg-[#1a1a1a] text-[#666] border-[#2a2a2a] hover:text-white'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className={LBL}>Estado</label>
            <select className={SEL} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
              {CLIENT_COLUMNS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>

          <div>
            <label className={LBL}>Notas</label>
            <textarea
              className={`${INP} resize-none`} rows={3}
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Notas del proyecto..."
            />
          </div>

          {saveError && (
            <p className="text-xs text-red-400 bg-red-950/40 border border-red-800/40 rounded-xl px-3 py-2">{saveError}</p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              onClick={() => setModalForm(false)}
              className="flex-1 py-2.5 rounded-xl border border-[#2a2a2a] text-sm font-medium text-[#666] hover:bg-[#1a1a1a] hover:text-white transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={!form.name || saving}
              className="flex-1 py-2.5 rounded-xl bg-[#E8410A] hover:bg-[#c93500] text-white text-sm font-semibold transition-colors disabled:opacity-40 cursor-pointer"
            >
              {saving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Crear cliente'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Stage Note Modal */}
      <Modal isOpen={!!modalNote} onClose={() => setModalNote(null)} title="Nota de etapa" size="md">
        {modalNote && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-white">{modalNote.name}</p>
                <p className="text-xs text-[#555]">{modalNote.club}</p>
              </div>
              <div className="flex items-center gap-2">
                <PackBadge pack={modalNote.pack} price={modalNote.pack === 'otro' ? (Number(modalNote.custom_price) || 0) : PACK_PRICES[modalNote.pack]} />
                <Badge type="client" value={modalNote.status} />
              </div>
            </div>

            <div className="flex gap-2">
              {['es', 'en'].map(l => (
                <button
                  key={l} onClick={() => setNoteLang(l)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    noteLang === l ? 'bg-[#E8410A] text-white' : 'bg-[#1a1a1a] text-[#666] hover:text-white border border-[#2a2a2a]'
                  }`}
                >
                  {l === 'es' ? 'ES 🇪🇸' : 'EN 🇬🇧'}
                </button>
              ))}
            </div>

            <div className="p-4 rounded-xl bg-[#1a1a1a] border border-[#222]">
              <p className="text-sm text-[#ccc] leading-relaxed whitespace-pre-wrap">
                {getNoteText(modalNote, noteLang) || 'Sin nota para esta etapa.'}
              </p>
            </div>

            <button
              onClick={handleCopy}
              className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                copied
                  ? 'bg-[#0f2a1f] text-[#1D9E75] border border-[#1D9E75]/30'
                  : 'bg-[#E8410A] hover:bg-[#c93500] text-white shadow-lg shadow-[#E8410A]/20'
              }`}
            >
              {copied ? <Check size={15} /> : <Copy size={15} />}
              {copied ? '¡Copiado!' : 'Copiar nota'}
            </button>
          </div>
        )}
      </Modal>
    </div>
  )
}
