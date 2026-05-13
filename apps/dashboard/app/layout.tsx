import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { trace } from '@opentelemetry/api';
import './globals.css';
import { LayoutShell } from './layout-shell';

const inter = Inter({ subsets: ['latin', 'vietnamese'] });

export const metadata: Metadata = {
  title: 'SignalOps — Giám sát mạng viễn thông',
  description:
    'Hệ thống giám sát chất lượng mạng viễn thông theo thời gian thực. Phát hiện bất thường, tạo cảnh báo, hiển thị trên bản đồ.',
  manifest: '/manifest.webmanifest',
  applicationName: 'SignalOps',
  appleWebApp: {
    capable: true,
    title: 'SignalOps',
    statusBarStyle: 'default',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const tracer = trace.getTracer('signalops-dashboard');

  return tracer.startActiveSpan('dashboard.root-layout.render', (span) => {
    span.setAttribute('signalops.route', 'root-layout');
    const node = (
      <html lang="vi">
        <body className={`${inter.className} antialiased`}>
          <LayoutShell>{children}</LayoutShell>
        </body>
      </html>
    );
    span.end();
    return node;
  });
}
