import type { ValueSegment } from '@microsoft/logic-apps-shared';

// Function to check if `initialValue` contains "useSchemaEditor": true
export const checkIsSchemaEditor = (initialValue: ValueSegment[]): boolean => {
  return initialValue.some((segment) => {
    try {
      const parsedValue = JSON.parse(segment.value);
      return parsedValue?.useSchemaEditor === true;
    } catch (error) {
      return false;
    }
  });
};

// Function to add "useSchemaEditor": true if it's missing
export const addUseSchemaEditor = (value: ValueSegment[]): ValueSegment[] => {
  const updatedValue = value.map((segment) => {
    try {
      const parsedValue = JSON.parse(segment.value);
      if (parsedValue && !Object.prototype.hasOwnProperty.call(parsedValue, 'useSchemaEditor')) {
        parsedValue.useSchemaEditor = true;
        return {
          ...segment,
          value: JSON.stringify(parsedValue),
        };
      }
      return segment;
    } catch (error) {
      return segment;
    }
  });

  return updatedValue;
};
