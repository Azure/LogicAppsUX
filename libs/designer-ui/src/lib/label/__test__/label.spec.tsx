import * as React from 'react';
import * as ReactShallowRenderer from 'react-test-renderer/shallow';

import { Label } from '../../label';

describe('ui/label', () => {
  let renderer: ReactShallowRenderer.ShallowRenderer;

  beforeEach(() => {
    renderer = ReactShallowRenderer.createRenderer();
  });

  afterEach(() => {
    renderer.unmount();
  });

  it('should construct', () => {
    renderer.render(<Label text="label" />);

    const label = renderer.getRenderOutput();
    expect(label).toBeDefined();
  });

  describe('className', () => {
    it('should set the "class" attribute', () => {
      const className = 'class-name';
      renderer.render(<Label className={className} text="label text" />);

      const label = renderer.getRenderOutput();
      expect(label.props.className).toBe(`${className} msla-label`);
    });

    it('should set the "class" attribute to "msla-label" when className is not set', () => {
      renderer.render(<Label text="label text" />);

      const label = renderer.getRenderOutput();
      expect(label.props.className).toBe('msla-label');
    });
  });

  describe('id', () => {
    it('should set the "id" attribute', () => {
      const id = 'label-id';
      const text = 'label text';
      renderer.render(<Label id={id} text={text} />);

      const label = renderer.getRenderOutput();
      expect(label.props.id).toBe(id);
    });
  });

  describe('htmlFor', () => {
    it('should set the "for" attribute', () => {
      const htmlFor = 'anInput';
      const text = 'label text';
      renderer.render(<Label htmlFor={htmlFor} text={text} />);

      const label = renderer.getRenderOutput();
      expect(label.props.htmlFor).toBe(htmlFor);
    });

    it('should not set the "for" attribute if htmlFor is not passed', () => {
      const text = 'label text';
      renderer.render(<Label text={text} />);

      const label = renderer.getRenderOutput();
      expect(label.props.htmlFor).toBeFalsy();
    });
  });

  describe('isRequiredField', () => {
    it('should render the required parameter marker if set', () => {
      renderer.render(<Label isRequiredField text="label text" />);

      const label = renderer.getRenderOutput();
      const [requiredParameterMarker]: any[] = React.Children.toArray(label.props.children); // tslint:disable-line: no-any
      expect(requiredParameterMarker.props.isRequiredField).toBeTruthy();
    });

    it('should not render the required parameter marker if not set', () => {
      const text = 'label text';
      renderer.render(<Label text={text} />);

      const label = renderer.getRenderOutput();
      const [requiredParameterMarker]: any[] = React.Children.toArray(label.props.children); // tslint:disable-line: no-any
      expect(requiredParameterMarker.props.isRequiredField).toBeFalsy();
    });
  });

  describe('text', () => {
    it('should render text', () => {
      const text = 'label text';
      renderer.render(<Label text={text} />);

      const label = renderer.getRenderOutput();
      const [, textContent]: any[] = React.Children.toArray(label.props.children); // tslint:disable-line: no-any
      expect(textContent).toBe(text);
    });
  });

  describe('tooltip', () => {
    it('should set the "title" attribute if tooltip is set', () => {
      const text = 'label text';
      const title = 'title';
      renderer.render(<Label text={text} tooltip={title} />);

      const label = renderer.getRenderOutput();
      expect(label.props.title).toBe(title);
    });

    it('should set the "title" attribute to the text content if tooltip is not set', () => {
      const text = 'label text';
      renderer.render(<Label text={text} />);

      const label = renderer.getRenderOutput();
      expect(label.props.title).toBe(text);
    });
  });
});
