import { tokens } from '@fluentui/react-components';
import type { GriffelStyle } from '@fluentui/react-components';

/** Shared card visuals without interaction, selection, or status styles. */
export const workflowCardStyles = {
  root: {
    margin: '0px auto',
    position: 'relative',
    border: '2px solid transparent',
    boxSizing: 'border-box',
    fontSize: '12px',
    borderRadius: '6px',
    width: '200px',
    padding: '8px 10px',
    webkitUserSelect: 'none',
    userSelect: 'none',
    backgroundColor: tokens.colorNeutralBackground1,
    cursor: 'default',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    boxShadow: '0 0 2px rgba(0,0,0,0.24), 0 2px 4px rgba(0,0,0,0.28)',
  },
  icon: {
    alignSelf: 'flex-start',
    height: '24px',
    width: '24px',
    borderRadius: '2px',
    overflow: 'hidden',
    flexShrink: 0,
    '& > img': {
      width: '100%',
      height: '100%',
      objectFit: 'contain',
    },
  },
  title: {
    fontSize: '14px',
    fontWeight: '600',
    color: tokens.colorNeutralForeground1,
    lineHeight: '20px',
    flexGrow: 1,
    wordBreak: 'break-word',
  },
} as const satisfies Record<'root' | 'icon' | 'title', GriffelStyle>;
