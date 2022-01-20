import {aggregate, arrayEquals, arrayEqualsOrderInsensitive, equals} from './../functions';

describe('Functions helper tests', () => {
    it('aggregate', () => {
        expect(aggregate(null)).toHaveLength(0);
        expect(aggregate([['a'], ['b']])).toHaveLength(2);
    });

    it('arrayEquals', () => {
        expect(arrayEquals(['a'], ['b', 'c'])).toBeFalsy();
        expect(arrayEquals(['a'], ['a'])).toBeTruthy();
    });

    it('arrayEqualsOrderInsensitive', () => {
        expect(arrayEqualsOrderInsensitive(['a'], ['b', 'c'])).toBeFalsy();
        expect(arrayEqualsOrderInsensitive(['a', 'b'], ['b', 'a'])).toBeTruthy();
    });

    it('equals', () => {
        expect(equals('a', 'b')).toBeFalsy();
        expect(equals('a', 'A')).toBeTruthy();
        expect(equals('a', 'a', false)).toBeTruthy();
        expect(equals('a', 'A', false)).toBeFalsy();
    });
});