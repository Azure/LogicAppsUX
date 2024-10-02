import { DefaultButton, PrimaryButton } from '@fluentui/react';
import type { ReactNode } from 'react';

export interface TemplatePanelFooterProps {
  primaryButtonText: string | ReactNode;
  primaryButtonOnClick: () => void | Promise<void>;
  primaryButtonDisabled?: boolean;
  secondaryButtonText: string;
  secondaryButtonOnClick: () => void;
  secondaryButtonDisabled?: boolean;
  showPrimaryButton?: boolean;
}

export const TemplatesPanelFooter = ({
  primaryButtonText,
  primaryButtonDisabled = false,
  primaryButtonOnClick,
  secondaryButtonText,
  secondaryButtonOnClick,
  secondaryButtonDisabled = false,
  showPrimaryButton = true,
}: TemplatePanelFooterProps) => {
  return (
    <div className="msla-templates-panel-footer">
      {showPrimaryButton ? (
        <PrimaryButton
          data-testid={'template-footer-primary-button'}
          data-automation-id={'template-footer-primary-button'}
          onClick={primaryButtonOnClick}
          disabled={primaryButtonDisabled}
        >
          {primaryButtonText}
        </PrimaryButton>
      ) : null}
      <DefaultButton
        onClick={secondaryButtonOnClick}
        style={{
          marginLeft: '8px',
        }}
        disabled={secondaryButtonDisabled}
      >
        {secondaryButtonText}
      </DefaultButton>
    </div>
  );
};
