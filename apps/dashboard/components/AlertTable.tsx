"use client";

import React, { useState } from "react";
import { ChevronDown, Clock, AlertTriangle, AlertCircle } from "lucide-react";
import type { Alert } from "@/types";

interface AlertTableProps {
  alerts: Alert[];
  onSelectAlert: (alert: Alert) => void;
}

const severityConfig = {
  high: { color: "bg-red-50 text-red-700", badge: "bg-red-100", icon: AlertTriangle },
  medium: { color: "bg-yellow-50 text-yellow-700", badge: "bg-yellow-100", icon: AlertCircle },
  low: { color: "bg-blue-50 text-blue-700", badge: "bg-blue-100", icon: AlertCircle },
};

export function AlertTable({ alerts, onSelectAlert }: AlertTableProps) {
  const [sortBy, setSortBy] = useState<"severity" | "time">("time");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const sortedAlerts = [...alerts].sort((a, b) => {
    if (sortBy === "severity") {
      const severityOrder = { high: 3, medium: 2, low: 1 };
      return sortOrder === "desc"
        ? severityOrder[b.severity] - severityOrder[a.severity]
        : severityOrder[a.severity] - severityOrder[b.severity];
    } else {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
    }
  });

  if (alerts.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-600 font-medium">No alerts</p>
        <p className="text-gray-500 text-sm">Everything looks good!</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left">
                <button
                  onClick={() => {
                    if (sortBy === "severity") {
                      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                    } else {
                      setSortBy("severity");
                      setSortOrder("desc");
                    }
                  }}
                  className="flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-gray-900"
                >
                  Severity
                  {sortBy === "severity" && (
                    <ChevronDown
                      className={`w-4 h-4 transition-transform ${
                        sortOrder === "asc" ? "rotate-180" : ""
                      }`}
                    />
                  )}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Type</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Location</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Message</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
              <th className="px-6 py-3 text-left">
                <button
                  onClick={() => {
                    if (sortBy === "time") {
                      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                    } else {
                      setSortBy("time");
                      setSortOrder("desc");
                    }
                  }}
                  className="flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-gray-900"
                >
                  Time
                  {sortBy === "time" && (
                    <ChevronDown
                      className={`w-4 h-4 transition-transform ${
                        sortOrder === "asc" ? "rotate-180" : ""
                      }`}
                    />
                  )}
                </button>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {sortedAlerts.map((alert) => {
              const config = severityConfig[alert.severity];
              const Icon = config.icon;
              return (
                <tr
                  key={alert.id}
                  onClick={() => onSelectAlert(alert)}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${config.badge}`}>
                      <Icon className="w-4 h-4" />
                      {alert.severity.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{alert.type}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {alert.location?.name || `${alert.location?.lat}, ${alert.location?.lng}`}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                    {alert.message}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                        alert.status === "open"
                          ? "bg-red-100 text-red-800"
                          : alert.status === "acknowledged"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-green-100 text-green-800"
                      }`}
                    >
                      {alert.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {new Date(alert.createdAt).toLocaleDateString()} {new Date(alert.createdAt).toLocaleTimeString()}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

