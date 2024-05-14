import * as React from 'react';
import { describe, beforeEach, it, expect } from 'vitest';
import { LargeText, MediumText, SmallText, TextProps, XLargeText, XXLargeText } from '../index';
import renderer from 'react-test-renderer';

describe('libs/designer-ui/text', () => {
  let minimal: TextProps;

  beforeEach(() => {
    minimal = {
      text: 'Hello Logic Apps',
      className: 'text-classname-test',
    };
  });

  it('Should render a MediumText component without styles and classnames', () => {
    const textComponent = <MediumText text={'Hello Logic Apps'} />;
    const renderedComponent = renderer.create(textComponent).toJSON();
    expect(renderedComponent).toMatchSnapshot();
  });

  it('Should render a MediumText component with a specific style display block and a border of 1px red solid', () => {
    const textComponent = <MediumText {...minimal} style={{ display: 'block', border: '1px red solid' }} />;
    const renderedComponent = renderer.create(textComponent).toJSON();
    expect(renderedComponent).toMatchSnapshot();
  });

  it('Should render a XXLargeText component', () => {
    const textComponent = <XXLargeText {...minimal} />;
    const renderedComponent = renderer.create(textComponent).toJSON();
    expect(renderedComponent).toMatchSnapshot();
  });

  it('Should render a XLargeText component', () => {
    const textComponent = <XLargeText {...minimal} />;
    const renderedComponent = renderer.create(textComponent).toJSON();
    expect(renderedComponent).toMatchSnapshot();
  });

  it('Should render a LargeText component', () => {
    const textComponent = <LargeText {...minimal} />;
    const renderedComponent = renderer.create(textComponent).toJSON();
    expect(renderedComponent).toMatchSnapshot();
  });

  it('Should render a MediumText component', () => {
    const textComponent = <MediumText {...minimal} />;
    const renderedComponent = renderer.create(textComponent).toJSON();
    expect(renderedComponent).toMatchSnapshot();
  });

  it('Should render a SmallText component', () => {
    const textComponent = <SmallText {...minimal} />;
    const renderedComponent = renderer.create(textComponent).toJSON();
    expect(renderedComponent).toMatchSnapshot();
  });
});
