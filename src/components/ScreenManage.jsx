import React, { useEffect, useState } from 'react';
import api from '../utils/axios';
import { useError } from '../utils/ErrorContext';
import { useMessage } from '../utils/MessageContext';
import ScreenSortModal from './ScreenSortModal.jsx';

export default function ScreenManager() {
  const { showError } = useError();
  const { showMessage } = useMessage();

  const [screenList, setScreenList] = useState([]);
  const [screenAllList, setScreenAllList] = useState([]);
  const [searchField, setSearchField] = useState('screen_name');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [modalType, setModalType] = useState('');
  const [editScreen, setEditScreen] = useState({});

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(15);
  const [totalCount, setTotalCount] = useState(0);
  const totalPage = Math.max(1, Math.ceil(totalCount / perPage));

  const fetchScreensMenuOrder = async () => {
    try {
      const res = await api.get('/apim/screens/menu-order', {});
      setScreenAllList(res.data.items || []);
    } catch (e) {
      const message = e.response?.data?.message || e.message || '오류';
      const detail = e.response?.data?.detail ? ` (${e.response.data.detail})` : '';
      showError(`❌ ${message}${detail}`);
      return [];
    }
  };

  const fetchScreens = async () => {
    try {
      const params = { page, per_page: perPage };
      if (searchKeyword) params[searchField] = searchKeyword;
      const res = await api.get('/apim/screens', { params });
      setScreenList(res.data.items || []);
      setTotalCount(res.data.total_count || res.data.items?.length || 0);
    } catch (e) {
      const message = e.response?.data?.message || e.message || '오류';
      const detail = e.response?.data?.detail ? ` (${e.response.data.detail})` : '';
      showError(`❌ ${message}${detail}`);
    }
  };

  useEffect(() => {
    fetchScreensMenuOrder();
  }, []);

  useEffect(() => {
    fetchScreens();
    //fetchScreensMenuOrder();
  }, [page, perPage]);

  const handleSearch = () => {
    if (page !== 1) setPage(1);
    else fetchScreens();
  };

  const handleSave = async () => {
    try {
      if (!editScreen.screen_code) {
        showMessage('⚠️ 화면 코드는 필수입니다.');
        return;
      }
      if (!editScreen.screen_name) {
        showMessage('⚠️ 화면 이름은 필수입니다.');
        return;
      }
      if (!editScreen.screen_path) {
        showMessage('⚠️ 화면 경로는 필수입니다.');
        return;
      }
      if (!editScreen.component_name) {
        showMessage('⚠️ 컴포넌트 이름은 필수입니다.');
        return;
      }
      if (!editScreen.use_yn) {
        showMessage('⚠️ 사용여부는 필수입니다.');
        return;
      }

      let res;
      if (modalType === 'create') {
        res = await api.post('/apim/screens', editScreen);
      } else {
        res = await api.put(`/apim/screens/${editScreen.screen_code}`, editScreen);
      }

      showMessage(res.data.message);
      setModalType('');
      setEditScreen({});
      fetchScreens();
    } catch (e) {
      const message = e.response?.data?.message || e.message || '오류';
      const detail = e.response?.data?.detail ? ` (${e.response.data.detail})` : '';
      showError(`❌ ${message}${detail}`);
    }
  };

  const handleDelete = async () => {
    try {
      const res = await api.delete(`/apim/screens/${editScreen.screen_code}`);
      showMessage(res.data.message);
      setModalType('');
      fetchScreens();
    } catch (e) {
      const message = e.response?.data?.message || e.message || '오류';
      const detail = e.response?.data?.detail ? ` (${e.response.data.detail})` : '';
      showError(`❌ ${message}${detail}`);
    }
  };

  return (
    <div className="flex flex-col flex-1 h-full min-h-0">
      <h2 className="text-xl font-bold mb-2">🖥️ 화면 관리</h2>

      <div className="flex justify-between items-center gap-4 mb-4 mt-2 text-sm p-3 bg-white shadow rounded">
        <div className="flex items-center gap-4">
          <select value={searchField} onChange={e => setSearchField(e.target.value)} className="border rounded px-3 py-2 w-[120px]">
            <option value="screen_name">이름</option>
            <option value="screen_path">경로</option>
          </select>
          <input
            value={searchKeyword}
            onChange={e => setSearchKeyword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="검색어 입력"
            className="border rounded px-3 py-2 w-64 bg-blue-50"
          />
        </div>
        <button onClick={handleSearch} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
          검색
        </button>
      </div>

      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-semibold">📋 목록</h3>
        <div className="flex gap-2">
          <button
            onClick={() => { setModalType('sort'); fetchScreensMenuOrder();}}
            className="bg-green-600 text-white px-4 py-1 rounded text-sm"
          >
            화면 순서 관리
          </button>
          <button
            onClick={() => {
              setEditScreen({
                screen_code: '',
                screen_name: '',
                screen_path: '',
                component_name: '',
                use_yn: 'Y',
                description: ''
              });
              setModalType('create');
            }}
            className="bg-blue-600 text-white px-4 py-1 rounded text-sm"
          >
            신규 등록
          </button>
        </div>
      </div>

      <div className="bg-white shadow rounded p-3 flex flex-col grow min-h-0">
        {/* 상단 표시 수 선택 */}
        <div className="flex justify-end items-center gap-2 mb-2 text-sm">
          <label htmlFor="perPageSelect">표시 수:</label>
          <select
            id="perPageSelect"
            value={perPage}
            onChange={e => {
              setPerPage(Number(e.target.value));
              setPage(1);
            }}
            className="border px-2 py-1 rounded"
          >
            <option value={10}>10</option>
            <option value={15}>15</option>
            <option value={20}>20</option>
          </select>
        </div>

        {/* 테이블 영역 (스크롤) */}
        <div className="flex-1 overflow-y-auto border-t">
          <table className="w-full text-sm border text-center table-fixed">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="border px-3 py-1 w-[5%]">#</th>
                <th className="border px-3 py-1 w-[10%]">코드</th>
                <th className="border px-3 py-1 w-[15%]">이름</th>
                <th className="border px-3 py-1 w-[18%]">접근 경로</th>
                <th className="border px-3 py-1 w-[15%]">컴포넌트</th>
                <th className="border px-3 py-1 w-[6%]">사용< br/>여부</th>
                <th className="border px-3 py-1 w-[19%]">설명</th>
                <th className="border px-3 py-1 w-[8%]">생성자</th>
                <th className="border px-3 py-1 w-[10%]">생성일</th>
                <th className="border px-3 py-1 w-[8%]">수정자</th>
                <th className="border px-3 py-1 w-[10%]">수정일</th>
                <th className="border px-3 py-1 w-[15%]">관리</th>
              </tr>
            </thead>
            <tbody>
              {screenList.length > 0 ? screenList.map((screen, index) => (
                <tr
                  key={screen.screen_code}
                  className="hover:bg-blue-100 cursor-pointer"
                  onClick={() => {
                    setEditScreen(screen);
                    setModalType('view');
                  }}
                >
                  <td className="border px-3 py-1">{totalCount - ((page - 1) * perPage + index)}</td>
                  <td className="border px-3 py-1 text-left truncate" title={screen.screen_code}>{screen.screen_code}</td>
                  <td className="border px-3 py-1 text-left truncate" title={screen.screen_name}>{screen.screen_name}</td>
                  <td className="border px-3 py-1 text-left font-mono text-xs break-all truncate" title={screen.screen_path}>{screen.screen_path}</td>
                  <td className="border px-3 py-1 text-left truncate" title={screen.component_name}>{screen.component_name}</td>
                  <td className="border px-3 py-1">
                    {screen.use_yn === 'Y' ? '✅' : '❌'}
                  </td>
                  <td className="border px-3 py-1 text-left truncate" title={screen.description}>{screen.description}</td>
                  <td className="border px-3 py-1">{screen.create_id}</td>
                  <td className="border px-3 py-1 text-xs">{screen.create_date}</td>
                  <td className="border px-3 py-1">{screen.update_id}</td>
                  <td className="border px-3 py-1 text-xs">{screen.update_date}</td>
                  <td className="border px-3 py-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditScreen(screen); setModalType('edit'); }}
                      className="bg-yellow-500 hover:bg-yellow-600 text-white px-2 py-1 rounded text-xs"
                    >
                      수정
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditScreen(screen); setModalType('delete'); }}
                      className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs ml-1"
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={12} className="text-center py-6 text-gray-500">등록된 화면이 없습니다.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 페이징 영역 (고정 하단) */}
        <div className="flex justify-center items-center gap-2 pt-3.5 border-t text-sm">
          <button
            disabled={page === 1}
            onClick={() => setPage(prev => prev - 1)}
            className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded disabled:opacity-50"
          >
            ◀ 이전
          </button>
          <span className="px-2 py-1">
            {page} / {totalPage}
          </span>
          <button
            disabled={page >= totalPage}
            onClick={() => setPage(prev => prev + 1)}
            className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded disabled:opacity-50"
          >
            다음 ▶
          </button>
        </div>
      </div>

      {/* 모달 */}
      {modalType && modalType != 'sort' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white rounded shadow-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-gray-800 border-b pb-2 mb-4">
              {modalType === 'create' && '🆕 화면 등록'}
              {modalType === 'view' && '🔍 화면 상세 보기'}
              {modalType === 'edit' && '📝 화면 수정'}
              {modalType === 'delete' && '🗑️ 화면 삭제 확인'}
            </h3>

            {modalType === 'delete' ? (
              <>
                <p className="mb-4 text-sm text-gray-700">
                  화면 <strong>{editScreen.screen_name}</strong> ({editScreen.screen_code}) 를 삭제하시겠습니까?
                </p>
                <div className="flex justify-end gap-2">
                  <button onClick={handleDelete} className="bg-red-600 text-white px-4 py-2 rounded">삭제</button>
                  <button onClick={() => setModalType('')} className="bg-gray-300 text-gray-800 px-4 py-2 rounded">취소</button>
                </div>
              </>
            ) : (
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <label className="w-28 text-gray-700">화면 코드</label>
                  <input
                    value={editScreen.screen_code}
                    onChange={e => setEditScreen({ ...editScreen, screen_code: e.target.value })}
                    className={`flex-1 border px-3 py-2 rounded ${modalType !== 'create' ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
                    readOnly={modalType !== 'create'}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="w-28 text-gray-700">화면 이름</label>
                  <input
                    value={editScreen.screen_name}
                    onChange={e => setEditScreen({ ...editScreen, screen_name: e.target.value })}
                    className="flex-1 border px-3 py-2 rounded"
                    readOnly={modalType === 'view'}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="w-28 text-gray-700">화면 접근 경로</label>
                  <input
                    value={editScreen.screen_path}
                    onChange={e => setEditScreen({ ...editScreen, screen_path: e.target.value })}
                    className="flex-1 border px-3 py-2 rounded"
                    readOnly={modalType === 'view'}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="w-28 text-gray-700">컴포넌트 이름</label>
                  <input
                    value={editScreen.component_name}
                    onChange={e => setEditScreen({ ...editScreen, component_name: e.target.value })}
                    className="flex-1 border px-3 py-2 rounded"
                    readOnly={modalType === 'view'}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="w-28 text-gray-700">사용 여부</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-1">
                      <input
                        type="radio"
                        name="use_yn"
                        value="Y"
                        checked={editScreen.use_yn === 'Y'}
                        onChange={e => setEditScreen({ ...editScreen, use_yn: e.target.value })}
                        disabled={modalType === 'view'}
                      />
                      <span>✅ 사용</span>
                    </label>
                    <label className="flex items-center gap-1">
                      <input
                        type="radio"
                        name="use_yn"
                        value="N"
                        checked={editScreen.use_yn === 'N'}
                        onChange={e => setEditScreen({ ...editScreen, use_yn: e.target.value })}
                        disabled={modalType === 'view'}
                      />
                      <span>❌ 미사용</span>
                    </label>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <label className="w-28 text-gray-700 pt-2">설명</label>
                  <textarea
                    value={editScreen.description}
                    onChange={e => setEditScreen({ ...editScreen, description: e.target.value })}
                    className="flex-1 border px-3 py-2 rounded h-[200px]"
                    readOnly={modalType === 'view'}
                  />
                </div>

                {modalType === 'view' ? (
                  <div className="flex justify-end">
                    <button onClick={() => setModalType('')} className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded text-sm font-semibold">닫기</button>
                    
                  </div>
                ) : (
                  <div className="flex justify-end gap-2">
                    <button onClick={handleSave} className="bg-blue-600 text-white px-4 py-2 rounded">저장</button>
                    <button onClick={() => setModalType('')} className="bg-gray-300 text-gray-800 px-4 py-2 rounded">취소</button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 화면 순서 변경 모달 */}
      {modalType === 'sort' && (
        <ScreenSortModal
          screens={screenAllList}
          onClose={() => {setModalType('');fetchScreensMenuOrder();}}
          onSave={fetchScreens}
        />
      )}

    </div>
  );
}
