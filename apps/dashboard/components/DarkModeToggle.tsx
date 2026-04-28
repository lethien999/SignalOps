"use client";

import React, { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export function DarkModeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("signalops-theme");
    if (saved === "dark" || (!saved && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      setIsDark(true);
      document.documentElement.classList.add("dark");
    }
  }, []);

  const toggle = () => {
    const next = !isDark;
    setIsDark(next);
    if (next) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("signalops-theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("signalops-theme", "light");
    }
  };

  return (
    <button
      onClick={toggle}
      className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      aria-label={isDark ? "Chuyển sang chế độ sáng" : "Chuyển sang chế độ tối"}
      title={isDark ? "Chế độ sáng" : "Chế độ tối"}
    >
      {isDark ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5" />}
    </button>
  );
}
