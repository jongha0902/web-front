import React, { useEffect, useRef } from 'react';
import Sortable from 'sortablejs';

const SortableList = ({ list, setList, children, disabled }) => {
  const ref = useRef();

  useEffect(() => {
    const sortable = Sortable.create(ref.current, {
      animation: 150,
      handle: '.drag-handle',
      disabled: disabled,  // ✅ 여기가 핵심입니다!
      onEnd: (evt) => {
        if (disabled) return;  // 이중 방어
        const updated = [...list];
        const [removed] = updated.splice(evt.oldIndex, 1);
        updated.splice(evt.newIndex, 0, removed);
        setList(updated);
      },
    });

    return () => sortable.destroy();
  }, [list, setList, disabled]);  // ✅ disabled도 의존성에 포함

  return (
    <ul ref={ref} className="divide-y text-xs text-gray-700">
      {children}
    </ul>
  );
};

export default SortableList;
