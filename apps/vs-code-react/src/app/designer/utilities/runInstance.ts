import { type DesignerServices } from '../servicesHelper';
import { type LogicAppsV2, type ContentLink } from '@microsoft/utils-logic-apps';

/**
 * Retrieves the mock data for a run instance.
 * @param {LogicAppsV2.RunInstanceDefinition} runDefinition - The run instance definition.
 * @param {DesignerServices} services - The designer services.
 * @returns An object containing the trigger mocks and action mocks.
 */
export const getRunInstanceMocks = async (runDefinition: LogicAppsV2.RunInstanceDefinition, services: DesignerServices) => {
  const triggerOutputs = await services.runService.getActionLinks({
    outputsLink: runDefinition.properties.trigger.outputsLink as ContentLink,
  });
  const triggerMocks = {
    [runDefinition.properties.trigger.name]: {
      properties: {
        status: runDefinition.properties.trigger.status,
      },
      outputs: triggerOutputs.outputs,
    },
  };

  const actionMocks: Record<string, any> = {};
  await Promise.all(
    Object.keys(runDefinition.properties.actions).map(async (actionName) => {
      const outputsLink = runDefinition.properties.actions[actionName].outputsLink as ContentLink;
      const actionOutputs = await services.runService.getActionLinks({ outputsLink });
      actionMocks[actionName] = {
        properties: {
          status: runDefinition.properties.actions[actionName].status,
        },
        outputs: actionOutputs.outputs,
      };
    })
  );

  return { triggerMocks, actionMocks };
};
