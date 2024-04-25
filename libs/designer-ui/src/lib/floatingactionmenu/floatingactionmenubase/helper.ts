import type { FloatingActionMenuItem } from '.';
import { DynamicallyAddedParameterType } from '../../dynamicallyaddedparameter';
import { getIconForDynamicallyAddedParameterType } from '../../dynamicallyaddedparameter/helper';
import { getIntl } from '@microsoft/logic-apps-shared';

export function getMenuItemsForDynamicAddedParameters(supportedTypes: string[]): FloatingActionMenuItem[] {
  const intl = getIntl();

  const menuItems: FloatingActionMenuItem[] = [];
  if (supportedTypes.includes('text')) {
    const type = DynamicallyAddedParameterType.Text;
    menuItems.push({
      type,
      label: intl.formatMessage({ defaultMessage: 'Text', id: '9YZ873', description: 'Label for Text type dynamically added parameter' }),
      icon: getIconForDynamicallyAddedParameterType(type),
    });
  }

  if (supportedTypes.includes('boolean')) {
    const type = DynamicallyAddedParameterType.Boolean;
    menuItems.push({
      type,
      label: intl.formatMessage({ defaultMessage: 'Yes/No', id: 'nOhve4', description: 'Label for Bool type dynamically added parameter' }),
      icon: getIconForDynamicallyAddedParameterType(type),
    });
  }

  if (supportedTypes.includes('file')) {
    const type = DynamicallyAddedParameterType.File;
    menuItems.push({
      type,
      label: intl.formatMessage({ defaultMessage: 'File', id: '90o7sB', description: 'Label for File type dynamically added parameter' }),
      icon: getIconForDynamicallyAddedParameterType(type),
    });
  }

  if (supportedTypes.includes('email')) {
    const type = DynamicallyAddedParameterType.Email;
    menuItems.push({
      type,
      label: intl.formatMessage({
        defaultMessage: 'Email',
        id: 'gfBWfH',
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
        id: 'h+W3VW',
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
        id: 'DMuwuJ',
        description: 'The label for a dynamically added parameter that has Date type.',
      }),
      icon: getIconForDynamicallyAddedParameterType(DynamicallyAddedParameterType.Date),
    });
  }

  return menuItems;
}
