export const hasModifier = (e: React.KeyboardEvent<HTMLElement>): boolean => {
  return !!(e?.altKey || e?.metaKey);
};

export const isKey = (e: React.KeyboardEvent<HTMLElement>, key: string): boolean => {
  return e.key === key;
};

//

export const isUpArrowKey = (e: React.KeyboardEvent<HTMLElement>): boolean => {
  return !!(e.key === 'ArrowUp');
};

export const isDownArrowKey = (e: React.KeyboardEvent<HTMLElement>): boolean => {
  return !!(e.key === 'ArrowDown');
};

export const isDeleteKey = (e: React.KeyboardEvent<HTMLElement>): boolean => {
  return e.key === 'Delete';
};

export const isEnterKey = (e: React.KeyboardEvent<HTMLElement>): boolean => {
  return e.key === 'Enter';
};

export const isSpaceKey = (e: React.KeyboardEvent<HTMLElement>): boolean => {
  return e.key === ' ';
};

export const isEscapeKey = (e: React.KeyboardEvent<HTMLElement>): boolean => {
  return e.key === 'Escape';
};
