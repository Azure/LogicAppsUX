/* eslint-disable no-param-reassign */
import { isNullOrUndefined } from '../../../../utils/src';

const _separator = '.';
const _subSegmentSeparator = '/';

const _escapeCharacter = '~';
const _encodedEscapeCharacter = '~0';

// Note: All characters added here should be able to generate the correct
// decoded string using the replaceCharacter method.
const _codeBook = [
  ['.', '~1'],
  ['[', '~2'],
  ['*', '~3'],
  ['?', '~4'],
];

export const WildIndexSegment = '[*]';

export const SegmentType = {
  Property: 0,
  Index: 1,
} as const;
export type SegmentType = (typeof SegmentType)[keyof typeof SegmentType];

export interface Segment {
  type: SegmentType;
  value: string | number | undefined;
}

export function getValue(key: string, prefix: string, data?: any): any {
  const segments = parseEx(key);
  let skip = parseEx(prefix).length;
  for (const segment of segments) {
    if (skip-- > 0) {
      continue;
    }
    if (typeof data === 'object' && typeof segment.value === 'string') {
      data = data[segment.value];
    } else {
      return undefined;
    }
  }

  return data;
}

export function create(segments: string[] | null | undefined): string | undefined {
  if (isNullOrUndefined(segments)) {
    return undefined;
  }

  return segments.map(encodePropertySegment).join(_separator);
}

export function createEx(segments: Segment[] | null | undefined): string | undefined {
  if (isNullOrUndefined(segments)) {
    return undefined;
  }

  return segments.map(_encodeSegment).join(_separator);
}

export function parseEx(key: string | null | undefined): Segment[] {
  if (isNullOrUndefined(key)) {
    return [];
  }

  return key.split(_separator).map(_decodeSegment);
}

export function splitEx(key: string | null | undefined): string[] {
  if (isNullOrUndefined(key)) {
    return [];
  }

  return key.split(_separator);
}

export function encodePropertySegment(segment: string): string {
  segment = _replaceCharacter(segment, _escapeCharacter, _encodedEscapeCharacter);
  _codeBook.forEach((entry) => {
    segment = _replaceCharacter(segment, entry[0], entry[1]);
  });
  return segment;
}

export function expandAndEncodePropertySegment(segment: string): string {
  const expandedSegments: string[] = [];
  const subSegments = segment.split(_subSegmentSeparator);

  for (let i = 0; i < subSegments.length; i++) {
    expandedSegments.push(encodePropertySegment(subSegments.slice(0, i + 1).join(_subSegmentSeparator)));
  }

  return expandedSegments.join(_separator);
}

export function replaceSubsegmentSeparator(key: string): string {
  return key.replace(new RegExp(`\\${_subSegmentSeparator}`, 'g'), _separator);
}

export function isAncestorKey(key: string, testAncestorKey: string | undefined): boolean {
  const segments = parseEx(key);
  if (testAncestorKey !== undefined) {
    const testAncestorSegments = parseEx(testAncestorKey);
    if (testAncestorSegments.length < segments.length) {
      for (let i = 0; i < testAncestorSegments.length; i++) {
        if (testAncestorSegments[i].type !== segments[i].type || testAncestorSegments[i].value !== segments[i].value) {
          return false;
        }
      }

      return true;
    }
  }

  return false;
}

export function isChildKey(key: string, testChildKey: string | undefined): boolean {
  const segments = parseEx(key);
  if (testChildKey !== undefined) {
    const testChildSegments = parseEx(testChildKey);
    if (testChildSegments.length === segments.length + 1) {
      for (let i = 0; i < segments.length; i++) {
        if (testChildSegments[i].type !== segments[i].type || testChildSegments[i].value !== segments[i].value) {
          return false;
        }
      }

      return true;
    }
  }

  return false;
}

export function decodePropertySegment(segment: string): string {
  _codeBook.forEach((entry) => {
    segment = _replaceCharacter(segment, entry[1], entry[0]);
  });
  return _replaceCharacter(segment, _encodedEscapeCharacter, _escapeCharacter);
}

export function containsWildIndexSegment(key: string): boolean {
  return key.split(_separator).filter(_isWildIndexSegment).length > 0;
}

export function cleanIndexedValue(key: string): string {
  const segments = parseEx(key);
  for (const segment of segments) {
    if (segment.type === SegmentType.Index) {
      segment.value = undefined;
    }
  }

  return createEx(segments) as string;
}

function _decodeSegment(segment: string): Segment {
  if (_isIndexSegment(segment)) {
    return {
      type: SegmentType.Index,
      value: segment === WildIndexSegment ? undefined : Number.parseInt(segment.substring(1, segment.length - 1), 10),
    };
  }
  _codeBook.forEach((entry) => {
    segment = _replaceCharacter(segment, entry[1], entry[0]);
  });
  const literalSegment = _replaceCharacter(segment, _encodedEscapeCharacter, _escapeCharacter);
  return {
    type: SegmentType.Property,
    value: literalSegment,
  };
}

function _encodeSegment(segment: Segment): string {
  if (segment.type === SegmentType.Property) {
    return encodePropertySegment(segment.value as string);
  }
  return segment.value !== undefined ? `[${segment.value}]` : WildIndexSegment;
}

function _isWildIndexSegment(segment: string): boolean {
  return segment === WildIndexSegment;
}

function _isIndexSegment(segment: string): boolean {
  return segment.length > 2 && segment[0] === '[' && segment[segment.length - 1] === ']';
}

// Note: All characted used in this function should be correctly replaced to the intended character,
// after applying the regex with escaping using \\.
function _replaceCharacter(value: string, charToReplace: string, replacedChar: string): string {
  return value.replace(new RegExp(`\\${charToReplace}`, 'g'), replacedChar);
}
