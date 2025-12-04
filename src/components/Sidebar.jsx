import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Lock } from 'lucide-react';
import api from '../utils/axios';
import { useError } from '../utils/ErrorContext';
import { useAuth } from '../store/Auth';

export default function Sidebar() {
  const [screens, setScreens] = useState([]);
  const { showError } = useError();
  const { user } = useAuth();

  useEffect(() => {
    const fetchScreens = async () => {
      try {
        const res = await api.get(`/apim/screens-with-permissions/${user.user_id}`);
        setScreens(res.data.items || []);
      } catch (e) {
        const message = e.response?.data?.message || e.message || '오류';
        const detail = e.response?.data?.detail ? ` (${e.response.data.detail})` : '';
        showError(`❌ ${message}${detail}`);
      }
    };

    fetchScreens();
  }, [user]);

  return (
    <aside className="min-w-[240px] bg-white shadow-sm border-r min-h-screen">
      {/* 헤더 */}
      <div className="h-[55px] px-12 font-bold text-l flex items-center gap-2">
        <Lock size={20} />
        전력거래 API
      </div>

      {/* 메뉴 */}
      <nav className="flex flex-col text-sm mt-1">
        {screens.map(screen => (
          <NavLink
            key={screen.screen_code}
            to={screen.screen_path}
            end
            className={({ isActive }) =>
              `px-5 py-3 border-l-4 text-left transition-all ${
                isActive
                  ? 'border-blue-500 text-blue-700 bg-blue-50 font-semibold'
                  : 'border-transparent text-gray-700 hover:bg-gray-100'
              }`
            }
          >
            {screen.screen_name}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
