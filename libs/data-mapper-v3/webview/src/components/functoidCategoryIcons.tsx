import {
  AddRegular,
  AddSubtractCircleFilled,
  ArrowMaximizeRegular,
  ArrowMinimizeRegular,
  ArrowSwapRegular,
  AutosumRegular,
  CalendarAddRegular,
  CalendarClockRegular,
  CalendarDateRegular,
  CalendarLtrRegular,
  CircleOffRegular,
  ClockRegular,
  CopyRegular,
  EqualOffRegular,
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
  type FluentIcon,
} from '@fluentui/react-icons';
import { getVsCodeFluentTheme } from '../fluentTheme';
import { CollectionRegular, StringCategory20Regular } from '../icons/CategoryIcons';
import {
  AbsoluteValue32Regular,
  AngleIcon,
  Count32Regular,
  Divide32Regular,
  EPowerX32Regular,
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
  XPowerY32Regular,
} from '../icons/FunctionIcons';

// Brand colors follow data-mapper-v2 (core/ThemeConect.ts fnColors); resolved from the active Fluent theme.
type BrandColor = 'string' | 'math' | 'logical' | 'dateTime' | 'conversion' | 'collection' | 'utility' | 'custom';

const categoryBrand: Record<string, BrandColor> = {
  String: 'string',
  Math: 'math',
  Scientific: 'math',
  Logical: 'logical',
  DateTime: 'dateTime',
  Conversion: 'conversion',
  Cumulative: 'collection',
  DatabaseLookup: 'utility',
  Advanced: 'utility',
  Custom: 'custom',
};

const categoryIcons: Record<string, FluentIcon> = {
  String: StringCategory20Regular,
  Math: MathSymbolsRegular,
  Scientific: MathSymbolsRegular,
  Logical: AddSubtractCircleFilled,
  DateTime: CalendarClockRegular,
  Conversion: ArrowSwapRegular,
  Cumulative: CollectionRegular,
  DatabaseLookup: WrenchRegular,
  Advanced: WrenchRegular,
  Custom: WrenchRegular,
};

// Functoids that share a v2 function reuse its icon; everything else falls back to the category icon.
const functoidIcons: Record<string, FluentIcon> = {
  'String Left': TextNumberFormatRegular,
  'String Right': TextNumberFormatRegular,
  'String Extract': TextNumberFormatRegular,
  'String Left Trim': TextNumberFormatRegular,
  'String Right Trim': TextNumberFormatRegular,
  'String Concatenate': TextNumberFormatRegular,
  'String Size': TextWholeWordRegular,
  Lowercase: TextCaseLowercaseRegular,
  Uppercase: TextCaseUppercaseRegular,

  'Absolute Value': AbsoluteValue32Regular,
  Integer: RoundRegular,
  Round: RoundRegular,
  'Maximum Value': ArrowMaximizeRegular,
  'Minimum Value': ArrowMinimizeRegular,
  Modulo: PercentageIcon,
  'Square Root': SquareRoot32Regular,
  Addition: AddRegular,
  Subtraction: SubtractCircleRegular,
  Multiplication: TextAsteriskRegular,
  Division: Divide32Regular,

  'Arc Tangent': AngleIcon,
  Tangent: AngleIcon,
  Cosine: RightTriangleRegular,
  Sine: RightTriangleRegular,
  'Natural Exponential': EPowerX32Regular,
  'Natural Logarithm': LogYX32Regular,
  'Base 10 Exponential': TenPowerX32Regular,
  'Common Logarithm': LogYX32Regular,
  'X^Y': XPowerY32Regular,
  'Base-Specified Logarithm': LogYX32Regular,

  'Greater Than': GreaterThan32Regular,
  'Greater Than or Equal To': GreaterThanOrEqual32Regular,
  'Less Than': LessThan32Regular,
  'Less Than or Equal To': LessThanOrEqual32Regular,
  Equal: ReOrderRegular,
  'Not Equal': EqualOffRegular,
  'Logical Date': CalendarDateRegular,
  'Logical Numeric': NumberSymbolRegular,
  'Logical Existence': CircleOffRegular,
  IsNil: CircleOffRegular,

  'Add Days': CalendarAddRegular,
  Date: CalendarLtrRegular,
  Time: ClockRegular,
  'Date and Time': CalendarClockRegular,

  'Mass Copy': CopyRegular,
  Index: IndexRegular,
  'Record Count': Count32Regular,

  'Cumulative Sum': AutosumRegular,
  'Cumulative Average': MathSymbolsRegular,
  'Cumulative Minimum': ArrowMinimizeRegular,
  'Cumulative Maximum': ArrowMaximizeRegular,
  'Cumulative Concatenate': TextNumberFormatRegular,
};

export type FunctoidIcon = FluentIcon;

export function getFunctoidIcon(name: string | undefined, category: string | undefined): FunctoidIcon {
  return (name ? functoidIcons[name] : undefined) ?? categoryIcons[category ?? 'Custom'] ?? WrenchRegular;
}

export function getFunctoidBrand(category: string | undefined): { color: string; iconColor: string } {
  const theme = getVsCodeFluentTheme();
  const colors: Record<BrandColor, string> = {
    string: theme.colorPaletteDarkOrangeForeground3,
    math: theme.colorPaletteMarigoldBorder2,
    logical: '#F6CA30',
    dateTime: theme.colorPaletteLightTealBorderActive,
    conversion: theme.colorPaletteBlueBorderActive,
    collection: theme.colorPaletteNavyForeground2,
    utility: theme.colorPaletteMagentaBorderActive,
    custom: theme.colorPaletteDarkGreenBackground2,
  };
  return { color: colors[categoryBrand[category ?? 'Custom'] ?? 'custom'], iconColor: theme.colorNeutralForegroundInverted };
}
