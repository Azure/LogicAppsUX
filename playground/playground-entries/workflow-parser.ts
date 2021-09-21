import { ConnectionLineType } from 'react-flow-renderer';

const position = { x: 0, y: 0 };
const edgeType = ConnectionLineType.Bezier;

// eslint-disable-next-line @typescript-eslint/ban-types
const objEmpty = (obj: Object) =>
  obj && // 👈 null and undefined check
  Object.keys(obj).length === 0 &&
  obj.constructor === Object;

export const fetchworkflow = async () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const workflow = await import('../../__mocks__/simpleworkflow.json');
  const ret: any[] = [];
  const triggers: any = workflow.definition.triggers;
  for (const t of Object.keys(triggers)) {
    ret.push({
      id: t,
      type: 'input',
      data: { label: triggers[t].kind },
      position,
    });
  }

  const actions: any = workflow.definition.actions;
  for (const a of Object.keys(actions)) {
    ret.push({
      id: a,
      data: { label: a },
      position,
    });

    if (actions[a].runAfter && !objEmpty(actions[a].runAfter)) {
      const ra = actions[a].runAfter;
      for (const e of Object.keys(ra)) {
        ret.push({
          id: `${e}-${a}`,
          source: e,
          target: a,
          type: edgeType,
          animated: false,
        });
      }
    } else if (objEmpty(actions[a].runAfter)) {
      ret.push({
        id: `entry-${a}`,
        source: 'manual',
        target: a,
        type: edgeType,
        animated: false,
      });
    }
  }

  return ret;
};
