import {
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
  Text,
  Image,
  tokens,
  Label,
  MessageBar,
  ProgressBar,
} from '@fluentui/react-components';
import { ErrorBar } from '../../configuretemplate/common';
import { useIntl } from 'react-intl';
import { useDefaultSettingsItems } from './common';
import { useCreateReviewStyles } from './styles';
import { TemplatesSection } from '@microsoft/designer-ui';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../core/state/mcp/store';
import { useConnectorSectionStyles } from '../wizard/styles';
import { useEffect, useMemo, useState } from 'react';
import { getResourceNameFromId } from '@microsoft/logic-apps-shared';
import WorkflowIcon from '../../../common/images/templates/logicapps.svg';
import AppServicePlanIcon from '../../../common/images/mcp/appserviceplan.svg';
import StorageAccountIcon from '../../../common/images/mcp/azurestorage.svg';
import ApplicationInsightsIcon from '../../../common/images/mcp/appinsights.svg';
import { CheckmarkCircle20Regular, ErrorCircle20Regular, CircleHint20Regular } from '@fluentui/react-icons';

export const SimpleCreateReview = ({
  isValidating,
  isCreated,
  errorInfo,
  resourcesStatus,
}: {
  isValidating: boolean;
  isCreated: boolean;
  errorInfo?: { title: string; message: string };
  resourcesStatus: Record<string, string>;
}) => {
  const styles = useCreateReviewStyles();
  const intl = useIntl();
  const intlTexts = {
    validatingLabel: intl.formatMessage({
      defaultMessage: 'Validating resources...',
      id: '3jL1mR',
      description: 'Label shown when the template is validating',
    }),
    resourcesSectionTitle: intl.formatMessage({
      defaultMessage: 'Resources',
      id: 'CaiUX0',
      description: 'Title for the resources section',
    }),
    resourcesSectionDescription: intl.formatMessage({
      defaultMessage: 'This list shows the new resources to create for your logic app and existing resources if any.',
      id: 'CDET7A',
      description: 'Description for the resources section',
    }),
    defaultSettingsTitle: intl.formatMessage({
      defaultMessage: 'Default settings',
      id: 'JCmWdL',
      description: 'Title for the default settings section',
    }),
    createdMessage: intl.formatMessage({
      defaultMessage: 'Standard logic app is successfully created.',
      id: 'vJFQQc',
      description: 'Success message shown when the logic app is created successfully',
    }),
  };

  const defaultSettingsSectionItems = useDefaultSettingsItems();

  const [value, setValue] = useState(0);
  useEffect((): any => {
    if (isCreated) {
      const id = setInterval(() => {
        setValue(value < 40 ? 1 + value : 0);
      }, 250);
      return () => {
        clearInterval(id);
      };
    }
  }, [isCreated, value]);

  return (
    <div className={styles.container}>
      {errorInfo ? <ErrorBar title={errorInfo.title} errorMessage={errorInfo.message} messageInNewline={true} /> : null}
      {isCreated ? (
        <div>
          <MessageBar intent="success">{intlTexts.createdMessage}</MessageBar>
          <ProgressBar max={40} value={value} />
        </div>
      ) : null}

      <TemplatesSection
        cssOverrides={{ sectionContainer: styles.templatesSection }}
        title={intlTexts.defaultSettingsTitle}
        titleHtmlFor={'defaultSettingsReviewSectionLabel'}
        items={defaultSettingsSectionItems}
      />
      <div className="msla-templates-section">
        <Label className="msla-templates-section-title" htmlFor={'resourcesSectionLabel'}>
          {intlTexts.resourcesSectionTitle}
        </Label>
        <Text className="msla-templates-section-description">{intlTexts.resourcesSectionDescription}</Text>
        <div className={styles.resourcesSection}>
          {isValidating ? (
            <Spinner size="medium" label={intlTexts.validatingLabel} labelPosition="after" />
          ) : (
            <ListResources resourcesStatus={resourcesStatus} />
          )}
        </div>
      </div>
    </div>
  );
};

const toolTableCellStyles = {
  border: 'none',
};
const toolNameCellStyles = {
  paddingTop: '6px',
  alignItems: 'center',
  display: 'flex',
};

export const ListResources = ({ resourcesStatus }: { resourcesStatus: Record<string, string> }) => {
  const intl = useIntl();
  const { appServicePlan, storageAccount, appInsights, logicAppName } = useSelector((state: RootState) => ({
    appServicePlan: state.resource.newLogicAppDetails?.appServicePlan ?? { id: '', sku: '', isNew: false },
    storageAccount: state.resource.newLogicAppDetails?.storageAccount ?? { id: '' },
    appInsights: state.resource.newLogicAppDetails?.appInsights ?? { id: '' },
    logicAppName: state.resource.newLogicAppDetails?.appName ?? '',
  }));

  const styles = useConnectorSectionStyles();
  const resourceStyles = useCreateReviewStyles();

  const INTL_TEXT = {
    logicAppType: intl.formatMessage({
      defaultMessage: 'Logic App Standard',
      id: '9Er8NF',
      description: 'The type for logic app resource',
    }),
    storageAccountType: intl.formatMessage({
      defaultMessage: 'Storage account',
      id: '8d3lmL',
      description: 'The type for storage account resource',
    }),
    appServicePlanType: intl.formatMessage({
      defaultMessage: 'App Service Plan',
      id: '7N+Zcl',
      description: 'The type for app service plan resource',
    }),
    appInsightsType: intl.formatMessage({
      defaultMessage: 'Application Insights',
      id: 'dU7f7n',
      description: 'The type for application insights resource',
    }),
    tableAriaLabel: intl.formatMessage({
      defaultMessage: 'This list shows the new resources to create for your logic app and existing resources if any.',
      id: '68UJHa',
      description: 'The aria label for the resources table',
    }),
    nameLabel: intl.formatMessage({
      defaultMessage: 'Name',
      id: '5m1Ozg',
      description: 'The label for the name column',
    }),
    typeLabel: intl.formatMessage({
      defaultMessage: 'Type',
      id: 'XXOaU8',
      description: 'The label for the type column',
    }),
    statusLabel: intl.formatMessage({
      defaultMessage: 'Status',
      id: 'YpTC5c',
      description: 'Label for the status column',
    }),
  };

  const items = useMemo(() => {
    const resourcesToBeCreated = [{ name: logicAppName, type: INTL_TEXT.logicAppType, key: 'logicapp' }];
    const existingResources: { name: string; type: string; key: string }[] = [];

    const storageDetails = { name: getResourceNameFromId(storageAccount.id), type: INTL_TEXT.storageAccountType, key: 'storageaccount' };
    const appPlanDetails = { name: getResourceNameFromId(appServicePlan.id), type: INTL_TEXT.appServicePlanType, key: 'appserviceplan' };
    const appInsightsDetails = appInsights.id
      ? { name: getResourceNameFromId(appInsights.id), type: INTL_TEXT.appInsightsType, key: 'appinsights' }
      : undefined;

    if (storageAccount?.isNew) {
      resourcesToBeCreated.push(storageDetails);
    } else {
      existingResources.push(storageDetails);
    }

    if (appServicePlan?.isNew) {
      resourcesToBeCreated.push(appPlanDetails);
    } else {
      existingResources.push(appPlanDetails);
    }

    if (appInsightsDetails) {
      if (appInsights?.isNew) {
        resourcesToBeCreated.push(appInsightsDetails);
      } else {
        existingResources.push(appInsightsDetails);
      }
    }

    return [...resourcesToBeCreated, ...existingResources];
  }, [
    logicAppName,
    INTL_TEXT.logicAppType,
    INTL_TEXT.storageAccountType,
    INTL_TEXT.appServicePlanType,
    INTL_TEXT.appInsightsType,
    storageAccount,
    appServicePlan,
    appInsights,
  ]);

  const columns = [
    { columnKey: 'name', label: INTL_TEXT.nameLabel },
    { columnKey: 'type', label: INTL_TEXT.typeLabel },
    { columnKey: 'status', label: INTL_TEXT.statusLabel },
  ];

  return (
    <Table className={styles.tableStyle} aria-label={INTL_TEXT.tableAriaLabel} size="small">
      <TableHeader>
        <TableRow style={toolTableCellStyles}>
          {columns.map((column) => (
            <TableHeaderCell key={column.columnKey} style={toolTableCellStyles}>
              <Text weight="semibold">{column.label}</Text>
            </TableHeaderCell>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody style={toolTableCellStyles}>
        {items.map((item) => (
          <TableRow key={item.key} style={toolTableCellStyles}>
            <TableCell style={toolNameCellStyles}>
              <Image
                className={resourceStyles.resourceIcon}
                src={getResourceIcon(item.key)}
                aria-label={item.name}
                width={20}
                height={20}
              />
              <Text className={resourceStyles.resourceName} title={item.name}>
                {item.name}
              </Text>
            </TableCell>
            <TableCell>
              <Text size={300} className={styles.descriptionSection} title={item.type}>
                {item.type}
              </Text>
            </TableCell>
            <TableCell style={{ alignContent: 'center' }}>
              <CreateStatus status={resourcesStatus[item.key]} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

const CreateStatus = ({ status }: { status: string }) => {
  const styles = useCreateReviewStyles();
  const intl = useIntl();
  const INTL_TEXT = {
    notStarted: intl.formatMessage({
      defaultMessage: 'Not created',
      id: '2cRdSf',
      description: 'Status when the resource creation has not started',
    }),
    creatingLabel: intl.formatMessage({
      defaultMessage: 'Creating...',
      id: 'pnrg3j',
      description: 'Label for the creating status',
    }),
    completedLabel: intl.formatMessage({
      defaultMessage: 'Created',
      id: 'vlxkNl',
      description: 'Label for the completed status',
    }),
    failedLabel: intl.formatMessage({
      defaultMessage: 'Failed',
      id: 'M+nnq6',
      description: 'Label for the failed status',
    }),
    existingLabel: intl.formatMessage({
      defaultMessage: 'Existing',
      id: '2P1Ap0',
      description: 'Label for the existing resource status',
    }),
  };

  const content: { icon: JSX.Element | null; label: string } = { icon: null, label: '' };
  switch (status) {
    case 'notstarted': {
      content.icon = <CircleHint20Regular color={tokens.colorBrandStroke1} className={styles.operationProgress} />;
      content.label = INTL_TEXT.notStarted;
      break;
    }
    case 'running': {
      content.icon = <Spinner className={styles.operationProgress} size="tiny" />;
      content.label = INTL_TEXT.creatingLabel;
      break;
    }
    case 'succeeded': {
      content.icon = <CheckmarkCircle20Regular className={styles.operationProgress} color={tokens.colorPaletteGreenBackground3} />;
      content.label = INTL_TEXT.completedLabel;
      break;
    }

    case 'failed': {
      content.icon = <ErrorCircle20Regular className={styles.operationProgress} color={tokens.colorStatusDangerBackground3Pressed} />;
      content.label = INTL_TEXT.failedLabel;
      break;
    }

    case 'existing': {
      content.icon = null;
      content.label = INTL_TEXT.existingLabel;
      break;
    }
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      {content.icon}
      <Text style={{ verticalAlign: 'top' }} title={content.label}>
        {content.label}
      </Text>
    </div>
  );
};

const getResourceIcon = (type: string) => {
  switch (type) {
    case 'logicapp':
      return WorkflowIcon;
    case 'storageaccount':
      return StorageAccountIcon;
    case 'appserviceplan':
      return AppServicePlanIcon;
    case 'appinsights':
      return ApplicationInsightsIcon;
    default:
      return null;
  }
};
