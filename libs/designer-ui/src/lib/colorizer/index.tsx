import { useTheme } from '@fluentui/react';
import Highlight, { defaultProps, type Language } from 'prism-react-renderer';
import dark from 'prism-react-renderer/themes/vsDark';
import light from 'prism-react-renderer/themes/vsLight';
import { useMemo } from 'react';

export interface ColorizerProps {
  ariaLabel: string;
  code: string;
  language?: Language;
}

export const Colorizer: React.FC<ColorizerProps> = ({ ariaLabel, code, language = 'json' }) => {
  const { isInverted } = useTheme();
  const theme = useMemo(() => (isInverted ? dark : light), [isInverted]);

  return (
    <div aria-label={ariaLabel} aria-readonly={true} className="msla-colorizer-wrapper" role="textbox" tabIndex={0}>
      <Highlight {...defaultProps} code={code} language={language} theme={theme}>
        {({ className, style, tokens, getLineProps, getTokenProps }) => (
          <pre className={className} style={style}>
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
