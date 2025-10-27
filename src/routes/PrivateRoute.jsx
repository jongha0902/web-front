import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../store/Auth';
import { useError } from '../utils/ErrorContext';
import { useMessage } from '../utils/MessageContext';
import { useEffect, useState } from 'react';
import useSessionStore from '@/utils/useSessionStore';

const RedirectWithError = () => {
  const { showError } = useError();
  const { showMessage } = useMessage();
  const [redirect, setRedirect] = useState(false);

  useEffect(() => {
    showMessage('로그인 후 접근 가능한 페이지입니다.');
    const timeout = setTimeout(() => setRedirect(true), 1000);
    return () => clearTimeout(timeout);
  }, []);

  return redirect ? <Navigate to="/login" replace /> : null;
};

const PrivateRoute = () => {
  const { isLoggedIn, isSessionChecked } = useAuth();
  const location = useLocation();
  const isSessionExpired = useSessionStore(state => state.isSessionExpired);

  if (!isSessionChecked) return null;

  // ✅ 세션 만료 상태일 경우, 아무 리다이렉트도 하지 않음
  if (isSessionExpired) return null;

  if (!isLoggedIn) {
    if (location.pathname === '/') {
      return <Navigate to="/login" replace />;
    }
    return <RedirectWithError />;
  }

  return <Outlet />;
};

export default PrivateRoute;
