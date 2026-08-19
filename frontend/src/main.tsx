import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { Toaster } from 'react-hot-toast';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
    <Toaster
      position="top-right"
      toastOptions={{
        style: {
          background: '#1a1a1a',
          color: '#f5f5f5',
          border: '1px solid #2a2a2a',
          fontFamily: 'Inter, sans-serif',
          fontSize: '14px',
        },
        success: {
          iconTheme: { primary: '#a855f7', secondary: '#1a1a1a' },
        },
        error: {
          iconTheme: { primary: '#ef4444', secondary: '#1a1a1a' },
        },
      }}
    />
  </React.StrictMode>
);
