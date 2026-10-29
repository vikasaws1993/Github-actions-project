import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar/Sidebar';
import Navbar from './Navbar/Navbar';
import { useLanguage } from '@/context/LanguageContext';
import './AppLayout.css';

export const AppLayout = () => {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);
  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="am-app-layout">
      <div
        className={`am-sidebar-backdrop ${sidebarOpen ? 'active' : ''}`}
        onClick={closeSidebar}
      />
      <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />
      <div className="am-main-container">
        <Navbar onToggleSidebar={toggleSidebar} />
        <main className="am-content-area">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;

