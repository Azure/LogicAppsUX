import { describe, it, expect } from 'vitest';
import { sanitizeHtml } from './sanitize';

describe('sanitizeHtml - XSS prevention', () => {
  it('should strip script tags', () => {
    const result = sanitizeHtml('<script>alert("xss")</script>');
    expect(result).not.toContain('<script');
    expect(result).not.toContain('alert');
  });

  it('should strip onerror handlers from img tags', () => {
    const result = sanitizeHtml('<img src=x onerror="alert(1)">');
    expect(result).not.toContain('onerror');
  });

  it('should strip javascript: URLs from links', () => {
    const result = sanitizeHtml('<a href="javascript:alert(1)">click</a>');
    expect(result).not.toContain('javascript:');
  });

  it('should strip SVG onload handlers', () => {
    const result = sanitizeHtml('<svg onload="alert(1)">');
    expect(result).not.toContain('onload');
    expect(result).not.toContain('<svg');
  });

  it('should strip iframe injection', () => {
    const result = sanitizeHtml('<iframe src="javascript:alert(1)"></iframe>');
    expect(result).not.toContain('<iframe');
  });

  it('should strip event handlers from HTML5 elements', () => {
    const result = sanitizeHtml('<details open ontoggle="alert(1)">test</details>');
    expect(result).not.toContain('ontoggle');
  });

  it('should strip nested XSS in markdown-like HTML', () => {
    const result = sanitizeHtml('<p>Hello <img src=x onerror="alert(document.cookie)"> world</p>');
    expect(result).not.toContain('onerror');
    expect(result).toContain('Hello');
    expect(result).toContain('world');
  });

  it('should preserve safe HTML formatting', () => {
    const result = sanitizeHtml('<strong>bold</strong> and <em>italic</em> and <code>code</code>');
    expect(result).toContain('<strong>bold</strong>');
    expect(result).toContain('<em>italic</em>');
    expect(result).toContain('<code>code</code>');
  });

  it('should preserve safe links', () => {
    const result = sanitizeHtml('<a href="https://example.com">link</a>');
    expect(result).toContain('href="https://example.com"');
    expect(result).toContain('link');
  });

  it('should preserve safe images', () => {
    const result = sanitizeHtml('<img src="https://example.com/img.png" alt="photo">');
    expect(result).toContain('src="https://example.com/img.png"');
    expect(result).toContain('alt="photo"');
  });

  it('should preserve code blocks', () => {
    const result = sanitizeHtml('<pre><code class="language-js">const x = 1;</code></pre>');
    expect(result).toContain('<pre>');
    expect(result).toContain('<code');
    expect(result).toContain('const x = 1;');
  });

  it('should preserve tables', () => {
    const result = sanitizeHtml('<table><thead><tr><th>Col</th></tr></thead><tbody><tr><td>Val</td></tr></tbody></table>');
    expect(result).toContain('<table>');
    expect(result).toContain('<th>Col</th>');
    expect(result).toContain('<td>Val</td>');
  });

  it('should handle data: URLs in image src safely', () => {
    // data:text/html in img src is not executable by browsers - DOMPurify keeps it
    // but the script tag text is just part of the URL attribute, not a DOM element
    const result = sanitizeHtml('<img src="data:text/html,<script>alert(1)</script>">');
    expect(result).toContain('<img');
    // Actual script tags in DOM context ARE stripped
    const result2 = sanitizeHtml('<script>alert(1)</script><img src="safe.png">');
    expect(result2).not.toContain('<script');
    expect(result2).toContain('<img');
  });

  it('should handle empty input', () => {
    expect(sanitizeHtml('')).toBe('');
  });
});
