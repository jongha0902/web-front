import React, { useEffect, useState } from 'react';
import api from '../utils/axios';
import { useError } from '../utils/ErrorContext';
import { useMessage } from '../utils/MessageContext';
import { isEmpty } from '../utils/common.js';

export default function UserManage() {
  const [userList, setUserList] = useState([]);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(15);
  const [totalCount, setTotalCount] = useState(0);
  const totalPage = Math.max(1, Math.ceil(totalCount / perPage));
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchField, setSearchField] = useState('user_id');

  const [modalType, setModalType] = useState('');
  const [editUser, setEditUser] = useState({});
  const { showError } = useError();
  const { showMessage } = useMessage();

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [newPasswordCheck, setNewPasswordCheck] = useState('');

  const [deleteModal, setDeleteModal] = useState(false);
  const [userPermissionTypeList, setUserPermissionTypeList] = useState([]);

  const fetchUsers = async () => {
    try {
      const params = { page, per_page: perPage };
      if (searchKeyword) params[searchField] = searchKeyword;
      const res = await api.get('/apim/user', { params });
      const items = Array.isArray(res.data?.items) ? res.data.items : [];
      setUserList(items);
      setTotalCount(res.data?.total_count || items.length);
    } catch (e) {
      const message = e.response?.data?.message || e.message || '오류';
      const detail = e.response?.data?.detail ? ` (${e.response.data.detail})` : '';
      showError(`❌ ${message}${detail}`);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchUserPermissionTypes(); // 권한 목록 호출
  }, [page, perPage]);
  
  const fetchUserPermissionTypes = async () => {
    try {
      const res = await api.get('/apim/user-permission-types', {"use_yn": "Y"});
      setUserPermissionTypeList(res.data?.items || []);
    } catch (e) {
      const message = e.response?.data?.message || e.message || '권한 목록 불러오기 실패';
      showError(`❌ ${message}`);
    }
  };

  // ✅ 추가: 유저 등록 Validation 함수
  const validateUserForm = (formData, modalType) => {
    const errors = {};

    if (!formData.user_id || formData.user_id.length < 3 || !/^[a-zA-Z0-9]+$/.test(formData.user_id)) {
      errors.user_id = 'ID는 영문/숫자 조합 3자 이상이어야 합니다.';
    }

    if (modalType === 'create') {
      if (!formData.password || formData.password.length < 8) {
        errors.password = '비밀번호는 8자 이상이어야 합니다.';
      }
      if (formData.password !== formData.passwordCheck) {
        errors.passwordCheck = '비밀번호가 일치하지 않습니다.';
      }
    }

    if (!formData.user_name) {
      errors.user_name = '이름을 입력하세요.';
    }

    if (!formData.permission_code) {
      errors.permission_code = '권한을 선택하세요.';
    }

    if (!['Y', 'N'].includes(formData.use_yn)) {
      errors.use_yn = '사용 여부를 선택하세요.';
    }

    return errors;
  };

  const handleSave = async () => {
    try {
      if (isEmpty(editUser)){
        showMessage("유저 정보는 필수입니다."); 
        return;
      }

      const errors = validateUserForm(editUser, modalType);
      if (Object.keys(errors).length > 0) {
        const firstError = Object.values(errors)[0];
        showMessage(`⚠️ ${firstError}`);
        return;
      }

      let res;

      if (modalType === 'create') {
        res = await api.post('/apim/user', editUser);
      } else if(modalType === 'edit') {
        res = await api.put(`/apim/user/${editUser.user_id}`, {
          "user_id": editUser.user_id,
          "user_name": editUser.user_name,
          "permission_code": editUser.permission_code,
          "use_yn": editUser.use_yn});
      }

      if(res.status === 200){
        setModalType('');
        setEditUser({});
        fetchUsers();
        showMessage(res.data.message);
      }
      
    } catch (e) {
      const message = e.response?.data?.message || e.message || '오류';
      const detail = e.response?.data?.detail ? ` (${e.response.data.detail})` : '';
      showError(`❌ ${message}${detail}`);
    }
  };

  const handleDelete = async (user_id) => {
    try {
      if (isEmpty(user_id)){
        showMessage("유저 ID는 필수입니다."); 
        return;
      }

      let res = await api.delete(`/apim/user/${user_id}`);
      
      if(res.status === 200){
        fetchUsers();
        setModalType('');
        setDeleteModal('');
        showMessage(res.data.message);
      }
    } catch (e) {
      const message = e.response?.data?.message || e.message || '오류';
      const detail = e.response?.data?.detail ? ` (${e.response.data.detail})` : '';
      showError(`❌ ${message}${detail}`);
    }
  };

  const handlePasswordChange = async () => {
    if (!newPasswordInput || !newPasswordCheck) {
      showMessage('비밀번호를 모두 입력하세요.');
      return;
    }
    if (newPasswordInput !== newPasswordCheck) {
      showMessage('비밀번호가 일치하지 않습니다.');
      return;
    }
  
    try {
      if (isEmpty(editUser.user_id)){
        showMessage("유저 ID는 필수입니다."); 
        return;
      }

      let res = await api.put(`/apim/user/${editUser.user_id}/password`, {
        new_password: newPasswordInput
      });
  
      if(res.status === 200 ){
        showMessage(res.data.message);
        setShowPasswordModal(false);
        setNewPasswordInput('');
        setNewPasswordCheck('');
      }
  
    } catch (e) {
      const message = e.response?.data?.message || e.message || '오류';
      const detail = e.response?.data?.detail ? ` (${e.response.data.detail})` : '';
      showError(`❌ ${message}${detail}`);
    }
  };

  const openDeleteModal = (user) => {
    setEditUser(user);
    setDeleteModal(true);
  };

  return (
    <div className="flex flex-col flex-1 h-full min-h-0">
      <h2 className="text-xl font-bold mb-2">👥 유저 관리</h2>

      <div className="flex justify-between items-center gap-4 mb-4 mt-2 text-sm p-3 bg-white shadow rounded">
        <div className="flex items-center gap-4">
          <select
            value={searchField}
            onChange={(e) => setSearchField(e.target.value)}
            className="border rounded px-3 py-2 w-[90px]"
          >
            <option value="user_id">ID</option>
            <option value="user_name">이름</option>
          </select>
          <input
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchUsers()}
            placeholder="검색어 입력"
            className="border rounded px-3 py-2 w-64 bg-blue-50"
          />
        </div>
        <button
          onClick={fetchUsers}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
        >
          검색
        </button>
      </div>

      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-semibold">📋 목록</h3>
        <button
          onClick={() => {
            setEditUser({ user_id: '', user_name: '', permission_code: '', use_yn: 'N', created_id: '', update_id: '' });
            setModalType('create');
          }}
          className="bg-blue-600 text-white px-4 py-1 rounded text-sm"
        >
          신규 등록
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

        <div className="flex-1 overflow-y-auto border-t">
          <table className="w-full text-sm border text-center table-fixed">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="border px-3 py-1 w-[4%]">#</th>
                <th className="border px-3 py-1 w-[11%]">ID</th>
                <th className="border px-3 py-1 w-[15%]">이름</th>
                <th className="border px-3 py-1 w-[8%]">권한</th>
                <th className="border px-3 py-1 w-[5%]">사용< br/>여부</th>
                <th className="border px-3 py-1 w-[10%]">등록자</th>
                <th className="border px-3 py-1 w-[15%]">등록일</th>
                <th className="border px-3 py-1 w-[10%]">수정자</th>
                <th className="border px-3 py-1 w-[15%]">수정일</th>
                <th className="border px-3 py-1 w-[10%]">관리</th>
              </tr>
            </thead>
            <tbody>
              {userList.length > 0 ? userList.map((u, i) => (
                <tr key={u.user_id} className="hover:bg-gray-100">
                  <td className="border px-3 py-1">{totalCount - ((page - 1) * perPage + i)}</td>
                  <td className="border px-3 py-1 font-mono">{u.user_id}</td>
                  <td className="border px-3 py-1">{u.user_name}</td>
                  <td className="border px-3 py-1">{u.permission_name}</td>
                  <td className="border px-3 py-1">
                    {u.use_yn === 'Y' ? '✅' : '❌'}
                  </td>
                  <td className="border px-3 py-1">{u.create_id}</td>
                  <td className="border px-3 py-1">{u.create_date}</td>
                  <td className="border px-3 py-1">{u.update_id}</td>
                  <td className="border px-3 py-1">{u.update_date}</td>
                  <td className="border px-3 py-1">
                    <button onClick={() => { setEditUser(u); setModalType('edit'); }} className="bg-yellow-500 hover:bg-yellow-600 text-white px-2 py-1 rounded text-xs">수정</button>
                    <button onClick={() => openDeleteModal(u)} className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs ml-1">삭제</button>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan="10" className="text-gray-500 py-6 text-center">등록된 유저가 없습니다.</td></tr>
              )}
            </tbody>
          </table>
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

      {modalType && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white rounded shadow-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-gray-800 border-b pb-2 mb-4">
              {modalType === 'create' && '🆕 유저 등록'}
              {modalType === 'edit' && '📝 유저 정보 수정'}
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <label className="w-24 text-gray-700 text-sm">ID</label>
                <input
                  value={editUser.user_id || ''}
                  onChange={(e) => setEditUser({ ...editUser, user_id: e.target.value })}
                  readOnly={modalType !== 'create'}
                  className={`flex-1 border px-3 py-2 rounded ${modalType !== 'create' ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
                />
              </div>
              {modalType === 'create' && (
                <>
                  <div className="flex items-center gap-2">
                    <label className="w-24 text-gray-700 text-sm">비밀번호</label>
                    <input
                      value={editUser.password || ''}
                      type="password"
                      onChange={(e) => setEditUser({ ...editUser, password: e.target.value })}
                      className="flex-1 border px-3 py-2 rounded"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="w-24 text-gray-700 text-sm">비밀번호 확인</label>
                    <input
                      value={editUser.passwordCheck || ''}
                      type="password"
                      onChange={(e) => setEditUser({ ...editUser, passwordCheck: e.target.value })}
                      className="flex-1 border px-3 py-2 rounded"
                    />
                  </div>
                </>
              )}
              {modalType === 'edit' && (
                <div className="flex gap-2 items-start">
                  <label className="w-24 text-gray-700 text-sm pt-2">비밀번호</label>
                  <div className="flex flex-1 gap-2">
                    <input
                      disabled
                      value=""
                      className="flex-1 border px-3 py-2 rounded bg-gray-100 text-gray-500"
                      title="보안을 위해 비밀번호는 표시되지 않습니다."
                    />
                    <button
                      onClick={() => {setShowPasswordModal(true); setNewPasswordInput(''); setNewPasswordCheck('');}}
                      className="bg-blue-600 text-white px-4 py-2 rounded whitespace-nowrap"
                    >
                      변경
                    </button>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2">
                <label className="w-24 text-gray-700 text-sm">이름</label>
                <input
                  value={editUser.user_name || ''}
                  onChange={(e) => setEditUser({ ...editUser, user_name: e.target.value })}
                  className={`flex-1 border px-3 py-2 rounded`}
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="w-24 text-gray-700 text-sm">권한</label>
                <select
                  value={editUser.permission_code || ''}
                  onChange={(e) => setEditUser({ ...editUser, permission_code: e.target.value })}
                  className="flex-1 border px-3 py-2 rounded"
                >
                  <option value="">선택</option>
                  {userPermissionTypeList.map((p) => (
                    <option key={p.permission_code} value={p.permission_code}>
                      {p.permission_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="w-24 text-gray-700 text-sm">사용여부</label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-1 text-sm text-gray-700">
                    <input
                      type="radio"
                      value="Y"
                      checked={editUser.use_yn === 'Y'}
                      onChange={() => setEditUser({ ...editUser, use_yn: 'Y' })}
                      className="w-4 h-4"
                    />
                    사용
                  </label>
                  <label className="flex items-center gap-1 text-sm text-gray-700">
                    <input
                      type="radio"
                      value="N"
                      checked={editUser.use_yn === 'N'}
                      onChange={() => setEditUser({ ...editUser, use_yn: 'N' })}
                      className="w-4 h-4"
                    />
                    미사용
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <button onClick={handleSave} className="bg-blue-600 text-white px-4 py-2 rounded">
                저장
              </button>
              <button onClick={() => setModalType('')} className="bg-gray-300 text-gray-800 px-4 py-2 rounded">
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {showPasswordModal && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex justify-center items-center">
          <div className="bg-white rounded shadow-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">🔐 비밀번호 변경</h3>

            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <label className="w-28 text-gray-700 text-sm">새 비밀번호</label>
                <input
                  type="password"
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  className="flex-1 border px-3 py-2 rounded"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="w-28 text-gray-700 text-sm">비밀번호 확인</label>
                <input
                  type="password"
                  value={newPasswordCheck}
                  onChange={(e) => setNewPasswordCheck(e.target.value)}
                  className="flex-1 border px-3 py-2 rounded"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button onClick={handlePasswordChange} className="bg-blue-600 text-white px-4 py-2 rounded">
                저장
              </button>
              <button onClick={() => setShowPasswordModal(false)} className="bg-gray-300 text-gray-800 px-4 py-2 rounded">
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteModal && editUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white rounded shadow-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-gray-800 border-b pb-2 mb-4">
              🗑️ 유저 삭제 확인
            </h3>

            <div className="space-y-3 mb-4 text-sm">
              <div className="flex items-center">
                <label className="w-24 text-sm font-medium text-gray-700">유저 ID</label>
                <input
                  value={editUser.user_id}
                  readOnly
                  className="flex-1 border px-3 py-2 rounded bg-gray-100 text-gray-600 cursor-not-allowed"
                />
              </div>
              <div className="flex items-center">
                <label className="w-24 text-sm font-medium text-gray-700">이름</label>
                <input
                  value={editUser.user_name}
                  readOnly
                  className="flex-1 border px-3 py-2 rounded bg-gray-100 text-gray-600 cursor-not-allowed"
                />
              </div>
            </div>

            <p className="text-sm text-gray-700 mb-6">
              해당 유저를 정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </p>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => handleDelete(editUser.user_id)}
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