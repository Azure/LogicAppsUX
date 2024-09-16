import type { InputParameter, BoundParameters, LogicAppsV2, BoundParameter } from '@microsoft/logic-apps-shared';
import { getIntl, isNullOrEmpty, isNullOrUndefined, unmap, Visibility } from '@microsoft/logic-apps-shared';
import { Binder } from '../binder';
import constants from '../constants';

export default class WorkflowInputsBinder extends Binder {
  bind(inputs: LogicAppsV2.ChildWorkflowInputs, inputParameters?: Record<string, InputParameter>): BoundParameters {
    const untypedInputParameters = this.makeUntypedInputsParameters(inputs);

    if (isNullOrEmpty(inputParameters)) {
      return untypedInputParameters;
    }

    const boundParameters = unmap(inputParameters).reduce(
      this.makeReducer(inputs, this._bindInputParameterToWorkflowInputs),
      {} as BoundParameters
    );

    if (!isNullOrEmpty(boundParameters)) {
      delete untypedInputParameters['body'];
    }

    return {
      ...untypedInputParameters,
      ...boundParameters,
    };
  }

  makeUntypedInputsParameters(inputs: LogicAppsV2.ChildWorkflowInputs): BoundParameters {
    if (!inputs) {
      return {};
    }

    const intl = getIntl();
    const intlMessages = {
      [constants.WORKFLOW.WORKFLOW]: intl.formatMessage({
        defaultMessage: 'Workflow',
        id: '96OeHh',
        description: 'Workflow',
      }),
      [constants.WORKFLOW.TRIGGER_NAME]: intl.formatMessage({
        defaultMessage: 'Trigger name',
        id: '+gC73N',
        description: 'Trigger name',
      }),
      [constants.WORKFLOW.BODY]: intl.formatMessage({
        defaultMessage: 'Body',
        id: '4SIrVn',
        description: 'Body',
      }),
      [constants.WORKFLOW.HEADERS]: intl.formatMessage({
        defaultMessage: 'Headers',
        id: 'VchR9d',
        description: 'Headers',
      }),
    };

    const {
      body,
      headers,
      host: {
        triggerName,
        workflow: { id },
      },
    } = inputs;

    return {
      ...this.makeBoundParameter(constants.WORKFLOW.WORKFLOW, intlMessages[constants.WORKFLOW.WORKFLOW], id, Visibility.Advanced),
      ...this.makeBoundParameter(constants.WORKFLOW.TRIGGER_NAME, intlMessages[constants.WORKFLOW.TRIGGER_NAME], triggerName),
      ...this.makeOptionalBoundParameter(constants.WORKFLOW.BODY, intlMessages[constants.WORKFLOW.BODY], body),
      ...this.makeOptionalBoundParameter(
        constants.WORKFLOW.HEADERS,
        intlMessages[constants.WORKFLOW.HEADERS],
        headers,
        Visibility.Advanced,
        {
          format: constants.FORMAT.KEY_VALUE_PAIRS,
        }
      ),
    };
  }

  private _bindInputParameterToWorkflowInputs = (inputs: any, parameter: InputParameter): BoundParameter<any> => {
    const { name, visibility } = parameter;
    const displayName = this.getInputParameterDisplayName(parameter);
    const identifiers = this.parsePath(name);

    // NOTE(joechung): Response schema can only be specified for the response body, not headers or any other source.
    let value = inputs.body;

    while (identifiers.length > 0 && !isNullOrUndefined(value)) {
      const identifier = this.resolveIdentifier(identifiers.shift()!);
      value = Object.prototype.hasOwnProperty.call(value, identifier) ? value[identifier] : undefined;
    }

    return this.buildBoundParameter(displayName, value, visibility);
  };
}
