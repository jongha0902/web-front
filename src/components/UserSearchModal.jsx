import React, { useState, useEffect } from 'react';
import api from '../utils/axios';
import { useError } from '../utils/ErrorContext';
import { useMessage } from '../utils/MessageContext';
import { X } from 'lucide-react';

const UserSearchModal = ({ isOpen, onClose, onSelect }) => {
  const [users, setUsers] = useState([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchField, setSearchField] = useState('user_id');
  const [page, setPage] = useState(1);
  const [perPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const totalPage = Math.max(1, Math.ceil(totalCount / perPage));
  const { showError } = useError();
  const { showMessage } = useMessage();

  const fetchUserList = async () => {
    try {
      const params = { page, per_page: perPage, use_yn: 'Y' };
      if (searchKeyword) params[searchField] = searchKeyword;
      const res = await api.get('/apim/user', { params });

      setUsers(res.data.items || []);
      setTotalCount(res.data.total_count || 0);
    } catch (e) {
      const message = e.response?.data?.message || e.message || '오류';
      const detail = e.response?.data?.detail ? ` (${e.response.data.detail})` : '';
      showError(`❌ ${message}${detail}`);
    }
  };

  // 1. 모달 열릴 때 상태 초기화
  useEffect(() => {
    if (!isOpen) {
      setSearchKeyword('');
      setSearchField('user_id');
      setUsers([]);
      setTotalCount(0);
      setPage(1);
    }
  }, [isOpen]);
  
  // 2. 검색 조건 변경되면 fetchUserList 실행
  useEffect(() => {
    if (isOpen) {
      fetchUserList();
    }
  }, [page, , isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center p-4"
    >
      <div
        className="p-6 w-full max-w-[500px] bg-white rounded shadow-lg relative flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 상단 닫기 버튼 */}
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-red-500 font-bold text-xl"
            aria-label="닫기"
          >
            <X />
          </button>
        </div>

        {/* 타이틀 */}
        <h2 className="text-lg font-semibold mb-4">👥 유저 검색</h2>

        {/* 검색 영역 */}
        <div className="flex gap-2 mb-4">
          <select
            value={searchField}
            onChange={(e) => setSearchField(e.target.value)}
            className="border px-2 py-2 rounded text-sm"
          >
            <option value="user_id">ID</option>
            <option value="user_name">이름</option>
          </select>

          <input
            type="text"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setPage(1);
                fetchUserList();
              }
            }}
            placeholder="검색어 입력"
            className="flex-1 border px-3 py-2 rounded text-sm"
          />

          <button
            onClick={() => {
              setPage(1);
              fetchUserList();
            }}
            className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm"
          >
            검색
          </button>
        </div>

        {/* 테이블 + 페이지네이션 */}
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* 테이블 영역 */}
          <div className="flex-1 overflow-hidden border rounded">
            <table className="w-full text-sm table-fixed">
              <thead>
                <tr className="bg-gray-100 border-b">
                  <th className="border px-3 py-2 text-center">ID</th>
                  <th className="border px-3 py-2 text-center">이름</th>
                  <th className="border px-3 py-2 text-center">선택</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="text-center py-6 text-gray-500">
                      검색 결과가 없습니다.
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.user_id} className="border-b hover:bg-gray-50">
                      <td className="border px-3 py-2 text-center font-mono">{user.user_id}</td>
                      <td className="border px-3 py-2 text-center">{user.user_name}</td>
                      <td className="border px-3 py-2 text-center">
                        <button
                            onClick={() => {
                            onSelect(user);
                            onClose();
                            }}
                            className="bg-green-500 hover:bg-green-600 text-white text-xs px-3 py-1 rounded shadow-sm transition"
                        >
                            선택
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* 하단 고정 페이지네이션 */}
          <div className="flex justify-center items-center gap-2 py-3 border-t text-sm">
            <button
              disabled={page === 1}
              onClick={() => setPage((prev) => prev - 1)}
              className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded disabled:opacity-50"
            >
              ◀ 이전
            </button>
            <span className="px-2 py-1">
              {page} / {totalPage}
            </span>
            <button
              disabled={page >= totalPage}
              onClick={() => setPage((prev) => prev + 1)}
              className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded disabled:opacity-50"
            >
              다음 ▶
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserSearchModal;
