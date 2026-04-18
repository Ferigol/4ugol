import React, { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { CLIENT_COLUMNS, PACKS, PACK_PRICES } from '../lib/constants'
import { stageNotes } from '../lib/messages'
import KanbanBoard from '../components/KanbanBoard'
import KanbanCard from '../components/KanbanCard'
import Modal from '../components/Modal'
import Badge, { LangBadge, PackBadge } from '../components/Badge'
import { Plus, FileText, Copy, Check, Loader2 } from 'lucide-react'

const defaultForm = {
  name: '', club: '', email: '', telefono: '', puesto: '', project_name: '',
  pack: '4-3-3', custom_price: '', payment_type: 'mensual', lang: 'es',
  start_date: '', end_date: '', status: 'brief', notes: '',
}

export default function Clientes() {
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
        .from('clients')
        .update(payload)
        .eq('id', editingId)
        .select()
        .single()
      if (error) {
        console.error('[handleSave] UPDATE error:', error)
        setSaveError(error.message)
        setSaving(false)
        return
      }
      setItems(prev => prev.map(i => i.id === editingId ? updated : i))
    } else {
      const { data, error } = await supabase.from('clients').insert(payload).select().single()
      if (error) {
        console.error('[handleSave] INSERT error:', error)
        setSaveError(error.message)
        setSaving(false)
        return
      }
      setItems(prev => [data, ...prev])
    }
    setSaving(false)
    setModalForm(false)
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

  const openNote = (item) => {
    setModalNote(item)
    setNoteLang(item.lang || 'es')
    setCopied(false)
  }

  const getNoteText = (item, lang) => stageNotes[item.status]?.[lang] || ''

  const handleCopy = async () => {
    const text = getNoteText(modalNote, noteLang)
    if (text) {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Clientes</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {items.length} total · MRR: ${items.reduce((s, c) => s + (c.pack === 'otro' ? (Number(c.custom_price) || 0) : (PACK_PRICES[c.pack] || 0)), 0).toLocaleString()}
          </p>
        </div>
        <button
          id="add-client-btn"
          onClick={() => openAdd()}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500 hover:bg-green-400 text-white text-sm font-semibold shadow-lg shadow-green-500/30 transition-all cursor-pointer"
        >
          <Plus size={16} />
          Nuevo cliente
        </button>
      </div>

      {/* Kanban */}
      <div className="w-full">
        <KanbanBoard
          columns={CLIENT_COLUMNS}
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
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">{item.name}</p>
                  {item.club && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{item.club}</p>}
                </div>
                <LangBadge lang={item.lang} />
              </div>

              <div className="mb-2">
                <PackBadge pack={item.pack} price={item.pack === 'otro' ? (Number(item.custom_price) || 0) : PACK_PRICES[item.pack]} />
              </div>

              {item.notes && (
                <p className="text-xs text-gray-400 dark:text-gray-500 line-clamp-2 mb-2 leading-relaxed">
                  {item.notes}
                </p>
              )}

              <button
                onClick={() => openNote(item)}
                className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400 hover:text-green-500 font-medium mt-1 cursor-pointer transition-colors"
              >
                <FileText size={12} />
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
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre *</label>
              <input
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Nombre del cliente"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Club / Agencia</label>
              <input
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
                value={form.club}
                onChange={e => setForm(f => ({ ...f, club: e.target.value }))}
                placeholder="Barcelona FC"
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
                placeholder="cliente@club.com"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Teléfono</label>
              <input
                type="tel"
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
                value={form.telefono}
                onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))}
                placeholder="+34 600 000 000"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Puesto</label>
              <input
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
                value={form.puesto}
                onChange={e => setForm(f => ({ ...f, puesto: e.target.value }))}
                placeholder="Director deportivo"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre del proyecto</label>
              <input
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
                value={form.project_name}
                onChange={e => setForm(f => ({ ...f, project_name: e.target.value }))}
                placeholder="Nombre del proyecto"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha inicio</label>
              <input
                type="date"
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
                value={form.start_date}
                onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha cierre</label>
              <input
                type="date"
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
                value={form.end_date}
                onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Pack</label>
              <select
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-green-500 cursor-pointer"
                value={form.pack}
                onChange={e => setForm(f => ({ ...f, pack: e.target.value, custom_price: '' }))}
              >
                {PACKS.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.id === 'otro' ? 'Otro — precio personalizado' : `${p.label} — $${p.price}/mes`}
                  </option>
                ))}
              </select>
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

          {form.pack === 'otro' && (
            <div className="space-y-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Precio personalizado ({form.payment_type === 'unico' ? 'pago único' : '$/mes'})
                </label>
                <input
                  type="number"
                  min="0"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
                  value={form.custom_price}
                  onChange={e => setForm(f => ({ ...f, custom_price: e.target.value }))}
                  placeholder="Ej. 1500"
                />
              </div>
              <div className="flex gap-2">
                {[['mensual', 'Mensual'], ['unico', 'Pago único']].map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, payment_type: val }))}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      form.payment_type === val
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Estado</label>
            <select
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-green-500 cursor-pointer"
              value={form.status}
              onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
            >
              {CLIENT_COLUMNS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Notas</label>
            <textarea
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 resize-none"
              rows={3}
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Notas del proyecto..."
            />
          </div>

          {saveError && (
            <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">{saveError}</p>
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
              {saving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Crear cliente'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Stage Note Modal */}
      <Modal
        isOpen={!!modalNote}
        onClose={() => setModalNote(null)}
        title="Nota de etapa"
        size="md"
      >
        {modalNote && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{modalNote.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{modalNote.club}</p>
              </div>
              <div className="flex items-center gap-2">
                <PackBadge pack={modalNote.pack} price={modalNote.pack === 'otro' ? (Number(modalNote.custom_price) || 0) : PACK_PRICES[modalNote.pack]} />
                <Badge type="client" value={modalNote.status} />
              </div>
            </div>

            {/* Lang toggle */}
            <div className="flex gap-2">
              {['es', 'en'].map(l => (
                <button
                  key={l}
                  onClick={() => setNoteLang(l)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    noteLang === l
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {l === 'es' ? 'ES 🇪🇸' : 'EN 🇬🇧'}
                </button>
              ))}
            </div>

            {/* Note text */}
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                {getNoteText(modalNote, noteLang) || 'Sin nota para esta etapa.'}
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
              {copied ? '¡Copiado!' : 'Copiar nota'}
            </button>
          </div>
        )}
      </Modal>
    </div>
  )
}
