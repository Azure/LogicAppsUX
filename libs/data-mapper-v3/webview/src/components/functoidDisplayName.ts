export function getFunctoidDisplayName(name: string): string {
  return name.replace(/^(String|Cumulative) /, '');
}

const shortNames: Record<string, string> = {
  // String
  'String Find': 'Find',
  'String Left': 'Left',
  Lowercase: 'Lwer',
  'String Right': 'Rght',
  'String Size': 'Size',
  'String Extract': 'Extr',
  'String Concatenate': 'Conc',
  'String Left Trim': 'LTrm',
  'String Right Trim': 'RTrm',
  Uppercase: 'Uppr',

  // Math
  'Absolute Value': 'Abs',
  Integer: 'Int',
  'Maximum Value': 'Max',
  'Minimum Value': 'Min',
  Modulo: 'Mod',
  Round: 'Rond',
  'Square Root': 'Sqrt',
  Addition: 'Add',
  Subtraction: 'Sub',
  Multiplication: 'Mult',
  Division: 'Div',

  // Scientific
  'Arc Tangent': 'ATan',
  Cosine: 'Cos',
  Sine: 'Sin',
  Tangent: 'Tan',
  'Natural Exponential': 'Exp',
  'Natural Logarithm': 'Ln',
  'Base 10 Exponential': '10^X',
  'Common Logarithm': 'Log',
  'X^Y': 'X^Y',
  'Base-Specified Logarithm': 'LogB',

  // Logical
  'Greater Than': 'GT',
  'Greater Than or Equal To': 'GTE',
  'Less Than': 'LT',
  'Less Than or Equal To': 'LTE',
  Equal: 'Eq',
  'Not Equal': 'NEq',
  'Logical String': 'LStr',
  'Logical Date': 'LDat',
  'Logical Numeric': 'LNum',
  'Logical OR': 'OR',
  'Logical AND': 'AND',
  'Value Mapping (Flattening)': 'VMpF',
  'Value Mapping': 'VMap',
  'Logical Existence': 'Exis',
  'Logical NOT': 'NOT',
  IsNil: 'IsNl',

  // DateTime
  'Add Days': 'AdDy',
  Date: 'Date',
  Time: 'Time',
  'Date and Time': 'DtTm',

  // Conversion
  'ASCII to Character': 'A2Ch',
  'Character to ASCII': 'Ch2A',
  Hexadecimal: 'Hex',
  Octal: 'Oct',

  // Advanced
  Scripting: 'Scrp',
  'Record Count': 'RCnt',
  Index: 'Indx',
  'Nil Value': 'Nil',
  Looping: 'Loop',
  Iteration: 'Iter',
  XPath: 'XPth',
  'Table Looping': 'TLop',
  'Table Extractor': 'TExt',
  Assert: 'Asrt',
  'Key Match': 'KMch',
  'Existence Looping': 'ELop',
  'Mass Copy': 'MCpy',

  // Database Lookup
  'Database Lookup': 'DBLk',
  'Value Extractor': 'VExt',
  'Error Return': 'ErrR',

  // Cumulative
  'Cumulative Sum': 'CSum',
  'Cumulative Average': 'CAvg',
  'Cumulative Minimum': 'CMin',
  'Cumulative Maximum': 'CMax',
  'Cumulative Concatenate': 'CCat',
};

export function getFunctoidShortName(name: string): string {
  return shortNames[name] ?? getFunctoidDisplayName(name).substring(0, 4);
}
