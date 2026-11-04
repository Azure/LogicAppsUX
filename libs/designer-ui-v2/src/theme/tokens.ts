export const designerUiTokens = {
  nodeSurface: 'var(--designer-ui-v2-node-surface, var(--colorNeutralBackground1))',
  nodeSurfaceHover: 'var(--designer-ui-v2-node-surface-hover, var(--colorNeutralBackground1Hover))',
  nodeSurfaceSelected: 'var(--designer-ui-v2-node-surface-selected, var(--colorNeutralBackground1Selected))',
  nodeBorderSelected: 'var(--designer-ui-v2-node-border-selected, var(--colorNeutralStroke1))',
  nodeTileBackground: 'var(--designer-ui-v2-node-tile-background, var(--colorNeutralBackground1))',
  nodeHandleBackground: 'var(--designer-ui-v2-node-handle-background, var(--colorNeutralBackground1))',
  nodeAgentSurface: 'var(--designer-ui-v2-node-agent-surface, var(--colorNeutralBackground3))',
  nodeAgentSurfaceHover: 'var(--designer-ui-v2-node-agent-surface-hover, var(--colorNeutralBackground3Hover))',
  nodeAgentSurfaceSelected: 'var(--designer-ui-v2-node-agent-surface-selected, var(--colorNeutralBackground3Selected))',
  nodeTestDataStroke: 'var(--designer-ui-v2-node-test-data-stroke, #8251ee)',
  nodeTestDataForeground: 'var(--designer-ui-v2-node-test-data-foreground, #643fb2)',
  agentNativeBadgeBackground: 'var(--designer-ui-v2-agent-native-badge-background, #CFDDFC)',
  agentNativeBadgeForeground: 'var(--designer-ui-v2-agent-native-badge-foreground, #1E40AF)',
} as const;

export const nodeCardVars = {
  background: '--designer-ui-v2-node-card-background',
  footerBackground: '--designer-ui-v2-node-card-footer-background',
  textEndReserve: '--designer-ui-v2-node-text-end-reserve',
} as const;
