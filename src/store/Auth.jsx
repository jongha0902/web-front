// src/store/Auth.jsx
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

  const [isLoading, setIsLoading] = useState(true); // ★★★ 초기 로딩 상태는 true
  const [isSessionChecked, setIsSessionChecked] = useState(false); // 세션 확인 완료 여부

  const location = useLocation();
  const logoutTimerRef = useRef(null);
  const INACTIVITY_LIMIT = 30 * 60 * 1000;

  const { showError } = useError();
  const { showMessage } = useMessage();

  // ✅ 로그아웃 함수
  const logout = useCallback(() => {
    return new Promise(async (resolve) => {
      try {
        await api.post('/apim/auth/logout', null, { withCredentials: true });
      } catch (e) {
        console.warn('서버 로그아웃 실패:', e);
      } finally {
        setIsLoggedIn(false);
        setUser(null);
        delete api.defaults.headers.common['X-Login-Id'];
        localStorage.removeItem('chat_session_id');
        if (logoutTimerRef.current) {
          clearTimeout(logoutTimerRef.current);
          logoutTimerRef.current = null;
        }
        resolve();
      }
    });
  }, []);

  // ✅ 로그인 성공 처리
  const login = (response) => {
    setUser(response.user);
    setIsLoggedIn(true);
    api.defaults.headers.common['X-Login-Id'] = response.user.user_id;
  };

  // ✅ 세션 체크 및 자동 갱신 로직
  const checkSession = useCallback(async () => {
    // ★★★ 함수 시작 시 상태 설정 ★★★
    setIsLoading(true);
    setIsSessionChecked(false); // 확인 시작
    let sessionEstablished = false; // 로그인 성공 플래그

    try {
      // --- 1. 초기 profile 호출 (silent) ---
      //console.log('Attempting initial profile check (silent)...');
      const profileRes = await api.get('/apim/auth/profile', {
        params: { silent: 1 },
        headers: { 'x-skip-expired-modal': '1' },
        withCredentials: true
      });

      const authenticated = profileRes.data?.authenticated ?? Boolean(profileRes.data?.user);

      if (authenticated && profileRes.data.user) {
        // --- 1-1. profile 성공: 로그인 처리 ---
        setUser(profileRes.data.user);
        setIsLoggedIn(true);
        api.defaults.headers.common['X-Login-Id'] = profileRes.data.user.user_id;
        sessionEstablished = true;
        //console.log('Initial profile check successful.');

      } else {
        // --- 1-2. profile 실패 (200 OK, authenticated: false): refresh 시도 ---
        //console.log('profile failed (authenticated: false), trying refresh...');
        try {
          // --- 2. /refresh 호출 ---
          await api.post('/apim/auth/refresh', null, {
             withCredentials: true,
             headers: { 'x-skip-expired-modal': '1' } // refresh 실패 시 인터셉터 모달 스킵
          });
          //console.log('refresh successful, retrying profile...');

          // --- 2-1. refresh 성공: profile 다시 호출 (non-silent) ---
          try {
            const profileRetryRes = await api.get('/apim/auth/profile', {
              // silent 없이 호출, 실패 시 Axios 인터셉터가 처리
              withCredentials: true
            });

            // --- 2-1-1. /profile 재시도 성공: 로그인 처리 ---
            if (profileRetryRes.data.user) {
              setUser(profileRetryRes.data.user);
              setIsLoggedIn(true);
              api.defaults.headers.common['X-Login-Id'] = profileRetryRes.data.user.user_id;
              sessionEstablished = true;
              //console.log('profile retry successful.');
            } else {
              // /refresh 성공 후 /profile 재시도가 user 없음 (비정상)
              console.error('profile retry failed after successful refresh (no user data).');
              await logout(); // 로그아웃
              // 필요시 에러 메시지 표시
              showError('세션 복구 후 사용자 정보를 가져오는데 실패했습니다.');
            }
          } catch (profileRetryError) {
             // --- 2-1-2. /profile 재시도 실패 (Axios 인터셉터에서 처리될 수 있음) ---
             console.error('profile retry failed:', profileRetryError);
             // Axios 인터셉터에서 SessionExpiredError가 발생하면 모달 뜸
             // 그 외의 경우(예: 404 Not Found)는 여기서 로그아웃 처리
             if (profileRetryError.name !== 'SessionExpiredError') {
                 // showError('세션 복구 후 사용자 정보 확인에 실패했습니다.'); // 필요시
                 await logout();
             }
             // SessionExpiredError의 경우 인터셉터/모달에서 로그아웃 처리를 유도하므로 여기서 logout() 호출 불필요
          }

        } catch (refreshError) {
          // --- 2-2. /refresh 실패: 로그아웃 처리 (에러 모달 X) ---
          //console.log('/refresh failed during initial check:', refreshError);
          await logout(); // 조용히 로그아웃
        }
      }
    } catch (initialProfileError) {
      // --- 1. 초기 /profile 호출 자체가 실패 (네트워크 오류 등): 로그아웃 처리 (에러 모달 X) ---
      //console.error('Initial /profile call failed:', initialProfileError);
      await logout(); // 조용히 로그아웃
    } finally {
      // --- ★★★ 모든 경로의 끝에서 실행: 로딩 상태 해제 ★★★ ---
      setIsLoading(false);
      setIsSessionChecked(true); // 세션 확인 절차 완료
      //console.log('checkSession finished. Final LoggedIn State:', sessionEstablished);
    }
  }, [logout]); // logout만 의존성으로 (showError 제거)

  // ✅ 앱 시작 시 checkSession 호출
  useEffect(() => {
    // isSessionChecked가 false일 때만 실행 방지 (선택 사항, 보통은 한 번만 실행됨)
    // if (!isSessionChecked) {
      checkSession();
    // }
  }, [checkSession]); // checkSession을 의존성 배열에 추가

  // ✅ 서버 프로필 다시 읽어서 user 갱신
  const refreshUser = useCallback(async () => {
    try {
      const res = await api.get('/apim/auth/profile', { withCredentials: true });
      setUser(res.data.user || null);
      setIsLoggedIn(!!res.data.user);
      if (res.data.user) {
        api.defaults.headers.common['X-Login-Id'] = res.data.user.user_id;
      } else {
        delete api.defaults.headers.common['X-Login-Id'];
        // 정보가 없으면 로그아웃된 것으로 간주
        await logout();
      }
      return res.data.user;
    } catch (e) {
      console.error('refreshUser failed:', e);
      // 로그인된 상태에서 실패 시 에러 표시 및 로그아웃
      if (e.name !== 'SessionExpiredError') {
         const backendMessage = e.response?.data?.message || e.response?.data?.detail || '사용자 정보 갱신 중 오류 발생';
         showError(`⛔ ${backendMessage}`);
      }
      await logout();
      return null;
    }
    // showError를 사용하므로 의존성 추가
  }, [logout, showError]);

  // ✅ 사용자 비활동 감지 타이머
  useEffect(() => {
    if (!isLoggedIn) return;

    let inactivityTimer = null;
    const resetTimer = () => {
      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        // 비활동 시간이 초과되면 세션 만료 모달 표시
        // 모달 확인 시 자동으로 로그아웃 및 페이지 이동됨
        showSessionExpiredModal('30분 동안 활동이 없어 자동 로그아웃되었습니다.');
      }, INACTIVITY_LIMIT);
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach((event) => window.addEventListener(event, resetTimer));
    resetTimer(); // 초기 타이머 설정

    return () => {
      events.forEach((event) => window.removeEventListener(event, resetTimer));
      clearTimeout(inactivityTimer);
    };
  }, [isLoggedIn]); // isLoggedIn만 의존성으로


  return (
    <AuthContext.Provider
      value={{ isLoggedIn, user, login, logout, isLoading, isSessionChecked, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}