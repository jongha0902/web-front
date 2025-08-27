import React, { createContext, useContext, useState } from 'react';

const MessageContext = createContext();

export function MessageProvider({ children }) {
  const [message, setMessage] = useState('');

  const showMessage = (msg) => setMessage(msg);
  const hideMessage = () => setMessage('');

  return (
    <MessageContext.Provider value={{ message, showMessage, hideMessage }}>
      {children}
    </MessageContext.Provider>
  );
}

export function useMessage() {
  return useContext(MessageContext);
}
