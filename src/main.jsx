import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './store/Auth';
import { ErrorProvider } from './utils/ErrorContext';
import ErrorModal from './utils/ErrorModal';
import { MessageProvider } from './utils/MessageContext';
import MessageModal from './utils/MessageModal';
import GlobalLoading from './utils/GlobalLoading';

import App from './App'; // <-- App만 import

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <ErrorProvider>
      <ErrorModal />
      <GlobalLoading />
      <MessageProvider>
        <MessageModal />
        <AuthProvider>
          <App />
        </AuthProvider>
      </MessageProvider>
    </ErrorProvider>
  </BrowserRouter>
);
