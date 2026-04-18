import React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Edit2, Trash2 } from 'lucide-react'

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
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 999 : undefined,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700
        shadow-sm hover:shadow-md card-hover cursor-default select-none
        ${isDragging ? 'shadow-2xl rotate-2' : ''}
      `}
    >
      {/* Top action bar — only visible on hover, no absolute positioning */}
      <div className="flex items-center justify-between px-3 pt-2 pb-0 opacity-0 group-hover:opacity-100 transition-opacity h-7">
        {/* Edit + Delete */}
        <div className="flex gap-0.5">
          {onEdit && (
            <button
              onClick={onEdit}
              className="p-1 rounded text-gray-400 hover:text-green-500 dark:hover:text-green-400 transition-colors cursor-pointer"
            >
              <Edit2 size={13} />
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              className="p-1 rounded text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors cursor-pointer"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>

        {/* Drag handle */}
        <div
          {...attributes}
          {...listeners}
          className="p-1 rounded text-gray-300 hover:text-gray-500 dark:hover:text-gray-300 cursor-grab active:cursor-grabbing"
        >
          <GripVertical size={14} />
        </div>
      </div>

      {/* Card content */}
      <div className="px-3 pb-3 pt-1">{children}</div>
    </div>
  )
}
