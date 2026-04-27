import React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Pencil, X } from 'lucide-react'

export default function KanbanCard({ id, children, onEdit, onDelete }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
    zIndex: isDragging ? 999 : undefined,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative bg-[#111111] rounded-2xl border border-[#222] card-hover cursor-default select-none overflow-hidden
        ${isDragging ? 'shadow-2xl rotate-1 border-[#E8410A]/40' : ''}
      `}
    >
      {/* Top action bar */}
      <div className="flex items-center justify-between px-3 pt-2.5 pb-0 h-8">
        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {onEdit && (
            <button
              onClick={onEdit}
              className="p-1 rounded-md text-[#444] hover:text-[#E8410A] hover:bg-[#E8410A]/10 transition-colors cursor-pointer"
            >
              <Pencil size={12} />
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              className="p-1 rounded-md text-[#444] hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
            >
              <X size={12} />
            </button>
          )}
        </div>
        <div
          {...attributes}
          {...listeners}
          className="p-1 rounded-md text-[#333] hover:text-[#555] cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <GripVertical size={13} />
        </div>
      </div>

      {/* Content */}
      <div className="px-3 pb-2 pt-1">{children}</div>

      {/* Orange accent line at bottom */}
      <div className="h-[2px] bg-gradient-to-r from-[#E8410A] to-[#FF5A1F] opacity-60" />
    </div>
  )
}
