interface LoadingDisplayProps {
  title: string;
  message: string;
}

export function LoadingDisplay({ title, message }: LoadingDisplayProps) {
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
      </div>
    </div>
  );
}
