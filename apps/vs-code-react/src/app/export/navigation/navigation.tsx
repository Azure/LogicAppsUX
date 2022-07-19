import { ExtensionCommand, RouteName, ValidationStatus } from '../../../run-service';
import type { RootState } from '../../../state/store';
import type { InitializedVscodeState } from '../../../state/vscodeSlice';
import { VSCodeContext } from '../../../webviewCommunication';
import { PrimaryButton } from '@fluentui/react';
import { useContext } from 'react';
import { useIntl } from 'react-intl';
import { useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';

export const Navigation: React.FC = () => {
  const intl = useIntl();
  const vscode = useContext(VSCodeContext);
  const navigate = useNavigate();
  const location = useLocation();

  const vscodeState = useSelector((state: RootState) => state.vscode);
  const { exportData } = vscodeState as InitializedVscodeState;
  const { selectedSubscription, selectedIse, selectedWorkflows, validationState, exportPath } = exportData;

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
    EXPORT: intl.formatMessage({
      defaultMessage: 'Export',
      description: 'Export button',
    }),
    EXPORT_WITH_WARNINGS: intl.formatMessage({
      defaultMessage: 'Export with warnings',
      description: 'Export with warnings button',
    }),
    FINISH: intl.formatMessage({
      defaultMessage: 'finish',
      description: 'Finish  button',
    }),
  };

  const onClickCancel = () => {
    vscode.postMessage({
      command: ExtensionCommand.dispose,
    });
  };

  const onClickBack = () => {
    navigate(-1);
  };

  const onClickNext = () => {
    const { pathname } = location;

    switch (pathname) {
      case `/${RouteName.export}/${RouteName.instance_selection}`: {
        navigate(`/${RouteName.export}/${RouteName.workflows_selection}`);
        break;
      }
      case `/${RouteName.export}/${RouteName.workflows_selection}`: {
        navigate(`/${RouteName.export}/${RouteName.validation}`);
        break;
      }
      case `/${RouteName.export}/${RouteName.validation}`: {
        navigate(`/${RouteName.export}/${RouteName.summary}`);
        break;
      }
    }
  };

  const isBackDisabled = (): boolean => {
    const { pathname } = location;
    return pathname === `/${RouteName.export}/${RouteName.instance_selection}`;
  };

  const isNextDisabled = (): boolean => {
    const { pathname } = location;

    switch (pathname) {
      case `/${RouteName.export}/${RouteName.instance_selection}`: {
        return selectedSubscription === '' || selectedIse === '';
      }
      case `/${RouteName.export}/${RouteName.workflows_selection}`: {
        return selectedSubscription === '' || selectedIse === '' || selectedWorkflows.length === 0;
      }
      case `/${RouteName.export}/${RouteName.validation}`: {
        return validationState === '' || validationState === ValidationStatus.failed;
      }
      case `/${RouteName.export}/${RouteName.summary}`: {
        return exportPath === '';
      }
      default: {
        return true;
      }
    }
  };

  const getNextText = (): string => {
    const { pathname } = location;

    switch (pathname) {
      case `/${RouteName.export}/${RouteName.validation}`: {
        return validationState === ValidationStatus.succeeded_with_warnings ? intlText.EXPORT_WITH_WARNINGS : intlText.EXPORT;
      }
      case `/${RouteName.export}/${RouteName.summary}`: {
        const validationText =
          validationState === ValidationStatus.succeeded_with_warnings ? intlText.EXPORT_WITH_WARNINGS : intlText.EXPORT;
        return `${validationText} and ${intlText.FINISH}`;
      }
      default: {
        return intlText.NEXT;
      }
    }
  };

  const nextText = getNextText();

  return (
    <div className="msla-export-navigation-panel">
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
      <PrimaryButton
        className="msla-export-navigation-panel-button"
        text={nextText}
        ariaLabel={nextText}
        onClick={onClickNext}
        disabled={isNextDisabled()}
      />
    </div>
  );
};
