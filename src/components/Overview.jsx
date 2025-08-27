import React from 'react';
import api from '../utils/axios';

export default function Overview() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-4">
        {[
          ['총 API 수', 0],
          ['총 발급 키 수', 0],
          ['총 호출 수', 0],
          ['오늘 호출 수', 0],
        ].map(([label, count], i) => (
          <div key={i} className="bg-white p-4 rounded shadow text-center">
            <p className="text-sm text-gray-500">{label}</p>
            <p className="text-2xl font-bold">{count}</p>
          </div>
        ))}
      </div>

      <div className="bg-white p-4 rounded shadow">
        <p className="font-bold mb-2">☑️ 호출 통계 차트</p>
        {/* 차트 들어갈 자리 */}
        <div className="h-48 flex items-center justify-center text-gray-400 min-h-0">[차트 영역]</div>
      </div>
    </div>
  );
}
