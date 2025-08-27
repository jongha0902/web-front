import React, { useEffect, useState, useRef } from 'react';
import api from '../utils/axios';
import { useError } from '../utils/ErrorContext';
import { useMessage } from '../utils/MessageContext';
import ApiListDropdown from './ApiListDropdown';
import { FileSearch } from 'lucide-react';

export default function Logs() {
  const [logs, setLogs] = useState([]);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(15);
  const [totalCount, setTotalCount] = useState(0);
  const totalPage = Math.max(1, Math.ceil(totalCount / perPage));
  const [filterUserId, setFilterUserId] = useState('');
  const [filterPath, setFilterPath] = useState('');
  const [modalData, setModalData] = useState(null);
  const [viewJson, setViewJson] = useState(false);
  const [methodFilter, setMethodFilter] = useState('ALL');
  
  // const [apiList, setApiList] = useState([]);
  // const [selectedApi, setSelectedApi] = useState('');
  const { showError } = useError();
  const { showMessage } = useMessage();
  
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
  

  // useEffect(() => {
  //   getApiList();
  // }, []);
  
  useEffect(() => {
    fetchLogs();
  }, [page, perPage]);

  // const getApiList = async () => {
  //   try {
  //     const params = { per_page: "-1" };
      
  //     const res = await api.get('/apim/api', { params });
  //     const options = res.data.items.map(api => ({
  //       api_id: api.api_id,
  //       name: api.api_name,
  //       label: `${api.method} | ${api.api_name} | ${api.path}`,
  //       method: api.method,
  //       path: api.path,
  //     }));
  //     setApiList(options);
  //   } catch (e) {
  //     const message = e.response?.data?.message || e.message || '오류';
  //     const detail = e.response?.data?.detail ? ` (${e.response.data.detail})` : '';
  //     showError(`❌ ${message}${detail}`);
  //   }
  // };

  const handleApiSelect = (api) => {
    //setSelectedApi(api);
    setFilterPath(api?.path || '');
    //setMethodFilter(api?.method || 'ALL');
  };

  const fetchLogs = async () => {
    const isValidDateTimeFormat = (value) => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value);

    if (!isValidDateTimeFormat(searchDateStart) || !isValidDateTimeFormat(searchDateEnd)) {
      showError("📅 날짜는 YYYY-MM-DDTHH:MM 형식으로 입력해주세요.");
      return;
    }

    // 🧠 시작일이 종료일보다 늦은 경우
    const start = new Date(searchDateStart);
    const end = new Date(searchDateEnd);

    if (start > end) {
      showError("🚫 조회 시작은 조회 종료보다 이전이어야 합니다.");
      return;
    }
  
    try {
      const params = {
        page,
        per_page: perPage,
        searchDateStart,
        searchDateEnd,
      };
      if (filterUserId) params.user_id = filterUserId;
      if (filterPath) params.path = filterPath;
      if (methodFilter !== "ALL") {
        params.method = methodFilter;
      }
  
      const res = await api.get("/apim/usage-log", { params });
      setLogs(res.data.items);
      setTotalCount(res.data.total_count);
    } catch (e) {
      const message = e.response?.data?.message || e.message || "오류";
      const detail = e.response?.data?.detail ? ` (${e.response.data.detail})` : "";
      showError(`❌ ${message}${detail}`);
    }
  };

  const handleSearch = () => {
    if (page !== 1) {
      setPage(1); // useEffect([page])에서 fetchLogs() 호출됨
    } else {
      fetchLogs();
    }
  };

  return (
    <div className="flex flex-col flex-1 h-full min-h-0">
      <h2 className="text-xl font-bold mb-2">📋 로그 조회</h2>

      <div className="flex flex-wrap justify-between items-start gap-4 mb-4 mt-2 text-sm p-3 bg-white shadow rounded">

        {/* 🔵 왼쪽 전체 필터 그룹 */}
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[320px]">

          {/* 유저 ID */}
          <div className="flex items-center">
            <label htmlFor="userId" className="w-20 text-center font-semibold text-gray-700">유저ID</label>
            <input
              id="userId"
              value={filterUserId}
              onChange={e => setFilterUserId(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              className="border px-3 py-2 rounded w-48 bg-blue-50"
            />
          </div>

          {/* 메서드 선택 */}
          <div className="flex items-center">
            <label className="w-20 text-gray-700 px-3 font-semibold">Method</label>
            <select
              value={methodFilter}
              onChange={(e) => {
                setMethodFilter(e.target.value);
                //setSelectedApi(null);
                setFilterPath('');
              }}
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

          {/* 요청 API 드롭다운 */}
          {/* <div className="flex items-center flex-wrap">
            <label htmlFor="path" className="w-24 text-center font-semibold text-gray-700">요청 API</label>
            <div className="w-[300px] sm:w-[400px] relative">
              <ApiListDropdown
                apiList={methodFilter === 'ALL' ? apiList : apiList.filter(api => api.method === methodFilter)}
                selectedApi={selectedApi}
                onChange={handleApiSelect}
                type="ALL"
              />
            </div>
          </div> */}
          {/* api명 검색 */}
          <div className="flex items-center">
            <label htmlFor="path" className="w-20 text-center font-semibold text-gray-700">API Path</label>
            <input
              id="path"
              value={filterPath}
              onChange={e => setFilterPath(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              className="border px-3 py-2 rounded w-[320px] bg-blue-50"
            />
          </div>

          {/* 조회기간 */}
          <div className="flex items-center flex-wrap gap-2 min-w-[300px]">
            <label className="w-20 text-gray-700 px-3 font-semibold">조회기간</label>
            <input
              type="datetime-local"
              value={searchDateStart}
              onChange={(e) => setSearchDateStart(e.target.value)}
              className="border px-3 py-1.5 rounded bg-blue-50 h-[38px]"
            />
            <span className="text-gray-500">~</span>
            <input
              type="datetime-local"
              value={searchDateEnd}
              onChange={(e) => setSearchDateEnd(e.target.value)}
              className="border px-3 py-1.5 rounded bg-blue-50 h-[38px]"
            />
          </div>
        </div>

        {/* 🔵 검색 버튼 (오른쪽 정렬, 좁은 화면에서는 하단으로 이동) */}
        <div className="flex-shrink-0">
          <button
            onClick={handleSearch}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            검색
          </button>
        </div>
      </div>




      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-semibold">📋 목록</h3>
      </div>
      
      <div className="bg-white shadow rounded p-3 flex flex-col grow min-h-0">
        <div className="flex justify-end items-center gap-2 mb-2 text-sm">
          <label htmlFor="perPageSelect">표시 수:</label>
          <select id="perPageSelect" value={perPage} onChange={e => { setPerPage(Number(e.target.value)); setPage(1); }} className="border px-2 py-1 rounded">
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
                  <th className="border px-3 py-2 w-[5%]">#</th>
                  <th className="border px-3 py-2 w-[6%]">사용자</th>
                  <th className="border px-3 py-2 w-[19%]">API</th>
                  <th className="border px-3 py-2 w-[5%]">Method</th>
                  <th className="border px-3 py-2 w-[5%]">상태</th>
                  <th className="border px-3 py-2 w-[12.5%]">요청 데이터</th>
                  <th className="border px-3 py-2 w-[12.5%]">응답 데이터</th>
                  <th className="border px-3 py-2 w-[15%]">요청시간</th>
                </tr>
              </thead>
              <tbody>
                {logs.length > 0 ? logs.map((log, i) => (
                  <tr key={i} className="hover:bg-gray-100 align-top">
                    <td className="border px-3 py-1">{totalCount - ((page - 1) * perPage + i)}</td>
                    <td className="border px-3 py-1 break-words">{log.user_id}</td>
                    <td className="border px-3 py-1 break-all text-xs text-left truncate" title={log.path}>{log.path}</td>
                    <td className="border px-3 py-1 break-all text-xs">{log.method}</td>
                    <td className="border px-3 py-1">{log.status_code}</td>
                    <td className="border px-3 py-1 text-xs">
                      <button
                        onClick={() => {
                          setModalData({ title: '요청 데이터', content: log.request_data });
                          setViewJson(false);
                        }}
                        className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1 rounded hover:bg-blue-100 text-xs"
                      >
                        <FileSearch size={14} />상세보기
                      </button>
                    </td>
                    <td className="border px-3 py-1 text-xs">
                      <button
                        onClick={() => {
                          setModalData({ title: '응답 데이터', content: log.response_data });
                          setViewJson(false);
                        }}
                        className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1 rounded hover:bg-blue-100 text-xs"
                      >
                        <FileSearch size={14} />상세보기
                      </button>
                    </td>
                    <td className="border px-3 py-1 text-xs">{log.request_time}</td>
                  </tr>
                )) : (
                  <tr><td colSpan="8" className="text-gray-500 py-6 text-center">등록된 로그가 없습니다.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

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
      
      {/* 상세보기 모달 */}
      {modalData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
          <div className="bg-white rounded shadow-lg max-w-3xl w-full min-h-[500px] max-h-[70vh] flex flex-col">
            <h3 className="text-lg font-bold p-4 border-b">{modalData.title}</h3>
            <div className="flex-1 overflow-y-auto p-4">
              <pre className="bg-gray-100 p-3 text-xs whitespace-pre-wrap break-all rounded min-h-[400px]">
                {viewJson ? JSON.stringify(tryParseJson(modalData.content), null, 2) : modalData.content}
              </pre>
            </div>
            <div className="p-4 border-t flex justify-end gap-2">
            <button
              onClick={() => {
                navigator.clipboard.writeText(
                  viewJson
                    ? JSON.stringify(tryParseJson(modalData.content), null, 2)
                    : modalData.content
                );
                showMessage('✅ 클립보드에 복사되었습니다.');
              }}
              className="bg-gray-400 text-white px-4 py-1 rounded"
            >
              복사
            </button>
              <button
                onClick={() => setViewJson(v => !v)}
                className="bg-gray-300 text-gray-800 px-4 py-1 rounded"
              >
                {viewJson ? '원문 보기' : 'JSON 보기'}
              </button>
              <button
                onClick={() => setModalData(null)}
                className="bg-blue-600 text-white px-4 py-1 rounded"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  function tryParseJson(str) {
    try {
      return JSON.parse(str);
    } catch {
      return { error: '유효한 JSON이 아닙니다.', 원문: str };
    }
  }
}
