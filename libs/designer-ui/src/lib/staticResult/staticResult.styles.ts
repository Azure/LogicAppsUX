import { makeStyles, shorthands, tokens } from '@fluentui/react-components';
import { designTokens } from '../tokens/designTokens';

export const useStaticResultStyles = makeStyles({
  containerHeader: {
    display: 'flex',
    width: '100%',
    verticalAlign: 'middle',
    ...shorthands.border('none'),
    cursor: 'pointer',
    backgroundColor: 'transparent',
    justifyContent: 'space-between',
    paddingLeft: '0',
    marginTop: '10px',
    height: '30px',

    '&:hover, &:active': {
      backgroundColor: designTokens.colors.selectedItemBackground,
    },
  },

  containerHeaderDark: {
    backgroundColor: tokens.colorNeutralBackground2,

    '&:hover': {
      backgroundColor: tokens.colorNeutralBackground1,
      cursor: 'pointer',
    },

    '&:active': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
  },

  containerHeaderIcon: {
    paddingLeft: '10px',
    paddingTop: '8px',
    paddingBottom: '12px',
    width: '20px',
  },

  containerHeaderText: {
    ...shorthands.border('none'),
    textAlign: 'left',
    fontSize: '14px',
    fontWeight: '600',
    fontFamily: tokens.fontFamilyBase,
    minWidth: '80%',
    lineHeight: '25px',
  },

  label: {
    fontSize: '14px',
    fontWeight: '600',
    lineHeight: '25px',
  },

  containerHeaderRoot: {
    display: 'flex',
    width: '100%',
    alignItems: 'flex-end',
    ...shorthands.border('none'),
  },

  containerHeaderRootText: {
    ...shorthands.border('none'),
    textAlign: 'left',
    fontSize: '14px',
    fontWeight: '600',
    fontFamily: tokens.fontFamilyBase,
    marginRight: '30px',
    lineHeight: '25px',
  },

  infoIcon: {
    height: '20px',
    width: '20px',
  },

  propertiesHeader: {
    paddingBottom: '20px',
    ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke1),
  },

  propertiesHeaderOptionalValues: {
    width: '50%',
  },

  propertiesInner: {
    marginLeft: '20px',
  },

  propertyInner: {
    paddingTop: '10px',
  },

  propertyEditorContainer: {
    ...shorthands.border('1px', 'solid', '#8a8886'),
    display: 'flex',
    ...shorthands.padding('10px'),
  },

  propertyEditors: {
    width: '95%',
  },

  propertyEditorProperty: {
    paddingBottom: '10px',
  },

  propertyEditorPropertyHeader: {
    display: 'flex',
    justifyContent: 'space-between',
  },

  propertyEditorPropertyHeaderText: {
    width: '80%',
  },

  propertyEditorPropertyHeaderIcon: {
    width: '20%',
  },

  propertyEditorNewProperty: {
    marginTop: '15px',
    ...shorthands.borderTop('1px', 'solid', tokens.colorNeutralStroke1),
    display: 'flex',
    justifyContent: 'space-between',
  },

  propertyEditorAddNewPropertyButton: {
    marginTop: '12px',
  },

  propertyEditorCommands: {
    verticalAlign: 'top',
    display: 'inline-block',
    alignSelf: 'flex-start',
  },

  actions: {
    display: 'flex',
    justifyContent: 'center',
    paddingTop: '30px',
    marginTop: '30px',
    ...shorthands.borderTop('1px', 'solid', tokens.colorNeutralStroke1),
  },

  actionButton: {
    height: '30px',
  },

  actionButtonDelete: {
    height: '30px',
    backgroundColor: 'rgb(164, 38, 44)',
    color: '#fff',
  },

  validation: {
    position: 'relative',
    color: '#e00202',
    fontSize: '14px',
    top: '15px',
  },
});
