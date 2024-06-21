import { DefaultButton, PrimaryButton } from '@fluentui/react';
import type { ReactNode } from 'react';

export interface TemplatePanelFooterProps {
  primaryButtonText: string | ReactNode;
  primaryButtonOnClick: () => void | Promise<void>;
  primaryButtonDisabled?: boolean;
  secondaryButtonText?: string | undefined;
  secondaryButtonOnClick?: () => void;
  secondaryButtonDisabled?: boolean;
}

export const TemplatesPanelFooter = ({
  primaryButtonText,
  primaryButtonDisabled,
  primaryButtonOnClick,
  secondaryButtonText,
  secondaryButtonOnClick,
  secondaryButtonDisabled = false,
}: TemplatePanelFooterProps) => {
  return (
    <div className="msla-templates-panel-footer">
      <PrimaryButton
        data-testid={'template-footer-primary-button'}
        data-automation-id={'template-footer-primary-button'}
        onClick={primaryButtonOnClick}
        disabled={primaryButtonDisabled}
      >
        {primaryButtonText}
      </PrimaryButton>
      {secondaryButtonText && (
        <DefaultButton
          onClick={secondaryButtonOnClick}
          style={{
            marginLeft: '8px',
          }}
          disabled={secondaryButtonDisabled}
        >
          {secondaryButtonText}
        </DefaultButton>
      )}
    </div>
  );
};
