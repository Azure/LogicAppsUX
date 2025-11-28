import React, { useState } from 'react';
import { Button, Caption1, tokens, makeStyles, shorthands } from '@fluentui/react-components';
import { CopyRegular, CheckmarkRegular } from '@fluentui/react-icons';

const useStyles = makeStyles({
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: tokens.colorNeutralBackground2,
    borderTopLeftRadius: tokens.borderRadiusMedium,
    borderTopRightRadius: tokens.borderRadiusMedium,
    borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
    ...shorthands.padding(tokens.spacingVerticalS, tokens.spacingHorizontalM),
  },
  language: {
    fontFamily: 'monospace',
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
    textTransform: 'lowercase',
  },
  copyButton: {
    minWidth: 'auto',
  },
  copyButtonSuccess: {
    color: tokens.colorPaletteGreenForeground1,
  },
});

interface CodeBlockHeaderProps {
  language: string;
  code: string;
}

export const CodeBlockHeader: React.FC<CodeBlockHeaderProps> = ({ language, code }) => {
  const styles = useStyles();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  return (
    <div className={styles.header}>
      <Caption1 className={styles.language}>{language}</Caption1>
      <Button
        appearance="subtle"
        size="small"
        icon={copied ? <CheckmarkRegular /> : <CopyRegular />}
        onClick={handleCopy}
        className={copied ? styles.copyButtonSuccess : styles.copyButton}
        aria-label={copied ? 'Copied' : 'Copy code'}
      >
        {copied ? 'Copied!' : 'Copy'}
      </Button>
    </div>
  );
};
