import React from 'react';
import { useError } from './ErrorContext';

export default function ErrorModal() {
  const { errorMessage, hideError } = useError();

  if (!errorMessage) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex justify-center items-center">
       <div className="bg-white rounded shadow-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-bold text-red-600 mb-4">오류 발생</h3>
        <p className="text-sm text-gray-800">{errorMessage}</p>
        <div className="flex justify-end mt-4">
          <button onClick={hideError} className="bg-red-600 text-white px-4 py-2 rounded">닫기</button>
        </div>
      </div>
    </div>
  );
}
