// src/components/GatewayLogs.jsx
import React, { useEffect, useState } from 'react';
import api from '../utils/axios';
import { useError } from '../utils/ErrorContext';
import { useMessage } from '../utils/MessageContext';
import { useAuth } from '../store/Auth';
import { FileSearch } from 'lucide-react';

export default function GatewayLogs() {
  const { user } = useAuth();
  const { showError } = useError();
  const { showMessage } = useMessage();

  const isAdmin = user?.permission_code === 'ADMIN';

  const [logs, setLogs] = useState([]);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(15);
  const [totalCount, setTotalCount] = useState(0);
  const totalPage = Math.max(1, Math.ceil(totalCount / perPage));

  // 🔎 Filters
  const [filterUserId, setFilterUserId] = useState('');
  const [filterApiId, setFilterApiId] = useState('');
  const [filterMethod, setFilterMethod] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState(''); // 숫자 문자열 (예: 200)
  const [filterSuccess, setFilterSuccess] = useState('ALL'); // ALL | Y | N

  // 기간 기본값: 현재 ~ 1시간전
  const formatDateTimeLocal = (offsetHours = 0) => {
      const now = new Date();
      now.setHours(now.getHours() + offsetHours); // 🔄 시간 오프셋 적용
      const pad = (n) => String(n).padStart(2, '0');
      const yyyy = now.getFullYear();
      const mm = pad(now.getMonth() + 1);
      const dd = pad(now.getDate());
      const hh = pad(now.getHours());
      const min = pad(now.getMinutes());
      return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
    };
    
    // ✅ 기본값 세팅
    const [searchDateStart, setSearchDateStart] = useState(formatDateTimeLocal(-1));      
    const [searchDateEnd, setSearchDateEnd] = useState(formatDateTimeLocal());    

  // 상세보기 모달
  const [modalData, setModalData] = useState(null); // { title, content }
  const [viewJson, setViewJson] = useState(false);

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, perPage]);

  const isValidDateTimeLocal = (v) =>
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v);

  const fetchLogs = async () => {
    if (!isValidDateTimeLocal(searchDateStart) || !isValidDateTimeLocal(searchDateEnd)) {
      showMessage('📅 날짜는 YYYY-MM-DDTHH:MM 형식으로 입력해주세요.');
      return;
    }
    const start = new Date(searchDateStart);
    const end = new Date(searchDateEnd);
    if (start > end) {
      showMessage('🚫 조회 시작은 조회 종료보다 이전이어야 합니다.');
      return;
    }

    try {
      const params = {
        page,
        per_page: perPage,
        searchDateStart,
        searchDateEnd,
      };

      if (isAdmin) {
        if (filterUserId) params.user_id = filterUserId;
      } else {
        params.user_id = user?.user_id; // 일반 유저는 자기 로그만
      }

      if (filterApiId) params.api_id = filterApiId;
      if (filterMethod !== 'ALL') params.method = filterMethod;
      if (filterSuccess !== 'ALL') params.is_success = filterSuccess; // 'Y'/'N'
      if (filterStatus) params.status_code = filterStatus; // exact match

      const res = await api.get('/apim/gateway-logs', { params });
      setLogs(Array.isArray(res.data.items) ? res.data.items : []);
      setTotalCount(Number(res.data.total_count || 0));
    } catch (e) {
      const message = e.response?.data?.message || e.message || '오류';
      const detail = e.response?.data?.detail ? ` (${e.response.data.detail})` : '';
      showError(`❌ ${message}${detail}`);
    }
  };

  const handleSearch = () => {
    if (page !== 1) setPage(1);
    else fetchLogs();
  };

  // JSON 안전 파싱
  function tryParseJson(str) {
    try {
      return JSON.parse(str);
    } catch {
      return { error: '유효한 JSON이 아닙니다.', 원문: str };
    }
  }

  return (
    <div className="flex flex-col flex-1 h-full min-h-0">
      <h2 className="text-xl font-bold mb-2">🛡️ 게이트웨이 로그 조회</h2>

      {/* 🔎 검색 필터 */}
      <div className="flex flex-wrap justify-between items-start gap-4 mb-4 mt-2 text-sm p-3 bg-white shadow rounded">
        <div className="flex flex-wrap items-center gap-1 flex-1 min-w-[320px]">
          {/* (관리자만) 유저ID */}
          {isAdmin && (
            <div className="flex items-center">
              <label className="w-16 text-center font-semibold text-gray-700">유저ID</label>
              <input
                value={filterUserId}
                onChange={e=>setFilterUserId(e.target.value)}
                onKeyDown={e=>e.key==='Enter'&&handleSearch()}
                className="border px-3 py-2 rounded w-36 bg-blue-50"
              />
            </div>
          )}

          {/* API ID */}
          <div className="flex items-center">
            <label className="w-16 text-center font-semibold text-gray-700">API ID</label>
            <input
              value={filterApiId}
              onChange={e=>setFilterApiId(e.target.value)}
              onKeyDown={e=>e.key==='Enter'&&handleSearch()}
              className="border px-3 py-2 rounded w-36 bg-blue-50"
            />
          </div>

          {/* 메서드 */}
          <div className="flex items-center">
            <label className="w-20 text-gray-700 px-3 font-semibold">Method</label>
            <select
              value={filterMethod}
              onChange={(e)=>setFilterMethod(e.target.value)}
              className="border px-3 py-2 rounded text-sm bg-blue-50"
            >
              <option value="ALL">전체</option>
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="PATCH">PATCH</option>
              <option value="DELETE">DELETE</option>
              <option value="HEAD">HEAD</option>
              <option value="OPTIONS">OPTIONS</option>
            </select>
          </div>

          {/* 성공여부 */}
          <div className="flex items-center">
            <label className="w-20 text-gray-700 px-3 font-semibold">통신상태</label>
            <select
              value={filterSuccess}
              onChange={(e)=>setFilterSuccess(e.target.value)}
              className="border px-3 py-2 rounded text-sm bg-blue-50"
            >
              <option value="ALL">전체</option>
              <option value="Y">성공</option>
              <option value="N">실패</option>
            </select>
          </div>

          {/* 상태코드 */}
          <div className="flex items-center">
            <label className="w-20 text-center font-semibold text-gray-700">상태코드</label>
            <input
              value={filterStatus}
              onChange={e=>setFilterStatus(e.target.value.replace(/[^\d]/g,''))}
              onKeyDown={e=>e.key==='Enter'&&handleSearch()}
              className="border px-3 py-2 rounded w-24 bg-blue-50"
              placeholder="200"
            />
          </div>

          {/* 조회기간 */}
          <div className="flex items-center flex-wrap gap-2 min-w-[270px]">
            <label className="w-20 text-gray-700 px-3 font-semibold">조회기간</label>
            <input
              type="datetime-local"
              value={searchDateStart}
              onChange={(e)=>setSearchDateStart(e.target.value)}
              className="border px-2 py-1.5 rounded bg-blue-50 h-[38px]"
            />
            <span className="text-gray-500">~</span>
            <input
              type="datetime-local"
              value={searchDateEnd}
              onChange={(e)=>setSearchDateEnd(e.target.value)}
              className="border px-2 py-1.5 rounded bg-blue-50 h-[38px]"
            />
          </div>
        </div>

        {/* 검색 버튼 */}
        <div className="flex-shrink-0">
          <button
            onClick={handleSearch}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            검색
          </button>
        </div>
      </div>

      {/* 목록 헤더 */}
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-semibold">📋 목록</h3>
      </div>

      {/* 목록 테이블 */}
      <div className="bg-white shadow rounded p-3 flex flex-col grow min-h-0">
        <div className="flex justify-end items-center gap-2 mb-2 text-sm">
          <label htmlFor="perPageSelect">표시 수:</label>
          <select
            id="perPageSelect"
            value={perPage}
            onChange={e=>{setPerPage(Number(e.target.value)); setPage(1);}}
            className="border px-2 py-1 rounded"
          >
            <option value={10}>10</option>
            <option value={15}>15</option>
            <option value={20}>20</option>
          </select>
        </div>

        <div className="flex-1 overflow-hidden">
          <div className="overflow-y-auto max-h-[550px] border-t">
            <table className="w-full text-sm border text-center table-fixed">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="border px-3 py-2 w-[6%]">#</th>
                  <th className="border px-3 py-2 w-[12%]">유저</th>
                  <th className="border px-3 py-2 w-[14%]">API ID</th>
                  <th className="border px-3 py-2 w-[10%]">Method</th>
                  <th className="border px-3 py-2 w-[10%]">통신상태</th>
                  <th className="border px-3 py-2 w-[10%]">상태코드</th>
                  <th className="border px-3 py-2 w-[18%]">요청시간</th>
                  <th className="border px-3 py-2 w-[18%]">응답시간</th>
                  <th className="border px-3 py-2 w-[12%]">상세</th>
                </tr>
              </thead>
              <tbody>
                {logs.length > 0 ? logs.map((log, i) => (
                  <tr key={log.log_id ?? i} className="hover:bg-gray-100 align-top">
                    <td className="border px-3 py-1">
                      {totalCount - ((page - 1) * perPage + i)}
                    </td>
                    <td className="border px-3 py-1 break-words">{log.user_id}</td>
                    <td className="border px-3 py-1 break-words">{log.api_id}</td>
                    <td className="border px-3 py-1 text-xs">{log.method}</td>
                    <td className="border px-3 py-1">{log.is_success}</td>
                    <td className="border px-3 py-1">{log.status_code}</td>
                    <td className="border px-3 py-1 text-xs">{log.requested_at}</td>
                    <td className="border px-3 py-1 text-xs">{log.responded_at}</td>
                    <td className="border px-2 py-1 text-xs">
                      <div className="flex flex-wrap gap-1 justify-center">
                        <button
                          onClick={() => { setModalData({ title: '요청 헤더(headers)', content: log.headers ?? '' }); setViewJson(false); }}
                          className="inline-flex items-center gap-1 bg-gray-50 text-gray-700 px-2 py-1 rounded hover:bg-gray-100 text-xs"
                        >
                          <FileSearch size={14}/>헤더
                        </button>
                        <button
                          onClick={() => { setModalData({ title: '쿼리 파라미터(query_param)', content: log.query_param ?? '' }); setViewJson(false); }}
                          className="inline-flex items-center gap-1 bg-gray-50 text-gray-700 px-2 py-1 rounded hover:bg-gray-100 text-xs"
                        >
                          <FileSearch size={14}/>쿼리
                        </button>
                        <button
                          onClick={() => { setModalData({ title: '요청 바디(body)', content: log.body ?? '' }); setViewJson(false); }}
                          className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1 rounded hover:bg-blue-100 text-xs"
                        >
                          <FileSearch size={14}/>요청
                        </button>
                        <button
                          onClick={() => { setModalData({ title: '응답(response)', content: log.response ?? '' }); setViewJson(false); }}
                          className="inline-flex items-center gap-1 bg-green-50 text-green-700 px-2 py-1 rounded hover:bg-green-100 text-xs"
                        >
                          <FileSearch size={14}/>응답
                        </button>
                        {log.error_message && (
                          <button
                            onClick={() => { setModalData({ title: '에러 메시지(error_message)', content: log.error_message ?? '' }); setViewJson(false); }}
                            className="inline-flex items-center gap-1 bg-red-50 text-red-700 px-2 py-1 rounded hover:bg-red-100 text-xs"
                          >
                            <FileSearch size={14}/>에러
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={9} className="text-gray-500 py-6 text-center">등록된 로그가 없습니다.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 페이징 */}
        <div className="flex justify-center items-center gap-2 pt-3.5 border-t text-sm">
          <button
            disabled={page === 1}
            onClick={()=>setPage(p=>p-1)}
            className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded disabled:opacity-50"
          >
            ◀ 이전
          </button>
          <span className="px-2 py-1">{page} / {totalPage}</span>
          <button
            disabled={page >= totalPage}
            onClick={()=>setPage(p=>p+1)}
            className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded disabled:opacity-50"
          >
            다음 ▶
          </button>
        </div>
      </div>

      {/* 상세보기 모달 */}
      {modalData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
          <div className="bg-white rounded shadow-lg max-w-4xl w-full min-h-[520px] max-h-[75vh] flex flex-col">
            <h3 className="text-lg font-bold p-4 border-b">{modalData.title}</h3>
            <div className="flex-1 overflow-y-auto p-4">
              <pre className="bg-gray-100 p-3 text-xs whitespace-pre-wrap break-all rounded min-h-[420px]">
                {viewJson ? JSON.stringify(tryParseJson(modalData.content ?? ''), null, 2) : (modalData.content ?? '')}
              </pre>
            </div>
            <div className="p-4 border-t flex justify-end gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(
                    viewJson
                      ? JSON.stringify(tryParseJson(modalData.content ?? ''), null, 2)
                      : (modalData.content ?? '')
                  );
                  showMessage('✅ 클립보드에 복사되었습니다.');
                }}
                className="bg-gray-400 text-white px-4 py-1 rounded"
              >
                복사
              </button>
              <button onClick={() => setViewJson(v=>!v)} className="bg-gray-300 text-gray-800 px-4 py-1 rounded">
                {viewJson ? '원문 보기' : 'JSON 보기'}
              </button>
              <button onClick={() => setModalData(null)} className="bg-blue-600 text-white px-4 py-1 rounded">
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
