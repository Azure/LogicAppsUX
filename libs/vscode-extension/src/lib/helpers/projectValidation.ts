const csharpKeywords = new Set(
  'abstract as base bool break byte case catch char checked class const continue decimal default delegate do double else enum event explicit extern false finally fixed float for foreach goto if implicit in int interface internal is lock long namespace new null object operator out override params private protected public readonly ref return sbyte sealed short sizeof stackalloc static string struct switch this throw true try typeof uint ulong unchecked unsafe ushort using virtual void volatile while'.split(
    ' '
  )
);

export const isCsharpIdentifier = (value: string): boolean => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value) && !csharpKeywords.has(value);

export const isCsharpNamespace = (value: string): boolean => typeof value === 'string' && value.split('.').every(isCsharpIdentifier);
