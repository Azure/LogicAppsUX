/**
 * BizTalk Data Mapper - Functoid Base and Registry
 * Defines the functoid framework and all built-in functoids.
 * Uses official BizTalk Server Functoid IDs (FIDs) from BaseFunctoidIDs enum.
 */

import { FunctoidCategory } from '../model';

export interface FunctoidDefinition {
    id: number;
    name: string;
    category: FunctoidCategory;
    description: string;
    minInputs: number;
    maxInputs: number;
    hasOutput: boolean;
    tooltip: string;
    generateXslt: (inputs: string[], params: string[]) => string;
    generateScript?: (inputs: string[], params: string[]) => string;
}

export class FunctoidRegistry {
    private static instance: FunctoidRegistry;
    private functoids: Map<number, FunctoidDefinition> = new Map();

    private constructor() {
        this.registerBuiltInFunctoids();
    }

    public static getInstance(): FunctoidRegistry {
        if (!FunctoidRegistry.instance) {
            FunctoidRegistry.instance = new FunctoidRegistry();
        }
        return FunctoidRegistry.instance;
    }

    public getFunctoid(id: number): FunctoidDefinition | undefined {
        return this.functoids.get(id);
    }

    public getFunctoidsByCategory(category: FunctoidCategory): FunctoidDefinition[] {
        return Array.from(this.functoids.values()).filter(f => f.category === category);
    }

    public getAllFunctoids(): FunctoidDefinition[] {
        return Array.from(this.functoids.values());
    }

    public registerFunctoid(functoid: FunctoidDefinition): void {
        this.functoids.set(functoid.id, functoid);
    }

    private registerBuiltInFunctoids(): void {
        this.registerStringFunctoids();
        this.registerMathFunctoids();
        this.registerScientificFunctoids();
        this.registerLogicalFunctoids();
        this.registerDateTimeFunctoids();
        this.registerConversionFunctoids();
        this.registerAdvancedFunctoids();
        this.registerDatabaseFunctoids();
        this.registerCumulativeFunctoids();
    }

    // --- String Functoids (BizTalk FIDs 101-110) ---

    private registerStringFunctoids(): void {
        this.functoids.set(101, {
            id: 101,
            name: 'String Find',
            category: FunctoidCategory.String,
            description: 'Returns the 1-based position of a substring within a string',
            minInputs: 2,
            maxInputs: 2,
            hasOutput: true,
            tooltip: 'Find position of substring',
            generateXslt: (inputs) => `string-length(substring-before(${inputs[0]}, ${inputs[1]})) + 1`
        });

        this.functoids.set(102, {
            id: 102,
            name: 'String Left',
            category: FunctoidCategory.String,
            description: 'Returns the specified number of characters from the left side of a string',
            minInputs: 2,
            maxInputs: 2,
            hasOutput: true,
            tooltip: 'Get left N characters',
            generateXslt: (inputs) => `substring(${inputs[0]}, 1, ${inputs[1]})`
        });

        this.functoids.set(103, {
            id: 103,
            name: 'Lowercase',
            category: FunctoidCategory.String,
            description: 'Converts a string to lowercase',
            minInputs: 1,
            maxInputs: 1,
            hasOutput: true,
            tooltip: 'Convert to lowercase',
            generateXslt: (inputs) => `translate(${inputs[0]}, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz')`
        });

        this.functoids.set(104, {
            id: 104,
            name: 'String Right',
            category: FunctoidCategory.String,
            description: 'Returns the specified number of characters from the right side of a string',
            minInputs: 2,
            maxInputs: 2,
            hasOutput: true,
            tooltip: 'Get right N characters',
            generateXslt: (inputs) => `substring(${inputs[0]}, string-length(${inputs[0]}) - ${inputs[1]} + 1)`
        });

        this.functoids.set(105, {
            id: 105,
            name: 'String Size',
            category: FunctoidCategory.String,
            description: 'Returns the length of a string',
            minInputs: 1,
            maxInputs: 1,
            hasOutput: true,
            tooltip: 'Get string length',
            generateXslt: (inputs) => `string-length(${inputs[0]})`
        });

        this.functoids.set(106, {
            id: 106,
            name: 'String Extract',
            category: FunctoidCategory.String,
            description: 'Extracts a substring from a string (1-based start and end positions)',
            minInputs: 3,
            maxInputs: 3,
            hasOutput: true,
            tooltip: 'Extract substring (string, start, end)',
            generateXslt: (inputs) => `substring(${inputs[0]}, ${inputs[1]}, ${inputs[2]} - ${inputs[1]} + 1)`
        });

        this.functoids.set(107, {
            id: 107,
            name: 'String Concatenate',
            category: FunctoidCategory.String,
            description: 'Concatenates one or more strings',
            minInputs: 1,
            maxInputs: 100,
            hasOutput: true,
            tooltip: 'Concatenate strings together',
            generateXslt: (inputs) => inputs.length === 1
                ? inputs[0]
                : `concat(${inputs.join(', ')})`
        });

        this.functoids.set(108, {
            id: 108,
            name: 'String Left Trim',
            category: FunctoidCategory.String,
            description: 'Removes leading whitespace from a string',
            minInputs: 1,
            maxInputs: 1,
            hasOutput: true,
            tooltip: 'Trim leading whitespace',
            generateXslt: (inputs) => `normalize-space(${inputs[0]})`
        });

        this.functoids.set(109, {
            id: 109,
            name: 'String Right Trim',
            category: FunctoidCategory.String,
            description: 'Removes trailing whitespace from a string',
            minInputs: 1,
            maxInputs: 1,
            hasOutput: true,
            tooltip: 'Trim trailing whitespace',
            generateXslt: (inputs) => `normalize-space(${inputs[0]})`
        });

        this.functoids.set(110, {
            id: 110,
            name: 'Uppercase',
            category: FunctoidCategory.String,
            description: 'Converts a string to uppercase',
            minInputs: 1,
            maxInputs: 1,
            hasOutput: true,
            tooltip: 'Convert to uppercase',
            generateXslt: (inputs) => `translate(${inputs[0]}, 'abcdefghijklmnopqrstuvwxyz', 'ABCDEFGHIJKLMNOPQRSTUVWXYZ')`
        });
    }
    // --- Math Functoids (BizTalk FIDs 111-121) ---

    private registerMathFunctoids(): void {
        this.functoids.set(111, {
            id: 111,
            name: 'Absolute Value',
            category: FunctoidCategory.Math,
            description: 'Returns the absolute value of a number',
            minInputs: 1,
            maxInputs: 1,
            hasOutput: true,
            tooltip: 'Absolute value',
            generateXslt: (inputs) => `userCSharp:MathAbs(${inputs[0]})`
        });

        this.functoids.set(112, {
            id: 112,
            name: 'Integer',
            category: FunctoidCategory.Math,
            description: 'Returns the integer part of a number (truncates toward zero)',
            minInputs: 1,
            maxInputs: 1,
            hasOutput: true,
            tooltip: 'Truncate to integer',
            generateXslt: (inputs) => `floor(${inputs[0]})`
        });

        this.functoids.set(113, {
            id: 113,
            name: 'Maximum Value',
            category: FunctoidCategory.Math,
            description: 'Returns the maximum of a set of values',
            minInputs: 2,
            maxInputs: 100,
            hasOutput: true,
            tooltip: 'Maximum value',
            generateXslt: (inputs) => `userCSharp:MathMax(${inputs.map(i => `string(${i})`).join(', ')})`
        });

        this.functoids.set(114, {
            id: 114,
            name: 'Minimum Value',
            category: FunctoidCategory.Math,
            description: 'Returns the minimum of a set of values',
            minInputs: 2,
            maxInputs: 100,
            hasOutput: true,
            tooltip: 'Minimum value',
            generateXslt: (inputs) => `userCSharp:MathMin(${inputs.map(i => `string(${i})`).join(', ')})`
        });

        this.functoids.set(115, {
            id: 115,
            name: 'Modulo',
            category: FunctoidCategory.Math,
            description: 'Returns the remainder of dividing two numbers',
            minInputs: 2,
            maxInputs: 2,
            hasOutput: true,
            tooltip: 'Modulo (remainder)',
            generateXslt: (inputs) => `${inputs[0]} mod ${inputs[1]}`
        });

        this.functoids.set(116, {
            id: 116,
            name: 'Round',
            category: FunctoidCategory.Math,
            description: 'Rounds a number to the nearest integer',
            minInputs: 1,
            maxInputs: 1,
            hasOutput: true,
            tooltip: 'Round to nearest integer',
            generateXslt: (inputs) => `round(${inputs[0]})`
        });

        this.functoids.set(117, {
            id: 117,
            name: 'Square Root',
            category: FunctoidCategory.Math,
            description: 'Returns the square root of a number',
            minInputs: 1,
            maxInputs: 1,
            hasOutput: true,
            tooltip: 'Square root',
            generateXslt: (inputs) => `userCSharp:MathSqrt(${inputs[0]})`
        });

        this.functoids.set(118, {
            id: 118,
            name: 'Addition',
            category: FunctoidCategory.Math,
            description: 'Adds two or more numeric values',
            minInputs: 2,
            maxInputs: 100,
            hasOutput: true,
            tooltip: 'Add numbers',
            generateXslt: (inputs) => inputs.join(' + ')
        });

        this.functoids.set(119, {
            id: 119,
            name: 'Subtraction',
            category: FunctoidCategory.Math,
            description: 'Subtracts the second value from the first',
            minInputs: 2,
            maxInputs: 2,
            hasOutput: true,
            tooltip: 'Subtract numbers',
            generateXslt: (inputs) => `${inputs[0]} - ${inputs[1]}`
        });

        this.functoids.set(120, {
            id: 120,
            name: 'Multiplication',
            category: FunctoidCategory.Math,
            description: 'Multiplies two or more numeric values',
            minInputs: 2,
            maxInputs: 100,
            hasOutput: true,
            tooltip: 'Multiply numbers',
            generateXslt: (inputs) => inputs.join(' * ')
        });

        this.functoids.set(121, {
            id: 121,
            name: 'Division',
            category: FunctoidCategory.Math,
            description: 'Divides the first value by the second',
            minInputs: 2,
            maxInputs: 2,
            hasOutput: true,
            tooltip: 'Divide numbers',
            generateXslt: (inputs) => `${inputs[0]} div ${inputs[1]}`
        });
    }
    // --- Scientific Functoids (BizTalk FIDs 130-139) ---

    private registerScientificFunctoids(): void {
        this.functoids.set(130, {
            id: 130,
            name: 'Arc Tangent',
            category: FunctoidCategory.Scientific,
            description: 'Returns the arc tangent of a number',
            minInputs: 1,
            maxInputs: 1,
            hasOutput: true,
            tooltip: 'Arc tangent',
            generateXslt: (inputs) => `userCSharp:MathAtan(${inputs[0]})`
        });

        this.functoids.set(131, {
            id: 131,
            name: 'Cosine',
            category: FunctoidCategory.Scientific,
            description: 'Returns the cosine of an angle (in radians)',
            minInputs: 1,
            maxInputs: 1,
            hasOutput: true,
            tooltip: 'Cosine',
            generateXslt: (inputs) => `userCSharp:MathCos(${inputs[0]})`
        });

        this.functoids.set(132, {
            id: 132,
            name: 'Sine',
            category: FunctoidCategory.Scientific,
            description: 'Returns the sine of an angle (in radians)',
            minInputs: 1,
            maxInputs: 1,
            hasOutput: true,
            tooltip: 'Sine',
            generateXslt: (inputs) => `userCSharp:MathSin(${inputs[0]})`
        });

        this.functoids.set(133, {
            id: 133,
            name: 'Tangent',
            category: FunctoidCategory.Scientific,
            description: 'Returns the tangent of an angle (in radians)',
            minInputs: 1,
            maxInputs: 1,
            hasOutput: true,
            tooltip: 'Tangent',
            generateXslt: (inputs) => `userCSharp:MathTan(${inputs[0]})`
        });

        this.functoids.set(134, {
            id: 134,
            name: 'Natural Exponential',
            category: FunctoidCategory.Scientific,
            description: 'Returns e raised to the specified power',
            minInputs: 1,
            maxInputs: 1,
            hasOutput: true,
            tooltip: 'e^x',
            generateXslt: (inputs) => `userCSharp:MathExp(${inputs[0]})`
        });

        this.functoids.set(135, {
            id: 135,
            name: 'Natural Logarithm',
            category: FunctoidCategory.Scientific,
            description: 'Returns the natural logarithm of a number',
            minInputs: 1,
            maxInputs: 1,
            hasOutput: true,
            tooltip: 'ln(x)',
            generateXslt: (inputs) => `userCSharp:MathLog(${inputs[0]})`
        });

        this.functoids.set(136, {
            id: 136,
            name: 'Base 10 Exponential',
            category: FunctoidCategory.Scientific,
            description: 'Returns 10 raised to the specified power',
            minInputs: 1,
            maxInputs: 1,
            hasOutput: true,
            tooltip: '10^x',
            generateXslt: (inputs) => `userCSharp:MathPow10(${inputs[0]})`
        });

        this.functoids.set(137, {
            id: 137,
            name: 'Common Logarithm',
            category: FunctoidCategory.Scientific,
            description: 'Returns the base-10 logarithm of a number',
            minInputs: 1,
            maxInputs: 1,
            hasOutput: true,
            tooltip: 'log10(x)',
            generateXslt: (inputs) => `userCSharp:MathLog10(${inputs[0]})`
        });

        this.functoids.set(138, {
            id: 138,
            name: 'X^Y',
            category: FunctoidCategory.Scientific,
            description: 'Returns X raised to the power of Y',
            minInputs: 2,
            maxInputs: 2,
            hasOutput: true,
            tooltip: 'Power (x^y)',
            generateXslt: (inputs) => `userCSharp:MathPow(${inputs[0]}, ${inputs[1]})`
        });

        this.functoids.set(139, {
            id: 139,
            name: 'Base-Specified Logarithm',
            category: FunctoidCategory.Scientific,
            description: 'Returns the logarithm in a specified base',
            minInputs: 2,
            maxInputs: 2,
            hasOutput: true,
            tooltip: 'log_base(x)',
            generateXslt: (inputs) => `userCSharp:MathLogn(${inputs[0]}, ${inputs[1]})`
        });
    }
    // --- Logical Functoids (BizTalk FIDs 311-321, 374-375, 701, 705, 706) ---

    private registerLogicalFunctoids(): void {
        this.functoids.set(311, {
            id: 311,
            name: 'Greater Than',
            category: FunctoidCategory.Logical,
            description: 'Tests whether first value is greater than second',
            minInputs: 2,
            maxInputs: 2,
            hasOutput: true,
            tooltip: 'Test greater than',
            generateXslt: (inputs) => `${inputs[0]} &gt; ${inputs[1]}`
        });

        this.functoids.set(312, {
            id: 312,
            name: 'Greater Than or Equal To',
            category: FunctoidCategory.Logical,
            description: 'Tests whether first value is greater than or equal to second',
            minInputs: 2,
            maxInputs: 2,
            hasOutput: true,
            tooltip: 'Test greater than or equal',
            generateXslt: (inputs) => `${inputs[0]} &gt;= ${inputs[1]}`
        });

        this.functoids.set(313, {
            id: 313,
            name: 'Less Than',
            category: FunctoidCategory.Logical,
            description: 'Tests whether first value is less than second',
            minInputs: 2,
            maxInputs: 2,
            hasOutput: true,
            tooltip: 'Test less than',
            generateXslt: (inputs) => `${inputs[0]} &lt; ${inputs[1]}`
        });

        this.functoids.set(314, {
            id: 314,
            name: 'Less Than or Equal To',
            category: FunctoidCategory.Logical,
            description: 'Tests whether first value is less than or equal to second',
            minInputs: 2,
            maxInputs: 2,
            hasOutput: true,
            tooltip: 'Test less than or equal',
            generateXslt: (inputs) => `${inputs[0]} &lt;= ${inputs[1]}`
        });

        this.functoids.set(315, {
            id: 315,
            name: 'Equal',
            category: FunctoidCategory.Logical,
            description: 'Tests whether two values are equal',
            minInputs: 2,
            maxInputs: 2,
            hasOutput: true,
            tooltip: 'Test equality',
            generateXslt: (inputs) => `${inputs[0]} = ${inputs[1]}`
        });

        this.functoids.set(316, {
            id: 316,
            name: 'Not Equal',
            category: FunctoidCategory.Logical,
            description: 'Tests whether two values are not equal',
            minInputs: 2,
            maxInputs: 2,
            hasOutput: true,
            tooltip: 'Test inequality',
            generateXslt: (inputs) => `${inputs[0]} != ${inputs[1]}`
        });

        this.functoids.set(317, {
            id: 317,
            name: 'Logical String',
            category: FunctoidCategory.Logical,
            description: 'Tests whether input is a non-empty string',
            minInputs: 1,
            maxInputs: 1,
            hasOutput: true,
            tooltip: 'Test if input is a non-empty string',
            generateXslt: (inputs) => `string(${inputs[0]}) != ''`
        });

        this.functoids.set(318, {
            id: 318,
            name: 'Logical Date',
            category: FunctoidCategory.Logical,
            description: 'Tests whether input is a valid date',
            minInputs: 1,
            maxInputs: 1,
            hasOutput: true,
            tooltip: 'Test if input is a valid date',
            generateXslt: (inputs) => `userCSharp:LogicalIsDate(string(${inputs[0]}))`
        });

        this.functoids.set(319, {
            id: 319,
            name: 'Logical Numeric',
            category: FunctoidCategory.Logical,
            description: 'Tests whether input is a valid number',
            minInputs: 1,
            maxInputs: 1,
            hasOutput: true,
            tooltip: 'Test if input is numeric',
            generateXslt: (inputs) => `number(${inputs[0]}) = number(${inputs[0]})`
        });

        this.functoids.set(320, {
            id: 320,
            name: 'Logical OR',
            category: FunctoidCategory.Logical,
            description: 'Performs logical OR on inputs',
            minInputs: 2,
            maxInputs: 100,
            hasOutput: true,
            tooltip: 'Logical OR',
            generateXslt: (inputs) => inputs.join(' or ')
        });

        this.functoids.set(321, {
            id: 321,
            name: 'Logical AND',
            category: FunctoidCategory.Logical,
            description: 'Performs logical AND on inputs',
            minInputs: 2,
            maxInputs: 100,
            hasOutput: true,
            tooltip: 'Logical AND',
            generateXslt: (inputs) => inputs.join(' and ')
        });

        this.functoids.set(374, {
            id: 374,
            name: 'Value Mapping (Flattening)',
            category: FunctoidCategory.Logical,
            description: 'Returns value if condition is true (flattening variant)',
            minInputs: 2,
            maxInputs: 2,
            hasOutput: true,
            tooltip: 'Conditional value with flattening',
            generateXslt: (inputs) => inputs[1]
        });

        this.functoids.set(375, {
            id: 375,
            name: 'Value Mapping',
            category: FunctoidCategory.Logical,
            description: 'Returns value if condition is true',
            minInputs: 2,
            maxInputs: 2,
            hasOutput: true,
            tooltip: 'Conditional value (condition, value)',
            generateXslt: (inputs) => inputs[1],
            generateScript: (inputs) => `if (${inputs[0]}) { return ${inputs[1]}; }`
        });

        this.functoids.set(701, {
            id: 701,
            name: 'Logical Existence',
            category: FunctoidCategory.Logical,
            description: 'Returns true if the input record or field exists',
            minInputs: 1,
            maxInputs: 1,
            hasOutput: true,
            tooltip: 'Test if source node exists',
            generateXslt: (inputs) => `boolean(${inputs[0]})`
        });

        this.functoids.set(705, {
            id: 705,
            name: 'Logical NOT',
            category: FunctoidCategory.Logical,
            description: 'Performs logical NOT on input',
            minInputs: 1,
            maxInputs: 1,
            hasOutput: true,
            tooltip: 'Logical NOT',
            generateXslt: (inputs) => `not(${inputs[0]})`
        });

        this.functoids.set(706, {
            id: 706,
            name: 'IsNil',
            category: FunctoidCategory.Logical,
            description: 'Tests whether a value is nil/empty',
            minInputs: 1,
            maxInputs: 1,
            hasOutput: true,
            tooltip: 'Test for nil/empty',
            generateXslt: (inputs) => `not(${inputs[0]}) or ${inputs[0]} = ''`
        });
    }
    // --- DateTime Functoids (BizTalk FIDs 122-125) ---

    private registerDateTimeFunctoids(): void {
        this.functoids.set(122, {
            id: 122,
            name: 'Add Days',
            category: FunctoidCategory.DateTime,
            description: 'Adds days to a date',
            minInputs: 2,
            maxInputs: 2,
            hasOutput: true,
            tooltip: 'Add days to date',
            generateXslt: (inputs) => `userCSharp:AddDays(string(${inputs[0]}), string(${inputs[1]}))`
        });

        this.functoids.set(123, {
            id: 123,
            name: 'Date',
            category: FunctoidCategory.DateTime,
            description: 'Returns the current date',
            minInputs: 0,
            maxInputs: 0,
            hasOutput: true,
            tooltip: 'Get current date (yyyy-MM-dd)',
            generateXslt: () => `userCSharp:DateCurrentDate()`
        });

        this.functoids.set(124, {
            id: 124,
            name: 'Time',
            category: FunctoidCategory.DateTime,
            description: 'Returns the current time',
            minInputs: 0,
            maxInputs: 0,
            hasOutput: true,
            tooltip: 'Get current time (HH:mm:ss)',
            generateXslt: () => `userCSharp:DateCurrentTime()`
        });

        this.functoids.set(125, {
            id: 125,
            name: 'Date and Time',
            category: FunctoidCategory.DateTime,
            description: 'Returns the current date and time',
            minInputs: 0,
            maxInputs: 0,
            hasOutput: true,
            tooltip: 'Get current date and time',
            generateXslt: () => `userCSharp:DateCurrentDateTime()`
        });
    }

    // --- Conversion Functoids (BizTalk FIDs 126-129) ---

    private registerConversionFunctoids(): void {
        this.functoids.set(126, {
            id: 126,
            name: 'ASCII to Character',
            category: FunctoidCategory.Conversion,
            description: 'Converts an ASCII code to character',
            minInputs: 1,
            maxInputs: 1,
            hasOutput: true,
            tooltip: 'ASCII code to character',
            generateXslt: (inputs) => `userCSharp:ConvertChr(${inputs[0]})`
        });

        this.functoids.set(127, {
            id: 127,
            name: 'Character to ASCII',
            category: FunctoidCategory.Conversion,
            description: 'Converts a character to its ASCII code',
            minInputs: 1,
            maxInputs: 1,
            hasOutput: true,
            tooltip: 'Character to ASCII code',
            generateXslt: (inputs) => `userCSharp:ConvertAsc(string(${inputs[0]}))`
        });

        this.functoids.set(128, {
            id: 128,
            name: 'Hexadecimal',
            category: FunctoidCategory.Conversion,
            description: 'Converts a number to hexadecimal string',
            minInputs: 1,
            maxInputs: 1,
            hasOutput: true,
            tooltip: 'Convert to hex',
            generateXslt: (inputs) => `userCSharp:ConvertHex(${inputs[0]})`
        });

        this.functoids.set(129, {
            id: 129,
            name: 'Octal',
            category: FunctoidCategory.Conversion,
            description: 'Converts a number to octal string',
            minInputs: 1,
            maxInputs: 1,
            hasOutput: true,
            tooltip: 'Convert to octal',
            generateXslt: (inputs) => `userCSharp:ConvertOct(${inputs[0]})`
        });
    }
    // --- Advanced Functoids (BizTalk FIDs 260, 322-323, 376, 424, 474, 702-704, 707, 800-802) ---

    private registerAdvancedFunctoids(): void {
        this.functoids.set(260, {
            id: 260,
            name: 'Scripting',
            category: FunctoidCategory.Advanced,
            description: 'Execute inline script (C#, VB.NET, JScript, XSLT, or XSLT Call Template)',
            minInputs: 0,
            maxInputs: 100,
            hasOutput: true,
            tooltip: 'Inline C#, VB.NET, JScript, XSLT, or XSLT Call Template script',
            generateXslt: (inputs, params) => {
                if (params.length > 0) {
                    return `userCSharp:ScriptFn(${inputs.map(i => `string(${i})`).join(', ')})`;
                }
                return inputs[0] || "''";
            }
        });

        this.functoids.set(322, {
            id: 322,
            name: 'Record Count',
            category: FunctoidCategory.Advanced,
            description: 'Counts the number of repeating records',
            minInputs: 1,
            maxInputs: 1,
            hasOutput: true,
            tooltip: 'Count of repeating source records',
            generateXslt: (inputs) => `count(${inputs[0]})`
        });

        this.functoids.set(323, {
            id: 323,
            name: 'Index',
            category: FunctoidCategory.Advanced,
            description: 'Returns the value at a specific index in a repeating record',
            minInputs: 1,
            maxInputs: 100,
            hasOutput: true,
            tooltip: 'Get value at specific index in repeating record',
            generateXslt: (inputs) => `${inputs[0]}[${inputs[1]}]`
        });

        this.functoids.set(376, {
            id: 376,
            name: 'Nil Value',
            category: FunctoidCategory.Advanced,
            description: 'Sets xsi:nil="true" on the output element',
            minInputs: 0,
            maxInputs: 1,
            hasOutput: true,
            tooltip: 'Set element to xsi:nil',
            generateXslt: () => `''`
        });

        this.functoids.set(424, {
            id: 424,
            name: 'Looping',
            category: FunctoidCategory.Advanced,
            description: 'Creates a looping context for repeating records',
            minInputs: 1,
            maxInputs: 100,
            hasOutput: true,
            tooltip: 'Loop over source records to create target records',
            generateXslt: (inputs) => inputs[0] || '.'
        });

        this.functoids.set(474, {
            id: 474,
            name: 'Iteration',
            category: FunctoidCategory.Advanced,
            description: 'Returns the current iteration index (1-based) in a loop',
            minInputs: 1,
            maxInputs: 1,
            hasOutput: true,
            tooltip: 'Current loop iteration number',
            generateXslt: () => `position()`
        });

        this.functoids.set(702, {
            id: 702,
            name: 'XPath',
            category: FunctoidCategory.Advanced,
            description: 'Evaluates an XPath expression against the source document',
            minInputs: 1,
            maxInputs: 2,
            hasOutput: true,
            tooltip: 'Evaluate XPath expression',
            generateXslt: (inputs) => inputs[0] || "''"
        });

        this.functoids.set(703, {
            id: 703,
            name: 'Table Looping',
            category: FunctoidCategory.Advanced,
            description: 'Configures a table of values used for output generation',
            minInputs: 2,
            maxInputs: 100,
            hasOutput: true,
            tooltip: 'Loop with a configured table of values',
            generateXslt: (inputs) => inputs[0] || "''"
        });

        this.functoids.set(704, {
            id: 704,
            name: 'Table Extractor',
            category: FunctoidCategory.Advanced,
            description: 'Extracts a column value from a Table Looping functoid',
            minInputs: 2,
            maxInputs: 2,
            hasOutput: true,
            tooltip: 'Extract value from table column',
            generateXslt: (inputs) => inputs[0] || "''"
        });

        this.functoids.set(707, {
            id: 707,
            name: 'Assert',
            category: FunctoidCategory.Advanced,
            description: 'Validates a condition and fails the map if false',
            minInputs: 2,
            maxInputs: 3,
            hasOutput: true,
            tooltip: 'Assert condition is true or fail with message',
            generateXslt: (inputs) => inputs[0] || "''"
        });

        this.functoids.set(800, {
            id: 800,
            name: 'Key Match',
            category: FunctoidCategory.Advanced,
            description: 'Matches records by key value for cross-referencing',
            minInputs: 1,
            maxInputs: 1,
            hasOutput: true,
            tooltip: 'Match records by key',
            generateXslt: (inputs) => inputs[0] || "''"
        });

        this.functoids.set(801, {
            id: 801,
            name: 'Existence Looping',
            category: FunctoidCategory.Advanced,
            description: 'Loops when input node exists',
            minInputs: 1,
            maxInputs: 100,
            hasOutput: true,
            tooltip: 'Loop if source exists',
            generateXslt: (inputs) => inputs[0] || '.'
        });

        this.functoids.set(802, {
            id: 802,
            name: 'Mass Copy',
            category: FunctoidCategory.Advanced,
            description: 'Copies all child elements from source to target recursively',
            minInputs: 1,
            maxInputs: 1,
            hasOutput: true,
            tooltip: 'Copy entire subtree from source to destination',
            generateXslt: (inputs) => `xsl:copy-of select="${inputs[0]}"`
        });
    }
    // --- Database Functoids (BizTalk FIDs 524, 574, 575) ---

    private registerDatabaseFunctoids(): void {
        this.functoids.set(524, {
            id: 524,
            name: 'Database Lookup',
            category: FunctoidCategory.DatabaseLookup,
            description: 'Looks up a record in a database table',
            minInputs: 4,
            maxInputs: 4,
            hasOutput: true,
            tooltip: 'Lookup value in database (connection, table, column, value)',
            generateXslt: (inputs) => `userCSharp:DatabaseLookup(${inputs.map(i => `string(${i})`).join(', ')})`
        });

        this.functoids.set(574, {
            id: 574,
            name: 'Value Extractor',
            category: FunctoidCategory.DatabaseLookup,
            description: 'Extracts a column value from a Database Lookup result',
            minInputs: 2,
            maxInputs: 2,
            hasOutput: true,
            tooltip: 'Extract column value from lookup result',
            generateXslt: (inputs) => `userCSharp:ValueExtractor(${inputs.map(i => `string(${i})`).join(', ')})`
        });

        this.functoids.set(575, {
            id: 575,
            name: 'Error Return',
            category: FunctoidCategory.DatabaseLookup,
            description: 'Returns the error string from a failed Database Lookup',
            minInputs: 1,
            maxInputs: 1,
            hasOutput: true,
            tooltip: 'Get error from database lookup',
            generateXslt: (inputs) => `userCSharp:ErrorReturn(${inputs[0]})`
        });
    }

    // --- Cumulative Functoids (BizTalk FIDs 324-328) ---

    private registerCumulativeFunctoids(): void {
        this.functoids.set(324, {
            id: 324,
            name: 'Cumulative Sum',
            category: FunctoidCategory.Cumulative,
            description: 'Calculates the sum of a repeating numeric field',
            minInputs: 1,
            maxInputs: 2,
            hasOutput: true,
            tooltip: 'Sum all values of a repeating field',
            generateXslt: (inputs) => `sum(${inputs[0]})`
        });

        this.functoids.set(325, {
            id: 325,
            name: 'Cumulative Average',
            category: FunctoidCategory.Cumulative,
            description: 'Calculates the average of a repeating numeric field',
            minInputs: 1,
            maxInputs: 2,
            hasOutput: true,
            tooltip: 'Average of all values of a repeating field',
            generateXslt: (inputs) => `sum(${inputs[0]}) div count(${inputs[0]})`
        });

        this.functoids.set(326, {
            id: 326,
            name: 'Cumulative Minimum',
            category: FunctoidCategory.Cumulative,
            description: 'Finds the minimum value of a repeating numeric field',
            minInputs: 1,
            maxInputs: 2,
            hasOutput: true,
            tooltip: 'Minimum value across repeating field',
            generateXslt: (inputs) => `math:min(${inputs[0]})`
        });

        this.functoids.set(327, {
            id: 327,
            name: 'Cumulative Maximum',
            category: FunctoidCategory.Cumulative,
            description: 'Finds the maximum value of a repeating numeric field',
            minInputs: 1,
            maxInputs: 2,
            hasOutput: true,
            tooltip: 'Maximum value across repeating field',
            generateXslt: (inputs) => `math:max(${inputs[0]})`
        });

        this.functoids.set(328, {
            id: 328,
            name: 'Cumulative Concatenate',
            category: FunctoidCategory.Cumulative,
            description: 'Concatenates all values of a repeating field with a separator',
            minInputs: 1,
            maxInputs: 3,
            hasOutput: true,
            tooltip: 'Concatenate all repeating field values',
            generateXslt: (inputs) => `string-join(${inputs[0]}, ${inputs[1] || "','"})`
        });
    }
}