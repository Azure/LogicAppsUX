import type { FunctionGroupBranding } from '../constants/FunctionConstants';
import { Collection20Regular, StringCategory20Regular } from '../images/CategoryIcons';
import {
  Any16Filled,
  Any16Regular,
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
import { FunctionCategory } from '../models/Function';
import type { TypeofSchemaNodeDataType, TypeofSchemaNodeProperties } from '../models/Schema';
import { SchemaNodeDataType, SchemaNodeProperties } from '../models/Schema';
import { Image } from '@fluentui/react-components';
import {
  AddSubtractCircle16Filled,
  AddSubtractCircle16Regular,
  AddSubtractCircle20Filled,
  AddSubtractCircle24Filled,
  AddSubtractCircle24Regular,
  bundleIcon,
  CalendarClock16Filled,
  CalendarClock16Regular,
  CalendarClock20Regular,
  CalendarClock24Filled,
  CalendarClock24Regular,
  CircleOff16Filled,
  CircleOff16Regular,
  CircleOffFilled,
  CircleOffRegular,
  Cube16Filled,
  Cube16Regular,
  Cube24Filled,
  Cube24Regular,
  MathSymbols20Regular,
  Wrench20Regular,
} from '@fluentui/react-icons';

export const icon16BundleForSchemaNodeType = (nodeType: SchemaNodeDataType) => {
  switch (nodeType) {
    /* Currently Unused will come into play with JSON
    case SchemaNodeDataType.ComplexType: {
      return bundleIcon(NumberSymbol16Filled, NumberSymbol16Regular); // Number
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
      return bundleIcon(Integer16Filled, Integer16Regular); // Integer
    }
    case SchemaNodeDataType.Decimal:
    case SchemaNodeDataType.Double:
    case SchemaNodeDataType.Float: {
      return bundleIcon(Decimal16Filled, Decimal16Regular); // Decimal
    }
    case SchemaNodeDataType.Base64Binary:
    case SchemaNodeDataType.Byte:
    case SchemaNodeDataType.HexBinary:
    case SchemaNodeDataType.UnsignedByte: {
      return bundleIcon(Binary16Filled, Binary16Regular); // Binary
    }
    case SchemaNodeDataType.Boolean: {
      return bundleIcon(AddSubtractCircle16Filled, AddSubtractCircle16Regular); // Boolean
    }
    case SchemaNodeDataType.AnyUri:
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
      return bundleIcon(String16Filled, String16Regular); // String
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
      return bundleIcon(CalendarClock16Filled, CalendarClock16Regular); // Date time
    }
    /* Currently Unused
    case SchemaNodeDataType: {
      return bundleIcon(Array16Filled, Array16Regular); // Array
    }
    */
    case SchemaNodeDataType.Entity:
    case SchemaNodeDataType.None: {
      return bundleIcon(Cube16Filled, Cube16Regular); // Object
    }
    case SchemaNodeDataType.AnyAtomicType:
    case SchemaNodeDataType.Item:
    case SchemaNodeDataType.Notation:
    case SchemaNodeDataType.UntypedAtomic: {
      return bundleIcon(Any16Filled, Any16Regular); // Any
    }
    default: {
      // TODO log when we fail to match a data type
      return bundleIcon(CircleOff16Filled, CircleOff16Regular); // Null
    }
  }
};

export const icon16ForSchemaNodeType = (nodeType: SchemaNodeDataType, properties?: SchemaNodeProperties) => {
  switch (nodeType) {
    /* Currently Unused will come into play with JSON
    case SchemaNodeDataType.ComplexType: {
      return bundleIcon(NumberSymbol16Filled, NumberSymbol16Regular); // Number
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
      return Integer16Regular; // Integer
    }
    case SchemaNodeDataType.Decimal:
    case SchemaNodeDataType.Double:
    case SchemaNodeDataType.Float: {
      return Decimal16Regular; // Decimal
    }
    case SchemaNodeDataType.Base64Binary:
    case SchemaNodeDataType.Byte:
    case SchemaNodeDataType.HexBinary:
    case SchemaNodeDataType.UnsignedByte: {
      return Binary16Regular; // Binary
    }
    case SchemaNodeDataType.Boolean: {
      return AddSubtractCircle16Regular; // Boolean
    }
    case SchemaNodeDataType.AnyUri:
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
      return String16Regular; // String
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
      return CalendarClock16Regular; // Date time
    }
    case SchemaNodeDataType.Entity: // danielle refactor this
    case SchemaNodeDataType.None: {
      if (properties === SchemaNodeProperties.Repeating) {
        return Array16Regular;
      }
      return Cube16Regular;
    }
    case SchemaNodeDataType.AnyAtomicType:
    case SchemaNodeDataType.Item:
    case SchemaNodeDataType.Notation:
    case SchemaNodeDataType.UntypedAtomic: {
      return Any16Regular; // Any
    }
    default: {
      // TODO log when we fail to match a data type
      return CircleOff16Regular; // Null
    }
  }
};

export const icon24BundleForSchemaNodeType = (nodeType: SchemaNodeDataType) => {
  switch (nodeType) {
    /* Currently Unused will come into play with JSON
    case SchemaNodeDataType.ComplexType: {
      return bundleIcon(NumberSymbol24Filled, NumberSymbol24Regular); // Number
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
      return bundleIcon(Integer24Filled, Integer24Regular); // Integer
    }
    case SchemaNodeDataType.Decimal:
    case SchemaNodeDataType.Double:
    case SchemaNodeDataType.Float: {
      return bundleIcon(Decimal24Filled, Decimal24Regular); // Decimal
    }
    case SchemaNodeDataType.Base64Binary:
    case SchemaNodeDataType.Byte:
    case SchemaNodeDataType.HexBinary:
    case SchemaNodeDataType.UnsignedByte: {
      return bundleIcon(Binary24Filled, Binary24Regular); // Binary
    }
    case SchemaNodeDataType.Boolean: {
      return bundleIcon(AddSubtractCircle24Filled, AddSubtractCircle24Regular); // Boolean
    }
    case SchemaNodeDataType.AnyUri:
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
      return bundleIcon(String24Filled, String24Regular); // String
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
      return bundleIcon(CalendarClock24Filled, CalendarClock24Regular); // Date time
    }
    /* Currently Unused
    case SchemaNodeDataType: {
      return bundleIcon(Array24Filled, Array24Regular); // Array
    }
    */
    case SchemaNodeDataType.Entity:
    case SchemaNodeDataType.None: {
      return bundleIcon(Cube24Filled, Cube24Regular); // Object
    }
    case SchemaNodeDataType.AnyAtomicType:
    case SchemaNodeDataType.Item:
    case SchemaNodeDataType.Notation:
    case SchemaNodeDataType.UntypedAtomic: {
      return bundleIcon(Any24Filled, Any24Regular); // Any
    }
    default: {
      // TODO log when we fail to match a data type
      return bundleIcon(CircleOffFilled, CircleOffRegular); // Null
    }
  }
};

export const icon24ForSchemaNodeType = (nodeType: TypeofSchemaNodeDataType, properties?: TypeofSchemaNodeProperties) => {
  switch (nodeType) {
    /* Currently Unused will come into play with JSON
    case SchemaNodeDataType.ComplexType: {
      return NumberSymbol24Regular; // Number
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
      return Integer24Regular; // Integer
    }
    case SchemaNodeDataType.Decimal:
    case SchemaNodeDataType.Double:
    case SchemaNodeDataType.Float: {
      return Decimal24Regular; // Decimal
    }
    case SchemaNodeDataType.Base64Binary:
    case SchemaNodeDataType.Byte:
    case SchemaNodeDataType.HexBinary:
    case SchemaNodeDataType.UnsignedByte: {
      return Binary24Regular; // Binary
    }
    case SchemaNodeDataType.Boolean: {
      return AddSubtractCircle24Regular; // Boolean
    }
    case SchemaNodeDataType.AnyUri:
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
      return String24Regular; // String
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
      return CalendarClock24Regular; // Date time
    }
    /* Currently Unused
    case SchemaNodeDataType: {
      return Array24Regular; // Array
    }
    */
    case SchemaNodeDataType.Entity:
    case SchemaNodeDataType.None: {
      if (properties === SchemaNodeProperties.Repeating) {
        return Array24Regular;
      }
      return Cube24Regular;
    }
    case SchemaNodeDataType.AnyAtomicType:
    case SchemaNodeDataType.Item:
    case SchemaNodeDataType.Notation:
    case SchemaNodeDataType.UntypedAtomic: {
      return Any24Regular; // Any
    }
    default: {
      // TODO log when we fail to match a data type
      return CircleOffRegular; // Null
    }
  }
};

export const iconForFunctionCategory = (functionCategory: FunctionCategory) => {
  switch (functionCategory) {
    case FunctionCategory.Collection: {
      return Collection20Regular;
    }
    case FunctionCategory.DateTime: {
      return CalendarClock20Regular;
    }
    case FunctionCategory.Logical: {
      return AddSubtractCircle20Filled;
    }
    case FunctionCategory.Math: {
      return MathSymbols20Regular;
    }
    case FunctionCategory.String: {
      return StringCategory20Regular;
    }
    case FunctionCategory.Utility: {
      return Wrench20Regular;
    }
    default: {
      console.error(`Invalid category type: ${functionCategory}`);
      return Wrench20Regular;
    }
  }
};

export const iconUriForIconImageName = (iconImageName: string) => {
  // TODO Temp CDN, will need to be moved into a production location
  return `https://datamappericons.azureedge.net/icons/${iconImageName}`;
};

export const getIconForFunction = (name: string, fileName: string | undefined, branding: FunctionGroupBranding) => {
  return fileName ? <Image src={iconUriForIconImageName(fileName)} height={20} width={20} alt={name} /> : <>{branding.icon}</>;
};
