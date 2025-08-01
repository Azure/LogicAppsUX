import { Button } from '@fluentui/react-components';
import { RouteName, ValidationStatus } from '../../../run-service';
import { Status } from '../../../state/WorkflowSlice';
import type { RootState } from '../../../state/store';
import { VSCodeContext } from '../../../webviewCommunication';
import { ExtensionCommand } from '@microsoft/vscode-extension-logic-apps';
import { useContext } from 'react';
import { useIntl } from 'react-intl';
import { useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { useExportStyles } from '../exportStyles';

export const Navigation: React.FC = () => {
  const intl = useIntl();
  const vscode = useContext(VSCodeContext);
  const navigate = useNavigate();
  const location = useLocation();
  const styles = useExportStyles();

  const workflowState = useSelector((state: RootState) => state.workflow);
  const { exportData } = workflowState;
  const { finalStatus } = workflowState;
  const {
    selectedSubscription,
    selectedIse,
    selectedWorkflows,
    validationState,
    targetDirectory,
    packageUrl,
    managedConnections,
    location: selectedLocation,
  } = exportData;
  const { isManaged, resourceGroup, resourceGroupLocation } = managedConnections;

  const intlText = {
    NEXT: intl.formatMessage({
      defaultMessage: 'Next',
      id: '3Wcqsy',
      description: 'Next button',
    }),
    BACK: intl.formatMessage({
      defaultMessage: 'Back',
      id: '2XH9oW',
      description: 'Back button',
    }),
    EXPORT: intl.formatMessage({
      defaultMessage: 'Export',
      id: 'wPzyvX',
      description: 'Export button',
    }),
    EXPORT_WITH_WARNINGS: intl.formatMessage({
      defaultMessage: 'Export with warnings',
      id: 'pK0Ir8',
      description: 'Export with warnings button',
    }),
    FINISH: intl.formatMessage({
      defaultMessage: 'finish',
      id: 'mlxD6R',
      description: 'Finish  button',
    }),
  };

  const onClickBack = () => {
    navigate(-1);
  };

  /**
   * Logs the last step of the navigation.
   * @param {string} pageName - The name of the page.
   */
  const logLastStep = (pageName: string) => {
    vscode.postMessage({
      command: ExtensionCommand.log_telemtry,
      key: 'lastStep',
      value: pageName,
    });
  };

  const onClickNext = () => {
    const { pathname } = location;

    switch (pathname) {
      case `/${RouteName.export}/${RouteName.instance_selection}`: {
        logLastStep(RouteName.workflows_selection);
        navigate(`/${RouteName.export}/${RouteName.workflows_selection}`);
        break;
      }
      case `/${RouteName.export}/${RouteName.workflows_selection}`: {
        logLastStep(RouteName.validation);
        navigate(`/${RouteName.export}/${RouteName.validation}`);
        break;
      }
      case `/${RouteName.export}/${RouteName.validation}`: {
        logLastStep(RouteName.summary);
        navigate(`/${RouteName.export}/${RouteName.summary}`);
        break;
      }
      case `/${RouteName.export}/${RouteName.summary}`: {
        logLastStep(RouteName.status);
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
    return (
      pathname === `/${RouteName.export}/${RouteName.instance_selection}` ||
      (pathname === `/${RouteName.export}/${RouteName.status}` && finalStatus !== Status.Succeeded && finalStatus !== Status.Failed)
    );
  };

  const isNextDisabled = (): boolean => {
    const { pathname } = location;

    switch (pathname) {
      case `/${RouteName.export}/${RouteName.instance_selection}`: {
        return selectedSubscription === '' || (selectedIse === '' && selectedLocation === '');
      }
      case `/${RouteName.export}/${RouteName.workflows_selection}`: {
        return selectedWorkflows.length === 0;
      }
      case `/${RouteName.export}/${RouteName.validation}`: {
        return validationState === '' || validationState === ValidationStatus.failed;
      }
      case `/${RouteName.export}/${RouteName.summary}`: {
        return !packageUrl || targetDirectory.path === '' || (targetDirectory.path !== '' && isManaged && resourceGroup === undefined);
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
    <div className={styles.navigationPanel}>
      <Button className={styles.navigationPanelButton} aria-label={intlText.BACK} onClick={onClickBack} disabled={isBackDisabled()}>
        {intlText.BACK}
      </Button>
      <Button
        className={styles.navigationPanelButton}
        appearance="primary"
        aria-label={nextText}
        onClick={onClickNext}
        disabled={isNextDisabled()}
      >
        {nextText}
      </Button>
    </div>
  );
};
