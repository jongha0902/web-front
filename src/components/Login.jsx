import React, { useState, useEffect } from 'react';
import api from '../utils/axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../store/Auth';
import { useError } from '../utils/ErrorContext';

export default function Login() {
  const { login, logout, isLoggedIn } = useAuth();
  const { showError } = useError();
  const navigate = useNavigate();

  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
  
    try {
      const response = await api.post(
        '/apim/auth/login',
        { user_id: userId, password },
        { withCredentials: true }
      );

      if (response.status === 200 && response.data.user) {
        login(response.data);
        navigate('/', { replace: true });
      } else {
        setError(response.data.message || '로그인 실패');
      }
  
    } catch (e) {
      // ✅ 이미 로그인된 계정 처리
      // if (e.response?.status === 403 && e.response?.data?.message?.code === 'ALREADY_LOGGED_IN') {
      //   const confirm = window.confirm('이미 다른 기기에서 로그인된 계정입니다.\n기존 기기에서 로그아웃하고 다시 로그인하시겠습니까?');
      //   if (confirm) {
      //     try {
      //       const retry = await api.post(
      //         '/apim/auth/login',
      //         { user_id: userId, password, force: true },  // ✅ 강제 로그인
      //         { withCredentials: true }
      //       );
  
      //       if (retry.status === 200 && retry.data.user) {
      //         login(retry.data);
      //         navigate('/', { replace: true });
      //         return;
      //       } else {
      //         setError(retry.data.message || '재로그인 실패');
      //       }
      //     } catch (re) {
      //       setError(re.response?.data?.message || re.response?.data?.detail || '재로그인 오류');
      //       console.error('재로그인 오류:', re);
      //     }
      //     return;
      //   }
      // }
      
      const message = e.response?.data?.message || e.message || '오류';
      const detail = e.response?.data?.detail ? ` (${e.response.data.detail})` : '';
      showError(`❌ ${message}${detail}`);
      setError(message || '로그인 실패');
  
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 bg-cover bg-center"
      style={{
        backgroundImage: `url('/images/login.jpg')`,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        opacity: 0.8
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="bg-black/80 backdrop-blur-sm shadow-2xl rounded-xl px-10 py-10 w-full max-w-[25rem] border-gray-300"
      >
        <h2 className="text-2xl font-bold mb-6 text-center leading-snug text-white">
          전력거래<br />
          <span className="text-white">API Management</span>
        </h2>


        <div className="mb-4">
          <label className="block font-semibold text-white text-sm mb-1">아이디</label>
          <input
            type="text"
            value={userId}
            onChange={e => setUserId(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
            pattern="[a-zA-Z0-9]+"
            title="영문자와 숫자만 입력 가능합니다."
          />
        </div>

        <div className="mb-4">
          <label className="block font-semibold text-white text-sm mb-1">비밀번호</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <p className="text-red-400 text-sm mb-4 text-center h-[20px]">{error}</p>

        <button
          type="submit"
          className="bg-gray-700 hover:bg-gray-800 text-white font-semibold py-2 rounded w-full transition"
        >
          로그인
        </button>
      </form>
    </div>
  );
}
