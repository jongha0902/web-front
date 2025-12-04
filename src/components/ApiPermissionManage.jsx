import React, { useEffect, useState, useRef, use } from 'react';
import api from '../utils/axios';
import { useError } from '../utils/ErrorContext';
import { useMessage } from '../utils/MessageContext';
import ApiListDropdown from './ApiListDropdown';

const UserApiPermissionManager = () => {
  const { showError } = useError();
  const { showMessage } = useMessage();
  const [users, setUsers] = useState([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchField, setSearchField] = useState('user_id');
  const [selectedUser, setSelectedUser] = useState(null);
  const [apiList, setApiList] = useState([]);
  const [userPermissions, setUserPermissions] = useState(new Set());

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(15);
  const [totalCount, setTotalCount] = useState(0);
  const [apiSearchKeyword, setApiSearchKeyword] = useState('');
  const [methodFilter, setMethodFilter] = useState('ALL');

  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestApiList, setRequestApiList] = useState([]);
  const [requestSelectedApi, setRequestSelectedApi] = useState('');
  const [requestList, setRequestList] = useState([]);
  const [requestUserId, setRequestUserId] = useState('');
  const [requestMethod, setRequestMethod] = useState('ALL');
  const [requestPath, setRequestPath] = useState('');
  const today = new Date();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(today.getDate() - 7);
  const formatDate = (date) => date.toISOString().split('T')[0]; // YYYY-MM-DD
  const [requestDateStart, setRequestDateStart] = useState(formatDate(sevenDaysAgo));
  const [requestDateEnd, setRequestDateEnd] = useState(formatDate(today));
  const [requestStatus, setRequestStatus] = useState('ALL');
  const [pendingCount, setPendingCount] = useState(0);

  const [reasonModalOpen, setReasonModalOpen] = useState(false);
  const [selectedReason, setSelectedReason] = useState('');

  function useInterval(callback, delay) {
    const savedCallback = useRef();
  
    // 매 렌더링마다 최신 콜백 저장
    useEffect(() => {
      savedCallback.current = callback;
    }, [callback]);
  
    // 타이머 설정
    useEffect(() => {
      if (delay === null) return;
  
      const id = setInterval(() => savedCallback.current(), delay);
      return () => clearInterval(id);
    }, [delay]);
  }

  useInterval(() => {
    if (!showRequestModal) {
      getPendingRequestCount();
    }
  }, 60000); // 1분마다 실행

  useEffect(() => {
    getPendingRequestCount();
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [page, perPage]);

  useEffect(() => {
    if (selectedUser) {
      fetchApiListWithPermissions(selectedUser.user_id);
    }
  }, [selectedUser]);

  const requestParamInit = () => {
    setRequestUserId('');
    setRequestMethod('ALL'); 
    setRequestSelectedApi(null);
    setRequestPath('');
    setRequestDateStart(formatDate(sevenDaysAgo)); 
    setRequestDateEnd(formatDate(today));
    setRequestStatus('ALL');
  }

  const handleToggleRequests = () => {
    requestParamInit();
    setShowRequestModal(prev => {
      const toggle = !prev;
      if (toggle) { // 모달이 열릴 때만 실행
        getRequestList();  
        getRequestApiList();
      }else{
        getPendingRequestCount();
        if(selectedUser) fetchApiListWithPermissions(selectedUser.user_id);
      }
      return toggle;
    });
  };

  const getPendingRequestCount = async () => {
    try {
      const res = await api.get('/apim/api-permission-requests/pending-count');
      setPendingCount(res.data.pendingCount || 0);
    } catch (e) {
      const message = e.response?.data?.message || e.message || '오류';
      const detail = e.response?.data?.detail ? ` (${e.response.data.detail})` : '';
      showError(`❌ ${message}${detail}`);
    }
  };

  const getRequestApiList = async () => {
    try {
      const params = { per_page: "-1", use_yn: "Y" };
  
      const res = await api.get('/apim/api', { params });
      const options = res.data.items.map(api => ({
        label: `${api.method} | ${api.api_name}`,
        name: api.api_name,
        method: api.method,
        path: api.path,
        description: api.description
      }));
      setRequestApiList(options);
    } catch (e) {
      const message = e.response?.data?.message || e.message || '오류';
      const detail = e.response?.data?.detail ? ` (${e.response.data.detail})` : '';
      showError(`❌ ${message}${detail}`);
    }
  };

  const handleRequestApiSelect = (api) => {
    setRequestSelectedApi(api);
    setRequestPath(api?.path || '');
    if(api){
      setRequestMethod(api?.method);
    }
  };

  const getRequestList = async () => {
    try {
      const params = {};
      if (requestUserId) params.user_id = requestUserId;
      if (requestMethod !== 'ALL') params.method = requestMethod;
      if (requestPath) params.path = requestPath;
      if (requestDateStart) params.start_date = requestDateStart;
      if (requestDateEnd) params.end_date = requestDateEnd;
      if (requestStatus !== 'ALL') params.status = requestStatus;
  
      const res = await api.get('/apim/api-permission-requests', { params });
      setRequestList(res.data.requestList || []);
    } catch (e) {
      const message = e.response?.data?.message || e.message || '오류';
      const detail = e.response?.data?.detail ? ` (${e.response.data.detail})` : '';
      showError(`❌ ${message}${detail}`);
    }
  };

  const handleApproveRequest = async (requestId) => {
    try {
      let res = await api.post(`/apim/api-permission-requests/${requestId}/approve`);
      showMessage(res.data.message);
      getRequestList(); // 최신 데이터 갱신
    } catch (e) {
      const message = e.response?.data?.message || e.message || '오류';
      const detail = e.response?.data?.detail ? ` (${e.response.data.detail})` : '';
      showError(`❌ ${message}${detail}`);
    }
  };
  
  const handleRejectRequest = async (requestId) => {
    try {
      let res = await api.post(`/apim/api-permission-requests/${requestId}/reject`);
      showMessage(res.data.message);
      getRequestList(); // 최신 데이터 갱신
    } catch (e) {
      const message = e.response?.data?.message || e.message || '오류';
      const detail = e.response?.data?.detail ? ` (${e.response.data.detail})` : '';
      showError(`❌ ${message}${detail}`);
    }
  };

  const filteredApiList = apiList.filter((api) => {
    const keywordMatch =
      api.api_name.toLowerCase().includes(apiSearchKeyword.toLowerCase()) ||
      api.path.toLowerCase().includes(apiSearchKeyword.toLowerCase());

    const methodMatch =
      methodFilter === 'ALL' || api.method.toUpperCase() === methodFilter;

    return keywordMatch && methodMatch;
  });


  const fetchUsers = async () => {
    try {
      const params = { page, per_page: perPage, use_yn: 'Y' };
      if (searchKeyword) {
        params[searchField] = searchKeyword;
      }
      const res = await api.get('/apim/user', { params });
      setUsers(res.data.items || []);
      setTotalCount(res.data.total_count || 0);
    } catch (e) {
      const message = e.response?.data?.message || e.message || '오류';
      const detail = e.response?.data?.detail ? ` (${e.response.data.detail})` : '';
      showError(`❌ ${message}${detail}`);
    }
  };

  const fetchApiListWithPermissions = async (userId) => {
    try {
      const res = await api.get(`/apim/api-permissions/${userId}`);
      setApiList(res.data.permissionList || []);
      setUserPermissions(new Set(res.data.permissionList.filter(p => p.has_permission).map(p => `${p.api_id}-${p.method}`)));
    } catch (e) {
      const message = e.response?.data?.message || e.message || '오류';
      const detail = e.response?.data?.detail ? ` (${e.response.data.detail})` : '';
      showError(`❌ ${message}${detail}`);
    }
  };

  const handleCheckboxChange = (apiId, method) => {
    setUserPermissions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(`${apiId}-${method}`)) newSet.delete(`${apiId}-${method}`);
      else newSet.add(`${apiId}-${method}`);
      return newSet;
    });
  };

  const savePermissions = async () => {
    try {
      // 1. Set을 배열로 변환: ["LLM_RAG-GET", "OTHER-API-POST", ...]
      const permissionStrings = Array.from(userPermissions);

      // 2. map을 사용해 각 문자열을 { api_id, method } 객체로 변환
      const permissionsPayload = permissionStrings.map(permString => {
        // 마지막 하이픈(-)의 위치를 찾음
        const lastHyphenIndex = permString.lastIndexOf('-');

        // 만약 하이픈이 없다면(비정상 데이터) null 반환
        if (lastHyphenIndex === -1) return null; 

        // 하이픈 앞부분을 api_id로, 뒷부분을 method로 분리
        const api_id = permString.substring(0, lastHyphenIndex);
        const method = permString.substring(lastHyphenIndex + 1);

        return { api_id, method };
      }).filter(Boolean); // 혹시 모를 null 값 제거

      // 3. 분리된 객체 배열을 서버로 전송
      await api.post(`/apim/api-permissions/${selectedUser.user_id}`, {
        permissions: permissionsPayload, // 백엔드 명세에 맞는 key 이름 사용
      });
      
      showMessage('✅ 권한이 저장되었습니다.');
      getPendingRequestCount();
      fetchApiListWithPermissions(selectedUser.user_id);
    } catch (e) {
      const message = e.response?.data?.message || e.message || '오류';
      const detail = e.response?.data?.detail ? ` (${e.response.data.detail})` : '';
      showError(`❌ ${message}${detail}`);
    }
  };

  const totalPage = Math.max(1, Math.ceil(totalCount / perPage));

  return (
    <div className="flex flex-col flex-1 h-full min-h-0">
      <h2 className="text-xl font-bold mb-2">🔐 API 권한 관리</h2>

      <div className="flex flex-row flex-1 gap-4 mt-2 min-h-0">
        {/* 유저 목록 */}
        <div className="flex flex-col min-w-[330px] max-w-[420px] border rounded p-3 bg-white shadow">
          <h2 className="text-lg font-semibold mb-1">📋 유저 목록</h2>

          {/* 🔧 검색 영역 */}
          <div className="flex flex-wrap items-center gap-2 mt-2 bg-white px-4 py-2 rounded border shadow-sm">
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
                  fetchUsers();
                  setSelectedUser(null);
                  setApiList([]);
                }
              }}
              placeholder="검색어 입력"
              className="flex-1 min-w-[120px] border bg-blue-50 px-3 py-2 rounded text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
            <button
              onClick={() => {
                setPage(1);
                fetchUsers();
                setSelectedUser(null);
                setApiList([]);
              }}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
            >
              검색
            </button>
          </div>

          {/* 🔽 표시 수 드롭다운 영역 */}
          <div className="flex items-center justify-end gap-1 mt-2 mb-2 text-sm">
            <label className="text-gray-600 whitespace-nowrap">표시 수:</label>
            <select
              value={perPage}
              onChange={(e) => {
                setPage(1);
                setPerPage(Number(e.target.value));
              }}
              className="border px-1.5 py-1 rounded text-sm w-[50px]"
            >
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={20}>20</option>
            </select>
          </div>

          <div className="flex-1 overflow-y-auto border rounded">
            <table className="w-full text-sm border text-center table-fixed">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="border px-3 py-2 w-[15%]">#</th>
                  <th className="border px-3 py-2 w-[42.5%]">이름</th>
                  <th className="border px-3 py-2 w-[42.5%]">ID</th>
                </tr>
              </thead>
              <tbody>
                {users.length > 0 ? (
                  users.map((user, index) => (
                    <tr
                      key={user.user_id}
                      onClick={() => setSelectedUser(user)}
                      className={`cursor-pointer hover:bg-blue-100 transition-all duration-150 ${
                        selectedUser?.user_id === user.user_id
                          ? 'bg-blue-100 text-blue-600 font-semibold'
                          : ''
                      }`}
                    >
                      <td className="border px-3 py-2">{(page - 1) * perPage + index + 1}</td>
                      <td className="border px-3 py-2">{user.user_name}</td>
                      <td className="border px-3 py-2">{user.user_id}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="text-center py-6 text-gray-500">
                      등록된 유저가 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

    
          <div className="flex justify-center items-center gap-2 mt-4 text-sm">
            <button
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page === 1}
              className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded disabled:opacity-50"
            >
              ◀ 이전
            </button>
            <span>{page} / {totalPage}</span>
            <button
              onClick={() => setPage((prev) => Math.min(totalPage, prev + 1))}
              disabled={page >= totalPage}
              className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded disabled:opacity-50"
            >
              다음 ▶
            </button>
          </div>
        </div>
    
        {/* API 권한 테이블 */}
        <div className="flex flex-col flex-1 bg-white shadow rounded p-4 min-w-[750px]">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-lg font-semibold">🔐 API 권한 설정</h2>
            <button 
              className="relative px-3 py-1.5 bg-yellow-400 hover:bg-yellow-500 rounded text-sm font-semibold"
              onClick={() => {handleToggleRequests(); requestParamInit();}}
            >
              📬 신청 내역 보기
              {pendingCount > 0 && (
                <span className="absolute -top-2 -right-2 flex items-center justify-center h-5 w-5">
                  {/* 뿌려지는 효과 */}
                  <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75 animate-ping"></span>
                
                  {/* 숫자 뱃지 */}
                  <span className="relative z-10 inline-flex items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold w-5 h-5">
                    {pendingCount}
                  </span>
                </span>
              )}
            </button>
          </div>
          
          {/* 🔍 검색 + Method 필터 */}
          <div className="flex flex-wrap items-center gap-2 mt-2 mb-2 bg-white px-4 py-2 rounded border shadow-sm">
            <label className="w-20 text-gray-700 px-3">검색어</label>
            <input
              type="text"
              value={apiSearchKeyword}
              onChange={(e) => setApiSearchKeyword(e.target.value)}
              placeholder="API 이름 또는 경로로 검색"
              className="flex-1 min-w-[180px] border px-3 py-2 rounded text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-blue-50"
            />
            <label className="w-20 text-gray-700 px-3">Method</label>
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
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
            <button
              onClick={() => {
                setApiSearchKeyword('');
                setMethodFilter('ALL');
              }}
              className="px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded text-sm"
            >
              초기화
            </button>
          </div>

          {!selectedUser ? (
            <div className="flex flex-1 items-center justify-center text-gray-500 text-lg font-semibold border">
              유저를 선택해주세요.
            </div>
          ) : (
            <>
              {/* 📋 테이블 */}
              <div className="flex-1 overflow-y-auto border-t">
                <table className="w-full text-sm border text-center table-fixed">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th className="border px-3 py-2 w-[4.5%]">#</th>
                      <th className="border px-3 py-2 w-[13.5%]">API ID</th>
                      <th className="border px-3 py-2 w-[13.5%]">API 이름</th>
                      <th className="border px-3 py-2 w-[40%]">경로</th>
                      <th className="border px-3 py-2 w-[10%]">Method</th>
                      <th className="border px-3 py-2 w-[10%] text-center">
                        <label className="inline-flex items-center gap-2 cursor-pointer">
                          <span className="text-sm">권한</span>
                          <input
                            type="checkbox"
                            checked={
                              filteredApiList.length > 0 &&
                              filteredApiList.every(api => userPermissions.has(`${api.api_id}-${api.method}`))
                            }
                            onChange={(e) => {
                              const newSet = new Set(userPermissions);
                              if (e.target.checked) {
                                filteredApiList.forEach(api => newSet.add(`${api.api_id}-${api.method}`));
                              } else {
                                filteredApiList.forEach(api => newSet.delete(`${api.api_id}-${api.method}`));
                              }
                              setUserPermissions(newSet);
                            }}
                            title="전체 선택"
                            className="cursor-pointer"
                          />
                        </label>
                      </th>

                    </tr>
                  </thead>
                  <tbody>
                    {filteredApiList.length > 0 ? (
                      filteredApiList.map((api, index) => (
                        <tr key={`${api.api_id}-${api.method}`} className="hover:bg-gray-100">
                          <td className="border px-3 py-2">{index + 1}</td>
                          <td className="border px-3 py-2 text-left truncate">{api.api_id}</td>
                          <td className="border px-3 py-2 text-left truncate">{api.api_name}</td>
                          <td className="border px-3 py-2 text-left truncate font-mono break-all">{api.path}</td>
                          <td className="border px-3 py-2 uppercase">{api.method}</td>
                          <td className="border px-3 py-2">
                            <input
                              type="checkbox"
                              checked={userPermissions.has(`${api.api_id}-${api.method}`)}
                              onChange={() => handleCheckboxChange(api.api_id, api.method)}
                            />
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr className="text-gray-500 text-center">
                        <td className="border px-3 py-6" colSpan={5}>권한 가능한 API가 없습니다.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* 💾 저장 버튼 */}
              <div className="text-right pt-2 border-t">
                <button
                  onClick={savePermissions}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  저장
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {showRequestModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-40">
          <div className="bg-white rounded shadow-lg max-w-[95%] max-h-[90%] overflow-hidden flex flex-col">
            
            {/* 헤더 */}
            <div className="flex justify-between items-center px-5 py-3 border-b">
              <h3 className="text-lg font-semibold">📬 권한 신청 내역</h3>
              <button onClick={() => handleToggleRequests()} className="text-gray-600 hover:text-black text-lg">
                ✖
              </button>
            </div>

            {/* 검색바 */}
            <div className="px-5 pt-4">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-3 bg-white px-4 py-3 rounded border shadow-sm">

                {/* 유저 ID */}
                <div className="flex items-center gap-2 min-w-[220px]">
                  <label className="text-gray-700 whitespace-nowrap">유저 ID</label>
                  <input type="text" value={requestUserId} onChange={(e) => setRequestUserId(e.target.value)} className="border px-3 py-1.5 rounded bg-blue-50 w-full h-[38px]" />
                </div>

                {/* Method */}
                <div className="flex items-center gap-2 min-w-[180px]">
                  <label className="text-gray-700 whitespace-nowrap">Method</label>
                  <select value={requestMethod} onChange={(e) => { setRequestMethod(e.target.value); setRequestSelectedApi(null); setRequestPath(''); }} className="border px-3 py-1.5 rounded bg-blue-50 w-full h-[38px]">
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

                {/* API 경로 */}
                <div className="flex items-center gap-2 min-w-[380px]">
                  <label className="text-gray-700 whitespace-nowrap">API 경로</label>
                  <div className="w-96">
                    <ApiListDropdown
                      apiList={requestMethod === 'ALL' ? requestApiList : requestApiList.filter(api => api.method === requestMethod)}
                      selectedApi={requestSelectedApi}
                      onChange={handleRequestApiSelect}
                      type='ALL'
                    />
                  </div>
                </div>

                {/* 신청일 */}
                <div className="flex items-center gap-2 min-w-[320px]">
                  <label className="text-gray-700 whitespace-nowrap">신청일</label>
                  <input type="date" value={requestDateStart} onChange={(e) => setRequestDateStart(e.target.value)} className="border px-3 py-1.5 rounded bg-blue-50 h-[38px]" />
                  <span className="text-gray-500">~</span>
                  <input type="date" value={requestDateEnd} onChange={(e) => setRequestDateEnd(e.target.value)} className="border px-3 py-1.5 rounded bg-blue-50 h-[38px]" />
                </div>

                {/* 상태 */}
                <div className="flex items-center gap-2 min-w-[200px]">
                  <label className="text-gray-700 whitespace-nowrap">상태</label>
                  <select value={requestStatus} onChange={(e) => setRequestStatus(e.target.value)} className="border px-3 py-1.5 rounded bg-blue-50 w-full h-[38px]">
                    <option value="ALL">전체</option>
                    <option value="PENDING">⏳ 대기</option>
                    <option value="APPROVED">✅ 승인</option>
                    <option value="REJECTED">❌ 반려</option>
                  </select>
                </div>

                {/* 버튼 영역 */}
                <div className="flex gap-2 ml-auto">
                  <button onClick={getRequestList} className="px-4 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700">검색</button>
                  <button onClick={() => requestParamInit()} className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 rounded">초기화</button>
                </div>

              </div>
            </div>

            {/* 테이블 영역 */}
            <div className="flex-1 px-5 py-4 overflow-hidden">
              <div className="h-[600px] border rounded flex flex-col">
                <div className="overflow-y-auto flex-1">
                  <table className="w-full text-sm text-center border table-fixed">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                      <tr>
                        <th className="border px-3 py-2 w-[4%]">#</th>
                        <th className="border px-3 py-2 w-[7%]">유저 ID</th>
                        <th className="border px-3 py-2 w-[10%]">API ID</th>
                        <th className="border px-3 py-2 w-[10%]">API 이름</th>
                        <th className="border px-3 py-2 w-[15%]">경로</th>
                        <th className="border px-3 py-2 w-[7%]">Method</th>
                        <th className="border px-3 py-2 w-[7%]">상태</th>
                        <th className="border px-3 py-2 w-[5%]">신청사유</th>
                        <th className="border px-3 py-2 w-[9%]">신청일</th>
                        <th className="border px-3 py-2 w-[10%]">처리자</th>
                        <th className="border px-3 py-2 w-[9%]">처리일</th>
                        <th className="border px-3 py-2 w-[7%]">처리</th>
                      </tr>
                    </thead>
                    <tbody>
                      {requestList.length > 0 ? (
                        requestList.map((req, index) => (
                          <tr key={req.request_id} className="hover:bg-gray-50">
                            <td className="border px-3 py-2">{index + 1}</td>
                            <td className="border px-3 py-2">{req.user_id}</td>
                            <td className="border px-3 py-2 text-left">{req.api_id}</td>
                            <td className="border px-3 py-2 text-left">{req.api_name}</td>
                            <td className="border px-3 py-2 text-left font-mono text-xs break-all">{req.path}</td>
                            <td className="border px-3 py-2">{req.method}</td>
                            <td className="border px-3 py-2">
                              {req.status === 'PENDING' && '⏳ 대기'}
                              {req.status === 'APPROVED' && '✅ 승인'}
                              {req.status === 'REJECTED' && '❌ 반려'}
                            </td>
                            <td className="border px-3 py-2">
                              {req.memo ? (
                                <button
                                  onClick={() => {
                                    setSelectedReason(req.memo);
                                    setReasonModalOpen(true);
                                  }}
                                  className="text-blue-600 hover:text-blue-800"
                                  title="신청사유 보기"
                                >
                                  🔍
                                </button>
                              ) : (
                                '-'
                              )}
                            </td>
                            <td className="border px-3 py-2 text-xs">{req.request_date || '-'}</td>
                            <td className="border px-3 py-2 text-xs">{req.response_id || '-'}</td>
                            <td className="border px-3 py-2 text-xs">{req.response_date || '-'}</td>
                            <td className="border px-3 py-2">
                              {req.status === 'PENDING' ? (
                                <div className="flex gap-1 justify-center">
                                  <button
                                    onClick={() => handleApproveRequest(req.request_id)}
                                    className="bg-green-500 text-white px-2 py-1 rounded text-xs hover:bg-green-600"
                                  >
                                    승인
                                  </button>
                                  <button
                                    onClick={() => handleRejectRequest(req.request_id)}
                                    className="bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600"
                                  >
                                    반려
                                  </button>
                                </div>
                              ) : (
                                '-'
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={10} className="text-center text-gray-500 py-6">
                            신청 내역이 없습니다.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div> 
              </div>
            </div>

            {/* 푸터 */}
            <div className="px-5 py-3 border-t text-right">
              <button
                onClick={() => handleToggleRequests()}
                className="bg-gray-300 hover:bg-gray-400 text-sm px-4 py-2 rounded"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 신청사유 모달 */}
      {reasonModalOpen && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-40 flex items-center justify-center">
          <div className="bg-white w-[500px] max-w-[90%] rounded shadow-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">📄 API 신청사유</h3>
              <button onClick={() => setReasonModalOpen(false)} className="text-gray-500 hover:text-black text-lg">✖</button>
            </div>
            <div className="border rounded p-3 text-gray-800 whitespace-pre-wrap h-[400px] overflow-y-auto">
              {selectedReason}
            </div>
            <div className="mt-4 text-right">
              <button onClick={() => setReasonModalOpen(false)} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">닫기</button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
};

export default UserApiPermissionManager;
