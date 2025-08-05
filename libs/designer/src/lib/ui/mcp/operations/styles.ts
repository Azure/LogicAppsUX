import { makeStyles, tokens } from '@fluentui/react-components';

export const useOperationSelectionGridStyles = makeStyles({
  container: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
  },

  selectionHeader: {
    display: 'flex',
    alignItems: 'center',
    paddingTop: tokens.spacingVerticalS,
    paddingBottom: tokens.spacingVerticalS,
    borderBottomWidth: tokens.strokeWidthThin,
    borderBottomStyle: 'solid',
    borderBottomColor: tokens.colorNeutralStroke2,
    gap: tokens.spacingHorizontalM,
    flexShrink: 0,
  },

  selectionCount: {
    color: tokens.colorNeutralForeground2,
  },

  operationsGrid: {
    flex: 1,
    overflow: 'auto',
    display: 'grid',
    gap: tokens.spacingVerticalM,
    padding: tokens.spacingHorizontalS,
    // Fixed grid with consistent cell dimensions
    gridAutoRows: 'minmax(100px, auto)', // Reduced minimum height
    alignItems: 'start', // Align items to top of grid cells
    alignContent: 'start', // Align grid content to top (prevents spreading)
  },

  operationCard: {
    width: '100%',
    height: 'fit-content',
    minHeight: '100px', // Reduced minimum height
    cursor: 'pointer',
    border: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
    transition: 'all 0.2s ease-in-out',
    display: 'flex',
    flexDirection: 'column',

    '&:hover': {
      border: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke1}`,
      backgroundColor: tokens.colorNeutralBackground1Hover,
      transform: 'translateY(-2px)',
      boxShadow: tokens.shadow4,
    },

    '&:active': {
      backgroundColor: tokens.colorNeutralBackground1Pressed,
      transform: 'translateY(0px)',
    },
  },

  operationCardSelected: {
    width: '100%',
    height: 'fit-content',
    minHeight: '100px', // Reduced minimum height
    cursor: 'pointer',
    border: `${tokens.strokeWidthThin} solid ${tokens.colorBrandStroke1}`,
    backgroundColor: tokens.colorBrandBackground2,
    boxShadow: tokens.shadow2,
    display: 'flex',
    flexDirection: 'column',
    transition: 'all 0.2s ease-in-out',

    '&:hover': {
      backgroundColor: tokens.colorBrandBackground2Hover,
      transform: 'translateY(-2px)',
    },

    '&:active': {
      transform: 'translateY(0px)',
    },
  },

  operationHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    width: '100%',
    gap: tokens.spacingHorizontalS,
    marginBottom: tokens.spacingVerticalXS,
  },

  operationTitle: {
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
    lineHeight: tokens.lineHeightBase200,
    flex: 1,
    minWidth: 0, // Allow text to shrink
    // Truncate long titles
    overflow: 'hidden',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
  },

  checkboxInCard: {
    flexShrink: 0,
    marginTop: '-4px', // Adjust alignment with text
  },

  connectorIcon: {
    width: '32px',
    height: '32px',
    borderRadius: tokens.borderRadiusSmall,
    objectFit: 'contain',
    flexShrink: 0,
  },

  connectorIconPlaceholder: {
    width: '32px',
    height: '32px',
    borderRadius: tokens.borderRadiusSmall,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tokens.colorBrandBackground,
    flexShrink: 0,
  },

  operationMeta: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
    flex: 1, // Allow this to grow and fill remaining space
    minHeight: 0, // Allow shrinking
  },

  operationDescription: {
    color: tokens.colorNeutralForeground2,
    lineHeight: tokens.lineHeightBase200,
    overflow: 'hidden',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    flex: 1,
  },

  connectorName: {
    color: tokens.colorNeutralForeground3,
    fontStyle: 'italic',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
  },

  operationStatus: {
    color: tokens.colorPaletteMarigoldForeground2,
    fontWeight: tokens.fontWeightMedium,
    textTransform: 'uppercase',
    fontSize: tokens.fontSizeBase100,
    backgroundColor: tokens.colorPaletteMarigoldBackground2,
    padding: `${tokens.spacingVerticalXXS} ${tokens.spacingHorizontalXS}`,
    borderRadius: tokens.borderRadiusSmall,
    display: 'inline-block',
    lineHeight: '1',
    width: 'fit-content',
    alignSelf: 'flex-start',
  },

  operationProgress: {
    width: '20px',
    height: '20px',
    paddingRight: '6px',
  },

  noResultsContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    gap: tokens.spacingVerticalS,
    padding: tokens.spacingVerticalXXL,
    textAlign: 'center',
  },

  noResultsSubtext: {
    color: tokens.colorNeutralForeground3,
    maxWidth: '300px',
  },
});
