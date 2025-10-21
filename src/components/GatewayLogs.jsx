// src/components/GatewayLogs.jsx
import React, { useEffect, useState, useMemo } from 'react';
import api from '../utils/axios';
import { useError } from '../utils/ErrorContext';
import { useMessage } from '../utils/MessageContext';
import { useAuth } from '../store/Auth';
import { FileSearch, Copy, X } from 'lucide-react';

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
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSuccess, setFilterSuccess] = useState('ALL');

  // yyyy-MM-ddTHH:mm 포맷 생성
  const formatDateTimeLocal = (date) => {
    const pad = (n) => String(n).padStart(2, '0');
    const yyyy = date.getFullYear();
    const mm = pad(date.getMonth() + 1);
    const dd = pad(date.getDate());
    const hh = pad(date.getHours());
    const min = pad(date.getMinutes());
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
  };

  // 시작: 오늘 00:00
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  // 종료: 내일 00:00
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);


  const [searchDateStart, setSearchDateStart] = useState(formatDateTimeLocal(todayStart));
  const [searchDateEnd, setSearchDateEnd] = useState(formatDateTimeLocal(todayEnd));

  // 통합 상세모달
  const [modalLog, setModalLog] = useState(null);
  // 섹션별 JSON 보기 토글 상태
  const [viewJson, setViewJson] = useState({
    headers: true,
    query_param: true,
    body: true,
    response: true,
    error_message: true
  });

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
        params.user_id = user?.user_id;
      }

      if (filterApiId) params.api_id = filterApiId;
      if (filterMethod !== 'ALL') params.method = filterMethod;
      if (filterSuccess !== 'ALL') params.is_success = filterSuccess;
      if (filterStatus) params.status_code = filterStatus;

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
    if (str == null) return null;
    if (typeof str !== 'string') return str;
    try {
      return JSON.parse(str);
    } catch {
      return null;
    }
  }

  // 섹션 렌더링 공통
  function Section({ title, raw, jsonKey }) {
    const data = useMemo(() => tryParseJson(raw), [raw]);

    const shown = viewJson[jsonKey] && data !== null ? JSON.stringify(data, null, 2) : (raw || '');

    const isJson = data !== null;

    const toggle = () =>
      setViewJson((prev) => ({ ...prev, [jsonKey]: !prev[jsonKey] }));

    const copy = async () => {
      try {
        await navigator.clipboard.writeText(shown || '');
        showMessage('클립보드에 복사되었습니다.');
      } catch {
        showError('복사 실패');
      }
    };

    return (
      <div className="border rounded mb-3">
        <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b">
          <h4 className="font-semibold">{title}</h4>
          <div className="flex items-center gap-2">
            <button onClick={toggle} className="px-2 py-1 text-xs bg-gray-200 rounded">
              {viewJson[jsonKey] ? '원문 보기' : (isJson ? 'JSON 보기' : '원문')}
            </button>
            <button onClick={copy} className="px-2 py-1 text-xs bg-gray-300 rounded inline-flex items-center gap-1">
              <Copy size={14}/>복사
            </button>
          </div>
        </div>
        <pre className="p-3 text-xs whitespace-pre-wrap break-all max-h-64 overflow-auto bg-white">
          {shown || <span className="text-gray-400">-</span>}
        </pre>
      </div>
    );
  }

  // 모달 전체 JSON 복사
  const copyWholeLog = async () => {
    if (!modalLog) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(modalLog, null, 2));
      showMessage('전체 JSON이 복사되었습니다.');
    } catch {
      showError('복사 실패');
    }
  };

  return (
    <div className="flex flex-col flex-1 h-full min-h-0">
      <h2 className="text-xl font-bold mb-2">🛡️ API 사용 로그</h2>

      {/* 🔎 검색 필터 */}
      <div className="flex flex-wrap justify-between items-start gap-4 mb-4 mt-2 text-sm p-3 bg-white shadow rounded">
        <div className="flex flex-wrap items-center gap-1 flex-1 min-w-[320px]">
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
          <div className="flex items-center">
            <label className="w-16 text-center font-semibold text-gray-700">API ID</label>
            <input
              value={filterApiId}
              onChange={e=>setFilterApiId(e.target.value)}
              onKeyDown={e=>e.key==='Enter'&&handleSearch()}
              className="border px-3 py-2 rounded w-36 bg-blue-50"
            />
          </div>
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
                  <th className="border px-3 py-2 w-[10%]">비고</th>
                </tr>
              </thead>
              <tbody>
                {logs.length > 0 ? logs.map((log, i) => (
                  <tr key={log.log_id ?? i} className="hover:bg-gray-100 align-top">
                    <td className="border px-3 py-1">
                      {totalCount - ((page - 1) * perPage + i)}
                    </td>
                    <td className="border px-3 py-1 break-words">{log.user_id || '-'}</td>
                    <td className="border px-3 py-1 break-words">{log.api_id}</td>
                    <td className="border px-3 py-1">{log.method}</td>
                    <td className="border px-3 py-1">{log.is_success == "Y" ? "✅ 성공" : "❌ 실패"}</td>
                    <td className="border px-3 py-1">{log.status_code}</td>
                    <td className="border px-3 py-1">{log.requested_at}</td>
                    <td className="border px-3 py-1">{log.responded_at}</td>
                    <td className="border px-2 py-1">
                      <button
                        onClick={() => {setModalLog(log); 
                                        setViewJson({ headers: true,
                                                      query_param: true,
                                                      body: true,
                                                      response: true,
                                                      error_message: true
                                                    });
                        }}
                        className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1 rounded hover:bg-blue-100 text-xs"
                      >
                        <FileSearch size={14}/>상세보기
                      </button>
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

      {/* 통합 상세보기 모달 */}
      {modalLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
          <div className="bg-white rounded shadow-lg max-w-5xl w-full max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-bold">상세 로그</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={copyWholeLog}
                  className="px-3 py-1 text-sm bg-gray-200 rounded inline-flex items-center gap-1"
                >
                  <Copy size={14}/> 전체 JSON 복사
                </button>
                <button
                  onClick={() => setModalLog(null)}
                  className="p-1 rounded hover:bg-gray-200"
                  aria-label="close"
                >
                  <X size={18}/>
                </button>
              </div>
            </div>

            <div className="p-4 overflow-y-auto">
              {/* 요약 */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4 text-sm">
                <Info label="유저" value={modalLog.user_id}/>
                <Info label="API ID" value={modalLog.api_id}/>
                <Info label="Method" value={modalLog.method}/>
                <Info label="통신상태" value={modalLog.is_success == "Y" ? "✅ 성공" : "❌ 실패"}/>
                <Info label="상태코드" value={modalLog.status_code}/>
                <Info label="요청시간" value={modalLog.requested_at}/>
                <Info label="응답시간" value={modalLog.responded_at}/>
                <Info label="지연(ms)" value={modalLog.latency_ms}/>
                <Info label="Client IP" value={modalLog.client_ip}/>
                <Info label="User-Agent" value={modalLog.user_agent}/>
                <Info label="Path" value={modalLog.path}/>
              </div>

              {/* 섹션들 */}
              <Section title="Headers" raw={modalLog.headers} jsonKey="headers" />
              <Section title="Query Params" raw={modalLog.query_param} jsonKey="query_param" />
              <Section title="Request Body" raw={modalLog.body} jsonKey="body" />
              <Section title="Response" raw={modalLog.response} jsonKey="response" />
              <Section title="Error Message" raw={modalLog.error_message} jsonKey="error_message" />
            </div>

            <div className="p-4 border-t flex justify-end">
              <button onClick={() => setModalLog(null)} className="bg-blue-600 text-white px-4 py-1 rounded">
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="border rounded bg-white">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-3 py-1 bg-gray-50 border-b">
        <h4 className="font-semibold text-sm text-gray-600">{label}</h4>
      </div>
      {/* 내용 */}
      <div className="p-3 text-sm break-all min-h-[32px]">
        {value || <span className="text-gray-400">-</span>}
      </div>
    </div>
  );
}
