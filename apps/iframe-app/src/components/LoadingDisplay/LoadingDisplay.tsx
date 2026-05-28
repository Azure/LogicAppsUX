import { useLoadingDisplayStyles } from './LoadingDisplayStyles';

interface LoadingDisplayProps {
  title: string;
  message: string;
}

export function LoadingDisplay({ title, message }: LoadingDisplayProps) {
  const styles = useLoadingDisplayStyles();

  return (
    <div className={styles.container}>
      <div>
        <h3 className={styles.title}>{title}</h3>
        <p className={styles.message}>{message}</p>
      </div>
    </div>
  );
}
