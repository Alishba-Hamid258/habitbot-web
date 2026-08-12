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
    <div className="flex h-screen w-screen overflow-hidden bg-[#f8f9fa] dark:bg-[#121212] text-[#202124] dark:text-[#e8eaed]">
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
