import React, { createContext, useContext, useState, useCallback } from 'react';

const ErrorContext = createContext();

export function ErrorProvider({ children }) {
  const [errorMessage, setErrorMessage] = useState('');

  // useCallback을 사용하여 함수가 재생성되지 않도록 수정
  const showError = useCallback((msg) => setErrorMessage(msg), []);
  const hideError = useCallback(() => setErrorMessage(''), []);

  return (
    <ErrorContext.Provider value={{ errorMessage, showError, hideError }}>
      {children}
    </ErrorContext.Provider>
  );
}

export function useError() {
  return useContext(ErrorContext);
}
