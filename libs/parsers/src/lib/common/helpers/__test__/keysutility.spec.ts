import * as ParameterKeyUtility from '../keysutility';

describe('Parameter Key Utility Tests', () => {
  describe('isAncestorKey', () => {
    it('should return correct result different cases', () => {
      expect(ParameterKeyUtility.isAncestorKey('body.$.attachements.[*].test', 'body.$.attachements')).toBeTruthy();
      expect(ParameterKeyUtility.isAncestorKey('body.$.attachements.[*].any.[*].test', 'body.$.attachements')).toBeTruthy();
      expect(ParameterKeyUtility.isAncestorKey('body.$.attachements123', 'body.$.attachements')).toBeFalsy();
      expect(ParameterKeyUtility.isAncestorKey('body.$.attachement.[*].test', 'body.$.attachements')).toBeFalsy();
      expect(ParameterKeyUtility.isAncestorKey('body.$.attachement.[*].test', undefined)).toBeFalsy();
    });
  });

  describe('isChildKey', () => {
    it('should return correct result different cases', () => {
      expect(ParameterKeyUtility.isChildKey('body.$.attachements', 'body.$.attachements.[*]')).toBeTruthy();
      expect(ParameterKeyUtility.isChildKey('body.$.attachements.[*]', 'body.$.attachements.[*].test')).toBeTruthy();
      expect(ParameterKeyUtility.isChildKey('body.$.[*].test.[*]', 'body.$.[*].test.[*].id')).toBeTruthy();
      expect(ParameterKeyUtility.isChildKey('body.$', 'body.$.attachements')).toBeTruthy();
      expect(ParameterKeyUtility.isChildKey('body.$.attachements123', 'body.$.attachements')).toBeFalsy();
      expect(ParameterKeyUtility.isChildKey('body.$.attachement2222', 'body.$.attachements.test')).toBeFalsy();
      expect(ParameterKeyUtility.isChildKey('body.$.attachement.[*].test', undefined)).toBeFalsy();
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
});
