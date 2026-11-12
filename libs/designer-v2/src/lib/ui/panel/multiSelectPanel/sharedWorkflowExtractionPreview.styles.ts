import { makeStyles, tokens } from '@fluentui/react-components';

export const useSharedPreviewStyles = makeStyles({
  root: {
    position: 'relative',
    width: '100%',
    height: '100%',
    minWidth: 0,
    minHeight: '320px',
    overflow: 'hidden',
    backgroundColor: tokens.colorNeutralBackground1,
    color: tokens.colorNeutralForeground1,
  },
  flow: {
    minHeight: '320px',
    '--xy-background-color': tokens.colorNeutralBackground1,
    '& > .react-flow__panel': {
      zIndex: '5 !important',
      margin: `${tokens.spacingHorizontalL} !important`,
      pointerEvents: 'auto',
    },
    '& .react-flow__edge': { pointerEvents: 'none' },
  },
  handle: {
    visibility: 'hidden',
    pointerEvents: 'none',
    // XYFlow connects at the outward edge; these invisible anchors stay inside the card.
    '&.react-flow__handle': { transform: 'translateX(-50%)' },
  },
  controls: {
    display: 'flex',
    flexDirection: 'column',
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground1,
  },
  control: { minWidth: '32px' },
  empty: { display: 'grid', height: '100%', placeItems: 'center', padding: tokens.spacingHorizontalL },
});
