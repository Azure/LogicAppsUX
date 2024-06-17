import { Button } from '@fluentui/react-components';

interface TemplatePanelFooterProps {
  primaryButtonText: string;
  primaryButtonOnClick: () => void;
  primaryButtonDisabled?: boolean;
  onClose: () => void;
}

export const TemplatePanelFooter = ({ primaryButtonText = 'Example', primaryButtonOnClick, onClose }: TemplatePanelFooterProps) => {
  return (
    <>
      <Button appearance="primary" onClick={primaryButtonOnClick}>
        {primaryButtonText}
      </Button>
      <Button appearance="outline" onClick={onClose}>
        Close
      </Button>
    </>
  );
};
