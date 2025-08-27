import React, { createContext, useContext, useState } from 'react';

const ErrorContext = createContext();

export function ErrorProvider({ children }) {
  const [errorMessage, setErrorMessage] = useState('');

  const showError = (msg) => setErrorMessage(msg);
  const hideError = () => setErrorMessage('');

  return (
    <ErrorContext.Provider value={{ errorMessage, showError, hideError }}>
      {children}
    </ErrorContext.Provider>
  );
}

export function useError() {
  return useContext(ErrorContext);
}
