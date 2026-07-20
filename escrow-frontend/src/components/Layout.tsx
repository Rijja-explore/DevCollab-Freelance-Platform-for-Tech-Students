import React, { useEffect, useState } from 'react';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [darkMode, setDarkMode] = useState<boolean>(true);

  useEffect(() => {
    const root = window.document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      root.style.backgroundColor = '#020617'; // slate-950
    } else {
      root.classList.remove('dark');
      root.style.backgroundColor = '#f8fafc'; // slate-50
    }
  }, [darkMode]);

  return (
    <div className={`min-h-screen relative z-0 ${darkMode ? 'dark bg-surface text-white' : 'bg-slate-50 text-slate-900'}`}>
      {/* Background Ambient Shapes for Premium Look */}
      {darkMode && (
        <>
          <div className="bg-shape bg-shape-1"></div>
          <div className="bg-shape bg-shape-2"></div>
          <div className="bg-shape bg-shape-3"></div>
        </>
      )}
      
      <div className="flex h-screen overflow-hidden z-10 relative">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Navbar darkMode={darkMode} setDarkMode={setDarkMode} />
          <main className="flex-1 p-8 overflow-y-auto w-full animate-fade-in relative">
            <div className="max-w-[1600px] mx-auto w-full">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};
