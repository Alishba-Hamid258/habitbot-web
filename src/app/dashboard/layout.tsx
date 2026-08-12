'use client';

import React from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { NavTabs } from '@/components/layout/nav-tabs';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-[#090d16] text-slate-900 dark:text-slate-100">
      {/* Persistent Left Sidebar */}
      <Sidebar />

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        <NavTabs />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 relative bg-slate-50/50 dark:bg-transparent">
          {children}
        </main>
      </div>
    </div>
  );
}
