import { makeStyles, tokens } from '@fluentui/react-components';

export const useEditOperationStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
    minHeight: 'min-content',
    width: '100%',
  },

  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
  },

  sectionTitle: {
    color: tokens.colorNeutralForeground1,
    marginBottom: tokens.spacingVerticalS,
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
  },

  operationHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
    padding: tokens.spacingVerticalM,
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: tokens.borderRadiusLarge,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    flexShrink: 0,
  },

  operationIcon: {
    color: tokens.colorBrandForeground1,
    fontSize: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  operationInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
    flex: 1,
    minWidth: 0, // Prevents flex item from overflowing
  },

  operationTitle: {
    color: tokens.colorNeutralForeground1,
    fontWeight: tokens.fontWeightSemibold,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },

  operationMeta: {
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
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
    overflow: 'hidden', // Ensures content doesn't overflow rounded corners

    ':hover': {
      border: `1px solid ${tokens.colorNeutralStroke1}`,
    },

    ':focus-within': {
      border: `1px solid ${tokens.colorBrandStroke1}`,
      boxShadow: `0 0 0 1px ${tokens.colorBrandStroke1}`,
    },

    paddingTop: tokens.spacingVerticalL,
    paddingBottom: tokens.spacingVerticalL,
  },

  parameterCardHeader: {
    padding: `${tokens.spacingVerticalM} ${tokens.spacingHorizontalL}`,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground2,
    borderTopLeftRadius: tokens.borderRadiusMedium,
    borderTopRightRadius: tokens.borderRadiusMedium,
  },

  requiredSection: {
    padding: `0px ${tokens.spacingHorizontalM}`,
    gap: tokens.spacingVerticalS,
    display: 'flex',
    flexDirection: 'column',
  },

  parameterList: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalL,
    paddingTop: '20px',
  },

  optionalParametersDescription: {
    marginTop: tokens.spacingVerticalS,
    fontSize: tokens.fontSizeBase300,
  },

  optionalParametersRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 0 0 0',
  },

  parameterInputTypeLabel: {
    alignContent: 'center',
    width: '121px',
  },

  parameterInputField: {
    display: 'flex',
    flexDirection: 'row',
  },

  parameterEditorField: {
    flex: 1,
    width: '100%',
  },

  parameterInputTypeDropdown: {
    width: '162px',
  },

  parameterBodySection: {
    marginLeft: tokens.spacingHorizontalS,
  },

  parameterLabelSection: {
    display: 'flex',
    justifyContent: 'space-around',
  },

  parameterField: {
    display: 'flex',
    flexDirection: 'column',
    border: `1px solid ${tokens.colorNeutralBackground6}`,
    borderRadius: '8px',
    padding: '16px',
  },

  parameterEditor: {
    width: '100%',
  },

  parameterValueSection: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: '8px',
  },

  validationErrorText: {
    color: tokens.colorPaletteRedForeground1,
  },

  largeParameterSection: {
    alignItems: 'flex-start',
  },

  parameterLabel: {
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
    fontSize: tokens.fontSizeBase300,
    flex: 1,
    marginBottom: tokens.spacingVerticalS,
  },

  rightLabelSection: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
  },

  removeParameterButton: {
    flexShrink: 0,
    color: tokens.colorNeutralForeground3,

    ':hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
      color: tokens.colorNeutralForeground2,
    },
  },

  optionalParametersSection: {
    marginTop: tokens.spacingVerticalM,
  },

  inlineParameterDivider: {
    margin: `${tokens.spacingVerticalM} 0`,
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
