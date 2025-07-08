import { useRef } from 'react';
import { McpPanelRoot } from './panel/mcpPanelRoot';
import { McpWizard } from './wizard/McpWizard';
import { useMcpContainerStyles } from './styles';

export const McpContainer = () => {
  const styles = useMcpContainerStyles();
  const panelContainerRef = useRef<HTMLElement | null>(null);

  return (
    <div className={styles.container} ref={panelContainerRef as any}>
      <div className={styles.wizardArea}>
        <McpWizard />
      </div>

      <McpPanelRoot panelContainerRef={panelContainerRef} />
    </div>
  );
};
