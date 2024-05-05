import { IconButton, css, useTheme } from '@fluentui/react';
import { useToggle } from '@react-hookz/web';
import { type Language, themes, Highlight } from 'prism-react-renderer';
import { useMemo, useRef, useCallback } from 'react';
import { useIntl } from 'react-intl';
import { useCopyToClipboard } from 'react-use';

export interface ColorizerProps {
  ariaLabel: string;
  code: string;
  language?: Language;
  // only used when format is 'date-time'
  utcDateTime?: string;
}

export const Colorizer: React.FC<ColorizerProps> = ({ ariaLabel, code, utcDateTime, language = 'json' }) => {
  const { isInverted } = useTheme();
  const theme = useMemo(() => (isInverted ? themes.vsDark : themes.vsLight), [isInverted]);
  const [useUtc, toggleUtc] = useToggle(false);
  const elementRef = useRef<HTMLPreElement | null>(null);
  const [_, copyToClipboard] = useCopyToClipboard();
  const selectText = useCallback(() => {
    if (!elementRef.current) {
      return;
    }
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

  const toggleLocalLabel = intl.formatMessage(
    {
      defaultMessage: `Switch ''{label}'' to the local time`,
      id: 'tooc6v',
      description: 'label for switching time format to local time',
    },
    {
      label: ariaLabel,
    }
  );
  const toggleUTCLabel = intl.formatMessage(
    {
      defaultMessage: `Switch ''{label}'' to the utc time format`,
      id: 'gNT/sd',
      description: 'label for switching time format to utc',
    },
    {
      label: ariaLabel,
    }
  );
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
      defaultMessage: `Select all text in ''{label}''`,
      id: 'ZN050N',
      description: 'Accessibility label for a button to select all text in a value box',
    },
    {
      label: ariaLabel,
    }
  );
  return (
    <div
      aria-label={ariaLabel}
      aria-readonly={true}
      className={css('msla-colorizer-wrapper', utcDateTime && 'date-time')}
      role="textbox"
      tabIndex={0}
    >
      <div className="buttons">
        {utcDateTime ? (
          <IconButton
            ariaLabel={toggleUTCLabel}
            iconProps={{ iconName: 'DateTime' }}
            onClick={toggleUtc}
            title={useUtc ? toggleUTCLabel : toggleLocalLabel}
          />
        ) : null}
        <IconButton ariaLabel={selectAria} iconProps={{ iconName: 'SelectAll' }} onClick={selectText} title={selectAria} />
        <IconButton ariaLabel={copyAria} iconProps={{ iconName: 'Copy' }} onClick={copyText} title={copyAria} />
      </div>
      <Highlight code={useUtc && utcDateTime ? utcDateTime : code} language={language} theme={theme}>
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

export type { Language };
