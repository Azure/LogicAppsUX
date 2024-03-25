import { useId } from '../../useId';
import type { ValueProps } from './types';

export const HtmlValue: React.FC<ValueProps> = (props) => {
  const id = useId('msla-html');

  const { displayName, value: __html, visible = true } = props;
  if (!visible) {
    return null;
  }

  return (
    <section className="msla-trace-value-label">
      <label className="msla-trace-value-display-name" id={id}>
        {displayName}
      </label>
      <div aria-labelledby={id} className="msla-trace-value-text msla-trace-value-html-table">
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: This is needed in this case but we should investigate other ways of doing it */}
        <table dangerouslySetInnerHTML={{ __html }} tabIndex={0}></table>
      </div>
    </section>
  );
};
