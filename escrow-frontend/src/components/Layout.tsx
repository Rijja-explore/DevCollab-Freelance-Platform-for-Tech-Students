import React, { useEffect, useState } from 'react';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  return (
    <div className="min-h-screen relative bg-surface text-white">
      {/* Ambient mesh background */}
      <div className="mesh-orb mesh-orb-1" aria-hidden />
      <div className="mesh-orb mesh-orb-2" aria-hidden />
      <div className="mesh-orb mesh-orb-3" aria-hidden />
      <div className="dot-grid-overlay" aria-hidden />

      {/* Mobile overlay */}
      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close navigation"
        />
      )}

      <div className="flex h-screen overflow-hidden relative z-10">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <div className="flex-1 flex flex-col min-w-0">
          <Navbar onMenuClick={() => setSidebarOpen(true)} />
          <main className="flex-1 p-5 md:p-8 overflow-y-auto w-full animate-fade-in">
            <div className="max-w-[1600px] mx-auto w-full">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};
