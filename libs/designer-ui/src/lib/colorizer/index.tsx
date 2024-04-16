import { IconButton, useTheme } from '@fluentui/react';
import { type Language, themes, Highlight } from 'prism-react-renderer';
import { useMemo, useRef, useCallback } from 'react';
import { useIntl } from 'react-intl';
import { useCopyToClipboard } from 'react-use';

export interface ColorizerProps {
  ariaLabel: string;
  code: string;
  language?: Language;
}

export const Colorizer: React.FC<ColorizerProps> = ({ ariaLabel, code, language = 'json' }) => {
  const { isInverted } = useTheme();
  const theme = useMemo(() => (isInverted ? themes.vsDark : themes.vsDark), [isInverted]);
  const elementRef = useRef<HTMLPreElement | null>(null);
  const [_, copyToClipboard] = useCopyToClipboard();
  const selectText = useCallback(() => {
    if (!elementRef.current) return;
    const range = document.createRange();
    range.selectNodeContents(elementRef.current);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  }, []);
  const copyText = useCallback(() => {
    copyToClipboard(code);
  }, [code, copyToClipboard]);
  const intl = useIntl();
  const copyAria = intl.formatMessage(
    {
      defaultMessage: `Copy the value of ''{label}'' to the clipboard`,
      id: 'lA/sHA',
      description: 'Accessibility label for a button to copy all text in a value box',
    },
    {
      label: ariaLabel,
    }
  );
  const selectAria = intl.formatMessage(
    {
      defaultMessage: 'Select all text in {label}',
      id: 'WK6hZX',
      description: 'Accessibility label for a button to select all text in a value box',
    },
    {
      label: ariaLabel,
    }
  );
  return (
    <div aria-label={ariaLabel} aria-readonly={true} className="msla-colorizer-wrapper" role="textbox" tabIndex={0}>
      <div className="buttons">
        <IconButton ariaLabel={selectAria} iconProps={{ iconName: 'SelectAll' }} onClick={selectText} />
        <IconButton ariaLabel={copyAria} iconProps={{ iconName: 'Copy' }} onClick={copyText} />
      </div>
      <Highlight code={code} language={language} theme={theme}>
        {({ className, style, tokens, getLineProps, getTokenProps }) => (
          <pre ref={elementRef} className={className} style={style}>
            {tokens.map((line, i) => (
              <div key={i} {...getLineProps({ line, key: i })}>
                {line.map((token, key) => (
                  <span key={key} {...getTokenProps({ token, key })} />
                ))}
              </div>
            ))}
          </pre>
        )}
      </Highlight>
    </div>
  );
};

export { type Language };
