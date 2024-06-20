import { DefaultButton, PrimaryButton } from '@fluentui/react';
import type { ReactNode } from 'react';
import { useIntl } from 'react-intl';

export interface TemplatePanelFooterProps {
  primaryButtonText: string | ReactNode;
  primaryButtonOnClick: () => void | Promise<void>;
  primaryButtonDisabled?: boolean;
  onClose: () => void;
}

export const TemplatesPanelFooter = ({
  primaryButtonText,
  primaryButtonDisabled,
  primaryButtonOnClick,
  onClose,
}: TemplatePanelFooterProps) => {
  const intl = useIntl();
  const CLOSE = intl.formatMessage({
    defaultMessage: 'Close',
    id: 'FTrMxN',
    description: 'Button text for closing the panel',
  });

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
      <DefaultButton
        onClick={onClose}
        style={{
          marginLeft: '8px',
        }}
      >
        {CLOSE}
      </DefaultButton>
    </div>
  );
};
