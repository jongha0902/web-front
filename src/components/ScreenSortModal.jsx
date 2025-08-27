import React, { useState } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import api from '../utils/axios';
import { useMessage } from '../utils/MessageContext';
import { useError } from '../utils/ErrorContext';

export default function ScreenSortModal({ screens, onClose, onSave }) {
  const [items, setItems] = useState([...screens]);
  const sensors = useSensors(useSensor(PointerSensor));
  const { showMessage } = useMessage();
  const { showError } = useError();

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      const oldIndex = items.findIndex(i => i.screen_code === active.id);
      const newIndex = items.findIndex(i => i.screen_code === over.id);
      setItems(arrayMove(items, oldIndex, newIndex));
    }
  };

  const handleSave = async () => {
    const payload = items.map((item, i) => ({
      screen_code: item.screen_code,
      menu_order: i + 1
    }));

    try {
      const res = await api.post('/apim/screens/menu-order', { orders: payload });
      showMessage(res.data.message);
      onSave?.();
      onClose();
    } catch (e) {
      const message = e.response?.data?.message || e.message || '오류';
      const detail = e.response?.data?.detail ? ` (${e.response.data.detail})` : '';
      showError(`❌ ${message}${detail}`);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white w-full max-w-md h-[90vh] rounded shadow p-6 flex flex-col">
        <h2 className="text-lg font-bold mb-4">📋 화면 순서 관리</h2>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items.map(i => i.screen_code)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2 overflow-y-auto flex-1 border rounded p-2">
              {items.map(item => (
                <SortableItem
                  key={item.screen_code}
                  id={item.screen_code}
                  name={item.screen_name}
                  items={items}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        <div className="flex justify-end gap-2 mt-4">
          <button onClick={handleSave} className="bg-blue-600 text-white px-4 py-2 rounded">저장</button>
          <button onClick={onClose} className="bg-gray-300 text-gray-800 px-4 py-2 rounded">취소</button>
        </div>
      </div>
    </div>
  );
}

function SortableItem({ id, name, items }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  };

  const index = items.findIndex(item => item.screen_code === id);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="border px-4 py-2 rounded bg-gray-50 hover:bg-gray-100 cursor-move text-sm font-medium shadow-sm flex items-center gap-2"
    >
      <span className="w-6 text-right text-gray-500">{index + 1}.</span>
      <span className="truncate">{name}</span>
    </div>
  );
}
