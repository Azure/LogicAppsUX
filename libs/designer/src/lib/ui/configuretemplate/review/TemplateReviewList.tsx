import { Accordion, AccordionHeader, AccordionItem, AccordionPanel, Divider, Text } from '@fluentui/react-components';
import { useResourceStrings } from '../resources';
import { useTemplatesStrings } from '../../templates/templatesStrings';
import { TemplatesSection, type TemplatesSectionItem } from '@microsoft/designer-ui';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../core/state/templates/store';
import { useIntl } from 'react-intl';
import { equals, getResourceNameFromId, normalizeConnectorId } from '@microsoft/logic-apps-shared';
import { ConnectorConnectionName } from '../../templates/connections/connector';
import React, { useMemo } from 'react';
import { useAllConnectors } from '../../../core/configuretemplate/utils/queries';
import { WorkflowKind } from '../../../core/state/workflow/workflowInterfaces';
import { DescriptionWithLink, ErrorBar } from '../common';
import { mergeStyles } from '@fluentui/react';
import { formatNameWithIdentifierToDisplay } from '../../../core/configuretemplate/utils/helper';

const SectionDividerItem: TemplatesSectionItem = {
  type: 'divider',
  value: undefined,
};

export const TemplateReviewList = () => {
  const intl = useIntl();
  const intlText = {
    TabDescription: intl.formatMessage({
      defaultMessage: `Review all the values you've added to this template. This read-only summary lets you quickly scan your template setup.`,
      id: 'Cnymq/',
      description: 'The dscription for review tab',
    }),
    TemplateDisplayName: intl.formatMessage({
      defaultMessage: 'Template display name',
      id: 'a7d1Dp',
      description: 'The aria label for the template display name',
    }),
    ConnectorNameLabel: intl.formatMessage({
      defaultMessage: 'Connector Name',
      id: '0zMOIe',
      description: 'The label for the connector name',
    }),
    ConnectorTypeLabel: intl.formatMessage({
      defaultMessage: 'Connector Type',
      id: '0m0zNa',
      description: 'The label for the connector type',
    }),
    StatusAndPlanLabel: intl.formatMessage({
      defaultMessage: 'Status and Plan',
      id: 'oiME91',
      description: 'The label for the status and plan tab label',
    }),
    ErrorMessage: intl.formatMessage({
      defaultMessage: 'Template validation failed. Please check the tabs for more details to fix the errors',
      id: 'fa8xG1',
      description: 'The information for the error message',
    }),
  };

  const hasError = useSelector((state: RootState) => {
    const { errors, workflows } = state.template;
    return (
      errors.general ||
      errors.connections ||
      Object.values(errors.parameters).some((parameterErrors) => parameterErrors !== undefined) ||
      Object.values(errors.manifest ?? {}).some((manifestErrors) => manifestErrors !== undefined) ||
      Object.values(workflows ?? {}).some(
        (workflow) =>
          workflow.errors?.general ||
          Object.values(workflow.errors?.manifest ?? {}).some((error) => error !== undefined) ||
          workflow.errors.kind ||
          workflow.errors.workflow
      )
    );
  });
  const { connectorKinds, stateTypes, resourceStrings: templateResourceStrings } = useTemplatesStrings();
  const resources = { ...templateResourceStrings, ...connectorKinds, ...stateTypes, ...useResourceStrings(), ...intlText };

  const statusAndPlanItems: TemplatesSectionItem[] = useStatusAndPlanItems(resources);
  const workflowsSectionItems: TemplatesSectionItem[] = useWorkflowSectionItems(resources);
  const connectionsSectionItems: TemplatesSectionItem[] = useConnectionSectionItems(resources);
  const paramtersSectionItems: TemplatesSectionItem[] = useParameterSectionItems(resources);
  const profileSectionItems: TemplatesSectionItem[] = useProfileSectionItems(resources);

  const sectionItems: Record<string, { label: string; value: TemplatesSectionItem[]; emptyText?: string }> = {
    statusAndPlan: {
      label: resources.StatusAndPlanLabel,
      value: statusAndPlanItems,
    },
    workflows: {
      label: resources.WorkflowsTabLabel,
      value: workflowsSectionItems,
    },
    connections: {
      label: resources.ConnectionsTabLabel,
      value: connectionsSectionItems,
      emptyText: resources.NoConnectionInTemplate,
    },
    parameters: {
      label: resources.ParametersTabLabel,
      value: paramtersSectionItems,
      emptyText: resources.NoParameterInTemplate,
    },
    profile: {
      label: resources.ProfileTabLabel,
      value: profileSectionItems,
    },
  };

  return (
    <div className={mergeStyles('msla-templates-wizard-tab-content', { marginLeft: '-10px' })}>
      <DescriptionWithLink text={resources.TabDescription} className={mergeStyles({ width: '70%' })} />
      {hasError ? <ErrorBar errorMessage={resources.ErrorMessage} /> : null}
      <Accordion multiple={true} defaultOpenItems={Object.keys(sectionItems)}>
        {Object.entries(sectionItems).map(([key, { label, value, emptyText }]) => (
          <React.Fragment key={key}>
            <AccordionItem value={key} key={key}>
              <AccordionHeader>
                <Text style={{ fontWeight: 'bold' }}>{label}</Text>
              </AccordionHeader>
              <AccordionPanel>
                {value?.length ? (
                  <TemplatesSection items={value} />
                ) : emptyText ? (
                  <div style={{ paddingBottom: 10 }}>
                    <Text>{emptyText}</Text>
                  </div>
                ) : null}
              </AccordionPanel>
            </AccordionItem>
            <Divider />
          </React.Fragment>
        ))}
      </Accordion>
    </div>
  );
};

const useStatusAndPlanItems = (resources: Record<string, string>) => {
  const { status, templateManifest } = useSelector((state: RootState) => ({
    status: state.template.status,
    templateManifest: state.template.manifest,
  }));

  const items: TemplatesSectionItem[] = [
    {
      label: resources.Host,
      value:
        templateManifest?.skus
          ?.map((skuKind) =>
            equals(skuKind, 'standard') ? resources.Standard : equals(skuKind, 'consumption') ? resources.Consumption : ''
          )
          ?.join(', ') ?? resources.Placeholder,
      type: 'text',
    },
    {
      label: resources.Status,
      value: equals(status, 'Production')
        ? resources.ProductionEnvironment
        : equals(status, 'Testing')
          ? resources.TestingEnvironment
          : resources.DevelopmentEnvironment,
      type: 'text',
    },
  ];

  return items;
};

const useWorkflowSectionItems = (resources: Record<string, string>) => {
  const { workflows } = useSelector((state: RootState) => ({
    workflows: state.template.workflows,
  }));

  const workflowDatas = Object.values(workflows);
  return workflowDatas?.flatMap((workflow, index) => {
    const isLast = index === workflowDatas.length - 1;
    const thisWorkflowSectionItems: TemplatesSectionItem[] = [
      {
        label: resources.WORKFLOW_NAME,
        value: workflow.workflowName,
        type: 'text',
      },
      {
        label: resources.WorkflowDisplayName,
        value: workflow?.manifest?.title,
        type: 'text',
      },
      {
        label: resources.StateType,
        value:
          workflow?.manifest?.kinds
            ?.map((kind) =>
              equals(kind, WorkflowKind.STATEFUL) ? resources.STATEFUL : equals(kind, WorkflowKind.STATELESS) ? resources.STATELESS : ''
            )
            ?.join(', ') ?? resources.Placeholder,
        type: 'text',
      },
      {
        label: resources.Summary,
        value: workflow?.manifest?.summary ?? resources.Placeholder,
        type: 'text',
      },
      {
        label: resources.Description,
        value: workflow?.manifest?.description ?? resources.Placeholder,
        type: 'text',
      },
      {
        label: resources.Prerequisites,
        value: workflow?.manifest?.prerequisites ?? resources.Placeholder,
        type: 'text',
      },
      {
        label: resources.LightModeImage,
        value: workflow?.manifest?.images?.light ?? resources.Placeholder,
        type: 'text',
      },
      {
        label: resources.DarkModeImage,
        value: workflow?.manifest?.images?.dark ?? resources.Placeholder,
        type: 'text',
      },
    ];

    if (!isLast) {
      thisWorkflowSectionItems.push(SectionDividerItem);
    }

    return thisWorkflowSectionItems;
  });
};

const useConnectionSectionItems = (resources: Record<string, string>) => {
  const { connections, subscriptionId, location } = useSelector((state: RootState) => ({
    connections: state.template.connections,
    subscriptionId: state.workflow.subscriptionId,
    location: state.workflow.location,
  }));

  const connectionsValues = Object.values(connections);
  return connectionsValues?.flatMap((connection, index) => {
    const isLast = index === connectionsValues.length - 1;
    const thisParameterSectionItems: TemplatesSectionItem[] = [
      {
        label: resources.ConnectorNameLabel,
        value: connection.connectorId,
        onRenderItem: () => (
          <ConnectorConnectionName
            connectorId={normalizeConnectorId(connection.connectorId, subscriptionId, location)}
            connectionKey={undefined}
          />
        ),
        type: 'custom',
      },
      {
        label: resources.ConnectorTypeLabel,
        value: resources[connection.kind?.toLowerCase() as string],
        type: 'text',
      },
    ];

    if (!isLast) {
      thisParameterSectionItems.push(SectionDividerItem);
    }

    return thisParameterSectionItems;
  });
};

const useParameterSectionItems = (resources: Record<string, string>) => {
  const { parameterDefinitions } = useSelector((state: RootState) => ({
    parameterDefinitions: state.template.parameterDefinitions,
  }));

  const parameterValues = Object.values(parameterDefinitions);
  return parameterValues?.flatMap((parameter, index) => {
    const isLast = index === parameterValues.length - 1;
    const thisParameterSectionItems: TemplatesSectionItem[] = [
      {
        label: resources.ParameterName,
        value: formatNameWithIdentifierToDisplay(parameter.name),
        type: 'text',
      },
      {
        label: resources.ParameterDisplayName,
        value: parameter.displayName ?? resources.Placeholder,
        type: 'text',
      },
      {
        label: resources.Type,
        value: parameter.type,
        type: 'text',
      },
      {
        label: resources.DefaultValue,
        value: parameter.default ?? resources.Placeholder,
        type: 'text',
      },
      {
        label: resources.AssociatedWorkflows,
        value:
          parameter.associatedWorkflows?.map((associatedWorkflow) => getResourceNameFromId(associatedWorkflow))?.join(', ') ??
          resources.Placeholder,
        type: 'text',
      },
      {
        label: resources.Description,
        value: parameter.description ?? resources.Placeholder,
        type: 'text',
      },
      {
        label: resources.Required,
        value: parameter.required ? resources.RequiredOn : resources.RequiredOff,
        type: 'text',
      },
    ];

    if (!isLast) {
      thisParameterSectionItems.push(SectionDividerItem);
    }

    return thisParameterSectionItems;
  });
};

const useProfileSectionItems = (resources: Record<string, string>) => {
  const { operationInfos, templateManifest, workflows } = useSelector((state: RootState) => ({
    operationInfos: state.operation.operationInfo,
    templateManifest: state.template.manifest,
    workflows: state.template.workflows,
  }));

  const { data: allConnectors } = useAllConnectors(operationInfos);
  const selectedConnectors = useMemo(() => {
    return allConnectors?.filter((connector) => templateManifest?.featuredConnectors?.some((conn) => equals(conn.id, connector.id)));
  }, [allConnectors, templateManifest]);

  const items: TemplatesSectionItem[] = [
    {
      label: resources.TemplateDisplayName,
      value: templateManifest?.title ?? resources.Placeholder,
      type: 'text',
    },
    {
      label: resources.WorkflowType,
      value: Object.keys(workflows).length > 1 ? resources.ACCELERATOR : resources.WORKFLOW,
      type: 'text',
    },
    {
      label: resources.BY,
      value: templateManifest?.details?.By ?? resources.Placeholder,
      type: 'text',
    },
    {
      label: resources.Category,
      value: templateManifest?.details?.Category ?? resources.Placeholder,
      type: 'text',
    },
    {
      label: resources.FeaturedConnectors,
      value: selectedConnectors?.map((connector) => connector.displayName).join(', ') ?? resources.Placeholder,
      type: 'text',
    },
    {
      label: resources.Tags,
      value: templateManifest?.tags?.join(', ') ?? resources.Placeholder,
      type: 'text',
    },
  ];

  return items;
};
