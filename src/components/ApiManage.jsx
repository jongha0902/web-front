import React, { useEffect, useState, useCallback, useRef } from 'react';
import FlowEditor from './FlowEditor.jsx';
import api from '../utils/axios.js';
import { useError } from '../utils/ErrorContext.jsx';
import { useMessage } from '../utils/MessageContext.jsx';
import { isEmpty } from '../utils/common.js';
import { X } from 'lucide-react';


export default function ApiList() {

  const [apiList, setApiList] = useState([]);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(15);
  const [totalCount, setTotalCount] = useState(0);
  const totalPage = Math.max(1, Math.ceil(totalCount / perPage));
  const [searchField, setSearchField] = useState('api_name');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchUseYn, setSearchUseYn] = useState('');
  const [modalType, setModalType] = useState(''); // 'create' or 'edit'
  const [deleteModal, setDeleteModal] = useState(false)
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState({ api_id: '', api_name: '', path: '', method: 'GET', description: '', use_yn: 'N' });
  const { showError } = useError();
  const { showMessage } = useMessage();
  const flowRef = useRef();

  useEffect(() => {
    if ((modalType === 'edit' || modalType === 'view') && editTarget?.flow_data) {
      flowRef.current?.setFlow(JSON.parse(editTarget.flow_data));
    }
  }, [modalType, editTarget]);

  const fetchApiList = async () => {
    try {
      const params = { page, per_page: perPage, use_yn: searchUseYn };
      if (searchKeyword) params[searchField] = searchKeyword;

      const res = await api.get('/apim/api', { params });
      setApiList(res.data.items);
      setTotalCount(res.data.total_count);
    } catch (e) {
      
      const message = e.response?.data?.message || e.message || '오류';
      const detail = e.response?.data?.detail ? ` (${e.response.data.detail})` : '';
      showError(`❌ ${message}${detail}`);
    }
  };

  useEffect(() => {
    fetchApiList();
  }, [page, perPage]);

  const handleSave = async () => {
    try {
      await flowRef.current?.setResetEdge();
      const flow = flowRef.current?.getFlow();
      let res;
      if (modalType === 'create') {
        res = await api.post('/apim/api', { ...form, flow_data: JSON.stringify(flow) });
        setModalType('');
      } else if (modalType === 'edit' && editTarget) {
        if (isEmpty(editTarget.api_id)) {
          showMessage("API_ID는 필수입니다."); 
          return;
        }
        if (isEmpty(editTarget.method)) {
          showMessage("API Method는 필수입니다."); 
          return;
        }
        res = await api.put(`/apim/api/${editTarget.method}/${editTarget.api_id}`, { ...form, flow_data: JSON.stringify(flow) });
        // ✅ 저장된 내용을 유지해서 바로 보여주기
        const updatedTarget = {
          ...form,
          flow_data: JSON.stringify(flow),
        };
        setEditTarget(updatedTarget); // 🔄 저장된 내용으로 editTarget 갱신
        setForm(updatedTarget);       // 🔄 form도 반영
        setModalType('view');         // 🔁 모달은 닫지 않고 view로 전환
      }

      if(res.status === 200){
        fetchApiList(); 
        showMessage(res.data.message);
      }
      
    } catch (e) {
      
      const message = e.response?.data?.message || e.message || '오류';
      const detail = e.response?.data?.detail ? ` (${e.response.data.detail})` : '';
      showError(`❌ ${message}${detail}`);
    }
  };

  const handleDelete = async (editTarget) => {
    try {
      if (isEmpty(editTarget.api_id)) {
        showMessage("API_ID는 필수입니다."); 
        return;
      }

      let res = await api.delete(`/apim/api/${editTarget.method}/${editTarget.api_id}`);

      if(res.status === 200){
        fetchApiList(); 
        setDeleteModal("false");
        setModalType("");
        showMessage(res.data.message);
      }
    } catch (e) {
      
      const message = e.response?.data?.message || e.message || '오류';
      const detail = e.response?.data?.detail ? ` (${e.response.data.detail})` : '';
      showError(`❌ ${message}${detail}`);
    }
  };

  return (
    <div className="flex flex-col flex-1 h-full min-h-0">
      <h2 className="text-xl font-bold mb-2">📚 API 관리</h2>

      <div className="flex justify-between items-center gap-4 mb-4 mt-2 text-sm p-3 bg-white shadow rounded">
        <div className="flex items-center gap-4">
          {/* ✅ 검색 필드 선택 */}
          <select
            value={searchField}
            onChange={e => setSearchField(e.target.value)}
            className="border rounded px-3 py-2"
          >
            <option value="api_name">이름</option>
            <option value="path">경로(URL)</option>
          </select>

          {/* ✅ 검색 키워드 입력 */}
          <input
            value={searchKeyword}
            onKeyDown={e => e.key === 'Enter' && fetchApiList()}
            onChange={e => setSearchKeyword(e.target.value)}
            placeholder="검색어 입력"
            className="border rounded px-3 py-2 w-64 bg-blue-50"
          />

          {/* ✅ 사용여부 선택 */}
          <label className="text-sm text-gray-700">사용여부</label>
          <select
            value={searchUseYn}
            onChange={e => setSearchUseYn(e.target.value)}
            className="border rounded px-3 py-2"
          >
            <option value="">전체</option>
            <option value="Y">사용</option>
            <option value="N">미사용</option>
          </select>
        </div>

        <button
          onClick={fetchApiList}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
        >
          검색
        </button>
      </div>


      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-semibold">📋 목록</h3>
        <button
          onClick={() => {
            setModalType(true);
            setModalType("create");
            setForm({ api_id: '', api_name: '', path: '', method: 'GET', description: '', use_yn: 'N'});  // ✅ form 초기화
            flowRef.current?.clearFlow();  // ✅ flow 초기화
          }}
          className="bg-blue-600 text-white px-4 py-1 rounded text-sm"
        >
          API 등록
        </button>
      </div>

      <div className="flex flex-col grow min-h-0 bg-white shadow rounded p-3">
        {/* 표시 수 select */}
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

        {/* ✅ 테이블 틀 + 헤더는 고정, tbody만 스크롤 */}
        <div className="flex-1 overflow-y-auto border-t">
          <table className="w-full text-sm border text-center table-fixed">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="border px-3 py-1 w-[4%]">#</th>
                <th className="border px-3 py-1 w-[7%]">API_ID</th>
                <th className="border px-3 py-1 w-[10%]">이름</th>
                <th className="border px-3 py-1 w-[16%]">경로(URL)</th>
                <th className="border px-3 py-1 w-[5%]">메서드</th>
                <th className="border px-3 py-1 w-[12%]">설명</th>
                <th className="border px-3 py-1 w-[4%]">사용<br />여부</th>
                <th className="border px-3 py-1 w-[7%]">생성자</th>
                <th className="border px-3 py-1 w-[10%]">생성일</th>
                <th className="border px-3 py-1 w-[7%]">수정자</th>
                <th className="border px-3 py-1 w-[10%]">수정일</th>
                <th className="border px-3 py-1 w-[8%]">관리</th>
                <th className="border px-3 py-1 w-[0%] hidden">flow_data</th>
              </tr>
            </thead>
            <tbody>
              {apiList.length > 0 ? apiList.map((api, i) => (
                <tr key={`${api.api_id}-${api.method}` || i} className="hover:bg-blue-100 cursor-pointer"
                  onClick={() => {
                    setForm(api);
                    setEditTarget(api);
                    setModalType('view');
                  }}
                >
                  <td className="border px-3 py-1">{totalCount - ((page - 1) * perPage + i)}</td>
                  <td className="border px-3 py-1 text-sm">{api.api_id}</td>
                  <td className="border px-3 py-1 text-left font-medium truncate">{api.api_name}</td>
                  <td className="border px-3 py-1 text-left text-blue-600 font-mono text-xs break-all truncate" title={api.path}>{api.path}</td>
                  <td className="border px-3 py-1 uppercase">{api.method}</td>
                  <td className="border px-3 py-1 text-left text-sm truncate" title={api.description}>{api.description}</td>
                  <td className="border px-3 py-1 text-sm">{api.use_yn === 'Y' ? '✅' : '❌'}</td>
                  <td className="border px-3 py-1 text-sm">{api.write_id}</td>
                  <td className="border px-3 py-1 text-sm">{api.write_date}</td>
                  <td className="border px-3 py-1 text-sm">{api.update_id}</td>
                  <td className="border px-3 py-1 text-sm">{api.update_date}</td>
                  <td className="border px-3 py-1">
                    <button className="bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded text-xs ml-1" onClick={(e) => { e.stopPropagation(); setForm(api); setEditTarget(api); setModalType('edit');}}>수정</button>
                    <button className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs ml-1" onClick={(e) => { e.stopPropagation(); setForm(api); setEditTarget(api); setDeleteModal(true); }}>삭제</button>
                  </td>
                  <td className="border px-3 py-1 text-sm hidden">{api.flow_data}</td>
                </tr>
              )) : (
                <tr><td colSpan="12" className="text-gray-500 py-6 text-center">등록된 API 정보가 없습니다.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 페이지 버튼 */}
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

      {/* 모달 */}
      {modalType && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 overflow-auto p-7">
          <div className="bg-white rounded-lg shadow-md w-full min-w-[1100px] h-full min-h-[600px] flex border border-gray-200">
            {/* 왼쪽 입력 영역 */}
            <div className="w-1/3 p-6 flex flex-col relative">
              <div className="flex items-center mb-4">
                {modalType === 'view' ? (
                  <span className="bg-gray-500 text-white text-[10px] font-bold px-2 py-0.5 rounded mr-2">VIEW</span>
                ) : modalType === 'edit' ? (
                  <span className="bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded mr-2">EDIT</span>
                ) : (
                  <span className="bg-blue-500 text-white text-[10px] font-bold px-2 py-0.5 rounded mr-2">NEW</span>
                )}
                <h3 className="text-lg font-bold">
                  {modalType === 'create' ? 'API 등록' : modalType === 'edit' ? 'API 수정' : 'API 상세보기'}
                </h3>
              </div>

              <hr className="mb-4" />

              <div className="space-y-3 text-sm flex-1 overflow-y-auto pb-28">
                <div className="flex items-center">
                  <label className="w-20 text-gray-700">API ID</label>
                  <input
                    className={`flex-1 px-3 py-2 rounded ${modalType === 'view' || modalType === 'edit' ? 'bg-gray-100 text-gray-700 border-none' : 'border border-gray-300'}`}
                    readOnly={modalType === 'view' || modalType === 'edit'}
                    value={form.api_id}
                    onChange={e => setForm({ ...form, api_id: e.target.value })}
                  />
                </div>

                <div className="flex items-center">
                  <label className="w-20 text-gray-700">API명</label>
                  <input
                    className={`flex-1 px-3 py-2 rounded ${modalType === 'view' ? 'bg-gray-100 text-gray-700 border-none' : 'border border-gray-300'}`}
                    readOnly={modalType === 'view'}
                    value={form.api_name}
                    onChange={e => setForm({ ...form, api_name: e.target.value })}
                  />
                </div>
                <div className="flex items-center">
                  <label className="w-20 text-gray-700">URL-PATH</label>
                  <input
                    className={`flex-1 px-3 py-2 rounded ${modalType === 'view' ? 'bg-gray-100 text-gray-700 border-none' : 'border border-gray-300'}`}
                    readOnly={modalType === 'view'}
                    value={form.path}
                    onChange={e => setForm({ ...form, path: e.target.value })}
                  />
                </div>
                <div className="flex items-center">
                  <label className="w-20 text-gray-700">Method</label>
                  <select
                    className={`flex-1 px-3 py-2 rounded ${modalType === 'view' || modalType === 'edit' ? 'bg-gray-100 text-gray-700 border-none' : 'border border-gray-300'}`}
                    disabled={modalType === 'view' || modalType === 'edit'}
                    value={form.method}
                    onChange={e => setForm({ ...form, method: e.target.value })}
                  >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="PATCH">PATCH</option>
                    <option value="DELETE">DELETE</option>
                    <option value="HEAD">HEAD</option>
                    <option value="OPTIONS">OPTIONS</option>
                  </select>
                </div>
                <div className="flex items-center">
                  <label className="w-20 text-gray-700">사용여부</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-1">
                      <input
                        type="radio"
                        value="Y"
                        checked={form.use_yn === 'Y'}
                        onChange={() => setForm({ ...form, use_yn: 'Y' })}
                        disabled={modalType === 'view'}
                        className="w-4 h-4"
                      />
                      <span className="text-gray-700">사용</span>
                    </label>
                    <label className="flex items-center gap-1">
                      <input
                        type="radio"
                        value="N"
                        checked={form.use_yn === 'N'}
                        onChange={() => setForm({ ...form, use_yn: 'N' })}
                        disabled={modalType === 'view'}
                        className="w-4 h-4"
                      />
                      <span className="text-gray-700">미사용</span>
                    </label>
                  </div>
                </div>
                <div className="flex items-start">
                  <label className="w-20 text-gray-700 pt-2">설명</label>
                  <textarea
                    className={`flex-1 min-h-[150px] px-3 py-2 rounded ${modalType === 'view' ? 'bg-gray-100 text-gray-700 border-none' : 'border border-gray-300'}`}
                    readOnly={modalType === 'view'}
                    value={form.description}
                    onChange={e => setForm({ ...form, description: e.target.value })}
                  />
                </div>
              </div>

              {/* 버튼 영역 */}
              {modalType === 'view' || modalType === 'delete' ? (
                <div className="absolute bottom-0 left-0 w-full bg-white py-4 px-6 border-t border-gray-200 flex justify-end gap-2">
                  <button
                    onClick={() => setModalType('edit')}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-semibold"
                  >
                    수정
                  </button>
                  <button
                    onClick={() => setDeleteModal(true)}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm font-semibold"
                  >
                    삭제
                  </button>
                  <button
                    onClick={() => setModalType('')}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded text-sm font-semibold"
                  >
                    닫기
                  </button>
                </div>
              ) : (
                <div className="absolute bottom-0 left-0 w-full bg-white py-4 px-6 border-t border-gray-200 flex justify-end gap-2">
                  <button
                    onClick={handleSave}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm font-semibold"
                  >
                    저장
                  </button>
                  <button
                    onClick={() => setModalType(modalType === 'edit' ? 'view' : '')}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded text-sm font-semibold"
                  >
                    취소
                  </button>
                </div>
              )}
            </div>

            {/* 오른쪽 FlowEditor */}
            <div className="w-2/3 h-full bg-gray-100 p-4 overflow-auto relative">
              <button
                onClick={() => setModalType('')}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-200 hover:bg-red-500 hover:text-white text-gray-600 text-sm font-bold flex items-center justify-center shadow transition-colors duration-200 z-[9999]"
                aria-label="닫기"
              >
                <X />
              </button>
              <FlowEditor ref={flowRef} isReadOnly={modalType === 'view'} />
            </div>
          </div>
        </div>
      )}

      {deleteModal === true && editTarget && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white rounded shadow-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-gray-800 border-b pb-2 mb-4">
              🗑️ API 삭제 확인
            </h3>

            <div className="space-y-3 mb-4 text-sm">
              <div className="flex items-center">
                <label className="w-24 text-sm font-medium text-gray-700">API 이름</label>
                <input
                  value={editTarget.api_name}
                  readOnly
                  className="flex-1 border px-3 py-2 rounded bg-gray-100 text-gray-600 cursor-not-allowed"
                />
              </div>
              <div className="flex items-center">
                <label className="w-24 text-sm font-medium text-gray-700">경로(URL)</label>
                <input
                  value={editTarget.path}
                  readOnly
                  className="flex-1 border px-3 py-2 rounded bg-gray-100 text-gray-600 cursor-not-allowed font-mono"
                />
              </div>
            </div>

            <p className="text-sm text-gray-700 mb-6">
              해당 API를 정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </p>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => handleDelete(editTarget)}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
              >
                삭제
              </button>
              <button
                onClick={() => setDeleteModal(false)}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}