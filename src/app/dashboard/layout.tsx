'use client';

import React, { useEffect } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { NavTabs } from '@/components/layout/nav-tabs';
import { getActiveUser, checkAndPerformDailyMidnightReset } from '@/lib/auth-storage';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Continuous midnight and tab-focus day rollover detection
  useEffect(() => {
    const handleMidnightCheck = () => {
      const active = getActiveUser();
      if (active) {
        checkAndPerformDailyMidnightReset(active.id);
      }
    };

    // 1. Check immediately on mount
    handleMidnightCheck();

    // 2. Periodic check every 30 seconds
    const interval = setInterval(handleMidnightCheck, 30000);

    // 3. Check on tab visibility or window focus
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleMidnightCheck();
      }
    };

    window.addEventListener('focus', handleMidnightCheck);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleMidnightCheck);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      {/* Persistent Left Sidebar */}
      <Sidebar />

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        <NavTabs />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 relative">
          {children}
        </main>
      </div>
    </div>
  );
}
