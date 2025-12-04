import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../store/Auth';
import { User } from 'lucide-react';

export default function Header() {
  const { logout, user, isLoading } = useAuth(); // ✅ useAuth 1번 호출

  const handleLogout = async () => {
    window.location.href = '/login';     // App 완전 언마운트 + 초기화
    await logout();                      // 상태 완전 정리 후
  };

  if (isLoading) return null; // 또는 <SkeletonHeader />

  return (
    <header className="bg-white shadow px-6 py-3 text-xl font-semibold border-b flex items-center justify-end h-[55px]">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <User size={16} className="text-gray-500" />
          <span>{user?.user_name || '사용자'}님</span>
        </div>
        <button
          onClick={handleLogout}
          className="text-sm bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded"
        >
          로그아웃
        </button>
      </div>
    </header>
  );
}
