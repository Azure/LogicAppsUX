import type { FunctionGroupBranding } from '../constants/FunctionConstants';
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
import { FunctionCategory, FunctionCategoryIconPrefix } from '../models/Function';
import { NormalizedDataType, SchemaNodeDataType, SchemaNodeProperty } from '../models/Schema';
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
} from '@fluentui/react-icons';

// Using Fluent v8 as it has option for fallback icon

type iconSize = 16 | 24;

export const getSchemaNodeDataTypeFromNormalizedDataType = (normalizedDataType: NormalizedDataType): SchemaNodeDataType => {
  switch (normalizedDataType) {
    case NormalizedDataType.Any:
    case NormalizedDataType.Binary:
      return SchemaNodeDataType.Base64Binary;
    case NormalizedDataType.Boolean:
      return SchemaNodeDataType.Boolean;
    case NormalizedDataType.ComplexType:
      return SchemaNodeDataType.None;
    case NormalizedDataType.DateTime:
      return SchemaNodeDataType.DateTime;
    case NormalizedDataType.Decimal:
      return SchemaNodeDataType.Decimal;
    case NormalizedDataType.Integer:
    case NormalizedDataType.Number:
      return SchemaNodeDataType.Integer;
    case NormalizedDataType.String:
      return SchemaNodeDataType.String;
    default:
      LogService.error(LogCategory.IconUtils, 'getSchemaNodeDataTypeFromNormalizedDataType', {
        message: `No corresponding SchemaNodeDataType found for NormalizedDataType ${normalizedDataType}`,
      });

      return SchemaNodeDataType.AnyAtomicType;
  }
};

export const iconForNormalizedDataType = (nodeType: NormalizedDataType, size: iconSize, bundled: boolean) => {
  return iconForSchemaNodeDataType(getSchemaNodeDataTypeFromNormalizedDataType(nodeType), size, bundled);
};

export const iconForSchemaNodeDataType = (
  nodeType: SchemaNodeDataType,
  size: iconSize,
  bundled: boolean,
  nodeProperties?: SchemaNodeProperty[]
) => {
  let icons: typeof Integer16Regular[] = [];

  switch (nodeType) {
    /* Currently Unused will come into play with JSON
    case SchemaNodeDataType.ComplexType: {
      // Number
      icons = size === 16 ? [NumberSymbol16Regular, NumberSymbol16Filled] : [NumberSymbol24Regular, NumberSymbol24Filled];
      break;
    }
    */
    case SchemaNodeDataType.Int:
    case SchemaNodeDataType.Integer:
    case SchemaNodeDataType.Long:
    case SchemaNodeDataType.NegativeInteger:
    case SchemaNodeDataType.NonNegativeInteger:
    case SchemaNodeDataType.NonPositiveInteger:
    case SchemaNodeDataType.PositiveInteger:
    case SchemaNodeDataType.Short:
    case SchemaNodeDataType.UnsignedInt:
    case SchemaNodeDataType.UnsignedLong:
    case SchemaNodeDataType.UnsignedShort: {
      // Integer
      icons = size === 16 ? [Integer16Regular, Integer16Filled] : [Integer24Regular, Integer24Filled];
      break;
    }
    case SchemaNodeDataType.Decimal:
    case SchemaNodeDataType.Double:
    case SchemaNodeDataType.Float: {
      // Decimal
      icons = size === 16 ? [Decimal16Regular, Decimal16Filled] : [Decimal24Regular, Decimal24Filled];
      break;
    }
    case SchemaNodeDataType.Base64Binary:
    case SchemaNodeDataType.Byte:
    case SchemaNodeDataType.HexBinary:
    case SchemaNodeDataType.UnsignedByte: {
      // Binary
      icons = size === 16 ? [Binary16Regular, Binary16Filled] : [Binary24Regular, Binary24Filled];
      break;
    }
    case SchemaNodeDataType.Boolean: {
      // Boolean
      icons =
        size === 16 ? [AddSubtractCircle16Regular, AddSubtractCircle16Filled] : [AddSubtractCircle24Regular, AddSubtractCircle24Filled];
      break;
    }
    case SchemaNodeDataType.AnyUri:
    case SchemaNodeDataType.Attribute:
    case SchemaNodeDataType.Id:
    case SchemaNodeDataType.Idref:
    case SchemaNodeDataType.Language:
    case SchemaNodeDataType.Name:
    case SchemaNodeDataType.NCName:
    case SchemaNodeDataType.NmToken:
    case SchemaNodeDataType.NormalizedString:
    case SchemaNodeDataType.QName:
    case SchemaNodeDataType.String:
    case SchemaNodeDataType.Token: {
      // String
      icons = size === 16 ? [String16Regular, String16Filled] : [String24Regular, String24Filled];
      break;
    }
    case SchemaNodeDataType.Date:
    case SchemaNodeDataType.DateTime:
    case SchemaNodeDataType.Duration:
    case SchemaNodeDataType.GDay:
    case SchemaNodeDataType.GMonth:
    case SchemaNodeDataType.GMonthDay:
    case SchemaNodeDataType.GYear:
    case SchemaNodeDataType.GYearMonth:
    case SchemaNodeDataType.Time: {
      // Date time
      icons = size === 16 ? [CalendarClock16Regular, CalendarClock16Filled] : [CalendarClock24Regular, CalendarClock24Filled];
      break;
    }
    case SchemaNodeDataType.Entity:
    case SchemaNodeDataType.None: {
      // Object | Array
      if (nodeProperties && nodeProperties.indexOf(SchemaNodeProperty.Repeating) > -1) {
        icons = size === 16 ? [Array16Regular, Array16Filled] : [Array24Regular, Array24Filled];
      } else {
        icons = size === 16 ? [Cube16Regular, Cube16Filled] : [Cube24Regular, Cube24Filled];
      }
      break;
    }
    case SchemaNodeDataType.AnyAtomicType:
    case SchemaNodeDataType.Item:
    case SchemaNodeDataType.Notation:
    case SchemaNodeDataType.UntypedAtomic: {
      // Any
      icons = size === 16 ? [Any16Regular, Any16Filled] : [Any24Regular, Any24Filled];
      break;
    }
    default: {
      LogService.error(LogCategory.IconUtils, 'iconForSchemaNodeDataType', {
        message: `Icon.Utils Error: No icon found for type ${nodeType}`,
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

export const getIconForFunction = (
  name: string,
  categoryName: FunctionCategory,
  fileName: string | undefined,
  _branding: FunctionGroupBranding
) => {
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
    <Image
      src={isError ? functionIcon : categoryIcon}
      shouldFadeIn={false}
      height={20}
      width={20}
      alt={name}
      onLoadingStateChange={loadBackupFunctionCategory}
    />
  );
};
