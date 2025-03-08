import { CollectionRegular, StringCategory20Regular } from '../images/FunctionIcons/CategoryIcons';
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
} from '../images/FunctionIcons/DataType16Icons';
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
} from '../images/FunctionIcons/DataType24Icons';
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
} from '../images/FunctionIcons/FunctionIcons';
import { FunctionCategory } from '../models/Function';
import { LogCategory } from './Logging.Utils';
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
  CalendarClockFilled,
  CalendarClockRegular,
  CalendarDateRegular,
  CalendarLtrRegular,
  CircleOffRegular,
  ClockRegular,
  CopyRegular,
  CubeRegular,
  DismissCircleFilled,
  EqualOffRegular,
  GatherRegular,
  InfoFilled,
  MathSymbolsRegular,
  NumberSymbolFilled,
  NumberSymbolRegular,
  QuestionCircleFilled,
  ReOrderRegular,
  SubtractCircleRegular,
  TextAsteriskRegular,
  TextCaseLowercaseRegular,
  TextCaseUppercaseRegular,
  TextNumberFormatRegular,
  TextWholeWordRegular,
  WarningFilled,
  WrenchRegular,
} from '@fluentui/react-icons';
import { LogEntryLevel, LoggerService, NormalizedDataType, SchemaNodeProperty } from '@microsoft/logic-apps-shared';
import type { ReactElement } from 'react';
import { MapCheckerItemSeverity } from './MapChecker.Utils';
import { tokens } from '@fluentui/react-components';

// Using Fluent v8 as it has option for fallback icon

type iconSize = 16 | 24;

const mapCheckerIconStyle = { minHeight: '16px', minWidth: '16px' };

export const iconForMapCheckerSeverity = (severity: MapCheckerItemSeverity) => {
  switch (severity) {
    case MapCheckerItemSeverity.Error: {
      return <DismissCircleFilled style={mapCheckerIconStyle} primaryFill={tokens.colorPaletteRedBackground3} />;
    }
    case MapCheckerItemSeverity.Warning: {
      return <WarningFilled style={mapCheckerIconStyle} primaryFill={tokens.colorPaletteGoldBorderActive} />;
    }
    case MapCheckerItemSeverity.Info: {
      return <InfoFilled style={mapCheckerIconStyle} primaryFill={tokens.colorPaletteBlueBorderActive} />;
    }
    case MapCheckerItemSeverity.Unknown:
    default: {
      return <QuestionCircleFilled style={mapCheckerIconStyle} primaryFill={tokens.colorPaletteBeigeBorderActive} />;
    }
  }
};

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
      icons = [NumberSymbolRegular, NumberSymbolFilled];
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
      icons = [AddSubtractCircleRegular, AddSubtractCircleFilled];
      break;
    }
    case NormalizedDataType.String: {
      icons = size === 16 ? [String16Regular, String16Filled] : [String24Regular, String24Filled];
      break;
    }
    case NormalizedDataType.DateTime: {
      icons = [CalendarClockRegular, CalendarClockFilled];
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
      LoggerService().log({
        level: LogEntryLevel.Error,
        area: `${LogCategory.IconUtils}/iconForNormalizedDataType`,
        message: `No icon found for type: ${nodeType}`,
      });

      // Null
      icon = CircleOffRegular;
      break;
    }
  }
  return bundled && icons.length > 1 ? bundleIcon(icons[1], icons[0]) : icon;
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
      LoggerService().log({
        level: LogEntryLevel.Error,
        area: `${LogCategory.IconUtils}/iconForFunctionCategory`,
        message: `Invalid category type: ${functionCategory}`,
      });

      return WrenchRegular;
    }
  }
};

export const iconUriForIconImageName = (iconImageName: string) => {
  return `${iconBaseUrl}${iconImageName}`;
};

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
