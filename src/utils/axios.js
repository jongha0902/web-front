// src/utils/axios.js
import axios from 'axios';
import showSessionExpiredModal from '@/utils/SessionExpiredModal';
import { setGlobalLoading } from '@/utils/useLoading';
import useSessionStore from '@/utils/useSessionStore';

let requestCount = 0;
let isRefreshing = false;
let refreshQueue = [];

function processRefreshQueue(error, success) {
  refreshQueue.forEach(prom => {
    if (success) prom.resolve();
    else prom.reject(error);
  });
  refreshQueue = [];
}

class SessionExpiredError extends Error {
  constructor(msg) {
    super(msg);
    this.name = 'SessionExpiredError';
  }
}

const api = axios.create({
  baseURL: '/',
  withCredentials: true,
  validateStatus: status => status >= 200 && status < 300,
});

// ✅ 요청 인터셉터
api.interceptors.request.use(
  config => {
    if (requestCount === 0) setGlobalLoading(true);
    requestCount++;

    // 필요 시 화면 경로 포함 로깅/추적 로직 추가 가능
    return config;
  },
  error => {
    requestCount = Math.max(requestCount - 1, 0);
    if (requestCount === 0) setGlobalLoading(false);
    return Promise.reject(error);
  }
);

// ✅ 응답 인터셉터
api.interceptors.response.use(
  async response => {
    requestCount = Math.max(requestCount - 1, 0);
    if (requestCount === 0) setGlobalLoading(false);
    return response;
  },
  async error => {
    requestCount = Math.max(requestCount - 1, 0);
    if (requestCount === 0) setGlobalLoading(false);

    const status = error.response?.status;
    const originalRequest = error.config;

    // 🔇 앱 로드 시 세션 체크 여부 플래그
    const silentAuthCheck = originalRequest?.headers?.['x-skip-expired-modal'] === '1';

    // ✅ refresh 요청 자체는 제외
    if (originalRequest?.url?.includes('/apim/auth/refresh')) {
      return Promise.reject(error);
    }

    // ✅ 세션 만료 (419) → refresh 시도
    if (status === 419) {
      if (originalRequest._retry) return Promise.reject(error);

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject });
        }).then(() => {
          originalRequest._retry = true;
          return api(originalRequest);
        });
      }

      isRefreshing = true;

      return new Promise(async (resolve, reject) => {
        try {
          await api.post('/apim/auth/refresh', null, { withCredentials: true });
          isRefreshing = false;
          processRefreshQueue(null, true);
          originalRequest._retry = true;
          resolve(api(originalRequest));
        } catch (refreshErr) {
          isRefreshing = false;
          processRefreshQueue(refreshErr, false);

          // silent 요청이 아니면 만료 모달
          if (!silentAuthCheck) {
            showSessionExpiredModal();
          }
          reject(refreshErr);
        }
      });
    }

    // ✅ 토큰 만료 or 토큰이 없을 경우 (440, 419)
    if (status === 440 || status === 419) {
      // 🔇 silentAuthCheck >> 모달/흐름차단 없이 그대로 에러 전달
      if (silentAuthCheck) {
        return Promise.reject(error);
      }

      // 일반 상황: 세션 만료 처리 + 모달 노출 + 흐름 차단
      useSessionStore.getState().setSessionExpired(true);
      const serverMessage = error.response?.data?.message;
      showSessionExpiredModal(serverMessage);
      processRefreshQueue(new SessionExpiredError(serverMessage), false);

      // 🔒 외부로 에러 전파하지 않고 흐름 차단
      return new Promise(() => {});
    }

    return Promise.reject(error);
  }
);

export default api;
