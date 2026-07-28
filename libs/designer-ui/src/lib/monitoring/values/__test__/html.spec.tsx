/**
 * @vitest-environment jsdom
 *
 * HtmlValue sanitizes its value with DOMPurify. DOMPurify >= 3.4.11 is incompatible with
 * happy-dom (sanitize() strips the outermost element), so this file runs under jsdom to
 * match production behavior. See the same note in
 * src/lib/html/plugins/toolbar/helper/__test__/util.spec.ts.
 */
import * as React from 'react';
import * as ReactShallowRenderer from 'react-test-renderer/shallow';
import { HtmlValue } from '../html';
import type { ValueProps } from '../types';
import { sanitizeHtmlValue } from '../utils';
import { describe, vi, beforeEach, afterEach, beforeAll, afterAll, it, test, expect } from 'vitest';
describe('ui/monitoring/values/_html', () => {
  const classNames = {
    displayName: 'msla-trace-value-display-name',
    htmlTable: 'msla-trace-value-html-table',
    label: 'msla-trace-value-label',
    text: 'msla-trace-value-text',
  };

  let props: ValueProps, renderer: ReactShallowRenderer.ShallowRenderer;

  beforeEach(() => {
    props = {
      displayName: 'display-name',
      value: '<table><tbody><tr><td>1</td></tr></tbody></table>',
    };
    renderer = ReactShallowRenderer.createRenderer();
  });

  afterEach(() => {
    renderer.unmount();
  });

  it('should render', () => {
    renderer.render(<HtmlValue {...props} />);

    const section = renderer.getRenderOutput();
    expect(section.props.className).toBe(classNames.label);

    const [displayName, text]: any[] = React.Children.toArray(section.props.children);
    expect(displayName.props.className).toBe(classNames.displayName);
    expect(displayName.props.children).toBe(props.displayName);
    expect(text.props['aria-labelledby']).toBe(displayName.props.id);
    expect(text.props.className.split(' ')).toEqual(expect.arrayContaining([classNames.text, classNames.htmlTable]));

    const table = React.Children.only(text.props.children);
    expect(table.props.dangerouslySetInnerHTML).toEqual(
      expect.objectContaining({
        __html: props.value,
      })
    );
  });

  it('should not render when not visible', () => {
    renderer.render(<HtmlValue {...props} visible={false} />);

    const section = renderer.getRenderOutput();
    expect(section).toBeNull();
  });

  it('should strip script tags from the rendered value', () => {
    renderer.render(<HtmlValue {...props} value={'<table><tbody><tr><td>1<script>alert(1)</script></td></tr></tbody></table>'} />);

    const section = renderer.getRenderOutput();
    const [, text]: any[] = React.Children.toArray(section.props.children);
    const table = React.Children.only(text.props.children);

    expect(table.props.dangerouslySetInnerHTML.__html).not.toContain('<script');
    expect(table.props.dangerouslySetInnerHTML.__html).not.toContain('alert(1)');
    expect(table.props.dangerouslySetInnerHTML.__html).toContain('<td>1</td>');
  });

  it('should strip inline event handlers from the rendered value', () => {
    renderer.render(<HtmlValue {...props} value={'<table><tbody><tr><td><img src="x" onerror="alert(1)"></td></tr></tbody></table>'} />);

    const section = renderer.getRenderOutput();
    const [, text]: any[] = React.Children.toArray(section.props.children);
    const table = React.Children.only(text.props.children);

    expect(table.props.dangerouslySetInnerHTML.__html).not.toContain('onerror');
  });

  describe('sanitizeHtmlValue', () => {
    it.each([
      ['<script>alert(1)</script>', 'script'],
      ['<iframe src="https://evil.example"></iframe>', 'iframe'],
      ['<object data="x"></object>', 'object'],
      ['<embed src="x">', 'embed'],
    ])('strips the dangerous tag in %s', (value, tagName) => {
      expect(sanitizeHtmlValue(value)).not.toContain(`<${tagName}`);
    });

    it.each([
      '<img src="x" onerror="alert(1)">',
      '<div onclick="alert(1)">text</div>',
      '<body onload="alert(1)">text</body>',
      '<svg><animate onbegin="alert(1)" /></svg>',
    ])('strips inline event handlers in %s', (value) => {
      const sanitized = sanitizeHtmlValue(value);
      expect(sanitized).not.toMatch(/\son[a-z]+=/i);
      expect(sanitized).not.toContain('alert(1)');
    });

    it('strips javascript: URLs', () => {
      const sanitized = sanitizeHtmlValue('<a href="javascript:alert(1)">link</a>');
      expect(sanitized).not.toContain('javascript:');
    });

    it('preserves table markup used by HTML-formatted outputs', () => {
      const value =
        '<table border="1"><thead><tr><th align="left">Name</th></tr></thead><tbody><tr><td colspan="2">Contoso</td></tr></tbody></table>';
      expect(sanitizeHtmlValue(value)).toBe(value);
    });

    it('preserves common text formatting and safe links', () => {
      const value = '<p><strong>bold</strong> <em>italic</em> <a href="https://contoso.com" target="_blank">link</a></p>';
      expect(sanitizeHtmlValue(value)).toBe(value);
    });

    it.each([[undefined], [null], [42], [{}]])('returns an empty string for the non-string value %s', (value) => {
      expect(sanitizeHtmlValue(value)).toBe('');
    });
  });
});
