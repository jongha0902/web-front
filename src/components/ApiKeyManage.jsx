import React, { useEffect, useState } from 'react';
import api from '../utils/axios.js';
import { useError } from '../utils/ErrorContext.jsx';
import { useMessage } from '../utils/MessageContext.jsx';
import { isEmpty } from '../utils/common.js';
import UserSearchModal from './UserSearchModal.jsx';
import { useAuth } from '../store/Auth';

export default function ApiKey() {
  const { refreshUser } = useAuth();
  const [keyList, setKeyList] = useState([]);
  const [page, setPage] = useState(1);
  const [perPage] = useState(15);
  const [totalCount, setTotalCount] = useState(0);
  const totalPage = Math.max(1, Math.ceil(totalCount / perPage));
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchField, setSearchField] = useState('user_id');

  const [userModalOpen, setUserModalOpen] = useState(false);
  const [modalAction, setModalAction] = useState('');
  const [modalUserId, setModalUserId] = useState('');
  const [modalUserComment, setModalComment] = useState('');
  const [regenerateKey, setRegenerateKey] = useState('');
  const [generateKey, setGenerateKey] = useState('');

  const [modalType, setModalType] = useState('');
  const { showError } = useError();
  const { showMessage } = useMessage();

  useEffect(() => {
    fetchKeyList();
  }, [page, perPage]);

  const fetchKeyList = async () => {
    try {
      const params = { page, per_page: perPage };
      if (searchKeyword) params[searchField] = searchKeyword;
      const res = await api.get('/apim/api-key', { params });
      setKeyList(res.data.items);
      setTotalCount(res.data.total_count);
    } catch (e) {
      const message = e.response?.data?.message || e.message || '오류';
      const detail = e.response?.data?.detail ? ` (${e.response.data.detail})` : '';
      showError(`❌ ${message}${detail}`);
    }
  };

  const handleSearch = () => {
    if (page !== 1) {
      setPage(1);
    } else {
      fetchKeyList(); // 현재 페이지가 1이면 직접 호출
    }
  };
  
  const generateApiKey = async () => {
    try {
      if (isEmpty(modalUserId)) {
        showMessage("유저ID는 필수입니다."); 
        return;
      }

      const res = await api.post('/apim/api-key', {
        user_id: modalUserId,
        comment: modalUserComment
      });

      setGenerateKey(res.data.api_key);  
      setModalType('');
      setModalAction('done');
      showError('');
      fetchKeyList();
      refreshUser();

    } catch (e) {
      const message = e.response?.data?.message || e.message || '오류';
      const detail = e.response?.data?.detail ? ` (${e.response.data.detail})` : '';
      showError(`❌ ${message}${detail}`);
    }
  };

  const handleRegenerate = async () => {
    try {
      if (isEmpty(modalUserId)) {
        showMessage("유저ID는 필수입니다."); 
        return;
      }

      const res = await api.put(`/apim/api-key/${modalUserId}/regenerate`);
      
      setModalAction('done');
      setRegenerateKey(res.data.new_api_key);
      fetchKeyList();
    } catch (e) {
      const message = e.response?.data?.message || e.message || '오류';
      const detail = e.response?.data?.detail ? ` (${e.response.data.detail})` : '';
      showError(`❌ ${message}${detail}`);
    }
  };

  const handleDelete = async () => {
    try {
      if (isEmpty(modalUserId)) {
        showMessage("유저ID는 필수입니다."); 
        return;
      }

      const res = await api.delete(`/apim/api-key/${modalUserId}`);

      showMessage(res.data.message || '삭제 완료');
      setModalAction('');
      setRegenerateKey('');
      fetchKeyList();
      refreshUser();
    } catch (e) {
      const message = e.response?.data?.message || e.message || '오류';
      const detail = e.response?.data?.detail ? ` (${e.response.data.detail})` : '';
      showError(`❌ ${message}${detail}`);
    }
  };

  const updateApiKeyInfo = async () => {
    try {
      if (isEmpty(modalUserId)) {
        showMessage("유저ID는 필수입니다."); 
        return;
      }

      const res = await api.put(`/apim/api-key/${modalUserId}`, {
        comment: modalUserComment,
      });

      if(res.status === 200){
        setModalType('');
        setModalAction('done-edit');
        fetchKeyList();
      }
      
    } catch (e) {
      const message = e.response?.data?.message || e.message || '오류';
      const detail = e.response?.data?.detail ? ` (${e.response.data.detail})` : '';
      showError(`❌ ${message}${detail}`);
    }
  };

  const resetGenerateModal = () => {
    setModalUserId('');
    setModalComment('');
    setGenerateKey('');
    setRegenerateKey('');
    setModalAction('');
    setModalType('');
    showError('');
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    showMessage('클립보드에 복사되었습니다.');
  };

  return (
    <div className="flex flex-col flex-1 h-full min-h-0">
      <h2 className="text-xl font-bold mb-2">🔑 API Key 관리</h2>

      <div className="flex justify-between items-center gap-4 mb-4 mt-2 text-sm p-3 bg-white shadow rounded">
        <div className="flex items-center gap-4">
          <label htmlFor="userIdSearch" className="w-20 text-center font-semibold text-gray-700">유저ID</label>
          <input
            value={searchKeyword}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            onChange={e => setSearchKeyword(e.target.value)}
            placeholder="검색어 입력"
            className="border rounded px-3 py-2 w-64 bg-blue-50"
          />
        </div>
        <button
          onClick={handleSearch}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
        >
          검색
        </button>
      </div>


      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-semibold">📋 목록</h3>
        <button
          onClick={() => {
            setModalType('generate');
            setModalUserId('');
            setModalComment('');
          }}
          className="bg-blue-600 text-white px-4 py-1 rounded text-sm"
        >
          신규 발급
        </button>
      </div>

      <div className="flex flex-col grow min-h-0 bg-white shadow rounded p-3">
        <div className="flex justify-end items-center gap-2 mb-2 text-sm">
          <label htmlFor="perPageSelect">표시 수:</label>
          <select id="perPageSelect" value={perPage} onChange={e => { setPerPage(Number(e.target.value)); setPage(1); }} className="border px-2 py-1 rounded">
            <option value={10}>10</option>
            <option value={15}>15</option>
            <option value={20}>20</option>
          </select>
        </div>

        {/* ✅ 테이블 틀 + 헤더는 고정, tbody만 스크롤 */}
        <div className="flex-1 overflow-y-auto border-t">
          <table className="w-full text-sm border text-center table-fixed">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="border px-3 py-2 w-[5%]">#</th>
                <th className="border px-3 py-2 w-[8%]">ID</th>
                <th className="border px-3 py-2 w-[8%]">이름</th>
                <th className="border px-3 py-2 w-[20%]">API Key</th>
                <th className="border px-3 py-2 w-[15%]">비고</th>
                <th className="border px-3 py-2 w-[13%]">생성일</th>
                <th className="border px-3 py-2 w-[10%]">생성자</th>
                <th className="border px-3 py-2 w-[13%]">재발급< br/>/수정일</th>
                <th className="border px-3 py-2 w-[10%]">재발급< br/>/수정자</th>
                <th className="border px-3 py-2 w-[15%]">관리</th>
              </tr>
            </thead>
            <tbody>
              {keyList.length > 0 ? keyList.map((key, i) => (
                <tr key={key.user_id} className="hover:bg-gray-100">
                  <td className="border px-3 py-1">{totalCount - ((page - 1) * perPage + i)}</td>
                  <td className="border px-3 py-1 font-mono">{key.user_id}</td>
                  <td className="border px-3 py-1 font-mono">{key.user_name}</td>
                  <td className="border px-3 py-1 font-mono text-xs break-all truncate" title={key.api_key}>{key.api_key}</td>
                  <td className="border px-3 py-1 truncate text-left" title={key.comment}>{key.comment}</td>
                  <td className="border px-3 py-1">{key.generate_date}</td>
                  <td className="border px-3 py-1">{key.generate_id}</td>
                  <td className="border px-3 py-1">{key.regenerate_date}</td>
                  <td className="border px-3 py-1">{key.regenerate_id}</td>
                  <td className="border px-3 py-1">
                    <button onClick={() => { setModalAction('regenerate'); setModalUserId(key.user_id); setModalComment(key.comment); }} className="bg-yellow-500 hover:bg-yellow-600 text-white px-2 py-1 rounded text-xs">재발급</button>
                    <button onClick={() => { setModalType('edit'); setModalUserId(key.user_id); setModalComment(key.comment); }} className="bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded text-xs ml-1">수정</button>
                    <button onClick={() => { setModalAction('revoke'); setModalUserId(key.user_id); setModalComment(key.comment); }} className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs ml-1">삭제</button>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan="10" className="text-gray-500 py-6 text-center">등록된 API Key가 없습니다.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ✅ 페이지 버튼 아래 고정 */}
        <div className="flex justify-center items-center gap-2 pt-3.5 border-t text-sm">
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
      
      {(modalType === 'generate' || modalType === 'edit' || modalAction === 'regenerate' || modalAction === 'revoke') && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white rounded shadow-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-gray-800 border-b pb-2 mb-4">
              {{
                generate: '🆕 신규 API Key 발급',
                edit: '📝 API Key 정보 수정',
                regenerate: '🔁 API Key 재발급 확인',
                revoke: '🗑️ API Key 삭제 확인'
              }[modalType || modalAction]}
            </h3>

            {/* 입력 or 확인용 필드 */}
            <div className="space-y-3 mb-4 text-sm">
              <div className="flex items-center gap-2">
                <label className="w-20 text-sm font-medium text-gray-700">ID</label>
                <input
                  value={modalUserId}
                  readOnly
                  className="flex-1 border px-3 py-2 rounded bg-gray-100 text-gray-600 cursor-not-allowed font-mono"
                />
                {!(modalType === 'edit' || modalAction) && (
                  <button
                    onClick={() => setUserModalOpen(true)}
                    className="px-3 py-2 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded"
                  >
                    검색
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <label className="w-20 text-sm font-medium text-gray-700">비고</label>
                {(modalType === 'generate' || modalType === 'edit') && !modalAction ? (
                  <textarea
                    value={modalUserComment ?? ''}
                    onChange={e => setModalComment(e.target.value)}
                    className="border flex-1 px-3 py-2 rounded h-[150px]"
                  />
                ) : (
                  <textarea
                    value={modalUserComment ?? ''}
                    readOnly
                    className="border flex-1 px-3 py-2 rounded bg-gray-100 text-gray-600 cursor-not-allowed h-[150px]"
                  />
                )}
              </div>
            </div>

            {/* 삭제/재발급 확인 문구 */}
            {(modalAction === 'regenerate' || modalAction === 'revoke') && (
              <p className="text-sm text-gray-700 mb-4">
                API Key를 {modalAction === 'regenerate' ? '재발급' : '삭제'}하시겠습니까?
              </p>
            )}

            <div className="flex justify-end gap-2 mt-4">
              {modalType === 'generate' && (
                <>
                  <button onClick={generateApiKey} className="bg-green-600 text-white px-4 py-2 rounded">발급</button>
                  <button onClick={resetGenerateModal} className="bg-gray-300 text-gray-800 px-4 py-2 rounded">취소</button>
                </>
              )}
              {modalType === 'edit' && (
                <>
                  <button onClick={updateApiKeyInfo} className="bg-green-600 text-white px-4 py-2 rounded">수정</button>
                  <button onClick={resetGenerateModal} className="bg-gray-300 text-gray-800 px-4 py-2 rounded">취소</button>
                </>
              )}
              {modalAction === 'regenerate' && (
                <>
                  <button onClick={handleRegenerate} className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded">재발급</button>
                  <button onClick={() => setModalAction('')} className="bg-gray-300 text-gray-800 px-4 py-2 rounded">취소</button>
                </>
              )}
              {modalAction === 'revoke' && (
                <>
                  <button onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded">삭제</button>
                  <button onClick={() => setModalAction('')} className="bg-gray-300 text-gray-800 px-4 py-2 rounded">취소</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 등록된 유저 검색 모달 */}
      <UserSearchModal
        isOpen={userModalOpen}
        onClose={() => setUserModalOpen(false)}
        onSelect={(user) => {
          setModalUserId(user.user_id);
          setUserModalOpen(false);
        }}
      />  


      {(modalAction === 'done' || modalAction === 'done-edit' || (modalType === 'generate' && generateKey)) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white rounded shadow-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-gray-800 border-b pb-2 mb-4">
              {{
                done: regenerateKey ? '🔁 API Key 재발급 완료' : '🗑️ API Key 삭제 완료',
                'done-edit': '📝 API Key 정보 수정 완료',
              }[modalAction] || '🆕 신규 API Key 발급 완료'}
            </h3>

            {/* ID + 비고 표시 */}
            <div className="space-y-3 mb-4 text-sm">
              <div className="flex items-center">
                <label className="w-24 text-sm font-medium text-gray-700">ID</label>
                <input
                  value={modalUserId}
                  readOnly
                  className="flex-1 border px-3 py-2 rounded bg-gray-100 text-gray-600 font-mono"
                />
              </div>
              <div className="flex items-center">
                <label className="w-24 text-sm font-medium text-gray-700">비고</label>
                <textarea
                  value={modalUserComment ?? ''}
                  readOnly
                  className="flex-1 border px-3 py-2 rounded bg-gray-100 text-gray-600 h-[150px]"
                />
              </div>
            </div>

            {/* API Key 표시 */}
            {(generateKey || regenerateKey) && (
              <>
                <p className="text-sm text-gray-700 mb-1">새 API Key:</p>
                <div className="bg-gray-100 p-2 rounded text-xs font-mono break-all flex justify-between items-center">
                  <span>{generateKey || regenerateKey}</span>
                  <button onClick={() => copyToClipboard(generateKey || regenerateKey)} className="text-blue-600 text-sm ml-2">복사</button>
                </div>
              </>
            )}

            {/* 완료 메시지 */}
            {modalAction === 'done-edit' && (
              <p className="text-green-600 mt-4">📝 API Key 정보 수정이 완료되었습니다.</p>
            )}
            {modalAction === 'done' && regenerateKey && (
              <p className="text-green-600 mt-4">🔁 API Key 재발급 작업이 완료되었습니다.</p>
            )}

            <div className="flex justify-end mt-4">
              <button
                onClick={() => {
                  setModalAction('');
                  setModalType('');
                  setGenerateKey('');
                  setRegenerateKey('');
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
