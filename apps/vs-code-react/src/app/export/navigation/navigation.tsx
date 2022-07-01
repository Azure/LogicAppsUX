import { ProjectRoutes } from '../../../run-service';
import { VSCodeContext } from '../../../webviewCommunication';
import { PrimaryButton } from '@fluentui/react';
import { useContext } from 'react';
import { useIntl } from 'react-intl';
import { useNavigate, useLocation } from 'react-router-dom';

export const Navigation: React.FC = () => {
  const intl = useIntl();
  const vscode = useContext(VSCodeContext);
  const navigate = useNavigate();
  const location = useLocation();

  const intlText = {
    NEXT: intl.formatMessage({
      defaultMessage: 'Next',
      description: 'Next button',
    }),
    BACK: intl.formatMessage({
      defaultMessage: 'Back',
      description: 'Back button',
    }),
    CANCEL: intl.formatMessage({
      defaultMessage: 'Cancel',
      description: 'Cancel button',
    }),
  };

  const onClickCancel = () => {
    vscode.postMessage({
      command: 'dispose',
    });
  };

  const onClickBack = () => {
    navigate(-1);
  };

  const onClickNext = () => {
    const { pathname } = location;

    switch (pathname) {
      case `/${ProjectRoutes.export}/${ProjectRoutes.instance_selection}`: {
        navigate(`/${ProjectRoutes.export}/${ProjectRoutes.selection}`);
      }
    }
  };

  const isBackDisabled = (): boolean => {
    const { pathname } = location;
    return pathname === `/${ProjectRoutes.export}/${ProjectRoutes.instance_selection}`;
  };

  return (
    <div className="msla-export-navigation-pane">
      <PrimaryButton
        className="msla-export-navigation-panel-button"
        text={intlText.CANCEL}
        ariaLabel={intlText.CANCEL}
        onClick={onClickCancel}
      />
      <PrimaryButton
        className="msla-export-navigation-panel-button"
        text={intlText.BACK}
        ariaLabel={intlText.BACK}
        onClick={onClickBack}
        disabled={isBackDisabled()}
      />
      <PrimaryButton className="msla-export-navigation-panel-button" text={intlText.NEXT} ariaLabel={intlText.NEXT} onClick={onClickNext} />
    </div>
  );
};
