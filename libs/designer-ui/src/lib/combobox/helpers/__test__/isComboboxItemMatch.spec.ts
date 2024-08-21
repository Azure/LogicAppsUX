import { describe, vi, beforeEach, afterEach, beforeAll, afterAll, it, test, expect } from 'vitest';
import { ComboboxItem } from '../../..';
import { isComboboxItemMatch } from '../isComboboxItemMatch';

describe('lib/combobox/helpers/isComboboxItemMatch', () => {
  test.each<[string, Partial<ComboboxItem>, boolean]>([
    ['', { displayName: '' }, true],
    ['', { displayName: 'My Special SharePoint Site' }, true],
    ['My', { displayName: 'My Special SharePoint Site' }, true],
    ['my', { displayName: 'My Special SharePoint Site' }, true],
    ['my special', { displayName: 'My Special SharePoint Site' }, true],
    [' ', { displayName: 'My Special SharePoint Site' }, true],
    ['sharepoint', { displayName: 'My Special SharePoint Site' }, true],
    ['SHAREPOINT', { displayName: 'My Special SharePoint Site' }, true],
    ['MY SPECIAL SHAREPOINT SITE', { displayName: 'My Special SharePoint Site' }, true],
    ['My Special Share\\Point Site', { displayName: 'My Special SharePoint Site' }, true],
    ['My Special Share\\\\\\\\\\\\\\\\\\\\Point Site', { displayName: 'My Special SharePoint Site' }, true],
    ['[', { displayName: 'My [] Site' }, true],
    ['foo', { displayName: 'My Special SharePoint Site' }, false],
    ['bar', { displayName: 'My Special SharePoint Site' }, false],
    ['sharePPoint', { displayName: 'My Special SharePoint Site' }, false],
    ['mySpecial', { displayName: 'My Special SharePoint Site' }, false],
    ['[', { displayName: 'My Special SharePoint Site' }, false],
  ])('indicates that "%s" filter matching against %o indicates %s', (searchValue, item, expected) => {
    expect(isComboboxItemMatch(item as ComboboxItem, searchValue)).toBe(expected);
  });
});
