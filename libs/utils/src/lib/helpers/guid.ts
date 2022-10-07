const hexValues = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F'];
const separator = '-';

/**
 * Returns a GUID such as xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx.
 *
 * @return New GUID.
 */
export function guid(): string {
  // c.f. rfc4122 (UUID version 4 = xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx)
  let oct = '',
    tmp: number;
  for (let a = 0; a < 4; a++) {
    tmp = (4294967296 * Math.random()) | 0;
    oct +=
      hexValues[tmp & 0xf] +
      hexValues[(tmp >> 4) & 0xf] +
      hexValues[(tmp >> 8) & 0xf] +
      hexValues[(tmp >> 12) & 0xf] +
      hexValues[(tmp >> 16) & 0xf] +
      hexValues[(tmp >> 20) & 0xf] +
      hexValues[(tmp >> 24) & 0xf] +
      hexValues[(tmp >> 28) & 0xf];
  }

  // 'Set the two most significant bits (bits 6 and 7) of the clock_seq_hi_and_reserved to zero and one, respectively'
  const clockSequenceHi = hexValues[(8 + Math.random() * 4) | 0];

  return (
    oct.substr(0, 8) +
    separator +
    oct.substr(9, 4) +
    separator +
    '4' +
    oct.substr(13, 3) +
    separator +
    clockSequenceHi +
    oct.substr(16, 3) +
    separator +
    oct.substr(19, 12)
  );
}

/**
 * Checks to see if the string is in the xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx.
 *
 * @return Boolean on if a string is a guid.
 */
export function isAGuid(potentialGuid: string): boolean {
  return !!potentialGuid.match('^[{]?[0-9a-fA-F]{8}-([0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}[}]?$');
}
