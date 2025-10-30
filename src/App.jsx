import React, { Suspense, useEffect, useState, lazy } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import SaveLastScreen from './components/SaveLastScreen';
import PrivateRoute from './routes/PrivateRoute';
import { useAuth } from './store/Auth';
import api from './utils/axios';
import { getCookie } from './utils/common';
import { useError } from './utils/ErrorContext';

// 레이지 로딩 컴포넌트
const Sidebar = lazy(() => import('./components/Sidebar'));
const Header = lazy(() => import('./components/Header'));
const NotFound = lazy(() => import('./components/NotFound'));
const Login = lazy(() => import('./components/Login'));

function PrivateLayout({ children, title }) {
  const { isLoggedIn } = useAuth();
  if (!isLoggedIn) return null; // 로그인 안됐으면 렌더링 X

  return (
    <div className="flex h-screen bg-gray-100 min-w-[1650px] min-h-[800px] overflow-auto">
      <Suspense fallback={<div>Sidebar Loading...</div>}>
        <Sidebar />
      </Suspense>

      {/* ✅ 오른쪽 콘텐츠 영역 전체 */}
      <div className="flex flex-col flex-1">
        <Suspense fallback={<div>Header Loading...</div>}>
          <Header title={title} />
        </Suspense>
        <main className="flex-1 flex flex-col overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  const { showError } = useError();
  const { isLoggedIn, user, isLoading, logout } = useAuth();
  const [screens, setScreens] = useState([]);
  const [components, setComponents] = useState({});
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();
  const handleGoLogin = async () => { try { if (logout) await logout(); } finally { navigate('/login', { replace: true }); } };

  // 마지막 화면 경로를 가져오는 함수
  const getLastScreenPath = () => {
    const lastScreenPath = getCookie('last_screen_path');
    if (!lastScreenPath) return null;
    
    // 현재 사용자가 접근 가능한 화면인지 확인
    const availableScreen = screens.find(screen => screen.screen_path === lastScreenPath);
    return availableScreen ? lastScreenPath : null;
  };

  useEffect(() => {
    if (!user || !isLoggedIn) {
      setScreens([]);
      setComponents({});
      setReady(false);
      return;
    }

    const fetchScreens = async () => {
      try {
        const res = await api.get(`/apim/screens-with-permissions/${user.user_id}`, {});
        const list = res.data.items || [];

        const imports = await Promise.all(
          list.map(async (screen) => {
            try {
              const mod = await import(`./components/${screen.component_name}.jsx`);
              return [screen.component_name, lazy(() => Promise.resolve(mod))];
            } catch (e) {
              const message = e.response?.data?.message || e.message || '오류';
              const detail = e.response?.data?.detail ? ` (${e.response.data.detail})` : '';
              showError(`❌ ${message}${detail}`);
              return [screen.component_name, null];
            }
          })
        );

        setScreens(list);
        setComponents(Object.fromEntries(imports.filter(Boolean)));
      } catch (e) {
        const message = e.response?.data?.message || e.message || '오류';
        const detail = e.response?.data?.detail ? ` (${e.response.data.detail})` : '';
        showError(`❌ ${message}${detail}`);
        setScreens([]);
        setComponents({});
      } finally {
        setReady(true);
      }
    };

    fetchScreens();
  }, [user, isLoggedIn]);

  // 로딩 처리
  if (isLoading || (isLoggedIn && !ready)) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-500 border-opacity-50"></div>
      </div>
    );
  }

  // 권한이 없는 경우
  if (isLoggedIn && ready && screens.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-gray-600 gap-4">
        <div>현재 사용자는 권한이 없습니다. 관리자에게 문의해주세요.</div>
        <button onClick={handleGoLogin} className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.99]">로그인 화면으로 이동</button>
      </div>
    );
  }

  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-500 border-opacity-50"></div>
      </div>
    }>
      <Routes>
        {/* 로그인 라우트 */}
        <Route 
          path="/login" 
          element={isLoggedIn ? <Navigate to="/" replace /> : <Login />} 
        />

        {/* 보호된 라우트: PrivateRoute가 루트 경로로 감싼다 */}
        <Route path="/" element={<PrivateRoute />}>
          {/* 접근 가능한 화면 등록 */}
          {screens.map((screen) => {
            const Component = components[screen.component_name];
            const relativePath = screen.screen_path.replace(/^\//, '');

            return (
              <Route
                key={screen.screen_code}
                path={relativePath}
                element={
                  <PrivateLayout title={screen.screen_name}>
                    <Suspense fallback={<div>화면 로딩 중...</div>}>
                      {Component ? <Component /> : <NotFound />}
                      <SaveLastScreen path={screen.screen_path} />
                    </Suspense>
                  </PrivateLayout>
                }
              />
            );
          })}

          {/* 첫 진입 시 마지막 화면 또는 첫 화면으로 리다이렉트 */}
          <Route index element={
              isLoggedIn
                ? <Navigate to={getLastScreenPath() || screens[0]?.screen_path || '/notfound'} replace />
                : null  // 비로그인 상태면 아무것도 렌더링 안 함 → PrivateRoute가 처리함
            }
          />

          {/* 로그인된 상태에서의 404 처리 */}
          <Route 
            path="*" 
            element={<NotFound />} 
          />
        </Route>
      </Routes>
    </Suspense>
  );
}
