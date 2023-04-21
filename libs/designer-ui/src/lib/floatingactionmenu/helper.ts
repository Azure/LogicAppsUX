import type { FloatingActionMenuItem } from '.';
import { DynamicallyAddedParameterType } from '../dynamicallyaddedparameter';
import { getIconForDynamicallyAddedParameterType } from '../dynamicallyaddedparameter/helper';
import { getIntl } from '@microsoft/intl-logic-apps';

export function getMenuItemsForDynamicAddedParameters(supportedTypes: any): FloatingActionMenuItem[] {
  const intl = getIntl();
  const supportedTypesArray = supportedTypes as Array<string>;

  const menuItems: FloatingActionMenuItem[] = [];
  if (supportedTypesArray.includes('text')) {
    const type = DynamicallyAddedParameterType.Text;
    menuItems.push({
      type,
      label: intl.formatMessage({ defaultMessage: 'Text', description: 'Label for Text type dynamically added parameter' }),
      icon: getIconForDynamicallyAddedParameterType(type),
      placeholder: intl.formatMessage({
        defaultMessage: 'Please enter your input',
        description: 'Placeholder text shown for a newly inserted Text parameter',
      }),
    });
  }

  if (supportedTypesArray.includes('boolean')) {
    const type = DynamicallyAddedParameterType.Boolean;
    menuItems.push({
      type,
      label: intl.formatMessage({ defaultMessage: 'Yes/No', description: 'Label for Bool type dynamically added parameter' }),
      icon: getIconForDynamicallyAddedParameterType(type),
      placeholder: intl.formatMessage({
        defaultMessage: 'Please select yes or no',
        description: 'Placeholder text shown for a newly inserted Boolean parameter',
      }),
    });
  }

  if (supportedTypesArray.includes('file')) {
    const type = DynamicallyAddedParameterType.File;
    menuItems.push({
      type,
      label: intl.formatMessage({ defaultMessage: 'File', description: 'Label for File type dynamically added parameter' }),
      icon: getIconForDynamicallyAddedParameterType(type),
      placeholder: intl.formatMessage({
        defaultMessage: 'Please select file or image',
        description: 'Placeholder text shown for a newly inserted File parameter',
      }),
    });
  }

  if (supportedTypesArray.includes('email')) {
    const type = DynamicallyAddedParameterType.Email;
    menuItems.push({
      type,
      label: intl.formatMessage({ defaultMessage: 'Email', description: 'Label for Email type dynamically added parameter' }),
      icon: getIconForDynamicallyAddedParameterType(type),
      placeholder: intl.formatMessage({
        defaultMessage: 'Please enter an e-mail address',
        description: 'Placeholder text shown for a newly inserted Email parameter',
      }),
    });
  }

  if (supportedTypesArray.includes('number')) {
    const type = DynamicallyAddedParameterType.Number;
    menuItems.push({
      type,
      label: intl.formatMessage({ defaultMessage: 'Number', description: 'Label for Number type dynamically added parameter' }),
      icon: getIconForDynamicallyAddedParameterType(type),
      placeholder: intl.formatMessage({
        defaultMessage: 'Please enter a number',
        description: 'Placeholder text shown for a newly inserted Number parameter',
      }),
    });
  }

  if (supportedTypesArray.includes('date')) {
    const type = DynamicallyAddedParameterType.Date;
    menuItems.push({
      type,
      label: intl.formatMessage({ defaultMessage: 'Date', description: 'Label for Date type dynamically added parameter' }),
      icon: getIconForDynamicallyAddedParameterType(DynamicallyAddedParameterType.Date),
      placeholder: intl.formatMessage({
        defaultMessage: 'Please enter or select a date (YYYY-MM-DD)',
        description: 'Placeholder text shown for a newly inserted Date parameter',
      }),
    });
  }

  return menuItems;
}
