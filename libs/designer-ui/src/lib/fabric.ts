import './fabric.less';
import type {
  IButtonStyles,
  ICalloutContentStyles,
  ICheckboxStyles,
  IComboBoxOptionStyles,
  IComboBoxStyles,
  IDropdownStyles,
  ISpinnerStyles,
  ITextFieldStyles,
} from '@fluentui/react';
import { FontSizes, mergeStyleSets } from '@fluentui/react';

export const buttonStyles: IButtonStyles = {
  label: {
    fontSize: FontSizes.small,
  },
};

export const calloutContentStyles: Partial<ICalloutContentStyles> = {
  calloutMain: {
    fontSize: FontSizes.small,
  },
};

export const checkboxStyles: ICheckboxStyles = {
  checkbox: {
    display: 'inline-flex',
  },
  label: {
    width: '100%',
  },
  text: {
    fontSize: FontSizes.small,
  },
};

export const placeholderTextFieldStyles: Partial<ITextFieldStyles> = {
  field: {
    fontSize: FontSizes.small,
    selectors: {
      '::placeholder': {
        fontSize: FontSizes.small,
      },
      ':-ms-input-placeholder': {
        fontSize: FontSizes.small,
      },
      '::-ms-input-placeholder': {
        fontSize: FontSizes.small,
      },
    },
  },
};

// NOTE(joechung): Fabric puts a red asterisk after required, label-less text fields which we do not want.
export const commonTextFieldStyles: Partial<ITextFieldStyles> = mergeStyleSets(placeholderTextFieldStyles, {
  field: {
    height: 26, // @parameter-inputbox-height
  },
  root: {
    border: 0,
    height: 28, // @parameter-inputbox-height + 2px (border padding)
  },
  wrapper: {
    height: 28, // @parameter-inputbox-height + 2px (border padding)
  },
  subComponentStyles: {},
});

export const multiLineTextFieldStyles: Partial<ITextFieldStyles> = mergeStyleSets(commonTextFieldStyles, {
  field: {
    overflowY: 'hidden',
  },
  fieldGroup: {
    minHeight: 26, // @parameter-inputbox-height
    selectors: {
      ':before': {
        content: '',
      },
      ':after': {
        content: '',
      },
    },
  },
  subComponentStyles: {},
});

export const singleLineTextFieldStyles: Partial<ITextFieldStyles> = mergeStyleSets(commonTextFieldStyles, {
  fieldGroup: {
    height: 26, // @parameter-inputbox-height
    selectors: {
      ':before': {
        content: '',
      },
      ':after': {
        content: '',
      },
    },
  },
  subComponentStyles: {},
});

export const caretDownButtonStyles: IButtonStyles = {
  icon: {
    /* NOTE(joechung): Fabric defaults as of 6.187.0 are 14px/16px. 12px/14px most closely emulates the 14px/16px ratio between font size and line height. */
    lineHeight: 14,
  },
};

export const comboboxOptionStyles: Partial<IComboBoxOptionStyles> = {
  optionText: {
    fontSize: FontSizes.small,
  },
};

export const comboboxStyles: Partial<IComboBoxStyles> = {
  input: {
    bottom: 2,
    fontSize: FontSizes.small,
    height: 20,
    position: 'relative',
  },
  root: {
    height: 26, // @parameter-inputbox-height
    lineHeight: 26, // @parameter-inputbox-height
  },
};

export const dropdownStyles: Partial<IDropdownStyles> = {
  caretDown: {
    lineHeight: 26, // @parameter-inputbox-height
  },
  caretDownWrapper: {
    right: 10,
  },
  dropdown: {
    fontSize: FontSizes.small,
    marginBottom: 0,
    selectors: {
      // NOTE(joechung): Remove duplicate asterisk from required dropdowns.
      ':before': {
        display: 'none',
      },
    },
  },
  dropdownOptionText: {
    fontSize: FontSizes.small,
  },
  label: {
    fontSize: FontSizes.small,
  },
  title: {
    fontSize: FontSizes.small,
    height: 26, // @parameter-inputbox-height
    lineHeight: 26, // @parameter-inputbox-height
    paddingLeft: 12, // @parameter-inputbox-start-padding
  },
};

export const spinnerStyles: ISpinnerStyles = {
  root: {
    alignSelf: 'center',
    margin: '10% 0',
    backgroundColor: 'transparent',
  },
  circle: {
    width: 70,
    height: 70,
    borderWidth: 8,
  },
};

export const featureFeedbackSpinnerStyles: ISpinnerStyles = {
  root: {
    alignItems: 'baseline',
    marginTop: 2,
  },
};
