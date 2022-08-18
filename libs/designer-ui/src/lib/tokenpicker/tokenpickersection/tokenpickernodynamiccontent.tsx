import constants from '../../constants';
import { Link } from '@fluentui/react/lib/Link';
import { useIntl } from 'react-intl';

export const TokenPickerNoDynamicContent = () => {
  const intl = useIntl();

  const intlText = {
    TOKEN_PICKER_NO_DYNAMIC_CONTENT_HEADER: intl.formatMessage({
      defaultMessage: 'No dynamic content available',
      description: 'Header for no dynamic content available card section',
    }),
    TOKEN_PICKER_NO_DYNAMIC_CONTENT_TEXT: intl.formatMessage({
      defaultMessage: 'There is no content available',
      description: 'No dynamic content available description',
    }),
    TOKEN_PICKER_INCLUDING_DYNAMIC_CONTENT_HEADER: intl.formatMessage({
      defaultMessage: 'Including dynamic content',
      description: 'Header for including dynamic content section',
    }),
    TOKEN_PICKER_INCLUDING_DYNAMIC_CONTENT_TEXT1: intl.formatMessage({
      defaultMessage: 'If available, dynamic content is automatically generated from the connectors and actions you choose for your flow.',
      description: 'Section 1 of text for including dynamic content section',
    }),
    TOKEN_PICKER_INCLUDING_DYNAMIC_CONTENT_TEXT2: intl.formatMessage({
      defaultMessage: 'Dynamic content may also be added from other sources.',
      description: 'Section 2 of text for including dynamic content section',
    }),
    TOKEN_PICKER_DYNAMIC_CONTENT_LINK_TEXT: intl.formatMessage({
      defaultMessage: 'Learn more about dynamic content.',
      description: 'Text for dynamic content link',
    }),
    TOKEN_PICKER_EMPTY_DYNAMIC_CONTENT_ICON_ALT_TEXT: intl.formatMessage({
      defaultMessage: 'Empty add dynamic content button',
      description: 'Alt text for empty dynamic content icon',
    }),
  };

  return (
    <div className="msla-token-picker-no-content">
      <div className="msla-token-picker-no-content-header">
        <span>{intlText.TOKEN_PICKER_NO_DYNAMIC_CONTENT_HEADER}</span>
      </div>
      <div>
        <img
          src="data:image/svg+xml;base64,PHN2ZyBpZD0iTGF5ZXJfMSIgZGF0YS1uYW1lPSJMYXllciAxIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxNiAxMyI+PGRlZnM+PHN0eWxlPi5jbHMtMXtmaWxsOiMwMDU4YWQ7fTwvc3R5bGU+PC9kZWZzPjx0aXRsZT5keW5hbWljIGNvbnRlbnQ8L3RpdGxlPjxwYXRoIGNsYXNzPSJjbHMtMSIgZD0iTTM2LDEuNXYxM0g1MlYxLjVIMzZabTEsMTJWMi41SDQ4djExSDM3Wm0xNCwwSDQ5VjIuNWgydjExWiIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoLTM2IC0xLjUpIi8+PHBvbHlnb24gY2xhc3M9ImNscy0xIiBwb2ludHM9IjkgNiA3IDYgNyA0IDYgNCA2IDYgNCA2IDQgNyA2IDcgNiA5IDcgOSA3IDcgOSA3IDkgNiIvPjwvc3ZnPg=="
          height="13"
          alt={intlText.TOKEN_PICKER_EMPTY_DYNAMIC_CONTENT_ICON_ALT_TEXT}
        />
        <span>{intlText.TOKEN_PICKER_NO_DYNAMIC_CONTENT_TEXT}</span>
      </div>
      <hr />
      <div className="msla-token-picker-no-content-header">
        <span>{intlText.TOKEN_PICKER_INCLUDING_DYNAMIC_CONTENT_HEADER}</span>
      </div>
      <div>
        <div>
          <span>{intlText.TOKEN_PICKER_INCLUDING_DYNAMIC_CONTENT_TEXT1}</span>
        </div>
        <br />
        <span>{intlText.TOKEN_PICKER_INCLUDING_DYNAMIC_CONTENT_TEXT2}</span>
        <br />
        <Link href={constants.TOKEN_PICKER_INCLUDING_DYNAMIC_CONTENT_LEARN_MORE_URL} target="_blank" rel="noopener">
          {intlText.TOKEN_PICKER_DYNAMIC_CONTENT_LINK_TEXT}
        </Link>
      </div>
    </div>
  );
};
