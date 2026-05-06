import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { PROSPECT_COLUMNS, PACKS } from '../lib/constants'
import { messages } from '../lib/messages'
import KanbanBoard from '../components/KanbanBoard'
import KanbanCard from '../components/KanbanCard'
import Modal from '../components/Modal'
import Badge, { LangBadge } from '../components/Badge'
import { Plus, MessageSquare, Copy, Check, Loader2, Download, ArrowLeft, Search, X, LayoutGrid, List, ChevronRight, ChevronUp, ChevronDown, UserCheck, Archive } from 'lucide-react'
import { downloadProspectFichas } from '../lib/downloadFichas'

const MSG_DATE_FIELDS = { msg1: 'msg1_fecha', msg2: 'msg2_fecha', msg3: 'msg3_fecha' }
const CONTACT_DATE_FIELD = {
  msg1: 'msg1_fecha', msg2: 'msg2_fecha', msg3: 'msg3_fecha',
  diagnostico: 'msg3_fecha', propuesta: 'msg3_fecha',
}
const MONTH_ABBR = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
const formatMsgDate = (d) => { if (!d) return null; const [y, m, day] = d.split('-'); return `${parseInt(day)} ${MONTH_ABBR[parseInt(m) - 1]} ${y}` }
const todayDate = () => new Date().toISOString().split('T')[0]

const daysSince = (dateStr) => {
  if (!dateStr) return null
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
}

const getLastContactDate = (item) => {
  const map = {
    msg1:        item.msg1_fecha,
    msg2:        item.msg2_fecha,
    msg3:        item.msg3_fecha,
    diagnostico: item.msg3_fecha || item.msg2_fecha || item.msg1_fecha,
    propuesta:   item.msg3_fecha || item.msg2_fecha || item.msg1_fecha,
  }
  return map[item.status] || null
}

const INP = 'w-full px-3 py-2.5 text-sm rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] text-white placeholder-[#444] focus:outline-none focus:border-[#E8410A] focus:ring-1 focus:ring-[#E8410A]/20 transition-all'
const SEL = 'w-full px-3 py-2.5 text-sm rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] text-white focus:outline-none focus:border-[#E8410A] cursor-pointer transition-all'
const LBL = 'block text-xs font-medium text-[#666] mb-1.5'

const daysUntilFollowup = (dateStr) => {
  if (!dateStr) return null
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr + 'T00:00:00')
  return Math.round((target - today) / 86400000)
}

const FollowupBadge = ({ dateStr }) => {
  const d = daysUntilFollowup(dateStr)
  if (d === null) return null
  if (d <= 0) return (
    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-red-950 text-red-400 whitespace-nowrap">
      SEGUIMIENTO HOY
    </span>
  )
  if (d <= 2) return (
    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-950 text-amber-400 whitespace-nowrap">
      Seguimiento en {d}d
    </span>
  )
  return null
}

const defaultForm = {
  name: '', club: '', email: '', phone: '', web_link: '', role: '', lang: 'es', status: 'nuevo', notes: '',
  msg1_texto: '', msg2_texto: '', msg3_texto: '',
  msg1_fecha: '', msg2_fecha: '', msg3_fecha: '',
  followup_date: '',
}

const SectionHeader = ({ label }) => (
  <div className="flex items-center gap-3 pt-3">
    <span className="text-[10px] font-semibold text-[#E8410A] uppercase tracking-widest whitespace-nowrap">{label}</span>
    <div className="flex-1 h-px bg-[#222]" />
  </div>
)

const SortBtn = ({ field, label, sortField, sortDir, onSort }) => (
  <button
    onClick={() => onSort(field)}
    className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-[#666] hover:text-[#999] transition-colors cursor-pointer select-none"
  >
    {label}
    <span className="flex flex-col" style={{ gap: -2 }}>
      <ChevronUp size={9} className={sortField === field && sortDir === 'asc' ? 'text-[#E8410A]' : 'text-[#333]'} />
      <ChevronDown size={9} className={sortField === field && sortDir === 'desc' ? 'text-[#E8410A]' : 'text-[#333]'} />
    </span>
  </button>
)

const ProspectAvatar = ({ name }) => (
  <div className="w-8 h-8 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center shrink-0">
    <span className="text-sm font-bold text-[#E8410A] leading-none">
      {(name || '?').trim().charAt(0).toUpperCase()}
    </span>
  </div>
)

const DaysBadge = ({ days }) => {
  if (days === null) return <span className="text-xs text-[#444]">—</span>
  if (days > 14) return <span className="inline-flex px-1.5 py-0.5 rounded-md text-xs font-semibold bg-red-950 text-red-400">{days}d</span>
  if (days > 7)  return <span className="inline-flex px-1.5 py-0.5 rounded-md text-xs font-semibold bg-amber-950 text-amber-400">{days}d</span>
  return <span className="inline-flex px-1.5 py-0.5 rounded-md text-xs font-semibold bg-[#1a1a1a] text-[#555]">{days}d</span>
}

const COL_TEMPLATE = '40px 1fr 64px 110px 100px 96px 110px 60px 28px'
const ARCHIVED_COL_TEMPLATE = '40px 1fr 130px 120px 110px'

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
  const [searchParams, setSearchParams] = useSearchParams()

  const [viewMode, setViewMode] = useState(() => localStorage.getItem('prospectos-view') || 'kanban')
  const [sortField, setSortField] = useState('name')
  const [sortDir, setSortDir] = useState('asc')
  const [activeFilter, setActiveFilter] = useState('all')
  const [contactingId, setContactingId] = useState(null)
  const [contactedId, setContactedId]   = useState(null)

  const [modalConvertir, setModalConvertir] = useState(null)
  const [convertForm, setConvertForm]       = useState({ pack: '4-3-3', custom_price: '', start_date: '' })
  const [converting, setConverting]         = useState(false)
  const [convertError, setConvertError]     = useState('')
  const [convertSuccess, setConvertSuccess] = useState(false)

  useEffect(() => {
    const targetId = searchParams.get('id')
    if (!targetId || items.length === 0) return
    const target = items.find(i => String(i.id) === targetId)
    if (target) {
      openEdit(target)
      setSearchParams({}, { replace: true })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, searchParams])

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus()
  }, [searchOpen])

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') { setSearchOpen(false); setSearchQuery('') } }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  const baseItems = items.filter(i => i.status !== 'convertido' && i.status !== 'archivado')
  const filteredItems = searchQuery.trim()
    ? baseItems.filter(i => i.name?.toLowerCase().includes(searchQuery.toLowerCase()))
    : baseItems

  const urgentCount = useMemo(
    () => filteredItems.filter(i => { const d = daysSince(getLastContactDate(i)); return d !== null && d > 7 }).length,
    [filteredItems]
  )

  const archivedItems = useMemo(() => items.filter(i => i.status === 'archivado'), [items])

  const listItems = useMemo(() => {
    if (activeFilter === 'convertido') {
      const pool = searchQuery.trim()
        ? items.filter(i => i.status === 'convertido' && i.name?.toLowerCase().includes(searchQuery.toLowerCase()))
        : items.filter(i => i.status === 'convertido')
      return pool.sort((a, b) => {
        let va, vb
        if (sortField === 'name')   { va = (a.name || '').toLowerCase(); vb = (b.name || '').toLowerCase() }
        if (sortField === 'status') { va = 0; vb = 0 }
        if (sortField === 'days')   { va = daysSince(getLastContactDate(a)) ?? -1; vb = daysSince(getLastContactDate(b)) ?? -1 }
        if (sortField === 'date')   { va = getLastContactDate(a) || ''; vb = getLastContactDate(b) || '' }
        if (va < vb) return sortDir === 'asc' ? -1 : 1
        if (va > vb) return sortDir === 'asc' ?  1 : -1
        return 0
      })
    }

    let base = [...filteredItems]
    switch (activeFilter) {
      case 'urgent': base = base.filter(i => { const d = daysSince(getLastContactDate(i)); return d !== null && d > 7 }); break
      case 'es':     base = base.filter(i => i.lang === 'es'); break
      case 'en':     base = base.filter(i => i.lang === 'en'); break
      case 'all':    break
      default:       base = base.filter(i => i.status === activeFilter)
    }
    base.sort((a, b) => {
      let va, vb
      if (sortField === 'name')   { va = (a.name || '').toLowerCase(); vb = (b.name || '').toLowerCase() }
      if (sortField === 'status') { const o = PROSPECT_COLUMNS.map(c => c.id); va = o.indexOf(a.status); vb = o.indexOf(b.status) }
      if (sortField === 'days')   { va = daysSince(getLastContactDate(a)) ?? -1; vb = daysSince(getLastContactDate(b)) ?? -1 }
      if (sortField === 'date')   { va = getLastContactDate(a) || ''; vb = getLastContactDate(b) || '' }
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ?  1 : -1
      return 0
    })
    return base
  }, [items, filteredItems, activeFilter, sortField, sortDir, searchQuery])

  const fetchData = useCallback(async () => {
    const { data } = await supabase.from('prospects').select('*').order('created_at', { ascending: false })
    setItems(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleSort = (field) => {
    if (field === sortField) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }

  const toggleView = (mode) => {
    setViewMode(mode)
    if (mode !== 'archived') localStorage.setItem('prospectos-view', mode)
  }

  const handleUnarchive = async (item) => {
    const newStatus = item.archived_prev_status || 'msg1'
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: newStatus, archived_at: null, archived_prev_status: null } : i))
    const { error } = await supabase.from('prospects').update({ status: newStatus, archived_at: null, archived_prev_status: null }).eq('id', item.id)
    if (error) await supabase.from('prospects').update({ status: newStatus }).eq('id', item.id)
  }

  const openAdd = (status = 'nuevo') => {
    setForm({ ...defaultForm, status })
    setSaveError('')
    setEditingId(null)
    setModalForm(true)
  }

  const openEdit = (item) => {
    setForm({
      name: item.name, club: item.club || '', email: item.email || '',
      phone: item.phone || '', web_link: item.web_link || '', role: item.role || '',
      lang: item.lang || 'es', status: item.status, notes: item.notes || '',
      msg1_texto: item.msg1_texto || '', msg2_texto: item.msg2_texto || '', msg3_texto: item.msg3_texto || '',
      msg1_fecha: item.msg1_fecha || '', msg2_fecha: item.msg2_fecha || '', msg3_fecha: item.msg3_fecha || '',
      followup_date: item.followup_date || '',
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
      const payload = {
        ...form,
        user_id: user.id,
        msg1_fecha: form.msg1_fecha || null,
        msg2_fecha: form.msg2_fecha || null,
        msg3_fecha: form.msg3_fecha || null,
        followup_date: form.followup_date || null,
      }

      if (editingId && form.status === 'archivado') {
        const prevItem = items.find(i => i.id === editingId)
        if (prevItem?.status !== 'archivado') {
          payload.archived_prev_status = prevItem?.status || null
          payload.archived_at = todayDate()
        }
      }

      const stripMissingCol = (p, err) => {
        if (!err?.message?.includes("schema cache")) return null
        const match = err.message.match(/find the '(\w+)' column/)
        if (!match) return null
        const { [match[1]]: _, ...rest } = p
        return rest
      }

      if (editingId) {
        let cur = payload
        let error
        for (let attempt = 0; attempt < 10; attempt++) {
          ;({ error } = await supabase.from('prospects').update(cur).eq('id', editingId))
          if (!error) break
          const next = stripMissingCol(cur, error)
          if (!next) break
          cur = next
        }
        if (error) throw error
        setItems(prev => prev.map(i => i.id === editingId ? { ...i, ...cur } : i))
      } else {
        const dateField = MSG_DATE_FIELDS[payload.status]
        if (dateField && !payload[dateField]) payload[dateField] = todayDate()
        let cur = payload
        let data, error
        for (let attempt = 0; attempt < 10; attempt++) {
          ;({ data, error } = await supabase.from('prospects').insert(cur).select().single())
          if (!error) break
          const next = stripMissingCol(cur, error)
          if (!next) break
          cur = next
        }
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
    const updates = { status: newStatus }
    if (dateField) {
      const existing = items.find(i => i.id === id)
      if (!existing?.[dateField]) updates[dateField] = todayDate()
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

  const handleContactedToday = async (e, item) => {
    e.stopPropagation()
    const field = CONTACT_DATE_FIELD[item.status]
    if (!field || contactingId) return
    setContactingId(item.id)
    const today = todayDate()
    await supabase.from('prospects').update({ [field]: today }).eq('id', item.id)
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, [field]: today } : i))
    setContactingId(null)
    setContactedId(item.id)
    setTimeout(() => setContactedId(prev => prev === item.id ? null : prev), 1800)
  }

  const openConvertir = (item) => {
    setModalConvertir(item)
    setConvertForm({ pack: '4-3-3', custom_price: '', start_date: '' })
    setConvertError('')
    setConvertSuccess(false)
  }

  const handleConvert = async () => {
    setConverting(true)
    setConvertError('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const p = modalConvertir

      const clientPayload = {
        user_id:      user.id,
        name:         p.name,
        club:         p.club          || '',
        email:        p.email         || '',
        telefono:     p.phone         || '',
        puesto:       p.role          || '',
        lang:         p.lang          || 'es',
        pack:         convertForm.pack,
        custom_price: convertForm.pack === 'otro' ? (Number(convertForm.custom_price) || null) : null,
        payment_type: 'mensual',
        start_date:   convertForm.start_date || null,
        end_date:     null,
        status:       'brief',
        notes:        p.notes         || '',
        project_name: '',
      }

      const { error: clientErr } = await supabase.from('clients').insert(clientPayload)
      if (clientErr) throw clientErr

      const { error: prospectErr } = await supabase
        .from('prospects').update({ status: 'convertido' }).eq('id', p.id)
      if (prospectErr) throw prospectErr

      setItems(prev => prev.map(i => i.id === p.id ? { ...i, status: 'convertido' } : i))
      setConvertSuccess(true)
      setTimeout(() => {
        setConvertSuccess(false)
        setModalConvertir(null)
      }, 1800)
    } catch (err) {
      setConvertError(err.message || 'Error al convertir. Intenta de nuevo.')
    } finally {
      setConverting(false)
    }
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
            <h1 className="text-xl text-white tracking-tight font-gilroy">Prospectos</h1>
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

          {/* View toggle */}
          <div className="flex items-center rounded-xl border border-[#222] overflow-hidden">
            <button
              onClick={() => toggleView('kanban')}
              title="Vista Kanban"
              className={`p-2 transition-colors cursor-pointer ${viewMode === 'kanban' ? 'bg-[#1a1a1a] text-white' : 'text-[#444] hover:text-[#888]'}`}
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => toggleView('list')}
              title="Vista Lista"
              className={`p-2 transition-colors cursor-pointer ${viewMode === 'list' ? 'bg-[#1a1a1a] text-white' : 'text-[#444] hover:text-[#888]'}`}
            >
              <List size={16} />
            </button>
          </div>

          <button
            onClick={() => toggleView(viewMode === 'archived' ? (localStorage.getItem('prospectos-view') || 'kanban') : 'archived')}
            title="Ver archivados"
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
              viewMode === 'archived'
                ? 'bg-[#1a1a1a] border-[#444] text-[#999]'
                : 'border-[#222] text-[#444] hover:text-[#888] hover:border-[#333]'
            }`}
          >
            <Archive size={13} />
            Archivados ({archivedItems.length})
          </button>

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

      {/* ── Kanban view ── */}
      {viewMode === 'kanban' && (
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
                  <div className="flex items-center justify-between gap-1.5 flex-wrap mb-0.5">
                    <LangBadge lang={item.lang} />
                    <div className="flex items-center gap-1 flex-wrap justify-end">
                      <FollowupBadge dateStr={item.followup_date} />
                      {(() => {
                        const days = daysSince(getLastContactDate(item))
                        if (days === null || days <= 7) return null
                        const isCritical = days > 14
                        return (
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${
                            isCritical ? 'bg-red-950 text-red-400' : 'bg-amber-950 text-amber-400'
                          }`}>
                            {days}d sin contacto
                          </span>
                        )
                      })()}
                    </div>
                  </div>
                  <p className="text-sm font-bold text-white leading-tight mt-1">{item.name}</p>
                  {item.club && <p className="text-xs text-[#555] mt-0.5">{item.club}</p>}
                  {(() => {
                    const days = daysSince(getLastContactDate(item))
                    if (days === null || days > 7) return null
                    return (
                      <p className="text-[10px] text-[#444] mt-0.5">hace {days} día{days !== 1 ? 's' : ''}</p>
                    )
                  })()}
                  {(item.msg1_fecha || item.msg2_fecha || item.msg3_fecha) && (
                    <div className="flex flex-col gap-0.5 mt-1.5">
                      {item.msg1_fecha && <span className="text-[10px] text-[#444]">MSJ 1: {formatMsgDate(item.msg1_fecha)}</span>}
                      {item.msg2_fecha && <span className="text-[10px] text-[#444]">MSJ 2: {formatMsgDate(item.msg2_fecha)}</span>}
                      {item.msg3_fecha && <span className="text-[10px] text-[#444]">MSJ 3: {formatMsgDate(item.msg3_fecha)}</span>}
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
      )}

      {/* ── List view ── */}
      {viewMode === 'list' && (
        <div className="flex flex-col gap-3">

          {/* Filter pills */}
          <div className="flex items-center gap-2 flex-wrap">
            {[
              { id: 'all',         label: 'Todos' },
              { id: 'urgent',      label: urgentCount > 0 ? `Urgentes (${urgentCount})` : 'Urgentes' },
              { id: 'es',          label: 'ES' },
              { id: 'en',          label: 'EN' },
              { id: 'msg1',        label: 'MSG1' },
              { id: 'msg2',        label: 'MSG2' },
              { id: 'msg3',        label: 'MSG3' },
              { id: 'diagnostico', label: 'Diagnóstico' },
              { id: 'propuesta',   label: 'Propuesta' },
              { id: 'convertido',  label: 'Convertidos' },
            ].map(pill => (
              <button
                key={pill.id}
                onClick={() => setActiveFilter(pill.id)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  activeFilter === pill.id
                    ? 'bg-[#E8410A] text-white shadow-sm shadow-[#E8410A]/20'
                    : 'bg-[#111] border border-[#222] text-[#666] hover:text-[#999] hover:border-[#333]'
                }`}
              >
                {pill.label}
              </button>
            ))}
          </div>

          {/* Table */}
          <div className="rounded-2xl border border-[#1e1e1e] overflow-hidden">

            {/* Header row */}
            <div
              className="grid gap-4 px-4 py-3 bg-[#0a0a0a] border-b border-[#222]"
              style={{ gridTemplateColumns: COL_TEMPLATE }}
            >
              <div />
              <SortBtn field="name"   label="Nombre"       sortField={sortField} sortDir={sortDir} onSort={handleSort} />
              <span className="text-xs font-semibold uppercase tracking-wider text-[#666]">Idioma</span>
              <SortBtn field="status" label="Estado"       sortField={sortField} sortDir={sortDir} onSort={handleSort} />
              <SortBtn field="days"   label="Sin contacto" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
              <SortBtn field="date"   label="Último msg"   sortField={sortField} sortDir={sortDir} onSort={handleSort} />
              <span className="text-xs font-semibold uppercase tracking-wider text-[#666]">Seguimiento</span>
              <span className="text-xs font-semibold uppercase tracking-wider text-[#666]">Acción</span>
              <div />
            </div>

            {/* Data rows */}
            {listItems.length === 0 ? (
              <div className="py-12 text-center text-sm text-[#333] bg-[#0f0f0f]">
                Sin resultados para este filtro.
              </div>
            ) : listItems.map((item, idx) => {
              const lastDate = getLastContactDate(item)
              const days = daysSince(lastDate)
              return (
                <button
                  key={item.id}
                  onClick={() => openEdit(item)}
                  className="grid gap-4 px-4 py-3 w-full text-left items-center bg-[#0f0f0f] hover:bg-[#1a1a1a] transition-colors cursor-pointer group"
                  style={{
                    gridTemplateColumns: COL_TEMPLATE,
                    borderTop: idx > 0 ? '0.5px solid #222' : 'none',
                  }}
                >
                  <ProspectAvatar name={item.name} />

                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate leading-tight">{item.name}</p>
                    {item.club && <p className="text-xs text-[#555] truncate mt-0.5">{item.club}</p>}
                  </div>

                  <div><LangBadge lang={item.lang} /></div>

                  <div><Badge type="prospect" value={item.status} /></div>

                  <div><DaysBadge days={days} /></div>

                  <div className="text-xs text-[#555]">
                    {lastDate ? formatMsgDate(lastDate) : <span className="text-[#333]">—</span>}
                  </div>

                  <div>
                    {(() => {
                      if (!item.followup_date) return <span className="text-xs text-[#333]">—</span>
                      const d = daysUntilFollowup(item.followup_date)
                      if (d !== null && d <= 0)
                        return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-red-950 text-red-400 whitespace-nowrap">HOY</span>
                      if (d !== null && d <= 2)
                        return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-950 text-amber-400 whitespace-nowrap">en {d}d</span>
                      return <span className="text-xs text-[#555]">{formatMsgDate(item.followup_date)}</span>
                    })()}
                  </div>

                  <div className="flex items-center">
                    {item.status === 'cerrado' ? (
                      <button
                        onClick={(e) => { e.stopPropagation(); openConvertir(item) }}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer bg-[#0f2a1f] text-[#1D9E75] border border-[#1D9E75]/30 hover:border-[#1D9E75]/60"
                      >
                        <UserCheck size={11} />
                        Cliente
                      </button>
                    ) : item.status === 'convertido' ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] font-semibold bg-[#0e1f3a] text-[#3B82F6]">
                        ✓
                      </span>
                    ) : CONTACT_DATE_FIELD[item.status] ? (
                      <button
                        onClick={(e) => handleContactedToday(e, item)}
                        disabled={!!contactingId}
                        className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer disabled:opacity-40 ${
                          contactedId === item.id
                            ? 'bg-[#0f2a1f] text-[#1D9E75] border border-[#1D9E75]/30'
                            : 'bg-[#111] text-[#555] border border-[#222] hover:border-[#1D9E75]/40 hover:text-[#1D9E75]'
                        }`}
                      >
                        {contactingId === item.id ? '...' : contactedId === item.id ? '✓' : 'Hoy'}
                      </button>
                    ) : (
                      <span />
                    )}
                  </div>

                  <div className="flex justify-end">
                    <ChevronRight size={14} className="text-[#333] group-hover:text-[#666] transition-colors" />
                  </div>
                </button>
              )
            })}
          </div>

          <p className="text-xs text-[#444] px-1">
            {listItems.length} prospecto{listItems.length !== 1 ? 's' : ''}
            {activeFilter !== 'all' ? ' filtrados' : ''}
          </p>
        </div>
      )}

      {/* ── Archived view ── */}
      {viewMode === 'archived' && (
        <div className="flex flex-col gap-3">
          <div className="rounded-2xl border border-[#1e1e1e] overflow-hidden">
            <div
              className="grid gap-4 px-4 py-3 bg-[#0a0a0a] border-b border-[#222]"
              style={{ gridTemplateColumns: ARCHIVED_COL_TEMPLATE }}
            >
              <div />
              <span className="text-xs font-semibold uppercase tracking-wider text-[#666]">Nombre</span>
              <span className="text-xs font-semibold uppercase tracking-wider text-[#666]">Estado ant.</span>
              <span className="text-xs font-semibold uppercase tracking-wider text-[#666]">Archivado</span>
              <div />
            </div>

            {archivedItems.length === 0 ? (
              <div className="py-12 text-center text-sm text-[#333] bg-[#0f0f0f]">
                No hay prospectos archivados.
              </div>
            ) : archivedItems.map((item, idx) => (
              <div
                key={item.id}
                className="grid gap-4 px-4 py-3 items-center bg-[#0f0f0f] hover:bg-[#1a1a1a] transition-colors"
                style={{ gridTemplateColumns: ARCHIVED_COL_TEMPLATE, borderTop: idx > 0 ? '0.5px solid #222' : 'none' }}
              >
                <ProspectAvatar name={item.name} />

                <button onClick={() => openEdit(item)} className="text-left min-w-0 cursor-pointer">
                  <p className="text-sm font-semibold text-white truncate leading-tight">{item.name}</p>
                  {item.club && <p className="text-xs text-[#555] truncate mt-0.5">{item.club}</p>}
                </button>

                <div>
                  {item.archived_prev_status
                    ? <Badge type="prospect" value={item.archived_prev_status} />
                    : <span className="text-xs text-[#333]">—</span>
                  }
                </div>

                <div className="text-xs text-[#555]">
                  {item.archived_at ? formatMsgDate(item.archived_at) : <span className="text-[#333]">—</span>}
                </div>

                <div>
                  <button
                    onClick={() => handleUnarchive(item)}
                    className="px-2 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer bg-[#111] text-[#555] border border-[#222] hover:border-[#E8410A]/40 hover:text-[#E8410A]"
                  >
                    Desarchivar
                  </button>
                </div>
              </div>
            ))}
          </div>

          <p className="text-xs text-[#444] px-1">
            {archivedItems.length} prospecto{archivedItems.length !== 1 ? 's' : ''} archivado{archivedItems.length !== 1 ? 's' : ''}
          </p>
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal isOpen={modalForm} onClose={() => setModalForm(false)} title={editingId ? 'Editar prospecto' : 'Nuevo prospecto'}>
        <div className="space-y-4">

          <SectionHeader label="Datos del prospecto" />

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

          <div>
            <label className={LBL}>Web / Instagram</label>
            <input type="url" className={INP} value={form.web_link} onChange={e => setForm(f => ({ ...f, web_link: e.target.value }))} placeholder="https://instagram.com/club" />
          </div>

          <SectionHeader label="Seguimiento LinkedIn" />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LBL}>Estado</label>
              <select className={SEL} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                {PROSPECT_COLUMNS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                <option value="archivado">Archivado</option>
              </select>
            </div>
            <div>
              <label className={LBL}>Próximo seguimiento</label>
              <input
                type="date"
                className={INP}
                value={form.followup_date || ''}
                onChange={e => setForm(f => ({ ...f, followup_date: e.target.value }))}
              />
            </div>
          </div>

          {[
            { key: 'msg1_texto', dateKey: 'msg1_fecha', label: 'Mensaje 1' },
            { key: 'msg2_texto', dateKey: 'msg2_fecha', label: 'Mensaje 2' },
            { key: 'msg3_texto', dateKey: 'msg3_fecha', label: 'Mensaje 3' },
          ].map(({ key, dateKey, label }) => (
            <div key={key} className="rounded-xl border border-[#222] bg-[#111] p-3 space-y-2">
              <p className="text-[10px] font-semibold text-[#555] uppercase tracking-wider">{label}</p>
              <div>
                <label className={LBL}>Texto del mensaje</label>
                <textarea
                  className={`${INP} resize-none`}
                  rows={3}
                  value={form[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  placeholder={`Escribe aquí el ${label.toLowerCase()}...`}
                />
              </div>
              <div>
                <label className={LBL}>Fecha de envío</label>
                <input
                  type="date"
                  className={INP}
                  value={form[dateKey] || ''}
                  onChange={e => setForm(f => ({ ...f, [dateKey]: e.target.value }))}
                />
              </div>
            </div>
          ))}

          <SectionHeader label="Notas generales" />

          <div>
            <textarea
              className={`${INP} resize-none`}
              rows={4}
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Links, observaciones, contexto extra..."
            />
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

          {editingId && form.status === 'cerrado' && (
            <div className="pt-2 border-t border-[#222]">
              <button
                onClick={() => {
                  const prospect = items.find(i => i.id === editingId)
                  setModalForm(false)
                  openConvertir(prospect)
                }}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-[#0f2a1f] border border-[#1D9E75]/30 text-[#1D9E75] text-sm font-semibold hover:bg-[#152e22] hover:border-[#1D9E75]/60 transition-all cursor-pointer"
              >
                <UserCheck size={15} />
                Convertir a cliente
              </button>
            </div>
          )}
        </div>
      </Modal>

      {/* Modal: Convertir a cliente */}
      <Modal isOpen={!!modalConvertir} onClose={() => { if (!converting) setModalConvertir(null) }} title="Convertir a cliente">
        {modalConvertir && (
          <div className="space-y-4">
            {convertSuccess ? (
              <div className="py-8 flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-full bg-[#0f2a1f] border border-[#1D9E75]/30 flex items-center justify-center">
                  <UserCheck size={26} className="text-[#1D9E75]" />
                </div>
                <p className="text-base font-semibold text-white">¡Cliente creado!</p>
                <p className="text-sm text-[#555] text-center">
                  {modalConvertir.name} ya está en el kanban de clientes en estado <span className="text-[#3B82F6]">Brief</span>.
                </p>
              </div>
            ) : (
              <>
                <div className="bg-[#111] border border-[#222] rounded-xl p-3 space-y-1">
                  <p className="text-sm font-semibold text-white">{modalConvertir.name}</p>
                  {modalConvertir.club && <p className="text-xs text-[#555]">{modalConvertir.club}</p>}
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
                    {modalConvertir.email && <p className="text-xs text-[#444]">{modalConvertir.email}</p>}
                    {modalConvertir.phone && <p className="text-xs text-[#444]">{modalConvertir.phone}</p>}
                  </div>
                </div>

                <div>
                  <label className={LBL}>Pack *</label>
                  <select
                    className={SEL}
                    value={convertForm.pack}
                    onChange={e => setConvertForm(f => ({ ...f, pack: e.target.value, custom_price: '' }))}
                  >
                    {PACKS.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.id === 'otro' ? 'Otro — precio personalizado' : `${p.label} — $${p.price}/mes`}
                      </option>
                    ))}
                  </select>
                </div>

                {convertForm.pack === 'otro' && (
                  <div>
                    <label className={LBL}>Precio mensual ($)</label>
                    <input
                      type="number" min="0"
                      className={INP}
                      value={convertForm.custom_price}
                      onChange={e => setConvertForm(f => ({ ...f, custom_price: e.target.value }))}
                      placeholder="Ej. 1500"
                    />
                  </div>
                )}

                <div>
                  <label className={LBL}>Fecha de inicio</label>
                  <input
                    type="date"
                    className={INP}
                    value={convertForm.start_date}
                    onChange={e => setConvertForm(f => ({ ...f, start_date: e.target.value }))}
                  />
                </div>

                {convertError && (
                  <div className="px-3 py-2.5 rounded-xl bg-red-950/50 border border-red-800/50 text-xs text-red-400">
                    {convertError}
                  </div>
                )}

                <div className="flex gap-3 pt-1">
                  <button
                    onClick={() => setModalConvertir(null)}
                    disabled={converting}
                    className="flex-1 py-2.5 rounded-xl border border-[#2a2a2a] text-sm font-medium text-[#666] hover:bg-[#1a1a1a] hover:text-white transition-colors cursor-pointer disabled:opacity-40"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleConvert}
                    disabled={converting || (convertForm.pack === 'otro' && !convertForm.custom_price)}
                    className="flex-1 py-2.5 rounded-xl bg-[#1D9E75] hover:bg-[#178a65] text-white text-sm font-semibold transition-colors disabled:opacity-40 cursor-pointer"
                  >
                    {converting ? 'Creando...' : 'Confirmar y crear cliente'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
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
