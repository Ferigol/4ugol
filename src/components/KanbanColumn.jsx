import React from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Plus } from 'lucide-react'

export default function KanbanColumn({ id, label, color, items = [], children, onAdd, count }) {
  const { isOver, setNodeRef } = useDroppable({ id })

  return (
    <div className="flex flex-col min-w-[230px] max-w-[230px]">
      {/* Column header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
          <span className="text-xs font-semibold text-[#6b6b6b] uppercase tracking-wider">
            {label}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-[#6b6b6b] bg-[#ebebeb] rounded-full px-2 py-0.5">
            {count ?? items.length}
          </span>
          {onAdd && (
            <button
              onClick={onAdd}
              className="p-1 rounded-lg text-[#9b9b9b] hover:text-[#eb5c37] hover:bg-[#eb5c37]/10 transition-colors cursor-pointer"
            >
              <Plus size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={`flex flex-col gap-2 min-h-[80px] rounded-2xl p-2 transition-all duration-150
          ${isOver
            ? 'bg-[#eb5c37]/5 border-2 border-dashed border-[#eb5c37]'
            : 'bg-[#ebebeb]/60 border-2 border-transparent'
          }
        `}
      >
        <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
          {children}
        </SortableContext>

        {items.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-xs text-[#c0c0c0]">Sin tarjetas</p>
          </div>
        )}
      </div>
    </div>
  )
}
