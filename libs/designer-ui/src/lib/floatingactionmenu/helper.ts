import type { FloatingActionMenuItem } from '.';
import { DynamicallyAddedParameterType } from '.';
import { ValidationErrorCode, ValidationException } from '@microsoft/utils-logic-apps';

export function getMenuItemsForDynamicAddedParameters(supportedTypes: any): FloatingActionMenuItem[] {
  if (!supportedTypes) {
    throw new ValidationException(ValidationErrorCode.INVALID_PARAMETERS, 'supportedTypes are necessary.');
  }

  const supportedTypesArray = supportedTypes as Array<string>;

  const menuItems = [];
  if (supportedTypesArray.includes('text')) {
    menuItems.push({
      label: 'Text',
      id: DynamicallyAddedParameterType.Text,
      icon: '', // TODO: Add icon
    });
  }

  if (supportedTypesArray.includes('boolean')) {
    menuItems.push({
      label: 'Yes/No',
      id: DynamicallyAddedParameterType.Boolean,
      icon: '', // TODO: Add icon
    });
  }

  if (supportedTypesArray.includes('file')) {
    menuItems.push({
      label: 'File',
      id: DynamicallyAddedParameterType.File,
      icon: '', // TODO: Add icon
    });
  }

  if (supportedTypesArray.includes('email')) {
    menuItems.push({
      label: 'Email',
      id: DynamicallyAddedParameterType.Email,
      icon: '', // TODO: Add icon
    });
  }

  if (supportedTypesArray.includes('number')) {
    menuItems.push({
      label: 'Number',
      id: DynamicallyAddedParameterType.Number,
      icon: '', // TODO: Add icon
    });
  }

  if (supportedTypesArray.includes('date')) {
    menuItems.push({
      label: 'Date',
      id: DynamicallyAddedParameterType.Date,
      icon: '', // TODO: Add icon
    });
  }
  return menuItems;
}
