import { useMemo } from 'react';
import { useId } from '../../useId';
import type { ValueProps } from './types';
import { sanitizeHtmlValue } from './utils';

export const HtmlValue: React.FC<ValueProps> = (props) => {
  const id = useId('msla-html');

  const { displayName, value, visible = true } = props;
  const __html = useMemo(() => sanitizeHtmlValue(value), [value]);

  if (!visible) {
    return null;
  }

  return (
    <section className="msla-trace-value-label">
      <label className="msla-trace-value-display-name" id={id}>
        {displayName}
      </label>
      <div aria-labelledby={id} className="msla-trace-value-text msla-trace-value-html-table">
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: HTML-formatted run outputs must render as markup; the value is sanitized with DOMPurify in sanitizeHtmlValue above. */}
        <table dangerouslySetInnerHTML={{ __html }} tabIndex={0} />
      </div>
    </section>
  );
};
