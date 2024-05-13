//import { MapCheckerItemSeverity } from '../components/sidePane/tabs/mapCheckerTab/MapCheckerItem';
import { CollectionRegular, StringCategory20Regular } from '../images/CategoryIcons';
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
  AngleIcon,
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
  PercentageIcon,
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
import type { FluentIcon } from '@fluentui/react-icons';
import {
  AddRegular,
  AddSubtractCircleFilled,
  AddSubtractCircleRegular,
  ArrowMaximizeRegular,
  ArrowMinimizeRegular,
  ArrowSwapRegular,
  AutosumRegular,
  bundleIcon,
  CalendarAddRegular,
  CalendarClockRegular,
  CalendarDateRegular,
  CalendarLtrRegular,
  CircleOffRegular,
  ClockRegular,
  CopyRegular,
  CubeRegular,
  EqualOffRegular,
  GatherRegular,
  MathSymbolsRegular,
  NumberSymbolRegular,
  ReOrderRegular,
  SubtractCircleRegular,
  TextAsteriskRegular,
  TextCaseLowercaseRegular,
  TextCaseUppercaseRegular,
  TextNumberFormatRegular,
  TextWholeWordRegular,
  WrenchRegular,
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

  let icon: FluentIcon = AddRegular;

  switch (nodeType) {
    case NormalizedDataType.Number: {
      icon = NumberSymbolRegular;
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
      icon = AddSubtractCircleRegular;
      break;
    }
    case NormalizedDataType.String: {
      icons = size === 16 ? [String16Regular, String16Filled] : [String24Regular, String24Filled];
      break;
    }
    case NormalizedDataType.DateTime: {
      icon = CalendarClockRegular;
      break;
    }
    case NormalizedDataType.Complex:
    case NormalizedDataType.Object: {
      if (nodeProperties && nodeProperties.indexOf(SchemaNodeProperty.Repeating) > -1) {
        icons = size === 16 ? [Array16Regular, Array16Filled] : [Array24Regular, Array24Filled];
      } else {
        icon = CubeRegular;
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
      icon = CircleOffRegular;
      break;
    }
  }
  console.log(icon);
  return bundled ? bundleIcon(icons[1], icons[0]) : icons[0];
};

export const iconBaseUrl = 'https://logicappsv2resources.blob.core.windows.net/icons/datamapper/';

export const iconForFunctionCategory = (functionCategory: FunctionCategory) => {
  switch (functionCategory) {
    case FunctionCategory.Collection: {
      return CollectionRegular;
    }
    case FunctionCategory.Conversion: {
      return ArrowSwapRegular;
    }
    case FunctionCategory.Custom: {
      return WrenchRegular;
    }
    case FunctionCategory.DateTime: {
      return CalendarClockRegular;
    }
    case FunctionCategory.Logical: {
      return AddSubtractCircleFilled;
    }
    case FunctionCategory.Math: {
      return MathSymbolsRegular;
    }
    case FunctionCategory.String: {
      return StringCategory20Regular;
    }
    case FunctionCategory.Utility: {
      return WrenchRegular;
    }
    default: {
      LogService.error(LogCategory.IconUtils, 'iconForFunctionCategory', {
        message: `Invalid category type: ${functionCategory}`,
      });

      return WrenchRegular;
    }
  }
};

export const iconUriForIconImageName = (iconImageName: string) => {
  return `${iconBaseUrl}${iconImageName}`;
};

// danielle for function icons coming from fluent, changing the font size works

export const iconForFunction = (functionKey: string, color: string, iconSize: number) => {
  const defaultStyle = { height: iconSize, width: iconSize, margin: 'auto', fontSize: `${iconSize}px` };
  const coloredDefaultStyle = { ...defaultStyle, color };
  const iconToEdgeStyle = { ...defaultStyle };

  // Commented out keys are either using category icons or haven't been given an icon yet
  const functionKeyIconMapping: { [key: string]: ReactElement } = {
    Maximum: <ArrowMaximizeRegular style={coloredDefaultStyle} />,
    Minimum: <ArrowMinimizeRegular style={coloredDefaultStyle} />,
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
    IsDate: <CalendarDateRegular style={coloredDefaultStyle} />,
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
    Absolute: <AbsoluteValue32Regular style={{ fontSize: '12px' }} primaryFill={color} />,
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
    Tangent: <AngleIcon style={coloredDefaultStyle} />,
    ArcTangent: <AngleIcon style={coloredDefaultStyle} />,
    Power: <XPowerY32Regular primaryFill={color} style={iconToEdgeStyle} />,
    Add: <AddRegular primaryFill={color} style={defaultStyle} />,
    Subtract: <SubtractCircleRegular style={coloredDefaultStyle} />,
    Multiply: <TextAsteriskRegular style={coloredDefaultStyle} />,
    Divide: <Divide32Regular primaryFill={color} style={defaultStyle} />,
    Mod: <PercentageIcon style={coloredDefaultStyle} />,
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
    ToDate: <CalendarDateRegular style={coloredDefaultStyle} />,
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
