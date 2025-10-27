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
  baseURL: '/', // 필요시 기본 URL 설정
  withCredentials: true,
  validateStatus: status => status >= 200 && status < 300,
});

// 요청 인터셉터
api.interceptors.request.use(
  config => {
    // 로딩 건너뛰기 헤더 확인
    const skipLoading = config.headers?.['X-Skip-Global-Loading'] === 'true';

    // 로딩을 건너뛰지 않고, 첫 요청일 때만 로딩 표시
    if (!skipLoading && requestCount === 0) {
      setGlobalLoading(true);
    }
    requestCount++;

    return config;
  },
  error => {
    // 요청 실패 시에도 카운트는 줄여야 함
    requestCount = Math.max(requestCount - 1, 0);
    // 실패한 요청의 헤더를 확인 (error.config 사용)
    const skipLoading = error.config?.headers?.['X-Skip-Global-Loading'] === 'true';
    // 로딩을 건너뛰지 않고, 마지막 요청이었을 때 로딩 숨김
    if (!skipLoading && requestCount === 0) {
      setGlobalLoading(false);
    }
    return Promise.reject(error);
  }
);

// 응답 인터셉터
api.interceptors.response.use(
  response => { // 성공 응답
    requestCount = Math.max(requestCount - 1, 0);
    // 성공 응답 원본 요청의 헤더 확인 (response.config 사용)
    const skipLoading = response.config?.headers?.['X-Skip-Global-Loading'] === 'true';
    // 로딩을 건너뛰지 않고, 마지막 요청이었을 때 로딩 숨김
    if (!skipLoading && requestCount === 0) {
      setGlobalLoading(false);
    }
    return response;
  },
  async error => { // 에러 응답
    requestCount = Math.max(requestCount - 1, 0);
    // 에러 응답 원본 요청의 헤더 확인 (error.config 사용)
    const skipLoading = error.config?.headers?.['X-Skip-Global-Loading'] === 'true';
     // 로딩을 건너뛰지 않고, 마지막 요청이었을 때 로딩 숨김
    if (!skipLoading && requestCount === 0) {
      setGlobalLoading(false);
    }

    const status = error.response?.status;
    const originalRequest = error.config;

    // refresh 요청 자체는 제외
    // if (originalRequest?.url?.includes('/apim/auth/refresh')) {
    //   return Promise.reject(error);
    // }

    // 세션 만료 (419) → refresh 시도
    if (status === 419) {
      if (originalRequest._retry) return Promise.reject(error); // 무한 재시도 방지

      if (isRefreshing) {
        // Refresh 중이면 큐에 추가하고 대기
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject });
        }).then(() => {
          // Refresh 완료 후 원래 요청 재시도
          originalRequest._retry = true;
          return api(originalRequest);
        });
      }

      isRefreshing = true;

      // Refresh 토큰 요청
      return new Promise(async (resolve, reject) => {
        try {
          await api.post('/apim/auth/refresh', null, { withCredentials: true });
          // Refresh 성공
          isRefreshing = false;
          processRefreshQueue(null, true); // 대기 중인 요청들 재개
          originalRequest._retry = true;
          resolve(api(originalRequest)); // 원래 요청 재시도
        } catch (refreshErr) {
          // Refresh 실패 (리프레시 토큰 만료 등)
          isRefreshing = false;
          processRefreshQueue(refreshErr, false); // 대기 중인 요청들 실패 처리
          // 440 처리 로직과 유사하게 세션 만료 처리
          useSessionStore.getState().setSessionExpired(true);
          const serverMessage = refreshErr.response?.data?.message || '세션 갱신 실패';
          showSessionExpiredModal(serverMessage);
          reject(new SessionExpiredError(serverMessage)); // 세션 만료 에러로 reject
        }
      });
    }

    // Refresh 토큰 만료 또는 토큰 없음 (440) - 419에서 Refresh 실패 시 여기로 올 수 있음
    const silentAuthCheck = originalRequest?.headers?.['x-skip-expired-modal'] === '1';
    if (status === 440) {
        if (silentAuthCheck) {
            // 조용한 체크 시에는 에러를 그대로 반환
            return Promise.reject(error);
        }
        // 일반적인 경우 세션 만료 처리
        useSessionStore.getState().setSessionExpired(true);
        const serverMessage = error.response?.data?.message || '세션이 만료되었습니다.';
        showSessionExpiredModal(serverMessage);
        processRefreshQueue(new SessionExpiredError(serverMessage), false);
        // 에러 전파를 막고 흐름 차단 (Modal에서 페이지 이동 처리)
        return new Promise(() => {}); // 의도적으로 resolve/reject하지 않음
    }

    // 그 외 다른 에러는 그대로 반환
    return Promise.reject(error);
  }
);

export default api;