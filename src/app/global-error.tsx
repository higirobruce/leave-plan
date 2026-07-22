'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'system-ui, sans-serif', background: '#f7f8fa' }}>
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 500, marginBottom: '0.5rem', color: '#333' }}>Something went wrong</h1>
            <p style={{ fontSize: '0.875rem', color: '#888', marginBottom: '1.5rem' }}>{error.message}</p>
            <button
              onClick={() => reset()}
              style={{
                fontSize: '0.875rem',
                color: '#2563eb',
                background: 'none',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                padding: '0.375rem 0.75rem',
                cursor: 'pointer',
              }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
