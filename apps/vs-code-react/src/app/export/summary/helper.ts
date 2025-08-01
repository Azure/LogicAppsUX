import type { TableColumnDefinition } from '@fluentui/react-components';
import { createTableColumn } from '@fluentui/react-components';
import { DetailCategory, StyledDetailCategory } from '../../../run-service';
import type {
  INamingValidation,
  IResourceGroup,
  ISummaryData,
  IExportDetails,
  IExportDetailsList,
  IDropDownOption,
  INamingRules,
} from '../../../run-service';
import type { IDropdownOption } from '../../components/searchableDropdown';

const resourceGroupNamingRules: INamingRules = {
  minLength: 1,
  maxLength: 90,
  invalidCharsRegExp: new RegExp(/[^a-zA-Z0-9._\-()]/, 'g'),
};

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

export const listColumns: TableColumnDefinition<IExportDetailsList>[] = [
  createTableColumn<IExportDetailsList>({
    columnId: 'type',
    renderHeaderCell: () => {
      return 'Type';
    },
    renderCell: (item: IExportDetailsList) => {
      return item.type;
    },
  }),
  createTableColumn<IExportDetailsList>({
    columnId: 'message',
    renderHeaderCell: () => {
      return 'Message';
    },
    renderCell: (item: IExportDetailsList) => {
      return item.message;
    },
  }),
];

export const getListColumns = () => {
  return [
    { key: 'type', name: 'Type', fieldName: 'type', minWidth: 170, maxWidth: 250, isResizable: true },
    { key: 'message', name: 'Message', fieldName: 'message', minWidth: 170, maxWidth: 250, isResizable: true },
  ];
};

export const getExportDetails = (details: IExportDetails[]): IExportDetailsList[] => {
  const listDetails = details.map((detail) => {
    const { exportDetailCategory, exportDetailMessage } = detail;

    return { type: getTypeName(exportDetailCategory), message: exportDetailMessage };
  });

  return listDetails.sort((previous, next) => (previous.type > next.type ? -1 : next.type > previous.type ? 1 : 0));
};

export const getSummaryData = (summaryData: ISummaryData) => {
  const exportSchema: Record<string, any> = summaryData?.properties ?? {};
  const exportDetails = exportSchema?.details ? getExportDetails(exportSchema?.details) : [];
  return { exportDetails };
};

export const parseResourceGroupsData = (resourceGroupsData: { resourceGroups: IResourceGroup[] }): IDropDownOption[] => {
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
  }
  if (trimmedName.match(resourceGroupNamingRules.invalidCharsRegExp) !== null) {
    return { validName, validationError: intlText.INVALID_CHARS };
  }
  if (trimmedName.endsWith('.')) {
    return { validName, validationError: intlText.INVALID_ENDING_CHAR };
  }
  if (resourceGroups.find((resourceGroup) => resourceGroup.key === trimmedName)) {
    return { validName, validationError: intlText.INVALID_EXISTING_NAME };
  }
  validName = true;
  return { validName, validationError: '' };
};
