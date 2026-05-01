import React from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Plus } from 'lucide-react'

export default function KanbanColumn({ id, label, color, items = [], children, onAdd }) {
  const { isOver, setNodeRef } = useDroppable({ id })

  return (
    <div className="h-full flex flex-col min-w-[220px] max-w-[220px]">
      {/* Column header */}
      <div className="flex items-center justify-between mb-2.5 px-1">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full shrink-0 ${color}`} />
          <span className="text-xs font-semibold text-[#888] uppercase tracking-wider">
            {label}
          </span>
          <span className="text-xs font-medium text-[#444] bg-[#1a1a1a] rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
            {items.length}
          </span>
        </div>
        {onAdd && (
          <button
            onClick={onAdd}
            className="p-1 rounded-md text-[#444] hover:text-[#E8410A] hover:bg-[#E8410A]/10 transition-colors cursor-pointer"
          >
            <Plus size={13} />
          </button>
        )}
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={`flex-1 min-h-0 overflow-y-auto kanban-col-body flex flex-col gap-2 rounded-2xl p-2 transition-all duration-150
          ${isOver
            ? 'bg-[#E8410A]/5 border-2 border-dashed border-[#E8410A]/40'
            : 'bg-[#0d0d0d] border-2 border-transparent'
          }
        `}
      >
        <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
          {children}
        </SortableContext>

        {items.length === 0 && (
          <div className="flex-1 flex items-center justify-center py-4">
            <p className="text-[10px] text-[#333]">Sin tarjetas</p>
          </div>
        )}
      </div>
    </div>
  )
}
