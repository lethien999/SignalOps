"use client";

import React from "react";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { useAlertStore } from "@/stores";
import { useSocket } from "@/hooks/useSocket";

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const activeAlerts = useAlertStore(
    (state) => state.alerts.filter((a) => a.status === "open").length
  );

  useSocket();

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header unreadAlerts={activeAlerts} />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
