import { ReactComponent as Any16Filled } from '../../images/Any16Filled.svg';
import { ReactComponent as Any16Regular } from '../../images/Any16Regular.svg';
import { ReactComponent as Binary16Filled } from '../../images/Binary16Filled.svg';
import { ReactComponent as Binary16Regular } from '../../images/Binary16Regular.svg';
import { ReactComponent as Decimal16Filled } from '../../images/Decimal16Filled.svg';
import { ReactComponent as Decimal16Regular } from '../../images/Decimal16Regular.svg';
import { ReactComponent as Integer16Filled } from '../../images/Integer16Filled.svg';
import { ReactComponent as Integer16Regular } from '../../images/Integer16Regular.svg';
import { ReactComponent as String16Filled } from '../../images/String16Filled.svg';
import { ReactComponent as String16Regular } from '../../images/String16Regular.svg';
import { SchemaNodeDataType } from '../../models/Schema';
import {
  AddSubtractCircle16Filled,
  AddSubtractCircle16Regular,
  bundleIcon,
  CalendarClock16Filled,
  CalendarClock16Regular,
  CircleOff16Filled,
  CircleOff16Regular,
  Cube16Filled,
  Cube16Regular,
} from '@fluentui/react-icons';

export const icon16ForSchemaNodeType = (nodeType: SchemaNodeDataType) => {
  switch (nodeType) {
    /* Currently Unused
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
    case SchemaNodeDataType.ComplexType:
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
