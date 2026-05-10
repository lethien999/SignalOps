'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { handleOAuthCallback } from '@/lib/auth';

export default function CallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState<string>('Processing OAuth callback...');

  useEffect(() => {
    const processCallback = async () => {
      try {
        const result = handleOAuthCallback();

        if (result.success) {
          setStatus('success');
          setMessage(`Successfully signed in with ${result.provider}`);

          // Redirect to dashboard after 1 second
          setTimeout(() => {
            router.push('/');
          }, 1000);
        } else {
          setStatus('error');
          setMessage(result.error || 'OAuth callback failed');
        }
      } catch (error) {
        setStatus('error');
        setMessage(error instanceof Error ? error.message : 'An error occurred');
      }
    };

    processCallback();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="text-center">
          {status === 'processing' && (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">{message}</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="flex justify-center mb-4">
                <svg
                  className="h-12 w-12 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <p className="text-green-600 dark:text-green-400 font-medium">{message}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Redirecting to dashboard...</p>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="flex justify-center mb-4">
                <svg
                  className="h-12 w-12 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <p className="text-red-600 dark:text-red-400 font-medium mb-4">{message}</p>
              <a
                href="/login"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
              >
                Back to Login
              </a>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
