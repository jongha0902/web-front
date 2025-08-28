import React, {
  createContext, useContext, useEffect, useRef, useState, useCallback
} from 'react';
import { useLocation } from 'react-router-dom';
import api from '../utils/axios';
import { useError } from '../utils/ErrorContext';
import { useMessage } from '../utils/MessageContext';
import showSessionExpiredModal from '../utils/SessionExpiredModal';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);

  // 부팅/세션확인 상태
  const [isLoading, setIsLoading] = useState(true);
  const [isSessionChecked, setIsSessionChecked] = useState(false);

  const location = useLocation();
  const logoutTimerRef = useRef(null);
  const INACTIVITY_LIMIT = 30 * 60 * 1000; // 30분

  const { showError } = useError();
  const { showMessage } = useMessage();

  // ✅ 로그아웃
  const logout = useCallback(() => {
    return new Promise(async (resolve) => {
      try {
        await api.post('/apim/auth/logout', null, { withCredentials: true });
      } catch (e) {
        console.warn('서버 로그아웃 실패:', e);
        showError('서버 로그아웃 실패');
      }

      setIsLoggedIn(false);
      setUser(null);

      if (logoutTimerRef.current) {
        clearTimeout(logoutTimerRef.current);
        logoutTimerRef.current = null;
      }

      resolve();
    });
  }, [showError]);

  // ✅ 로그인 성공 처리
  const login = (response) => {
    setUser(response.user);
    setIsLoggedIn(true);
    // ✅ axios 전역 헤더에 login_id 추가
    api.defaults.headers.common['X-Login-Id'] = response.user.user_id;
  };

  // ✅ 앱 시작 & 라우트 변경 시: 프로필 체크 (로그인 페이지는 silent)
  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/apim/auth/profile', {
        // ✅ 부팅 시엔 항상 '조용히' 상태만 확인
        params: { silent: 1 },
        headers: { 'x-skip-expired-modal': '1' },
        withCredentials: true
      });

      // 서버가 {authenticated, user} 또는 {user} 형태로 내려와도 대응
      const authenticated = res.data?.authenticated ?? Boolean(res.data?.user);

      if (authenticated && res.data.user) {
        setUser(res.data.user);
        setIsLoggedIn(true);
        // ✅ 로그인된 경우에만 헤더 세팅
        api.defaults.headers.common['X-Login-Id'] = res.data.user.user_id;
      } else {
        setUser(null);
        setIsLoggedIn(false);
        // ✅ 비로그인/실패 시 헤더 제거
        delete api.defaults.headers.common['X-Login-Id'];
      }
    } catch (e) {
      setUser(null);
      setIsLoggedIn(false);
      delete api.defaults.headers.common['X-Login-Id'];
    } finally {
      setIsLoading(false);
      setIsSessionChecked(true);
    }
  };

  // ✅ 서버 프로필 다시 읽어서 user 갱신
  const refreshUser = useCallback(async () => {
    try {
      const res = await api.get('/apim/auth/profile', { withCredentials: true });
      setUser(res.data.user || null);
      setIsLoggedIn(!!res.data.user);
      return res.data.user;
    } catch (e) {
      setUser(null);
      setIsLoggedIn(false);
      return null;
    }
  }, []);

  // ✅ 사용자 비활동 감지 타이머 (로그인 상태에서만)
  useEffect(() => {
    if (!isLoggedIn) return;

    const handleActivity = () => {
      if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
      logoutTimerRef.current = setTimeout(() => {
        showSessionExpiredModal('30분 동안 활동이 없어 자동 로그아웃되었습니다.');
      }, INACTIVITY_LIMIT);
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach((event) => window.addEventListener(event, handleActivity));
    handleActivity();

    return () => {
      events.forEach((event) => window.removeEventListener(event, handleActivity));
      if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    };
  }, [isLoggedIn]);

  return (
    <AuthContext.Provider
      value={{ isLoggedIn, user, login, logout, isLoading, isSessionChecked, checkSession, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
