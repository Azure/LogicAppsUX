interface ErrorDisplayProps {
  title: string;
  message: string;
  details?: {
    url?: string;
    parameters?: string;
  };
}

export function ErrorDisplay({ title, message, details }: ErrorDisplayProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        fontFamily: 'sans-serif',
        color: '#666',
        textAlign: 'center',
        padding: '20px',
      }}
    >
      <div>
        <h3 style={{ color: '#333', marginBottom: '10px' }}>{title}</h3>
        <p style={{ margin: 0 }}>{message}</p>
        {details && (
          <>
            {details.url && (
              <p style={{ marginTop: '10px', fontSize: '12px', color: '#999' }}>
                URL: {details.url}
              </p>
            )}
            {details.parameters && (
              <p style={{ marginTop: '5px', fontSize: '12px', color: '#999' }}>
                Parameters: {details.parameters}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
