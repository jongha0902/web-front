import { useState, useCallback } from 'react';

let globalSetLoading = null;

export function useLoading() {
  const [loading, setLoading] = useState(false);

  globalSetLoading = setLoading;

  return loading;
}

// 외부에서 로딩 상태를 제어하기 위한 함수
export function setGlobalLoading(value) {
  if (globalSetLoading) {
    globalSetLoading(value);
  }
}
