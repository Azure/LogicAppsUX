import { PrimaryButton } from '@fluentui/react';
import { serializeWorkflow } from '@microsoft/logic-apps-designer';

const TestFunctions = () => {
  const logSerialization = () => {
    const state = (window as any).DesignerStore.getState();
    serializeWorkflow(state).then((serialized) => console.log(serialized));
  };

  return (
    <div style={{ display: 'flex', gap: '24px' }}>
      <PrimaryButton text="Log Serialization" onClick={logSerialization} />
    </div>
  );
};

export default TestFunctions;
