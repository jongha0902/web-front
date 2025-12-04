import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function NotFound() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      const lastPath = getCookie('last_screen_path') || '/';
      navigate(lastPath);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  const getCookie = (name) => {
    const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
    return match ? decodeURIComponent(match[2]) : null;
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-white text-gray-700">
      <h1 className="text-4xl font-bold mb-4 text-red-600">404 - 페이지를 찾을 수 없습니다</h1>
      <p className="mb-2 text-lg">요청하신 주소는 존재하지 않거나 사용할 수 없습니다.</p>
      <p className="mb-6 text-sm text-gray-500">5초 후 이전 화면으로 자동 이동합니다.</p>
      <button
        onClick={() => {
            const path = getCookie('last_screen_path') || '/';
            navigate(path);
        }}
        className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
        >
        이전 화면으로 돌아가기
      </button>
    </div>
  );
}
