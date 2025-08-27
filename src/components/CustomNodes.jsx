import React, { useState, useRef, useEffect } from 'react';
import { Handle, Position } from 'reactflow';
import SortableList from './SortableList';
import { RefreshCw, MoveDiagonal } from 'lucide-react'

const AllHandles = ({ readOnly }) => (

  <>
    {/* 왼쪽 */}
    <Handle
      id="left"
      type="target"
      position={Position.Left}
      className={`!w-2 !h-2 bg-white border border-gray-300 rounded-full ${
        readOnly ? 'opacity-0 pointer-events-none' : ''
      }`}
      style={{ left: -6, top: '50%', transform: 'translateY(-50%)' }}
    />

    {/* 오른쪽 */}
    <Handle
      id="right"
      type="source"
      position={Position.Right}
      className={`!w-2 !h-2 bg-white border border-gray-300 rounded-full ${
        readOnly ? 'opacity-0 pointer-events-none' : ''
      }`}
      style={{ right: -6, top: '50%', transform: 'translateY(-50%)' }}
    />

    {/* 위쪽 */}
    <Handle
      id="top"
      type="target"
      position={Position.Top}
      className={`!w-2 !h-2 bg-white border border-gray-300 rounded-full ${
        readOnly ? 'opacity-0 pointer-events-none' : ''
      }`}
      style={{ top: -6, left: '50%', transform: 'translateX(-50%)' }}
    />

    {/* 아래쪽 */}
    <Handle
      id="bottom"
      type="source"
      position={Position.Bottom}
      className={`!w-2 !h-2 bg-white border border-gray-300 rounded-full ${
        readOnly ? 'opacity-0 pointer-events-none' : ''
      }`}
      style={{ bottom: -6, left: '50%', transform: 'translateX(-50%)' }}
    />
  </>
);


const EditableLabel = ({ data, onChange }) => {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(data.label);
  const inputRef = useRef(null);

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus();
  }, [editing]);

  if (data.readOnly) return <div className="text-xs text-center text-gray-700">{text}</div>;

  return editing ? (
    <input
      ref={inputRef}
      value={text}
      onBlur={() => {
        setEditing(false);
        onChange(text);
      }}
      onChange={(e) => setText(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          setEditing(false);
          onChange(text);
        }
      }}
      className="border border-gray-300 rounded px-2 py-1 text-xs text-center shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
    />
  ) : (
    <div onDoubleClick={() => setEditing(true)} className="text-xs text-gray-800 px-2 py-1 cursor-text text-center">
      {text}
    </div>
  );
};

export const EdgeColorModal = ({ edge, onClose, onSave }) => {
  const [color, setColor] = useState(edge?.style?.stroke || '#999999');

  return (
    <div className="fixed top-[72px] right-[122px] z-50 bg-white p-4 rounded shadow-lg border border-gray-200 w-64">
      <h2 className="text-lg font-semibold mb-4">엣지 색상 선택</h2>

      {/* 색상 선택 영역 */}
      <div className="flex items-center gap-3 w-full mb-5">
        <label className="text-sm font-medium text-gray-700 whitespace-nowrap">색상</label>
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="h-7 flex-grow border border-gray-300 rounded"
        />
        <button
          onClick={() => setColor('#999999')}
          className="p-2 bg-gray-100 hover:bg-gray-200 rounded"
        >
          <RefreshCw size={16} strokeWidth={2} />
        </button>
      </div>

      {/* 하단 버튼 영역 */}
      <div className="border-t border-gray-200 pt-3 flex justify-end gap-2">
        <button
          onClick={() => onSave(color)}
          className="px-4 py-1.5 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
        >
          확인
        </button>
        <button
          onClick={onClose}
          className="px-4 py-1.5 bg-gray-300 rounded hover:bg-gray-400 text-sm"
        >
          취소
        </button>
      </div>
    </div>

  );
};

export const SquareNode = ({ data, id, selected }) => (
  <div className={`w-40 h-20 bg-white ${selected ? 'border-pink-600 ring-2 ring-pink-300 shadow-lg' : 'border-gray-300 shadow'} border rounded-xl transition-shadow duration-300 flex items-center justify-center relative hover:border-gray-500`}>
    <EditableLabel data={data} onChange={(val) => data.setLabel(id, val)} />
    <AllHandles readOnly={data.readOnly} />
  </div>
);

export const ConditionNode = ({ data, id, selected }) => (
  <div className="w-32 h-32 relative">
    <div className={`w-full h-full bg-yellow-50 ${selected ? 'border-pink-600 ring-2 ring-pink-300 shadow-lg' : 'border-yellow-400 shadow'} border rounded-md transform rotate-45 flex items-center justify-center transition-shadow duration-300 hover:border-yellow-500`}>
      <div className="transform -rotate-45 text-yellow-800 font-semibold">
        <EditableLabel data={data} onChange={(val) => data.setLabel(id, val)} />
      </div>
    </div>
    <AllHandles readOnly={data.readOnly} />
  </div>
);

export const CircleNode = ({ data, id, selected }) => (
  <div className={`w-20 h-20 rounded-full bg-white ${selected ? 'border-2 border-pink-600 ring-2 ring-pink-200 shadow-lg' : 'border-2 border-blue-300 shadow'} transition-shadow duration-300 flex items-center justify-center relative hover:border-blue-500`}>
    <EditableLabel data={data} onChange={(val) => data.setLabel(id, val)} />
    <AllHandles readOnly={data.readOnly} />
  </div>
);

export const TableNode = ({ data, id, selected }) => {
  const initialColumns = data.columns && data.columns.length > 0 ? data.columns : [{ name: '컬럼명', type: '타입' }];
  const [columns, setColumns] = useState(initialColumns);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState('');

  const readOnly = data.readOnly;

  const updateColumns = (cols) => {
    setColumns(cols);
    if (data.setColumns) data.setColumns(id, cols);
  };

  const confirmEdit = () => {
    if (editingIndex === null) return;
    const updated = [...columns];
    updated[editingIndex] = {
      name: editName.trim() || updated[editingIndex].name,
      type: editType.trim() || updated[editingIndex].type,
    };
    updateColumns(updated);
    setEditingIndex(null);
  };

  const addColumn = () => {
    if (editingIndex !== null) confirmEdit();
    const newCols = [...columns, { name: '컬럼명', type: '타입' }];
    updateColumns(newCols);
    setEditingIndex(newCols.length - 1);
    setEditName('');
    setEditType('');
  };

  const deleteColumn = (index) => {
    if (editingIndex === index) setEditingIndex(null);
    const newCols = columns.filter((_, i) => i !== index);
    updateColumns(newCols);
  };

  const startEditing = (index) => {
    if (readOnly) return;
    setEditingIndex(index);
    setEditName(columns[index].name);
    setEditType(columns[index].type);
  };

  return (
    <div className={`w-64 bg-white ${selected ? 'border-pink-600 ring-2 ring-pink-300 shadow-lg' : 'border-gray-300 shadow'} border rounded-xl transition-shadow duration-300 text-sm relative hover:border-gray-500`}>
      <div className="font-semibold text-center py-2 bg-gray-100 border-b text-gray-800 rounded-t-xl">
        <EditableLabel data={data} onChange={(val) => data.setLabel(id, val)} />
      </div>

      <SortableList list={columns} setList={updateColumns} disabled={readOnly}>
        {columns.map((col, i) => (
          <li key={`${col.name}-${i}`} className="nodrag px-2 py-1 flex items-center gap-1 w-full">
            <span className="drag-handle nodrag cursor-move text-gray-400">☰</span>
            {editingIndex === i && !readOnly ? (
              <>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && confirmEdit()}
                  onBlur={confirmEdit}
                  onMouseDown={(e) => e.stopPropagation()}
                  className="w-[60%] border rounded px-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
                <input
                  value={editType}
                  onChange={(e) => setEditType(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && confirmEdit()}
                  onBlur={confirmEdit}
                  onMouseDown={(e) => e.stopPropagation()}
                  className="w-[40%] border rounded px-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
              </>
            ) : (
              <>
                <span
                  onDoubleClick={() => startEditing(i)}
                  onMouseDown={(e) => e.stopPropagation()}
                  className="w-[60%] cursor-text truncate hover:text-blue-600"
                >
                  {col.name}
                </span>
                <span
                  onDoubleClick={() => startEditing(i)}
                  onMouseDown={(e) => e.stopPropagation()}
                  className="w-[40%] text-gray-500 cursor-text truncate"
                >
                  {col.type}
                </span>
              </>
            )}
            {!readOnly && (
              <button
                onClick={() => deleteColumn(i)}
                onMouseDown={(e) => e.stopPropagation()}
                className="ml-1 text-red-400 hover:text-red-600 text-xs"
              >
                ✕
              </button>
            )}
          </li>
        ))}
      </SortableList>

      {!readOnly && (
        <button
          onClick={addColumn}
          onMouseDown={(e) => e.stopPropagation()}
          className="w-full text-blue-500 hover:text-blue-700 text-xs py-1 border-t bg-gray-50 rounded-b-xl"
        >
          ＋ 컬럼 추가
        </button>
      )}
      <AllHandles readOnly={data.readOnly} />
    </div>
  );
  
};

export const CustomGroup = ({ id, selected, data, setNodes }) => {
  const width = data?.width || 320;
  const height = data?.height || 200;
  const isResizingRef = useRef(false);

  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(data.label || '그룹 타이틀명');
  const inputRef = useRef(null);

  const readOnly = data.readOnly;

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus();
  }, [editing]);

  const handleResize = (e) => {
    if (isResizingRef.current) return;
    isResizingRef.current = true;

    const startX = e.clientX;
    const startY = e.clientY;
    const initialWidth = width;
    const initialHeight = height;

    const onPointerMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;

      const newWidth = Math.max(150, initialWidth + deltaX);
      const newHeight = Math.max(100, initialHeight + deltaY);

      setNodes((nds) =>
        nds.map((node) =>
          node.id === id
            ? {
                ...node,
                data: {
                  ...node.data,
                  width: newWidth,
                  height: newHeight,
                },
                style: {
                  ...node.style,
                  width: newWidth,
                  height: newHeight,
                },
              }
            : node
        )
      );
    };

    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      isResizingRef.current = false;
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  return (
    <div
      className={`bg-purple-200/30 absolute rounded-md ${selected ? 'ring-2 ring-blue-500' : ''}`}
      style={{
        width,
        height,
        zIndex: 0,
        pointerEvents: 'none',
      }}
    >
      {/* 타이틀 (더블클릭 편집 가능) */}
      <div
        className="absolute top-0 left-0 w-full h-10 bg-purple-300 text-lg text-white font-extrabold uppercase cursor-move z-[10] flex items-center justify-center shadow-md border-b border-white/30 rounded-t-md"
        style={{ pointerEvents: 'auto' }}
        data-drag-handle
        onDoubleClick={(e) => {
          e.stopPropagation();
          setEditing(true);
        }}
      >
        {editing && !readOnly ? (
          <input
            ref={inputRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => {
              setEditing(false);
              data.setLabel(id, title);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setEditing(false);
                data.setLabel(id, title);
              }
            }}
            className="text-black text-sm rounded px-2 py-1 w-[90%] text-center shadow focus:outline-none"
            onPointerDown={(e) => e.stopPropagation()} // input 포커스 보호
          />
        ) : (
          title
        )}
      </div>

      {/* 리사이즈 핸들 */}
      {!readOnly && (
        <div
          onPointerDownCapture={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleResize(e);
          }}
          className="absolute bottom-0 right-0 w-7 h-7 bg-white rounded-md shadow flex items-center justify-center cursor-nwse-resize z-[9999]"
          style={{ pointerEvents: 'auto' }}
          title="크기 조절"
        >
          <MoveDiagonal
            size={16}
            className="text-blue-500 transform rotate-90"
          />
        </div>
      )}
    </div>
  );
};


