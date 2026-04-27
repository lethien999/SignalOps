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
  const [severityFilter, setSeverityFilter] = useState<"all" | "low" | "medium" | "high">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "acknowledged" | "resolved">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const filteredAlerts = alerts.filter((alert) => {
    const matchesSeverity = severityFilter === "all" || alert.severity === severityFilter;
    const matchesStatus = statusFilter === "all" || alert.status === statusFilter;
    return matchesSeverity && matchesStatus;
  });

  const sortedAlerts = [...filteredAlerts].sort((a, b) => {
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

  const totalPages = Math.max(1, Math.ceil(sortedAlerts.length / pageSize));
  const paginatedAlerts = sortedAlerts.slice((currentPage - 1) * pageSize, currentPage * pageSize);

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
      <div className="border-b border-gray-200 bg-gray-50 px-4 py-4 md:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
              Filters
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              Lọc alert theo severity và status.
            </p>
          </div>

          <div className="flex flex-col gap-4 md:flex-row md:items-end">
            <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
              Severity
              <select
                value={severityFilter}
                onChange={(event) => {
                  setSeverityFilter(event.target.value as typeof severityFilter);
                  setCurrentPage(1);
                }}
                className="min-w-40 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                <option value="all">All severities</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </label>

            <div className="flex flex-col gap-2 text-sm font-medium text-gray-700">
              Status
              <div className="flex flex-wrap gap-3 rounded-lg border border-gray-300 bg-white px-3 py-2 shadow-sm">
                {(["all", "open", "acknowledged", "resolved"] as const).map((status) => (
                  <label key={status} className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="radio"
                      name="status-filter"
                      value={status}
                      checked={statusFilter === status}
                      onChange={() => {
                        setStatusFilter(status);
                        setCurrentPage(1);
                      }}
                      className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="capitalize">{status}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

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
            {paginatedAlerts.map((alert) => {
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

      {filteredAlerts.length !== alerts.length && (
        <div className="border-t border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600 md:px-6">
          Showing {filteredAlerts.length} of {alerts.length} alerts.
        </div>
      )}

      {sortedAlerts.length > pageSize && (
        <div className="flex items-center justify-between gap-3 border-t border-gray-200 bg-white px-4 py-3 md:px-6">
          <p className="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              disabled={currentPage === 1}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              disabled={currentPage === totalPages}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

