import { RouteName, ValidationStatus } from '../../../run-service';
import type { RootState } from '../../../state/store';
import type { InitializedVscodeState } from '../../../state/vscodeSlice';
import { VSCodeContext } from '../../../webviewCommunication';
import { PrimaryButton } from '@fluentui/react';
import { ExtensionCommand } from '@microsoft-logic-apps/utils';
import { Fragment, useContext } from 'react';
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
  const { selectedSubscription, selectedIse, selectedWorkflows, validationState, targetDirectory, packageUrl, managedConnections } =
    exportData;
  const { isManaged, resourceGroup, resourceGroupLocation } = managedConnections;

  const intlText = {
    NEXT: intl.formatMessage({
      defaultMessage: 'Next',
      description: 'Next button',
    }),
    BACK: intl.formatMessage({
      defaultMessage: 'Back',
      description: 'Back button',
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
      case `/${RouteName.export}/${RouteName.summary}`: {
        navigate(`/${RouteName.export}/${RouteName.status}`);
        vscode.postMessage({
          command: ExtensionCommand.export_package,
          targetDirectory,
          packageUrl,
          selectedSubscription,
          resourceGroupName: isManaged ? resourceGroup : undefined,
          location: isManaged ? resourceGroupLocation : undefined,
        });
        break;
      }
    }
  };

  const isBackDisabled = (): boolean => {
    const { pathname } = location;
    return pathname === `/${RouteName.export}/${RouteName.instance_selection}` || pathname === `/${RouteName.export}/${RouteName.status}`;
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
        return targetDirectory.path === '' || (targetDirectory.path !== '' && isManaged && resourceGroup === undefined);
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

  const isButtonsVisible = location.pathname !== `/${RouteName.export}/${RouteName.status}`;

  return (
    <div className="msla-export-navigation-panel">
{
      isButtonsVisible ?
      <>
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
      </>
      : null
}
    </div>
  );
};
