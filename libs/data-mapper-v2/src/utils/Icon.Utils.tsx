//import { MapCheckerItemSeverity } from '../components/sidePane/tabs/mapCheckerTab/MapCheckerItem';
import { Collection20Regular, StringCategory20Regular } from '../images/CategoryIcons';
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
import {
  AbsoluteValue32Regular,
  CeilingValue32Regular,
  Count32Regular,
  Divide32Regular,
  EPowerX32Regular,
  FloorValue32Regular,
  GreaterThan32Regular,
  GreaterThanOrEqual32Regular,
  IndexRegular,
  LessThan32Regular,
  LessThanOrEqual32Regular,
  LogYX32Regular,
  RightTriangleRegular,
  RoundRegular,
  SquareRoot32Regular,
  TenPowerX32Regular,
  XDivide132Regular,
  XPowerY32Regular,
} from '../images/FunctionIcons';
import { FunctionCategory } from '../models/Function';
import { LogCategory, LogService } from './Logging.Utils';
import { FontIcon } from '@fluentui/react';
import { tokens } from '@fluentui/react-components';
import {
  AddRegular,
  AddSubtractCircle16Filled,
  AddSubtractCircle16Regular,
  AddSubtractCircle20Filled,
  AddSubtractCircle24Filled,
  AddSubtractCircle24Regular,
  ArrowSwap20Regular,
  AutosumRegular,
  bundleIcon,
  CalendarAddRegular,
  CalendarClock16Filled,
  CalendarClock16Regular,
  CalendarClock20Regular,
  CalendarClock24Filled,
  CalendarClock24Regular,
  CalendarClockRegular,
  CalendarLtrRegular,
  CircleOff16Filled,
  CircleOff16Regular,
  CircleOffRegular,
  ClockRegular,
  CopyRegular,
  Cube16Filled,
  Cube16Regular,
  Cube24Filled,
  Cube24Regular,
  DismissCircleFilled,
  EqualOffRegular,
  GatherRegular,
  InfoFilled,
  MathSymbols20Regular,
  MathSymbolsRegular,
  NumberSymbol16Filled,
  NumberSymbol16Regular,
  NumberSymbol24Filled,
  NumberSymbol24Regular,
  NumberSymbolRegular,
  QuestionCircleFilled,
  ReOrderRegular,
  TextCaseLowercaseRegular,
  TextCaseUppercaseRegular,
  TextNumberFormatRegular,
  TextWholeWordRegular,
  WarningFilled,
  Wrench20Regular,
} from '@fluentui/react-icons';
import { NormalizedDataType, SchemaNodeProperty } from '@microsoft/logic-apps-shared';
import type { ReactElement } from 'react';

// Using Fluent v8 as it has option for fallback icon

type iconSize = 16 | 24;

export const iconForNormalizedDataType = (
  nodeType: NormalizedDataType,
  size: iconSize,
  bundled: boolean,
  nodeProperties?: SchemaNodeProperty[]
) => {
  let icons: (typeof Integer16Regular)[] = [];

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
    case NormalizedDataType.Complex:
    case NormalizedDataType.Object: {
      if (nodeProperties && nodeProperties.indexOf(SchemaNodeProperty.Repeating) > -1) {
        icons = size === 16 ? [Array16Regular, Array16Filled] : [Array24Regular, Array24Filled];
      } else {
        icons = size === 16 ? [Cube16Regular, Cube16Filled] : [Cube24Regular, Cube24Filled];
      }
      break;
    }
    case NormalizedDataType.Array: {
      icons = size === 16 ? [Array16Regular, Array16Filled] : [Array24Regular, Array24Filled];
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
  switch (functionCategory) {
    case FunctionCategory.Collection: {
      return Collection20Regular;
    }
    case FunctionCategory.Conversion: {
      return ArrowSwap20Regular;
    }
    case FunctionCategory.Custom: {
      return Wrench20Regular;
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
      LogService.error(LogCategory.IconUtils, 'iconForFunctionCategory', {
        message: `Invalid category type: ${functionCategory}`,
      });

      return Wrench20Regular;
    }
  }
};

export const iconUriForIconImageName = (iconImageName: string) => {
  return `${iconBaseUrl}${iconImageName}`;
};

const mapCheckerIconStyle = { minHeight: '20px', minWidth: '20px' };

// export const iconForMapCheckerSeverity = (severity: MapCheckerItemSeverity) => {
//   switch (severity) {
//     case MapCheckerItemSeverity.Error: {
//       return <DismissCircleFilled style={mapCheckerIconStyle} primaryFill={tokens.colorPaletteRedBackground3} />;
//     }
//     case MapCheckerItemSeverity.Warning: {
//       return <WarningFilled style={mapCheckerIconStyle} primaryFill={tokens.colorPaletteGoldBorderActive} />;
//     }
//     case MapCheckerItemSeverity.Info: {
//       return <InfoFilled style={mapCheckerIconStyle} primaryFill={tokens.colorPaletteBlueBorderActive} />;
//     }
//     case MapCheckerItemSeverity.Unknown:
//     default: {
//       return <QuestionCircleFilled style={mapCheckerIconStyle} primaryFill={tokens.colorPaletteBeigeBorderActive} />;
//     }
//   }
// };

export const iconForFunction = (functionKey: string, color: string) => {
  const defaultStyle = { height: 20, width: 20, margin: 'auto' };
  const coloredDefaultStyle = { ...defaultStyle, color };
  const iconToEdgeStyle = { ...defaultStyle, height: 18, width: 18 };

  // Commented out keys are either using category icons or haven't been given an icon yet
  const functionKeyIconMapping: { [key: string]: ReactElement } = {
    Maximum: <FontIcon iconName="MaximumValue" style={coloredDefaultStyle} />,
    Minimum: <FontIcon iconName="MinimumValue" style={coloredDefaultStyle} />,
    Average: <MathSymbolsRegular primaryFill={color} style={defaultStyle} />,
    Count: <Count32Regular primaryFill={color} style={defaultStyle} />,
    Sum: <AutosumRegular primaryFill={color} style={defaultStyle} />,
    Join: <GatherRegular primaryFill={color} style={defaultStyle} />,
    CurrentDate: <CalendarLtrRegular primaryFill={color} style={defaultStyle} />,
    CurrentDateTime: <CalendarClockRegular primaryFill={color} style={defaultStyle} />,
    CurrentTime: <ClockRegular primaryFill={color} style={defaultStyle} />,
    AddDays: <CalendarAddRegular primaryFill={color} style={defaultStyle} />,
    IsNull: <CircleOffRegular primaryFill={color} style={defaultStyle} />,
    IsNil: <CircleOffRegular primaryFill={color} style={defaultStyle} />,
    IsNumber: <NumberSymbolRegular primaryFill={color} style={defaultStyle} />,
    IsString: <String24Regular primaryFill={color} style={defaultStyle} />,
    IsDate: <FontIcon iconName="EventDate" style={coloredDefaultStyle} />,
    IsEqual: <ReOrderRegular primaryFill={color} style={defaultStyle} />,
    IsNotEqual: <EqualOffRegular primaryFill={color} style={defaultStyle} />,
    IsGreater: <GreaterThan32Regular primaryFill={color} style={defaultStyle} />,
    IsGreaterOrEqual: <GreaterThanOrEqual32Regular primaryFill={color} style={defaultStyle} />,
    IsLess: <LessThan32Regular primaryFill={color} style={defaultStyle} />,
    IsLessOrEqual: <LessThanOrEqual32Regular primaryFill={color} style={defaultStyle} />,
    // Exists
    Not: <FontIcon iconName="Important" style={coloredDefaultStyle} />,
    // And
    // Or
    Absolute: <AbsoluteValue32Regular primaryFill={color} style={iconToEdgeStyle} />,
    Round: <RoundRegular primaryFill={color} style={defaultStyle} />,
    Floor: <FloorValue32Regular primaryFill={color} style={iconToEdgeStyle} />,
    Ceiling: <CeilingValue32Regular primaryFill={color} style={iconToEdgeStyle} />,
    SquareRoot: <SquareRoot32Regular primaryFill={color} style={iconToEdgeStyle} />,
    Exponential: <EPowerX32Regular primaryFill={color} style={defaultStyle} />,
    ExponentialBase10: <TenPowerX32Regular primaryFill={color} style={defaultStyle} />,
    Log: <LogYX32Regular primaryFill={color} style={defaultStyle} />,
    LogBase10: <LogYX32Regular primaryFill={color} style={defaultStyle} />,
    Sine: <RightTriangleRegular primaryFill={color} style={defaultStyle} />,
    Cosine: <RightTriangleRegular primaryFill={color} style={defaultStyle} />,
    Tangent: <FontIcon iconName="ChartYAngle" style={coloredDefaultStyle} />,
    ArcTangent: <FontIcon iconName="ChartYAngle" style={coloredDefaultStyle} />,
    Power: <XPowerY32Regular primaryFill={color} style={iconToEdgeStyle} />,
    Add: <AddRegular primaryFill={color} style={defaultStyle} />,
    Subtract: <FontIcon iconName="CalculatorSubtract" style={coloredDefaultStyle} />,
    Multiply: <FontIcon iconName="CalculatorMultiply" style={coloredDefaultStyle} />,
    Divide: <Divide32Regular primaryFill={color} style={defaultStyle} />,
    Mod: <FontIcon iconName="CalculatorPercentage" style={coloredDefaultStyle} />,
    Idiv: <XDivide132Regular primaryFill={color} style={iconToEdgeStyle} />,
    Concat: <TextNumberFormatRegular primaryFill={color} style={defaultStyle} />,
    ToLower: <TextCaseLowercaseRegular primaryFill={color} style={defaultStyle} />,
    ToUpper: <TextCaseUppercaseRegular primaryFill={color} style={defaultStyle} />,
    StringLength: <TextWholeWordRegular primaryFill={color} style={defaultStyle} />,
    // Contains
    SubString: <TextNumberFormatRegular primaryFill={color} style={defaultStyle} />,
    SubStringBefore: <TextNumberFormatRegular primaryFill={color} style={defaultStyle} />,
    SubStringAfter: <TextNumberFormatRegular primaryFill={color} style={defaultStyle} />,
    // StartsWith
    // EndsWith
    // Replace
    Trim: <TextNumberFormatRegular primaryFill={color} style={defaultStyle} />,
    TrimLeft: <TextNumberFormatRegular primaryFill={color} style={defaultStyle} />,
    TrimRight: <TextNumberFormatRegular primaryFill={color} style={defaultStyle} />,
    // StringToCodepoints
    // CodepointsToString
    // Error
    MassCopy: <CopyRegular primaryFill={color} style={defaultStyle} />,
    // IfElse
    ToDate: <FontIcon iconName="EventDate" style={coloredDefaultStyle} />,
    ToNumber: <NumberSymbolRegular primaryFill={color} style={defaultStyle} />,
    ToString: <String24Regular primaryFill={color} style={defaultStyle} />,
    ToInt: <RoundRegular primaryFill={color} style={defaultStyle} />,
    FormatNumber: <NumberSymbolRegular primaryFill={color} style={defaultStyle} />,
    FormatDateTime: <CalendarClockRegular primaryFill={color} style={defaultStyle} />,
    index: <IndexRegular primaryFill={color} style={defaultStyle} />,
    // if
    // directAccess
  };

  return functionKeyIconMapping[functionKey];
};
