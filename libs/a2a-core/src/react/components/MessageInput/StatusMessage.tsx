import React from 'react';
import { Caption1, makeStyles, tokens } from '@fluentui/react-components';

const useStyles = makeStyles({
  statusMessage: {
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
    textAlign: 'center',
  },
});

interface StatusMessageProps {
  isConnected: boolean;
  isTyping: boolean;
  hasAuthRequired: boolean;
}

export function StatusMessage({ isConnected, isTyping, hasAuthRequired }: StatusMessageProps) {
  const styles = useStyles();

  // Priority hierarchy:
  // 1. Not connected - highest priority
  // 2. Agent is typing - second priority
  // 3. Authentication in progress - third priority
  // 4. Nothing - when all are false

  if (!isConnected) {
    return <Caption1 className={styles.statusMessage}>Connecting...</Caption1>;
  }

  if (isTyping) {
    return <Caption1 className={styles.statusMessage}>Agent is typing...</Caption1>;
  }

  if (hasAuthRequired) {
    return <Caption1 className={styles.statusMessage}>Authentication in progress...</Caption1>;
  }

  // Return null when no status to show
  return null;
}
