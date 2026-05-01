import React, { useState } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import KanbanColumn from './KanbanColumn'

export default function KanbanBoard({
  columns,
  items,
  onItemsChange,
  onStatusChange,
  renderCard,
  onAddToColumn,
}) {
  const [activeId, setActiveId] = useState(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  )

  const getColumnItems = (colId) =>
    items.filter((item) => item.status === colId)

  const findContainer = (id) => {
    // id is a column id
    if (columns.some((col) => col.id === id)) return id
    // id is an item id
    const item = items.find((i) => i.id === id)
    return item?.status || null
  }

  const handleDragStart = ({ active }) => {
    setActiveId(active.id)
  }

  const handleDragOver = ({ active, over }) => {
    if (!over) return

    const activeContainer = findContainer(active.id)
    const overContainer = findContainer(over.id)

    if (!activeContainer || !overContainer || activeContainer === overContainer) return

    // Move item to new column (optimistic)
    onStatusChange(active.id, overContainer)
  }

  const handleDragEnd = ({ active, over }) => {
    setActiveId(null)
    if (!over) return

    const activeContainer = findContainer(active.id)
    const overContainer = findContainer(over.id)

    if (!activeContainer || !overContainer) return

    if (activeContainer === overContainer) {
      const colItems = getColumnItems(activeContainer)
      const oldIndex = colItems.findIndex((i) => i.id === active.id)
      const newIndex = colItems.findIndex((i) => i.id === over.id)
      if (oldIndex !== newIndex) {
        const reordered = arrayMove(colItems, oldIndex, newIndex)
        onItemsChange(activeContainer, reordered)
      }
    }
  }

  const activeItem = items.find((i) => i.id === activeId)

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="h-full flex gap-4 overflow-x-scroll kanban-scroll">
        {columns.map((col) => {
          const colItems = getColumnItems(col.id)
          return (
            <KanbanColumn
              key={col.id}
              id={col.id}
              label={col.label}
              color={col.color}
              items={colItems}
              onAdd={onAddToColumn ? () => onAddToColumn(col.id) : undefined}
            >
              {colItems.map((item) => renderCard(item))}
            </KanbanColumn>
          )
        })}
      </div>

      <DragOverlay>
        {activeItem ? (
          <div className="opacity-90 rotate-2 scale-105">
            {renderCard(activeItem, true)}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
