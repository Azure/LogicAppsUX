import {
  Any16Filled,
  Any16Regular,
  Array16Filled,
  Array16Regular,
  Binary16Filled,
  Binary16Regular,
  Decimal16Filled,
  Decimal16Regular,
  Integer16Filled,
  Integer16Regular,
  String16Filled,
  String16Regular,
} from '../images/DataType16Icons';
import {
  Any24Filled,
  Any24Regular,
  Array24Filled,
  Array24Regular,
  Binary24Filled,
  Binary24Regular,
  Decimal24Filled,
  Decimal24Regular,
  Integer24Filled,
  Integer24Regular,
  String24Filled,
  String24Regular,
} from '../images/DataType24Icons';
import { NormalizedDataType, SchemaNodeProperty } from '../models';
import { FunctionCategory, FunctionCategoryIconPrefix } from '../models/Function';
import { LogCategory, LogService } from './Logging.Utils';
import { Image, ImageLoadState } from '@fluentui/react';
import {
  AddSubtractCircle16Filled,
  AddSubtractCircle16Regular,
  AddSubtractCircle24Filled,
  AddSubtractCircle24Regular,
  bundleIcon,
  CalendarClock16Filled,
  CalendarClock16Regular,
  CalendarClock24Filled,
  CalendarClock24Regular,
  CircleOff16Filled,
  CircleOff16Regular,
  Cube16Filled,
  Cube16Regular,
  Cube24Filled,
  Cube24Regular,
  NumberSymbol16Filled,
  NumberSymbol16Regular,
  NumberSymbol24Filled,
  NumberSymbol24Regular,
} from '@fluentui/react-icons';

// Using Fluent v8 as it has option for fallback icon

type iconSize = 16 | 24;

export const iconForNormalizedDataType = (
  nodeType: NormalizedDataType,
  size: iconSize,
  bundled: boolean,
  nodeProperties?: SchemaNodeProperty[]
) => {
  let icons: typeof Integer16Regular[] = [];

  switch (nodeType) {
    case NormalizedDataType.Number: {
      icons = size === 16 ? [NumberSymbol16Regular, NumberSymbol16Filled] : [NumberSymbol24Regular, NumberSymbol24Filled];
      break;
    }
    case NormalizedDataType.Integer: {
      icons = size === 16 ? [Integer16Regular, Integer16Filled] : [Integer24Regular, Integer24Filled];
      break;
    }
    case NormalizedDataType.Decimal: {
      icons = size === 16 ? [Decimal16Regular, Decimal16Filled] : [Decimal24Regular, Decimal24Filled];
      break;
    }
    case NormalizedDataType.Binary: {
      icons = size === 16 ? [Binary16Regular, Binary16Filled] : [Binary24Regular, Binary24Filled];
      break;
    }
    case NormalizedDataType.Boolean: {
      icons =
        size === 16 ? [AddSubtractCircle16Regular, AddSubtractCircle16Filled] : [AddSubtractCircle24Regular, AddSubtractCircle24Filled];
      break;
    }
    case NormalizedDataType.String: {
      icons = size === 16 ? [String16Regular, String16Filled] : [String24Regular, String24Filled];
      break;
    }
    case NormalizedDataType.DateTime: {
      icons = size === 16 ? [CalendarClock16Regular, CalendarClock16Filled] : [CalendarClock24Regular, CalendarClock24Filled];
      break;
    }
    case NormalizedDataType.ComplexType: {
      if (nodeProperties && nodeProperties.indexOf(SchemaNodeProperty.Repeating) > -1) {
        icons = size === 16 ? [Array16Regular, Array16Filled] : [Array24Regular, Array24Filled];
      } else {
        icons = size === 16 ? [Cube16Regular, Cube16Filled] : [Cube24Regular, Cube24Filled];
      }
      break;
    }
    case NormalizedDataType.Any: {
      // Any
      icons = size === 16 ? [Any16Regular, Any16Filled] : [Any24Regular, Any24Filled];
      break;
    }
    default: {
      LogService.error(LogCategory.IconUtils, 'iconForNormalizedDataType', {
        message: `No icon found for type: ${nodeType}`,
      });

      // Null
      icons = [CircleOff16Regular, CircleOff16Filled];
      break;
    }
  }

  return bundled ? bundleIcon(icons[1], icons[0]) : icons[0];
};

export const iconBaseUrl = 'https://logicappsv2resources.blob.core.windows.net/icons/datamapper/';

export const iconForFunctionCategory = (functionCategory: FunctionCategory) => {
  const functionCategories = Object.values(FunctionCategory);
  const functionIconUrlPrefix = `${iconBaseUrl}${FunctionCategoryIconPrefix}`;
  if (functionCategories.indexOf(functionCategory) >= 0) {
    return `${functionIconUrlPrefix}${functionCategory.toLowerCase().replace(' ', '')}.svg`;
  } else {
    return `${functionIconUrlPrefix}${FunctionCategory.Utility.toLowerCase()}.svg`;
  }
};

export const iconUriForIconImageName = (iconImageName: string) => {
  return `${iconBaseUrl}${iconImageName}`;
};

export const getIconForFunction = (name: string, categoryName: FunctionCategory, fileName: string | undefined, color?: string) => {
  const functionIcon = iconUriForIconImageName(fileName ?? '');
  const categoryIcon = iconForFunctionCategory(categoryName);
  let isError = false;

  const loadBackupFunctionCategory = (loadState: ImageLoadState) => {
    if (loadState === ImageLoadState.error) {
      isError = true;
    } else {
      isError = false;
    }
  };
  return (
    // TODO Color isn't hooked up to the SVGs properly.
    // They will always return the default color
    <Image
      src={isError ? functionIcon : categoryIcon}
      shouldFadeIn={false}
      height={20}
      width={20}
      alt={name}
      onLoadingStateChange={loadBackupFunctionCategory}
      style={{ color }}
    />
  );
};
