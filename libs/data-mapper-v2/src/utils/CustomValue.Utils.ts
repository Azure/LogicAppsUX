export const checkIfValueNeedsQuotes = (customValue: string): boolean => {
  // if string contains spaces treat it as a string
  if (customValue.trim().length !== customValue.length) {
    return true;
  }
  // Check if string is a number
  const parsedNumber = Number(customValue);
  if (!Number.isNaN(parsedNumber) && customValue.trim() !== '') {
    return false;
  }

  // Check if string is a boolean using literal comparison
  const lowerCaseValue = customValue.toLowerCase();
  if (lowerCaseValue === 'true' || lowerCaseValue === 'false') {
    // Convert string to actual boolean and check its type
    const boolValue = lowerCaseValue === 'true';
    if (typeof boolValue === 'boolean') {
      return false;
    }
  }

  // Check if string is a valid date
  const dateValue = new Date(customValue);
  if (
    !Number.isNaN(dateValue.getTime()) &&
    // Additional check to avoid treating numbers as dates
    !/^\d+$/.test(customValue)
  ) {
    return false;
  }
  return true;
};

export const quoteSelectedCustomValue = (customValue: string): string => {
  if (!checkIfValueNeedsQuotes(customValue)) {
    return customValue; // If it's a number, boolean, or date, return as is
  }
  return quoteString(customValue); // Otherwise, quote the string
};

const quoteString = (value: string): string => {
  // If the value is empty, return empty quotes
  if (!value) {
    return '';
  }

  // Remove any existing quotes (single or double) from beginning and end
  let cleanValue = value;

  // Check if the string is already wrapped in double quotes
  if (cleanValue.startsWith('"')) {
    cleanValue = cleanValue.substring(1, cleanValue.length);
  }

  // Check if the string is already wrapped in double quotes
  if (cleanValue.endsWith('"')) {
    cleanValue = cleanValue.substring(0, cleanValue.length - 1);
  }

  // Check if the string is wrapped in single quotes
  else if (cleanValue.startsWith("'") && cleanValue.endsWith("'")) {
    cleanValue = cleanValue.substring(1, cleanValue.length - 1);
  }

  // Escape any double quotes within the string content
  cleanValue = cleanValue.replace(/"/g, '\\"');

  // Return the string wrapped in double quotes
  return `"${cleanValue}"`;
};
