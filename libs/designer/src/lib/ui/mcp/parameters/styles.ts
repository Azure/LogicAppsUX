import { makeStyles, tokens } from '@fluentui/react-components';

export const useEditOperationStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXXS,
    padding: `${tokens.spacingVerticalL} 0`,
    minHeight: 'min-content',
    width: '100%',
  },

  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalL,
  },

  sectionTitle: {
    color: tokens.colorNeutralForeground1,
  },

  operationHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalL,
    padding: tokens.spacingVerticalM,
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: tokens.borderRadiusLarge,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    flexShrink: 0,
  },

  operationIcon: {
    color: tokens.colorBrandForeground1,
    fontSize: '24px',
  },

  operationInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
    flex: 1,
  },

  operationTitle: {
    color: tokens.colorNeutralForeground1,
    fontWeight: tokens.fontWeightSemibold,
  },

  operationMeta: {
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
  },

  statusBadge: {
    flexShrink: 0,
  },

  divider: {
    margin: `${tokens.spacingVerticalM} 0`,
  },

  parametersSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalL,
  },

  parameterCard: {
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground1,
    transition: 'border-color 0.15s ease',

    ':hover': {
      border: `1px solid ${tokens.colorNeutralStroke1}`,
    },
  },

  parameterCardHeader: {
    padding: `${tokens.spacingVerticalM} ${tokens.spacingHorizontalL}`,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground2,
    borderTopLeftRadius: tokens.borderRadiusMedium,
    borderTopRightRadius: tokens.borderRadiusMedium,
  },

  parameterCardContent: {
    padding: tokens.spacingHorizontalL,
    paddingTop: tokens.spacingVerticalL,
    paddingBottom: tokens.spacingVerticalL,
  },

  parameterList: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalL,
  },

  parameterField: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
  },

  parameterLabel: {
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
    fontSize: tokens.fontSizeBase300,
  },

  emptyParametersCard: {
    padding: `${tokens.spacingVerticalXL} ${tokens.spacingHorizontalL}`,
    textAlign: 'center',
    backgroundColor: tokens.colorNeutralBackground2,
    border: `1px dashed ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
  },

  emptyParametersText: {
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase300,
  },

  descriptionField: {
    marginTop: tokens.spacingVerticalS,
  },

  modifiedBadge: {
    backgroundColor: tokens.colorPaletteMarigoldBackground2,
    color: tokens.colorPaletteMarigoldForeground2,
  },

  savedBadge: {
    backgroundColor: tokens.colorPaletteGreenBackground2,
    color: tokens.colorPaletteGreenForeground2,
  },
});
