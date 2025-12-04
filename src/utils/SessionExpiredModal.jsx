// src/utils/SessionExpiredModal.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import axios from 'axios';
import api from '../utils/axios';

let isModalOpen = false;

const showSessionExpiredModal = (message = '세션이 만료되었습니다.\n다시 로그인해주세요.') => {
  if (isModalOpen) return;
  isModalOpen = true;

  const modalRoot = document.createElement('div');
  modalRoot.id = 'session-expired-modal';
  document.body.appendChild(modalRoot);

  const Modal = ({ onClose, message }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-2xl shadow-2xl w-96 text-center animate-fade-in overflow-hidden">
        
        {/* 헤더 영역 */}
        <div className="flex items-center justify-start px-6 py-4 border-b">
          <span className="text-yellow-500 text-2xl">📢</span>
          <h2 className="ml-2 text-xl font-bold text-gray-800">알림</h2>
        </div>
  
        {/* 본문 영역 */}
        <div className="px-6 py-2">
          <p className="text-gray-600 text-sm font-bold whitespace-pre-line leading-relaxed">
            {message}
          </p>
        </div>

        <div className="px-4 py-2 border-t flex justify-end">
          <button
            className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
            onClick={async () => {
              try {
                await axios.post('/apim/auth/logout', null, { withCredentials: true });
              } catch (e) {
                console.warn('서버 로그아웃 실패:', e);
              } finally {
                delete api.defaults.headers.common['X-Login-Id'];
                window.location.href = '/login';
                onClose();
              }
            }}
          >
            닫기
          </button>
        </div>

      </div>
    </div>
  );

  const root = ReactDOM.createRoot(modalRoot);
  root.render(
    <Modal
      message={message}
      onClose={() => {
        root.unmount();
        modalRoot.remove();
        isModalOpen = false;
      }}
    />
  );
};

export default showSessionExpiredModal;
