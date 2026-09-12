import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './components/Toast';
import { DataSyncProvider } from './context/DataSyncContext';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <DataSyncProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </DataSyncProvider>
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>
);
