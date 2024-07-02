import { type Template, TemplateService } from '@microsoft/logic-apps-shared';
import { useQuery } from '@tanstack/react-query';

export const useExistingWorkflowNames = () => {
  return useQuery(['getExistingWorkflowNames'], async () => {
    return await TemplateService()?.getExistingWorkflowNames();
  });
};

export const useTemplateConnectors = (availableTemplates: Record<string, Template.Manifest>) => {
  return useQuery(
    ['getTemplateConnectors', { availableTemplates }],
    async () => {
      const allConnectorsIds = Object.values(availableTemplates).flatMap((template) =>
        Object.values(template.connections).flatMap((connection) => connection.connectorId)
      );
      const uniqueConnectorIds = [...new Set(allConnectorsIds)];
      return await Promise.all(
        uniqueConnectorIds.map(async (connectorId) => {
          return connectorId;
        })
      );
    },
    {
      enabled: !!availableTemplates,
    }
  );
};

export const useUniqueConnectorsIds = (connectors: Template.Connection[]) => {
  return [...new Set(connectors.map((connector) => connector.connectorId))]; // id or name?
};
