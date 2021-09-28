import { convertActionIDToTitleCase } from '../../src/common/utilities/Utils';
import { ConnectionLineType } from 'react-flow-renderer';

const position = { x: 0, y: 0 };
const edgeType = 'type';

// eslint-disable-next-line @typescript-eslint/ban-types
const objEmpty = (obj: Object) => obj && Object.keys(obj).length === 0 && obj.constructor === Object;

export const fetchworkflow = async () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const workflow: { definition: LogicAppsV2.WorkflowDefinition } = await import('../../__mocks__/workflows/Conditionals.json');
  const ret: any[] = [];
  const triggers = workflow.definition.triggers;
  for (const [key, value] of Object.entries(triggers ?? {})) {
    ret.push({
      id: key,
      type: 'input',
      data: { label: convertActionIDToTitleCase(value.kind ?? '') },
      position,
    });
  }

  const actions = workflow.definition.actions;
  for (const [akey, avalue] of Object.entries(actions ?? {})) {
    ret.push({
      id: akey,
      data: { label: convertActionIDToTitleCase(akey) },
      position,
    });

    if (avalue.runAfter && !objEmpty(avalue.runAfter)) {
      const ra = avalue.runAfter;
      for (const e of Object.keys(ra)) {
        ret.push({
          id: `${e}-${akey}`,
          source: e,
          target: akey,
          type: edgeType,
          animated: false,
          arrowHeadType: 'arrow',
        });
      }
    } else if (avalue.runAfter && objEmpty(avalue.runAfter)) {
      for (const [tkey] of Object.entries(triggers ?? {})) {
        ret.push({
          id: `entry-${tkey}-${akey}`,
          source: tkey,
          target: akey,
          type: edgeType,
          animated: false,
          arrowHeadType: 'arrow',
        });
      }
    }
  }

  return ret;
};
