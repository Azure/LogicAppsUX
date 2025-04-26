import { Button, Divider } from '@fluentui/react-components';
import type { ReactNode } from 'react';

export interface TemplatePanelFooterProps {
  primaryButtonText: string | ReactNode;
  primaryButtonOnClick: () => void | Promise<void>;
  primaryButtonDisabled?: boolean;
  showPrimaryButton?: boolean;

  secondaryButtonText: string;
  secondaryButtonOnClick: () => void;
  secondaryButtonDisabled?: boolean;

  thirdButtonText?: string;
  thirdButtonOnClick?: () => void;
  thirdButtonDisabled?: boolean;
}

export const TemplatesPanelFooter = ({
  primaryButtonText,
  primaryButtonDisabled = false,
  primaryButtonOnClick,
  showPrimaryButton = true,

  secondaryButtonText,
  secondaryButtonOnClick,
  secondaryButtonDisabled = false,

  thirdButtonText,
  thirdButtonOnClick = () => {},
  thirdButtonDisabled,
}: TemplatePanelFooterProps) => {
  return (
    <div className="msla-templates-panel-footer">
      {showPrimaryButton ? (
        <Button
          appearance="primary"
          data-testid={'template-footer-primary-button'}
          data-automation-id={'template-footer-primary-button'}
          onClick={primaryButtonOnClick}
          disabled={primaryButtonDisabled}
        >
          {primaryButtonText}
        </Button>
      ) : null}

      <Button
        onClick={secondaryButtonOnClick}
        style={{
          marginLeft: showPrimaryButton ? '8px' : undefined,
        }}
        disabled={secondaryButtonDisabled}
      >
        {secondaryButtonText}
      </Button>

      {thirdButtonText ? (
        <Divider
          vertical={true}
          style={{
            display: 'inline-block', // Important
            height: '100%',
            paddingLeft: '8px',
          }}
        />
      ) : null}

      {thirdButtonText ? (
        <Button appearance="subtle" disabled={thirdButtonDisabled} onClick={thirdButtonOnClick} style={{ marginLeft: '8px' }}>
          {thirdButtonText}
        </Button>
      ) : null}
    </div>
  );
};
