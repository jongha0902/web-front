import React, { useEffect, useState } from 'react';
import api from '../utils/axios';
import { useError } from '../utils/ErrorContext';
import { useMessage } from '../utils/MessageContext';

export default function PermissionManage() {
  const { showError } = useError();
  const { showMessage } = useMessage();

  const [permissionTypes, setPermissionTypes] = useState([]);
  const [selectedPermissionType, setSelectedPermissionType] = useState(null);
  const [permissionSearchField, setPermissionSearchField] = useState('permission_code');
  const [permissionSearchKeyword, setPermissionSearchKeyword] = useState('');

  const [screens, setScreens] = useState([]);
  const [screenPermissions, setScreenPermissions] = useState(new Set());
  const [screenSearchKeyword, setScreenSearchKeyword] = useState('');

  const fetchUserPermissionTypes = async () => {
    try {
      const params = {};
      if (permissionSearchKeyword) {
        params.search_field = permissionSearchField;
        params.search = permissionSearchKeyword;
      }
      params.use_yn = "Y";
      const res = await api.get('/apim/user-permission-types', { params });
      setPermissionTypes(res.data.items || []);
    } catch (e) {
      const message = e.response?.data?.message || e.message || '오류';
      const detail = e.response?.data?.detail ? ` (${e.response.data.detail})` : '';
      showError(`❌ ${message}${detail}`);
    }
  };

  const fetchScreensWithPermissions = async (permissionCode) => {
    try {
      const params = {
        permission_code: permissionCode
      };
      if (screenSearchKeyword) {
        params.search = screenSearchKeyword;
      }
      const res = await api.get('/apim/screens-with-permissions', { params });
      const filtered = (res.data.items || []).filter(screen => screen.use_yn === 'Y');
      setScreens(filtered);

      const permissionSet = new Set();
      filtered.forEach(screen => {
        if (screen.has_permission) {
          permissionSet.add(screen.screen_code);
        }
      });
      setScreenPermissions(permissionSet);
    } catch (e) {
      const message = e.response?.data?.message || e.message || '오류';
      const detail = e.response?.data?.detail ? ` (${e.response.data.detail})` : '';
      showError(`❌ ${message}${detail}`);
    }
  };

  useEffect(() => {
    fetchUserPermissionTypes();
  }, []);

  useEffect(() => {
    if (selectedPermissionType) {
      fetchScreensWithPermissions(selectedPermissionType.permission_code);
    }
  }, [selectedPermissionType]);

  const handlePermissionTypeSelect = (permissionType) => {
    setSelectedPermissionType(permissionType);
    setScreenSearchKeyword('');
  };

  const handleScreenCheckboxChange = (screenCode) => {
    const newPermissions = new Set(screenPermissions);
    if (newPermissions.has(screenCode)) {
      newPermissions.delete(screenCode);
    } else {
      newPermissions.add(screenCode);
    }
    setScreenPermissions(newPermissions);
  };

  const handleToggleAllScreens = () => {
    const allScreenCodes = screens.map((screen) => screen.screen_code);
    const allSelected = allScreenCodes.every((code) => screenPermissions.has(code));
    const newSet = new Set();
  
    if (!allSelected) {
      allScreenCodes.forEach((code) => newSet.add(code));
    }
  
    setScreenPermissions(newSet);
  };

  const saveScreenPermissions = async () => {
    try {
      if (!selectedPermissionType) {
        showMessage('⚠️ 권한 종류를 선택해주세요.');
        return;
      }

      const permissionData = {
        permission_code: selectedPermissionType.permission_code,
        screen_codes: Array.from(screenPermissions)
      };

      const res = await api.post('/apim/screens-with-permissions', permissionData);
      showMessage(res.data.message);
    } catch (e) {
      const message = e.response?.data?.message || e.message || '오류';
      const detail = e.response?.data?.detail ? ` (${e.response.data.detail})` : '';
      showError(`❌ ${message}${detail}`);
    }
  };

  return (
    <div className="flex flex-col flex-1 h-full min-h-0">
      <h2 className="text-xl font-bold mb-2">🖥️ 권한별 화면 관리</h2>

      <div className="flex flex-row flex-1 gap-4 mt-2 min-h-0">
        {/* 권한 종류 영역 */}
        <div className="flex flex-col min-h-[450px] min-w-[360px] max-w-[420px] flex-shrink-0 border rounded p-4 bg-white shadow">
          <h2 className="text-lg font-semibold mb-1">📋 권한 종류 목록</h2>

          <div className="flex flex-wrap items-center gap-2 mt-2 mb-2 bg-white px-4 py-2 rounded border shadow-sm">
            <select
              value={permissionSearchField}
              onChange={(e) => setPermissionSearchField(e.target.value)}
              className="border rounded px-3 py-2 w-[100px] text-sm"
            >
              <option value="permission_code">권한코드</option>
              <option value="permission_name">권한명</option>
            </select>
            <input
              type="text"
              value={permissionSearchKeyword}
              onChange={(e) => setPermissionSearchKeyword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  fetchUserPermissionTypes();
                  setSelectedPermissionType(null);
                  setScreens([]);
                }
              }}
              className="flex-1 min-w-[120px] border bg-blue-50 px-3 py-2 rounded text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
            <button
              onClick={() => {
                fetchUserPermissionTypes();
                setSelectedPermissionType(null);
                setScreens([]);
              }}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
            >
              검색
            </button>
          </div>

          <div className="flex-1 overflow-y-auto min-h-0 border rounded">
            <table className="w-full text-sm border text-center table-fixed">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="border px-3 py-2 w-[15%]">#</th>
                  <th className="border px-3 py-2 w-[42.5%]">권한명</th>
                  <th className="border px-3 py-2 w-[42.5%]">권한코드</th>
                </tr>
              </thead>
              <tbody>
                {permissionTypes.length > 0 ? (
                  permissionTypes.map((permissionType, index) => (
                    <tr
                      key={permissionType.permission_code}
                      onClick={() => handlePermissionTypeSelect(permissionType)}
                      className={`cursor-pointer hover:bg-blue-100 transition-all duration-150 ${
                        selectedPermissionType?.permission_code === permissionType.permission_code
                          ? 'bg-blue-100 text-blue-600 font-semibold'
                          : ''
                      }`}
                    >
                      <td className="border px-3 py-2">{index + 1}</td>
                      <td className="border px-3 py-2">{permissionType.permission_name}</td>
                      <td className="border px-3 py-2">{permissionType.permission_code}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="text-center py-6 text-gray-500">
                      등록된 권한 종류가 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 오른쪽 영역: 화면 권한 설정 */}
        <div className="flex flex-col min-h-[450px] w-full border rounded p-4 bg-white shadow">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-lg font-semibold">🖥️ 화면 권한 설정</h2>
          </div>

          {selectedPermissionType ? (
            <>
              <div className="mb-2 text-sm text-gray-600 ml-auto">
                선택된 권한: <span className="font-semibold text-blue-600">{selectedPermissionType.permission_name}</span>
              </div>

              <div className="flex flex-wrap items-center gap-2 mt-2 mb-2 bg-white px-4 py-2 rounded border shadow-sm">
                <input
                  type="text"
                  value={screenSearchKeyword}
                  onChange={(e) => setScreenSearchKeyword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      fetchScreensWithPermissions(selectedPermissionType.permission_code);
                    }
                  }}
                  placeholder="화면 이름 또는 경로로 검색"
                  className="flex-1 min-w-[180px] border px-3 py-2 rounded text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-blue-50"
                />
                <button
                  onClick={() => fetchScreensWithPermissions(selectedPermissionType.permission_code)}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                >
                  검색
                </button>
              </div>

              <div className="flex-1 overflow-y-auto min-h-0 border rounded">
                <table className="w-full text-sm border text-center">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th className="border px-3 py-2 w-[5%]">#</th>
                      <th className="border px-3 py-2 w-[27.5%]">화면명</th>
                      <th className="border px-3 py-2 w-[27.5%]">화면경로</th>
                      <th className="border px-3 py-2 w-[15%]">화면코드</th>
                      <th className="border px-3 py-2 w-[10%]">
                        <label className="inline-flex items-center justify-center gap-1">
                          권한
                          <input
                            type="checkbox"
                            checked={screens.length > 0 && screens.every((s) => screenPermissions.has(s.screen_code))}
                            onChange={handleToggleAllScreens}
                            className="w-4 h-4"
                            title="전체 선택/해제"
                          />
                        </label>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {screens.length > 0 ? (
                      screens.map((screen, index) => (
                        <tr key={screen.screen_code} className="hover:bg-gray-50">
                          <td className="border px-3 py-2">{index + 1}</td>
                          <td className="border px-3 py-2 text-left">{screen.screen_name}</td>
                          <td className="border px-3 py-2 text-left">{screen.screen_path}</td>
                          <td className="border px-3 py-2 text-left">{screen.screen_code}</td>
                          <td className="border px-3 py-2">
                            <input
                              type="checkbox"
                              checked={screenPermissions.has(screen.screen_code)}
                              onChange={() => handleScreenCheckboxChange(screen.screen_code)}
                              className="w-4 h-4"
                            />
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="text-center py-6 text-gray-500">
                          등록된 화면이 없습니다.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* 저장 버튼 */}
              {selectedPermissionType && (
                <div className="text-right mt-4">
                  <button 
                    onClick={saveScreenPermissions}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    저장
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              왼쪽에서 권한 종류를 선택해주세요.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
