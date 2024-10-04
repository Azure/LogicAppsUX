import { OutputSource } from '../../constants';
import * as ParameterKeyUtility from '../keysutility';
import { describe, vi, beforeEach, afterEach, beforeAll, afterAll, it, test, expect } from 'vitest';
import { Segment, isBodySegment } from '../keysutility';
describe('Parameter Key Utility Tests', () => {
  describe('isAncestorKey', () => {
    it('should return correct result different cases', () => {
      expect(ParameterKeyUtility.isAncestorKey('body.$.attachments.[*].test', 'body.$.attachments')).toBeTruthy();
      expect(ParameterKeyUtility.isAncestorKey('body.$.attachments.[*].any.[*].test', 'body.$.attachments')).toBeTruthy();
      expect(ParameterKeyUtility.isAncestorKey('body.$.attachments123', 'body.$.attachments')).toBeFalsy();
      expect(ParameterKeyUtility.isAncestorKey('body.$.attachment.[*].test', 'body.$.attachments')).toBeFalsy();
      expect(ParameterKeyUtility.isAncestorKey('body.$.attachment.[*].test', undefined)).toBeFalsy();
    });
  });

  describe('isChildKey', () => {
    it('should return correct result different cases', () => {
      expect(ParameterKeyUtility.isChildKey('body.$.attachments', 'body.$.attachments.[*]')).toBeTruthy();
      expect(ParameterKeyUtility.isChildKey('body.$.attachments.[*]', 'body.$.attachments.[*].test')).toBeTruthy();
      expect(ParameterKeyUtility.isChildKey('body.$.[*].test.[*]', 'body.$.[*].test.[*].id')).toBeTruthy();
      expect(ParameterKeyUtility.isChildKey('body.$', 'body.$.attachments')).toBeTruthy();
      expect(ParameterKeyUtility.isChildKey('body.$.attachments123', 'body.$.attachments')).toBeFalsy();
      expect(ParameterKeyUtility.isChildKey('body.$.attachment2222', 'body.$.attachments.test')).toBeFalsy();
      expect(ParameterKeyUtility.isChildKey('body.$.attachment.[*].test', undefined)).toBeFalsy();
    });
  });

  describe('parseEx', () => {
    it('should return correct result if the value is undefined', () => {
      expect(ParameterKeyUtility.parseEx(undefined)).toEqual([]);
    });

    it('should return correct result if the value contains index type', () => {
      expect(ParameterKeyUtility.parseEx('body.$.[123]')).toEqual(
        expect.arrayContaining([
          {
            type: ParameterKeyUtility.SegmentType.Property,
            value: 'body',
          },
          {
            type: ParameterKeyUtility.SegmentType.Property,
            value: '$',
          },
          {
            type: ParameterKeyUtility.SegmentType.Index,
            value: 123,
          },
        ])
      );

      expect(ParameterKeyUtility.parseEx('body.$.[2].[*]')).toEqual(
        expect.arrayContaining([
          {
            type: ParameterKeyUtility.SegmentType.Property,
            value: 'body',
          },
          {
            type: ParameterKeyUtility.SegmentType.Property,
            value: '$',
          },
          {
            type: ParameterKeyUtility.SegmentType.Index,
            value: 2,
          },
          {
            type: ParameterKeyUtility.SegmentType.Index,
            value: undefined,
          },
        ])
      );
    });
  });

  describe('create', () => {
    it('should return correct result if the value is undefined', () => {
      expect(ParameterKeyUtility.create(undefined)).toBeUndefined();
    });
  });

  describe('createEx', () => {
    it('should return correct result if the value is undefined', () => {
      expect(ParameterKeyUtility.createEx(undefined)).toBeUndefined();
    });
  });

  describe('expandAndEncodePropertySegment', () => {
    it.each([
      ['', ''],
      ['body', 'body'],
      ['body.foo', 'body~1foo'],
      ['body/foo', 'body.body/foo'],
      ['body/foo/Bar', 'body.body/foo.body/foo/Bar'],
    ])('"%s" evaluates to "%s"', (input, expected) => {
      expect(ParameterKeyUtility.expandAndEncodePropertySegment(input)).toBe(expected);
    });
  });

  describe('isBodySegment', () => {
    it('should return true when segment value is Body', () => {
      const segment: Segment = {
        value: OutputSource.Body,
        type: 1,
      };
      expect(isBodySegment(segment)).toBe(true);
    });

    it('should return false when segment value is not Body', () => {
      const segment: Segment = {
        value: 'NotBody',
        type: 0,
      };
      expect(isBodySegment(segment)).toBe(false);
    });

    it('should return false when segment is undefined', () => {
      expect(isBodySegment(undefined)).toBe(false);
    });
  });
});
