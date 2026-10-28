import { makeStyles, tokens } from '@fluentui/react-components';
import { workflowCardStyles } from '../card/workflowCardStyles';

export const useWorkflowPreviewStyles = makeStyles({
  root: {
    position: 'relative',
    width: '100%',
    height: '100%',
    minWidth: 0,
    minHeight: '320px',
    overflow: 'hidden',
    backgroundColor: tokens.colorNeutralBackground3,
    color: tokens.colorNeutralForeground1,
    fontFamily: tokens.fontFamilyBase,
    fontSize: tokens.fontSizeBase300,
    lineHeight: tokens.lineHeightBase300,
  },
  flow: {
    minHeight: '320px',
    '--xy-background-color': tokens.colorNeutralBackground3,
    // The host designer globally lowers React Flow panels below the canvas renderer.
    '& > .react-flow__panel': {
      zIndex: '5 !important',
      margin: `${tokens.spacingHorizontalL} !important`,
      pointerEvents: 'auto',
    },
    '& .react-flow__edge': {
      pointerEvents: 'none',
    },
    '& .react-flow__edge-interaction': {
      pointerEvents: 'none',
    },
  },
  card: {
    ...workflowCardStyles.root,
    pointerEvents: 'auto',
  },
  iconTile: {
    ...workflowCardStyles.icon,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tokens.colorNeutralBackground3,
  },
  label: {
    ...workflowCardStyles.title,
    display: '-webkit-box',
    WebkitBoxOrient: 'vertical',
    WebkitLineClamp: 2,
    minWidth: 0,
    overflow: 'hidden',
    overflowWrap: 'anywhere',
  },
  handle: {
    visibility: 'hidden',
    pointerEvents: 'none',
  },
  controls: {
    display: 'flex',
    flexDirection: 'column',
    margin: tokens.spacingHorizontalL,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground1,
  },
  controlButton: {
    minWidth: '32px',
  },
  empty: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxSizing: 'border-box',
    height: '100%',
    minHeight: '320px',
    padding: tokens.spacingHorizontalXL,
    color: tokens.colorNeutralForeground3,
    textAlign: 'center',
  },
});
