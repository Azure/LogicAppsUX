import type { FloatingActionMenuItem } from '.';
import { DynamicallyAddedParameterType } from '../../dynamicallyaddedparameter';
import { getIconForDynamicallyAddedParameterType } from '../../dynamicallyaddedparameter/helper';
import { getIntl } from '@microsoft/intl-logic-apps';

export function getMenuItemsForDynamicAddedParameters(supportedTypes: string[]): FloatingActionMenuItem[] {
  const intl = getIntl();

  const menuItems: FloatingActionMenuItem[] = [];
  if (supportedTypes.includes('text')) {
    const type = DynamicallyAddedParameterType.Text;
    menuItems.push({
      type,
      label: intl.formatMessage({ defaultMessage: 'Text', description: 'Label for Text type dynamically added parameter' }),
      icon: getIconForDynamicallyAddedParameterType(type),
    });
  }

  if (supportedTypes.includes('boolean')) {
    const type = DynamicallyAddedParameterType.Boolean;
    menuItems.push({
      type,
      label: intl.formatMessage({ defaultMessage: 'Yes/No', description: 'Label for Bool type dynamically added parameter' }),
      icon: getIconForDynamicallyAddedParameterType(type),
    });
  }

  if (supportedTypes.includes('file')) {
    const type = DynamicallyAddedParameterType.File;
    menuItems.push({
      type,
      label: intl.formatMessage({ defaultMessage: 'File', description: 'Label for File type dynamically added parameter' }),
      icon: getIconForDynamicallyAddedParameterType(type),
    });
  }

  if (supportedTypes.includes('email')) {
    const type = DynamicallyAddedParameterType.Email;
    menuItems.push({
      type,
      label: intl.formatMessage({
        defaultMessage: 'Email',
        description: 'Label for Email type dynamically added parameter',
      }),
      icon: getIconForDynamicallyAddedParameterType(type),
    });
  }

  if (supportedTypes.includes('number')) {
    const type = DynamicallyAddedParameterType.Number;
    menuItems.push({
      type,
      label: intl.formatMessage({
        defaultMessage: 'Number',
        description: 'Label for Number type dynamically added parameter',
      }),
      icon: getIconForDynamicallyAddedParameterType(type),
    });
  }

  if (supportedTypes.includes('date')) {
    const type = DynamicallyAddedParameterType.Date;
    menuItems.push({
      type,
      label: intl.formatMessage({
        defaultMessage: 'Date',
        description: 'The label for a dynamically added parameter that has Date type.',
      }),
      icon: getIconForDynamicallyAddedParameterType(DynamicallyAddedParameterType.Date),
    });
  }

  return menuItems;
}
