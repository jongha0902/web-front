import React from 'react';
import { useMessage } from './MessageContext';

export default function MessageModal() {
  const { message, hideMessage } = useMessage();

  if (!message) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex justify-center items-center">
       <div className="bg-white rounded shadow-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-bold text-black-600 mb-4">메시지</h3>
        <p className="text-sm text-gray-800 whitespace-pre-line">{message}</p>
        <div className="flex justify-end mt-4">
          <button onClick={hideMessage} className="bg-blue-600 text-white px-4 py-2 rounded">확인</button>
        </div>
      </div>
    </div>
  );
}
