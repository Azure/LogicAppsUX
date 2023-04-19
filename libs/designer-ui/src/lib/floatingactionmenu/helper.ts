import type { FloatingActionMenuItem } from '.';
import { DynamicallyAddedParameterType } from '../dynamicallyaddedparameter';
import { getIconForDynamicallyAddedParameterType } from '../dynamicallyaddedparameter/helper';
import { getIntl } from '@microsoft/intl-logic-apps';

export function getMenuItemsForDynamicAddedParameters(supportedTypes: any): FloatingActionMenuItem[] {
  const intl = getIntl();
  const supportedTypesArray = supportedTypes as Array<string>;

  const menuItems: FloatingActionMenuItem[] = [];
  if (supportedTypesArray.includes('text')) {
    menuItems.push({
      label: intl.formatMessage({ defaultMessage: 'Text', description: 'Dynamically added parameter type Text' }),
      id: DynamicallyAddedParameterType.Text,
      icon: getIconForDynamicallyAddedParameterType(DynamicallyAddedParameterType.Text),
    });
  }

  if (supportedTypesArray.includes('boolean')) {
    menuItems.push({
      label: intl.formatMessage({ defaultMessage: 'Yes/No', description: 'Dynamically added parameter type Boolean' }),
      id: DynamicallyAddedParameterType.Boolean,
      icon: getIconForDynamicallyAddedParameterType(DynamicallyAddedParameterType.Boolean),
    });
  }

  if (supportedTypesArray.includes('file')) {
    menuItems.push({
      label: intl.formatMessage({ defaultMessage: 'File', description: 'Dynamically added parameter type File' }),
      id: DynamicallyAddedParameterType.File,
      icon: getIconForDynamicallyAddedParameterType(DynamicallyAddedParameterType.File),
    });
  }

  if (supportedTypesArray.includes('email')) {
    menuItems.push({
      label: intl.formatMessage({ defaultMessage: 'Email', description: 'Dynamically added parameter type Email' }),
      id: DynamicallyAddedParameterType.Email,
      icon: getIconForDynamicallyAddedParameterType(DynamicallyAddedParameterType.Email),
    });
  }

  if (supportedTypesArray.includes('number')) {
    menuItems.push({
      label: intl.formatMessage({ defaultMessage: 'Number', description: 'Dynamically added parameter type Number' }),
      id: DynamicallyAddedParameterType.Number,
      icon: getIconForDynamicallyAddedParameterType(DynamicallyAddedParameterType.Number),
    });
  }

  if (supportedTypesArray.includes('date')) {
    menuItems.push({
      label: intl.formatMessage({ defaultMessage: 'Date', description: 'Dynamically added parameter type Date' }),
      id: DynamicallyAddedParameterType.Date,
      icon: getIconForDynamicallyAddedParameterType(DynamicallyAddedParameterType.Date),
    });
  }

  return menuItems;
}
