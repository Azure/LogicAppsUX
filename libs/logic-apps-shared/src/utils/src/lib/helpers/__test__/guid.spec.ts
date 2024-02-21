import { guid } from '../guid';

describe('lib/helpers/guid', () => {
  it('should generate the guid in proper format', () => {
    expect(guid()).toEqual(expect.stringMatching(/[a-z|\d]{8}-[a-z|\d]{4}-[a-z|\d]{4}-[a-z|\d]{4}-[a-z|\d]{12}/i));
  });
});
