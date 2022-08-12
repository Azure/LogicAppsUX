import { DetailCategory, StyledDetailCategory } from '../../../run-service';
import type {
  INamingValidation,
  IResourceGroup,
  ISummaryData,
  IExportDetails,
  IExportDetailsList,
  IDropDownOption,
} from '../../../run-service';
import { resourceGroupNamingRules } from './newResourceGroup';
import type { IDropdownOption } from '@fluentui/react';

const getTypeName = (typeName: string): string => {
  switch (typeName) {
    case DetailCategory.requiredStep: {
      return StyledDetailCategory.requiredStep;
    }
    case DetailCategory.information: {
      return StyledDetailCategory.information;
    }
    default: {
      return typeName;
    }
  }
};

export const getListColumns = () => {
  return [
    { key: 'type', name: 'Type', fieldName: 'type', minWidth: 170, maxWidth: 250, isResizable: true },
    { key: 'message', name: 'Message', fieldName: 'message', minWidth: 170, maxWidth: 250, isResizable: true },
  ];
};

export const getExportDetails = (details: Array<IExportDetails>): Array<IExportDetailsList> => {
  const listDetails = details.map((detail) => {
    const { exportDetailCategory, exportDetailMessage } = detail;

    return { type: getTypeName(exportDetailCategory), message: exportDetailMessage };
  });

  return listDetails.sort((previous, next) => (previous.type > next.type ? -1 : next.type > previous.type ? 1 : 0));
};

export const getSummaryData = (summaryData: ISummaryData) => {
  const exportSchema: Record<string, any> = summaryData?.properties ?? {};
  const exportDetails = getExportDetails(exportSchema?.details);

  return { exportDetails };
};

export const parseResourceGroupsData = (resourceGroupsData: { resourceGroups: Array<IResourceGroup> }): Array<IDropDownOption> => {
  const { resourceGroups } = resourceGroupsData;

  return resourceGroups.map((resourceGroup: IResourceGroup) => {
    const { name, location, text } = resourceGroup;
    return { key: name, text: text ?? name, data: location };
  });
};

export const isNameValid = (name: string, intlText: any, resourceGroups: IDropdownOption[]): INamingValidation => {
  const trimmedName = name.trim();

  let validName = false;

  if (trimmedName.length < resourceGroupNamingRules.minLength || trimmedName.length > resourceGroupNamingRules.maxLength) {
    return { validName, validationError: '' };
  } else if (trimmedName.match(resourceGroupNamingRules.invalidCharsRegExp) !== null) {
    return { validName, validationError: intlText.INVALID_CHARS };
  } else if (trimmedName.endsWith('.')) {
    return { validName, validationError: intlText.INVALID_ENDING_CHAR };
  } else if (resourceGroups.find((resourceGroup) => resourceGroup.key === trimmedName)) {
    return { validName, validationError: intlText.INVALID_EXISTING_NAME };
  } else {
    validName = true;
    return { validName, validationError: '' };
  }
};
