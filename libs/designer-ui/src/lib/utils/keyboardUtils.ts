import { KeyCodes } from '@fluentui/react/lib/Utilities';
import * as React from 'react';

export const isUpArrowKey = (e: React.KeyboardEvent<HTMLElement>): boolean => {
  return !!(e && e.which === KeyCodes.up);
};

export const isDownArrowKey = (e: React.KeyboardEvent<HTMLElement>): boolean => {
  return !!(e && e.which === KeyCodes.down);
};

export const hasModifier = (e: React.KeyboardEvent<HTMLElement>): boolean => {
  return !!(e && (e.altKey || e.metaKey));
};

export const isDeleteKey = (e: React.KeyboardEvent<HTMLElement>): boolean => {
  return e.which === KeyCodes.del && !e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey;
};

export const isEnterKey = (e: React.KeyboardEvent<HTMLElement>): boolean => {
  return e.which === KeyCodes.enter && !e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey;
};

export const isSpaceKey = (e: React.KeyboardEvent<HTMLElement>): boolean => {
  return e.which === KeyCodes.space && !e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey;
};

export const isEscapeKey = (e: React.KeyboardEvent<HTMLElement>): boolean => {
  return e.which === KeyCodes.escape && !e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey;
};
