import renderer from 'react-test-renderer';
import { Label } from '../../label';

describe('lib/label', () => {
  it('should construct', () => {
    const tree = renderer.create(<Label text="label" />).toJSON();
    expect(tree).toMatchSnapshot();
  });

  describe('className', () => {
    it('should set the "class" attribute', () => {
      const tree = renderer.create(<Label className="class-name" text="label text" />).toJSON();
      expect(tree).toMatchSnapshot();
    });
  });

  describe('id', () => {
    it('should set the "id" attribute', () => {
      const tree = renderer.create(<Label id="label-id" text="label text" />).toJSON();
      expect(tree).toMatchSnapshot();
    });
  });

  describe('htmlFor', () => {
    it('should set the "for" attribute', () => {
      const tree = renderer.create(<Label htmlFor="an-input" text="label text" />).toJSON();
      expect(tree).toMatchSnapshot();
    });
  });

  describe('isRequiredField', () => {
    it('should render the required parameter marker if set', () => {
      const tree = renderer.create(<Label isRequiredField text="label text" />).toJSON();
      expect(tree).toMatchSnapshot();
    });
  });

  describe('tooltip', () => {
    it('should set the "title" attribute if tooltip is set', () => {
      const tree = renderer.create(<Label isRequiredField text="label text" title="title" />).toJSON();
      const text = 'label text';
    });
  });
});
