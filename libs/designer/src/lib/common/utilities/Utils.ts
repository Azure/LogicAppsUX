import toTitleCase from "to-title-case";

export const convertActionIDToTitleCase = (s: string) => {
    return toTitleCase(s.replace(/_/g, ' '));
  };