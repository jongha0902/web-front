import React, { useEffect, useState } from 'react';
import api from '../utils/axios';
import { useError } from '../utils/ErrorContext';
import { useMessage } from '../utils/MessageContext';
import useSortableData from '../utils/useSortableData';

export default function UserPermissionManage() {
  const { showError } = useError();
  const { showMessage } = useMessage();

  // 왼쪽 영역: 권한 종류 관리
  const [permissionTypes, setPermissionTypes] = useState([]);
  const [selectedPermissionType, setSelectedPermissionType] = useState(null); // ✅ 객체 또는 null
  const [permissionSearchKeyword, setPermissionSearchKeyword] = useState('');
  const [permissionSearchField, setPermissionSearchField] = useState('permission_code'); // ✅ 권한 검색 전용 필드
  const [modalType, setModalType] = useState('');
  const [editPermissionType, setEditPermissionType] = useState({});

  // 오른쪽 영역: 유저 목록
  const [users, setUsers] = useState([]);
  const [userSearchKeyword, setUserSearchKeyword] = useState('');
  const [userSearchField, setUserSearchField] = useState('user_id');
  const { sortedData, sortField, sortDirection, handleSort } = useSortableData(users);

  // 권한 종류 목록 조회
  const fetchUserPermissionTypes = async () => {
    try {
      const params = {};
      if (permissionSearchKeyword) {
        params.search = permissionSearchKeyword;
        params.search_field = permissionSearchField;
      }
      const res = await api.get('/apim/user-permission-types', { params });
      setPermissionTypes(res.data.items || []);
    } catch (e) {
      const message = e.response?.data?.message || e.message || '오류';
      const detail = e.response?.data?.detail ? ` (${e.response.data.detail})` : '';
      showError(`❌ ${message}${detail}`);
    }
  };

  // 유저 목록 조회 (권한 종류별)
  const fetchUsersWithPermission = async (permissionTypeCode) => {
    try {
      const params = { permission_code: permissionTypeCode };
      if (userSearchKeyword) {
        params[userSearchField] = userSearchKeyword;
      }
      const res = await api.get('/apim/users-with-permission-types', { params });
      setUsers(res.data.items || []);
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
    if (selectedPermissionType?.permission_code) {
      fetchUsersWithPermission(selectedPermissionType.permission_code);
    }
  }, [selectedPermissionType]);

  const handlePermissionTypeSelect = (permissionType) => {
    setSelectedPermissionType(permissionType);
    setUserSearchKeyword('');
  };

  const handleCreate = () => {
    setModalType('create');
    setEditPermissionType({
      permission_name: '',
      permission_code: '',
      use_yn: 'Y',
      description: ''
    });
  };

  const handleEdit = (permissionType) => {
    setModalType('edit');
    setEditPermissionType(permissionType);
  };

  const handleSave = async () => {
    try {
      if (!editPermissionType.permission_code) {
        showMessage('⚠️ 권한코드는 필수입니다.');
        return;
      }
      if (!editPermissionType.permission_name) {
        showMessage('⚠️ 권한명은 필수입니다.');
        return;
      }

      let res;
      if (modalType === 'create') {
        res = await api.post('/apim/user-permission-types', editPermissionType);
      } else {
        res = await api.put(`/apim/user-permission-types/${editPermissionType.permission_code}`, editPermissionType);
      }

      showMessage(res.data.message);
      setModalType('');
      setEditPermissionType({});
      fetchUserPermissionTypes();
    } catch (e) {
      const message = e.response?.data?.message || e.message || '오류';
      const detail = e.response?.data?.detail ? ` (${e.response.data.detail})` : '';
      showError(`❌ ${message}${detail}`);
    }
  };

  const handleDelete = async () => {
    try {
      const res = await api.delete(`/apim/user-permission-types/${editPermissionType.permission_code}`);
      showMessage(res.data.message);
      setModalType('');
      fetchUserPermissionTypes();
    } catch (e) {
      const message = e.response?.data?.message || e.message || '오류';
      const detail = e.response?.data?.detail ? ` (${e.response.data.detail})` : '';
      showError(`❌ ${message}${detail}`);
    }
  };

  return (
    <div className="flex flex-col flex-1 h-full min-h-0">
      <h2 className="text-xl font-bold mb-2">🔐 유저 권한 관리</h2>
      
      <div className="flex flex-row flex-1 gap-4 mt-2 min-h-0">
        {/* 왼쪽 영역: 권한 종류 관리 */}
        <div className="flex flex-col min-h-[450px] border rounded p-4 bg-white shadow">

          <div className="flex items-center justify-between mb-1">
            <h2 className="text-lg font-semibold">📋 유저 권한 목록</h2>
          </div>

          {/* 검색 영역 */}
          <div className="flex flex-wrap items-center gap-4 mt-2 bg-white px-4 py-2 rounded border shadow-sm text-sm">
            <select
              value={permissionSearchField}
              onChange={(e) => setPermissionSearchField(e.target.value)}
              className="border rounded px-3 py-2 w-[130px]"
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
                  setUsers([]);
                }
              }}
              placeholder="검색어 입력"
              className="w-[200px] border bg-blue-50 px-3 py-2 rounded text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
            <div className="ml-auto">
              <button
                onClick={() => {
                  fetchUserPermissionTypes();
                  setSelectedPermissionType(null);
                  setUsers([]);
                }}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
              >
                검색
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end mt-2">
            <button
              onClick={handleCreate}
              className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
            >
              ➕ 추가
            </button>
          </div>

          {/* 권한 종류 테이블 */}
          <div className="flex-1 overflow-y-auto border rounded mt-2">
            <table className="w-full text-sm border table-fixed">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="border px-3 py-2 w-[5%]">#</th>
                  <th className="border px-3 py-2 w-[15%]">권한코드</th>
                  <th className="border px-3 py-2 w-[15%]">권한명</th>
                  <th className="border px-3 py-2 w-[7%]">사용<br/>여부</th>
                  <th className="border px-3 py-2 w-[33%]">설명</th>
                  <th className="border px-3 py-2 w-[15%]">관리</th>
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
                      <td className="border px-3 py-2 text-center">{index + 1}</td>
                      <td className="border px-3 py-2">{permissionType.permission_code}</td>
                      <td className="border px-3 py-2">{permissionType.permission_name}</td>
                      <td className="border px-3 py-1 text-center">
                        {permissionType.use_yn === 'Y' ? '✅' : '❌'}
                      </td>
                      <td className="border px-3 py-2">{permissionType.description}</td>
                      <td className="border px-3 py-2 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(permissionType);
                          }}
                          className="px-2 py-1 bg-yellow-500 text-white rounded text-xs hover:bg-yellow-600 mr-1"
                        >
                          수정
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditPermissionType(permissionType);
                            setModalType('delete');
                          }}
                          className="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
                        >
                          삭제
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="text-center py-6 text-gray-500">
                      등록된 권한 종류가 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 오른쪽 영역: 유저 목록 */}
        <div className="flex flex-col flex-shrink-0 bg-white shadow rounded p-4 w-[500px]">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-lg font-semibold">📋 권한별 유저 목록</h2>
          </div>

          {selectedPermissionType ? (
            <>
              {/* 검색 영역 */}
              <div className="flex flex-wrap items-center gap-2 mt-2 mb-2 bg-white px-4 py-2 rounded border shadow-sm">
                <select
                  value={userSearchField}
                  onChange={(e) => setUserSearchField(e.target.value)}
                  className="border px-2 py-2 rounded text-sm"
                >
                  <option value="user_id">ID</option>
                  <option value="user_name">이름</option>
                </select>
                <input
                  type="text"
                  value={userSearchKeyword}
                  onChange={(e) => setUserSearchKeyword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (!selectedPermissionType?.permission_code) {
                        showMessage('⚠️ 먼저 왼쪽에서 권한을 선택하세요.');
                        return;
                      }
                      fetchUsersWithPermission(selectedPermissionType.permission_code);
                    }
                  }}
                  placeholder="검색어 입력"
                  className="flex-1 min-w-[120px] border bg-blue-50 px-3 py-2 rounded text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
                <button
                  onClick={() => {
                    if (!selectedPermissionType?.permission_code) {
                      showMessage('⚠️ 먼저 왼쪽에서 권한을 선택하세요.');
                      return;
                    }
                    fetchUsersWithPermission(selectedPermissionType.permission_code);
                  }}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                >
                  검색
                </button>
              </div>
              
              <div className="mb-2 text-sm text-gray-600 ml-auto">
                선택된 권한: <span className="font-semibold text-blue-600">{selectedPermissionType.permission_name}</span>
              </div>
              
              {/* 유저 목록 테이블 */}
              <div className="flex-1 overflow-y-auto border rounded">
                <table className="w-full text-sm border text-center">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th className="border px-3 py-2 w-[12%]">#</th>
                      <th
                        className="border px-3 py-2 w-[35%] cursor-pointer"
                        onClick={() => handleSort('user_name')}
                      >
                        유저명 {sortField === 'user_name' && (sortDirection === 'asc' ? '▲' : '▼')}
                      </th>
                      <th
                        className="border px-3 py-2 w-[35%] cursor-pointer"
                        onClick={() => handleSort('user_id')}
                      >
                        유저ID {sortField === 'user_id' && (sortDirection === 'asc' ? '▲' : '▼')}
                      </th>
                      <th
                        className="border px-3 py-2 w-[18%] cursor-pointer"
                        onClick={() => handleSort('use_yn')}
                      >
                        사용여부 {sortField === 'use_yn' && (sortDirection === 'asc' ? '▲' : '▼')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedData.length > 0 ? (
                      sortedData.map((user, index) => (
                        <tr key={user.user_id} className="hover:bg-gray-50">
                          <td className="border px-3 py-2">{index + 1}</td>
                          <td className="border px-3 py-2">{user.user_name}</td>
                          <td className="border px-3 py-2">{user.user_id}</td>
                          <td className="border px-3 py-2">
                            <span className="px-2 py-1 rounded text-xs">
                              {user.use_yn === 'Y' ? '✅' : '❌'}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="text-center py-6 text-gray-500">
                          해당 권한을 가진 유저가 없습니다.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              왼쪽에서 권한 종류를 선택해주세요.
            </div>
          )}
        </div>

        {/* 모달 */}
        {modalType && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded shadow-lg w-[450px] max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="px-6 py-3 border-b bg-gray-50">
                <h3 className="text-lg font-semibold">
                  {modalType === 'create' ? '권한 추가' : modalType === 'edit' ? '권한 수정' : '권한 삭제'}
                </h3>
              </div>

              {/* Body */}
              <div className="px-6 py-4">
                {modalType === 'delete' ? (
                  <p className="text-sm">
                    <span className="font-semibold text-red-600">{editPermissionType.permission_name}</span>
                    ({editPermissionType.permission_code}) 을 삭제하시겠습니까?
                  </p>
                ) : (
                  <div className="space-y-4 text-sm">
                    <div className="flex items-center gap-3">
                      <label className="w-28 text-gray-700">권한 코드</label>
                      <input
                        value={editPermissionType.permission_code ?? ''}
                        onChange={e => setEditPermissionType({ ...editPermissionType, permission_code: e.target.value })}
                        className={`flex-1 border px-3 py-2 rounded ${modalType !== 'create' ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
                        readOnly={modalType !== 'create'}
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="w-28 text-gray-700">권한 이름</label>
                      <input
                        value={editPermissionType.permission_name ?? ''}
                        onChange={e => setEditPermissionType({ ...editPermissionType, permission_name: e.target.value })}
                        className="flex-1 border px-3 py-2 rounded"
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="w-28 text-gray-700">사용 여부</label>
                      <div className="flex gap-6">
                        <label className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="use_yn"
                            value="Y"
                            checked={editPermissionType.use_yn === 'Y'}
                            onChange={e => setEditPermissionType({ ...editPermissionType, use_yn: e.target.value })}
                          />
                          사용
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="use_yn"
                            value="N"
                            checked={editPermissionType.use_yn === 'N'}
                            onChange={e => setEditPermissionType({ ...editPermissionType, use_yn: e.target.value })}
                          />
                          미사용
                        </label>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <label className="w-28 pt-2 text-gray-700">설명</label>
                      <textarea
                        value={editPermissionType.description ?? ''}
                        onChange={e => setEditPermissionType({ ...editPermissionType, description: e.target.value })}
                        className="flex-1 border px-3 py-2 rounded h-[100px]"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-3 border-t flex justify-end gap-2">
                {modalType === 'delete' ? (
                  <>
                    <button onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded">
                      삭제
                    </button>
                    <button onClick={() => setModalType('')} className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded">
                      취소
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
                      저장
                    </button>
                    <button onClick={() => setModalType('')} className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded">
                      취소
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
