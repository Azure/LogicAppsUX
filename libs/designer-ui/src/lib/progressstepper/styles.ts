import { makeStyles, shorthands, tokens } from '@fluentui/react-components';
import { designTokens } from '../tokens/designTokens';

const indicatorSize = designTokens.sizes.insertButtonSize;
const horizontalLayout = '@container progress-stepper (min-width: 480px)';

export const useProgressStepperStyles = makeStyles({
  container: {
    containerType: 'inline-size',
    containerName: 'progress-stepper',
    minWidth: 0,
    width: '100%',
  },
  root: {
    listStyleType: 'none',
    margin: 0,
    padding: 0,
    color: tokens.colorNeutralForeground1,
    backgroundColor: tokens.colorNeutralBackground1,
    [horizontalLayout]: {
      display: 'grid',
      gridAutoFlow: 'column',
      gridAutoColumns: 'minmax(0, 1fr)',
      columnGap: tokens.spacingHorizontalL,
    },
  },
  step: {
    position: 'relative',
    display: 'flex',
    columnGap: tokens.spacingHorizontalM,
    paddingBottom: tokens.spacingVerticalL,
    ':last-child': {
      paddingBottom: 0,
    },
    ':not(:last-child)::after': {
      content: '""',
      position: 'absolute',
      insetInlineStart: `calc(${indicatorSize} / 2 - ${tokens.strokeWidthThin} / 2)`,
      top: `calc(${indicatorSize} + ${tokens.spacingVerticalXS})`,
      bottom: tokens.spacingVerticalXS,
      borderInlineStartWidth: tokens.strokeWidthThin,
      borderInlineStartStyle: 'solid',
      borderInlineStartColor: tokens.colorNeutralStroke2,
      '@media (forced-colors: active)': {
        borderInlineStartColor: 'CanvasText',
      },
    },
    [horizontalLayout]: {
      minWidth: 0,
      flexDirection: 'column',
      alignItems: 'center',
      rowGap: tokens.spacingVerticalS,
      paddingBottom: 0,
      ':not(:last-child)::after': {
        insetInlineStart: `calc(50% + ${indicatorSize} / 2 + ${tokens.spacingHorizontalS})`,
        insetInlineEnd: `calc(-50% - ${tokens.spacingHorizontalL} + ${indicatorSize} / 2 + ${tokens.spacingHorizontalS})`,
        top: `calc(${indicatorSize} / 2 - ${tokens.strokeWidthThin} / 2)`,
        bottom: 'auto',
        borderInlineStartWidth: 0,
        borderTopWidth: tokens.strokeWidthThin,
        borderTopStyle: 'solid',
        borderTopColor: tokens.colorNeutralStroke2,
        '@media (forced-colors: active)': {
          borderTopColor: 'CanvasText',
        },
      },
    },
  },
  indicator: {
    boxSizing: 'border-box',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    width: indicatorSize,
    height: indicatorSize,
    borderRadius: tokens.borderRadiusCircular,
    ...shorthands.border(tokens.strokeWidthThin, 'solid', tokens.colorNeutralStroke1),
    color: tokens.colorNeutralForeground2,
    '@media (forced-colors: active)': {
      ...shorthands.borderColor('CanvasText'),
      color: 'CanvasText',
    },
  },
  active: {
    ...shorthands.borderColor(tokens.colorBrandStroke1),
    color: tokens.colorBrandForeground1,
    '@media (forced-colors: active)': {
      ...shorthands.borderColor('Highlight'),
      color: 'Highlight',
    },
  },
  success: {
    ...shorthands.borderColor(tokens.colorStatusSuccessForeground1),
    color: tokens.colorStatusSuccessForeground1,
  },
  error: {
    ...shorthands.borderColor(tokens.colorStatusDangerForeground1),
    color: tokens.colorStatusDangerForeground1,
  },
  content: {
    minWidth: 0,
    width: '100%',
    overflowWrap: 'anywhere',
    textAlign: 'start',
    [horizontalLayout]: {
      textAlign: 'center',
    },
  },
  label: {
    display: 'flex',
    alignItems: 'center',
    minHeight: indicatorSize,
    color: tokens.colorNeutralForeground1,
    [horizontalLayout]: {
      justifyContent: 'center',
      textAlign: 'center',
    },
  },
  details: {
    display: 'flex',
    flexDirection: 'column',
    rowGap: tokens.spacingVerticalXS,
    ':not(:empty)': {
      paddingTop: tokens.spacingVerticalXS,
    },
  },
  status: {
    color: tokens.colorNeutralForeground2,
    [horizontalLayout]: {
      textAlign: 'center',
    },
  },
  errorMessage: {
    color: tokens.colorStatusDangerForeground1,
    [horizontalLayout]: {
      textAlign: 'center',
    },
  },
});
