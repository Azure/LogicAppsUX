import React from 'react';
import { makeStyles, tokens } from '@fluentui/react-components';
import { ChatWindow } from '../ChatWindow';
import { ChatThemeProvider } from '../ThemeProvider/ThemeProvider';
import type { ChatWidgetProps } from '../../types';
import type { ThemeConfig } from '../../theme/fluentTheme';

const useStyles = makeStyles({
  container: {
    height: '100%',
    width: '100%',
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusMedium,
    overflow: 'hidden',
    boxShadow: tokens.shadow16,
  },
});

/**
 * Main chat widget component that provides a complete chat interface.
 * This is the primary component exported by the library for easy integration
 * into any React application.
 *
 * @example
 * ```tsx
 * import { ChatWidget } from '@microsoft/logicAppsChat/react';
 *
 * function App() {
 *   return (
 *     <ChatWidget
 *       agentCard="https://agent.example.com/agent-card.json"
 *       themeConfig={{
 *         primaryColor: '#007bff',
 *       }}
 *       welcomeMessage="Hello! How can I help you today?"
 *     />
 *   );
 * }
 * ```
 */
export function ChatWidget(
  props: ChatWidgetProps & {
    themeConfig?: ThemeConfig;
    fluentTheme?: 'light' | 'dark';
    mode?: 'light' | 'dark';
  }
) {
  const { theme, themeConfig, fluentTheme = 'light', mode = 'light', ...restProps } = props;
  const styles = useStyles();

  // For backward compatibility, convert old theme to themeConfig
  const fluentThemeConfig: ThemeConfig | undefined = React.useMemo(() => {
    if (themeConfig) return themeConfig;

    // Support new theme structure with colors object
    if (theme && 'colors' in theme && theme.colors && typeof theme.colors.primary === 'string') {
      return {
        primaryColor: theme.colors.primary,
      };
    }

    // Legacy theme support - primaryColor might exist on old theme prop
    if (theme && 'primaryColor' in theme && typeof theme.primaryColor === 'string') {
      return {
        primaryColor: theme.primaryColor,
      };
    }
    return undefined;
  }, [theme, themeConfig]);

  // Check if we're in a single-session context by looking for the parent container
  // Default is multi-session unless explicitly set to single-session
  const isSingleSession =
    typeof window !== 'undefined' && window.location.search.includes('singleSession=true');
  const isMultiSession = !isSingleSession;

  return (
    <ChatThemeProvider theme={fluentTheme} themeConfig={fluentThemeConfig}>
      {isMultiSession ? (
        <ChatWindow {...restProps} theme={theme} mode={mode} />
      ) : (
        <div className={styles.container}>
          <ChatWindow {...restProps} theme={theme} mode={mode} />
        </div>
      )}
    </ChatThemeProvider>
  );
}
