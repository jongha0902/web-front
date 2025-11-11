import React, { useState, useEffect } from 'react';
import api from '../utils/axios';
import { useAuth } from '../store/Auth';
import { useMessage } from '../utils/MessageContext';
import { useError } from '../utils/ErrorContext';
import useSortableData from '../utils/useSortableData';
import ApiListDropdown from './ApiListDropdown';

const ApiPermissionRequest = () => {
  const { user, refreshUser } = useAuth();
  const { showMessage } = useMessage();
  const { showError } = useError();

  const [apiList, setApiList] = useState([]);
  const [methodFilter, setMethodFilter] = useState('ALL');
  const [selectedApi, setSelectedApi] = useState(null);
  const [reason, setReason] = useState('');
  const [permissionList, setPermissionList] = useState([]);
  const [apiSearchKeyword, setApiSearchKeyword] = useState('');
  const [permissionMethodFilter, setPermissionMethodFilter] = useState('ALL');

  // 🔑 모달에서 발급/재발급 구분 위해 type까지 보관
  // { key: string, type: 'create' | 'regenerate' }
  const [apiKeyInfo, setApiKeyInfo] = useState(null);

  useEffect(() => {
    fetchApiList();
    fetchPermissionList();
  }, []);

  const fetchApiList = async () => {
    try {
      const res = await api.get('/apim/api', { params: { per_page: '-1', use_yn: "Y" } });
      const options = Array.isArray(res.data.items)
        ? res.data.items.map(api => ({
            id: api.api_id,
            label: `${api.method} | ${api.api_name}`,
            name: api.api_name,
            method: api.method,
            path: api.path,
            description: api.description
          }))
        : [];
      setApiList(options);
    } catch (e) {
      const message = e.response?.data?.message || e.message || '오류';
      showError(`❌ ${message}`);
    }
  };

  const fetchPermissionList = async () => {
    try {
      const res = await api.get(`/apim/api-permissions/${user.user_id}`);
      setPermissionList(Array.isArray(res.data.permissionList) ? res.data.permissionList : []);
    } catch (e) {
      const message = e.response?.data?.message || e.message || '오류';
      showError(`❌ ${message}`);
      setPermissionList([]);
    }
  };

  const filteredApiList = apiList.filter(api => {
    const perm = permissionList.find(p => p.api_id === api.id && p.method === api.method);
    const isPermitted = perm?.has_permission === 1 || perm?.request_status === 'PENDING';
    const matchesMethod = methodFilter === 'ALL' || api.method === methodFilter;
    return !isPermitted && matchesMethod;
  });

  const handleApiKey = async () => {
    try {
      if (!user?.user_id) {
        showMessage("유저ID는 필수입니다.");
        return;
      }

      // 현재 상태를 기준으로 type 결정
      const wasHasApiKey = !!user?.has_api_key;

      let res;
      if (wasHasApiKey) { // 재발급
        res = await api.put(`/apim/api-key/${user.user_id}/regenerate`);
      } else { // 최초 발급
        res = await api.post('/apim/api-key', { user_id: user.user_id });
      }

      const key = res.data.api_key || res.data.new_api_key;
      setApiKeyInfo({ key, type: wasHasApiKey ? 'regenerate' : 'create' });

      // ✅ 발급/재발급 성공 후에는 무조건 전역 프로필 재조회해서 user.has_api_key 동기화
      await refreshUser();

    } catch (e) {
      const message = e.response?.data?.message || e.message || '오류';
      const detail = e.response?.data?.detail ? ` (${e.response.data.detail})` : '';
      showError(`❌ ${message}${detail}`);
    }
  };

  const handleRequest = async () => {
    if (!selectedApi || !reason.trim()) {
      showError('❗ API 선택과 신청 사유를 모두 입력해주세요.');
      return;
    }

    try {
      const payload = {
        api_id: selectedApi.id,
        method: selectedApi.method,
        reason,
      };
      const res = await api.post(`/apim/api-permission-requests/${user.user_id}`, payload);
      showMessage(res.data.message);
      setSelectedApi(null);
      setReason('');
      fetchPermissionList();
    } catch (e) {
      const message = e.response?.data?.message || e.message || '오류';
      const detail = e.response?.data?.detail ? ` (${e.response.data.detail})` : '';
      showError(`❌ ${message}${detail}`);
    }
  };

  const filteredPermissionApiList = permissionList.filter((item) => {
    const name = (item.api_name || '').toLowerCase();
    const path = (item.path || '').toLowerCase();
    const keyword = apiSearchKeyword.toLowerCase();

    const keywordMatch = name.includes(keyword) || path.includes(keyword);
    const methodMatch = permissionMethodFilter === 'ALL' || (item.method || '').toUpperCase() === permissionMethodFilter;
    return keywordMatch && methodMatch;
  });

  const { sortedData, sortField, sortDirection, handleSort } = useSortableData(filteredPermissionApiList);

  return (
    <div className="flex flex-col flex-1 h-full min-h-0">
      <h2 className="text-xl font-bold mb-2">🔑 API 권한 신청</h2>
      
      <div className="flex flex-row flex-1 gap-4 mt-2 min-h-0">
        {/* 왼쪽 - 신청 영역 */}
        <div className="w-[550px] flex-none bg-white border rounded shadow p-6 flex flex-col gap-4">

          {/* 🔑 API Key 발급 or 재발급 영역 */}
          <div className="bg-white border rounded shadow p-6 mb-4">
            <h2 className="text-lg font-bold mb-2">
              🔑 API Key {user?.has_api_key ? '재발급' : '발급'}
            </h2>

            <p className="text-sm text-gray-600 mb-4">
              {user?.has_api_key
                ? '이미 API Key가 발급된 계정입니다.'
                : 'API Key가 발급되지 않은 계정입니다.'}
            </p>

            <div className="flex justify-end">
              <button
                onClick={handleApiKey}
                className={`${user?.has_api_key ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-green-600 hover:bg-green-700'} text-white px-4 py-2 rounded text-sm`}
              >
                {user?.has_api_key ? 'API Key 재발급' : 'API Key 신규 발급'}
              </button>
            </div>
          </div>

          <div className="bg-white border rounded shadow p-6 flex flex-col gap-4 flex-grow">
            <h2 className="text-xl font-bold mb-2">📮 API 권한 신청</h2>

            {/* 입력 필드 영역 (전체 높이 사용) */}
            <div className="flex flex-col gap-4 flex-grow">
              {/* Method Filter */}
              <div className="grid grid-cols-[80px_1fr] items-center gap-2">
                <label className="text-sm text-gray-700">Method</label>
                <select
                  value={methodFilter}
                  onChange={(e) => {
                    setMethodFilter(e.target.value);
                    setSelectedApi(null);
                  }}
                  className="border rounded px-3 py-1 bg-blue-50"
                >
                  <option value="ALL">전체</option>
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="PATCH">PATCH</option>
                  <option value="DELETE">DELETE</option>
                </select>
              </div>

              {/* API 선택 */}
              <div className="grid grid-cols-[80px_1fr] items-center gap-2">
                <label className="text-sm text-gray-700">신청 가능한 API</label>
                <div className="w-full relative">
                  {filteredApiList.length > 0 ? (
                    <ApiListDropdown
                      apiList={filteredApiList}
                      selectedApi={selectedApi}
                      onChange={setSelectedApi}
                      type=""
                    />
                  ) : (
                    <div className="text-sm text-gray-500 px-2 py-2 border rounded bg-gray-50">
                      신청 가능한 API가 없습니다.
                    </div>
                  )}
                </div>
              </div>

              {/* 사유 입력 */}
              <div className="grid grid-cols-[80px_1fr] items-start gap-2 flex-grow">
                <label className="text-sm text-gray-700 mt-1">신청 사유</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="border rounded px-3 py-2 bg-blue-50 w-full h-full resize-none"
                  placeholder="API 권한이 필요한 이유를 작성해주세요."
                />
              </div>
            </div>

            {/* 신청 버튼 (하단 고정) */}
            <div className="text-right mt-2">
              <button
                onClick={handleRequest}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
              >
                신청
              </button>
            </div>
          </div>
        </div>
        
        {/* 오른쪽 내 권한 영역 */}
        <div className="flex flex-col border rounded p-4 bg-white shadow">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-lg font-semibold">🔐 내 API 권한 목록</h2>
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
            {/* 🔧 버그 수정: methodFilter → permissionMethodFilter */}
            <select
              value={permissionMethodFilter}
              onChange={(e) => setPermissionMethodFilter(e.target.value)}
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
                setPermissionMethodFilter('ALL');
                fetchApiList();
              }}
              className="px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded text-sm"
            >
              초기화
            </button>
          </div>

          {/* 📋 권한 테이블 */}
          <div className="flex-1 overflow-y-auto min-h-0 border rounded">
            <table className="w-full text-sm border text-center table-fixed">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="border px-3 py-2 w-[5%]">#</th>
                    <th className="border px-3 py-2 w-[14%]">API id</th>
                    <th
                      className="border px-3 py-2 w-[20%] cursor-pointer"
                      onClick={() => handleSort('api_name')}
                    >
                      API 이름 {sortField === 'api_name' && (sortDirection === 'asc' ? '▲' : '▼')}
                    </th>
                    <th
                      className="border px-3 py-2 w-[30%] cursor-pointer"
                      onClick={() => handleSort('description')}
                    >
                      설명 {sortField === 'description' && (sortDirection === 'asc' ? '▲' : '▼')}
                    </th>
                    <th
                      className="border px-3 py-2 w-[9%] cursor-pointer"
                      onClick={() => handleSort('method')}
                    >
                      Method {sortField === 'method' && (sortDirection === 'asc' ? '▲' : '▼')}
                    </th>
                    <th
                      className="border px-3 py-2 w-[10%] cursor-pointer"
                      onClick={() => handleSort('has_permission')}
                    >
                      권한 {sortField === 'has_permission' && (sortDirection === 'asc' ? '▲' : '▼')}
                    </th>
                    <th
                      className="border px-3 py-2 w-[11%] cursor-pointer"
                      onClick={() => handleSort('request_status')}
                    >
                      신청 상태 {sortField === 'request_status' && (sortDirection === 'asc' ? '▲' : '▼')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedData.length > 0 ? (
                    sortedData.map((item, idx) => (
                      <tr key={`${item.api_id}-${item.method}`} className="hover:bg-gray-50">
                        <td className="border px-3 py-2">{idx + 1}</td>
                        <td className="border px-3 py-2">{item.api_id}</td>
                        <td className="border px-3 py-2 text-left truncate" title={item.api_name}>{item.api_name}</td>
                        <td className="border px-3 py-2 text-left font-mono break-all" title={item.description}>{item.description}</td>
                        <td className="border px-3 py-2">{item.method}</td>
                        <td className="border px-3 py-2 font-semibold">
                          {item.has_permission ? '✅ 보유' : '❌ 없음'}
                        </td>
                        <td className="border px-3 py-2">
                          {item.request_status === 'PENDING' && <span className="text-yellow-600 font-medium">⏳ 대기</span>}
                          {item.request_status === 'APPROVED' && <span className="text-green-600 font-medium">✅ 승인</span>}
                          {item.request_status === 'REJECTED' && <span className="text-red-600 font-medium">❌ 반려</span>}
                          {item.request_status === 'return' && <span className="text-red-600 font-medium">🔁 권한철회</span>}
                          {!item.request_status && <span className="text-gray-400">-</span>}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="text-center text-gray-500 py-6">
                        권한이 부여된 API가 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
          </div>
        </div>

        {/* 🔔 API Key 발급/재발급 결과 모달 */}
        {apiKeyInfo && (
          <ModalApiKeyResult
            apiKey={apiKeyInfo.key}
            type={apiKeyInfo.type}
            onClose={() => setApiKeyInfo(null)}
          />
        )}
      </div>
    </div>
  );
};

const ModalApiKeyResult = ({ apiKey, type, onClose }) => {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(apiKey);
      alert('복사되었습니다!');
    } catch (err) {
      alert('복사 실패');
    }
  };

  const isRegen = type === 'regenerate';

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex justify-center items-center">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md text-left relative pb-20">
        <h3 className="text-lg font-bold mb-4 text-gray-800 border-b pb-2">
          {isRegen ? '🔄 API Key 재발급 완료' : '✅ API Key 발급 완료'}
        </h3>
        <p className="text-sm text-gray-700 mb-4">
          {isRegen
            ? '아래 새 API Key를 안전하게 보관해주세요. 기존 키는 즉시 무효화됩니다.'
            : '아래 API Key를 안전하게 보관해주세요. 재발급 시 기존 키는 무효화됩니다.'}
        </p>
        <div className="bg-gray-100 text-gray-800 px-4 py-2 rounded font-mono text-sm break-all flex items-center justify-between">
          <span>{apiKey}</span>
          <button
            onClick={handleCopy}
            className="ml-2 bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-1 rounded"
          >
            복사
          </button>
        </div>
        <div className="absolute bottom-4 right-6">
          <button
            onClick={onClose}
            className="bg-gray-300 hover:bg-gray-400 text-gray-800 text-sm px-4 py-2 rounded"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};

export default ApiPermissionRequest;
