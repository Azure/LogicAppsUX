/**
 * Returns the item of the last element in the array where predicate is true, and undefined
 * otherwise.
 * @param array The source array to search in
 * @param predicate find calls predicate once for each element of the array, in descending
 * order, until it finds one where predicate returns true. If such an element is found,
 * findLastIndex immediately returns that element. Otherwise, findLastIndex returns undefined.
 */
export function findLast<T>(array: T[], predicate: (value: T, index: number, obj: T[]) => boolean): T | undefined {
  let l = array.length;
  while (l--) {
    if (predicate(array[l], l, array)) {
      return array[l];
    }
  }
  return undefined;
}
