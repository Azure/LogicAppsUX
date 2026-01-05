import { useErrorDisplayStyles } from './ErrorDisplayStyles';

interface ErrorDisplayProps {
  title: string;
  message: string;
  details?: {
    url?: string;
    parameters?: string;
  };
}

/**
 * Displays error information with optional details in a formatted container.
 * @param props - The error display properties
 * @param props.title - The main title of the error
 * @param props.message - The descriptive error message
 * @param props.details - Optional additional error details
 * @param props.details.url - The URL where the error occurred (optional)
 * @param props.details.parameters - Additional parameters related to the error (optional)
 * @returns A React component that renders the error information
 */
export function ErrorDisplay({ title, message, details }: ErrorDisplayProps) {
  const styles = useErrorDisplayStyles();

  return (
    <div className={styles.container}>
      <div>
        <h3 className={styles.title}>{title}</h3>
        <p className={styles.message}>{message}</p>
        {details && (
          <>
            {details.url && <p className={styles.details}>URL: {details.url}</p>}
            {details.parameters && <p className={styles.detailsSecondary}>Parameters: {details.parameters}</p>}
          </>
        )}
      </div>
    </div>
  );
}
