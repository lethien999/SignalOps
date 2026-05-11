'use client';

import React, { useEffect, useState } from 'react';
import { Download } from 'lucide-react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  if (!deferredPrompt || dismissed) {
    return null;
  }

  return (
    <div className="mx-4 mt-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 md:hidden">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-lg bg-blue-100 p-2">
          <Download className="h-4 w-4 text-blue-700" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-blue-900">Cài SignalOps Mobile</p>
          <p className="mt-0.5 text-xs text-blue-700">Thêm ứng dụng vào màn hình chính để theo dõi cảnh báo nhanh hơn.</p>
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={handleInstall}
              className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
            >
              Cài đặt
            </button>
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="rounded-md border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
            >
              Để sau
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
