import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';

function ApiListDropdown({ apiList = [], selectedApi, onChange, type }) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (api) => {
    onChange(api);
    setOpen(false);
  };

  const getSelectedText = () => {
    if (selectedApi?.method) {
      return `${selectedApi.method} | ${selectedApi.name}`;
    }
    return type === 'ALL' ? '전체' : '선택';
  };

  return (
    <div className="relative w-full z-50" ref={dropdownRef}>
      <div
        className="flex items-start justify-between border rounded px-3 py-2 bg-blue-50 cursor-pointer min-h-[38px] w-full"
        onClick={() => setOpen(!open)}
        title={getSelectedText()}
      >
      <div className="font-mono text-sm break-words whitespace-pre-wrap w-full pr-2 leading-snug">
        {getSelectedText()}
      </div>
      <ChevronDown size={16} className="shrink-0 mt-1" />
    </div>

      {open && (
        <ul
          className="absolute left-0 z-10 max-h-64 overflow-y-auto bg-white border rounded shadow text-sm"
          style={{
            minWidth: '362px',         
            whiteSpace: 'nowrap'        // 📌 한 줄로만 표시
          }}
        >
          <li
            className="px-3 py-2 hover:bg-blue-100 cursor-pointer font-mono"
            onClick={() => handleSelect(null)}
            title={type === 'ALL' ? '전체' : '선택'}
          >
            {type === 'ALL' ? '전체' : '선택'}
          </li>
          {apiList.map((api, idx) => (
            <li
              key={idx}
              className="px-3 py-1.5 hover:bg-blue-100 cursor-pointer font-mono"
              onClick={() => handleSelect(api)}
              title={api.label}
            >
              <div className="text-gray-700">{api.label}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default ApiListDropdown;
