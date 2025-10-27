import React from 'react';
import { useMessage } from './MessageContext';

export default function MessageModal() {
  const { message, hideMessage } = useMessage();

  if (!message) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex justify-center items-center">
      <div className="bg-white rounded shadow-lg w-full max-w-md overflow-hidden">
        
        {/* 헤더 */}
        <div className="px-6 py-3 border-b">
          <h3 className="text-lg font-bold">📢 알림</h3>
        </div>
  
        {/* 본문 */}
        <div className="px-6 py-4">
          <p className="text-sm text-gray-800 whitespace-pre-line">{message}</p>
        </div>
  
        {/* 푸터 */}
        <div className="px-4 py-2 border-t flex justify-end">
          <button
            onClick={hideMessage}
            className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
          >
            닫기
          </button>
        </div>
  
      </div>
    </div>
  );
}
