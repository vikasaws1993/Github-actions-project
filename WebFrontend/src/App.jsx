import React, { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { LanguageProvider } from '@/context/LanguageContext';
import AppRoutes from '@/routes/AppRoutes';
import './App.css';

export function App() {
  // Prevent mouse wheel from inadvertently changing values in number inputs across the entire application
  useEffect(() => {
    const handleWheel = (e) => {
      if (
        document.activeElement && 
        (document.activeElement.tagName === 'INPUT' && document.activeElement.type === 'number')
      ) {
        document.activeElement.blur();
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: true });
    return () => window.removeEventListener('wheel', handleWheel);
  }, []);

  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <LanguageProvider>
            <AppRoutes />
          </LanguageProvider>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
// This is test Workflow
export default App;

