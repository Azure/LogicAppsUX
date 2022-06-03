import constants from '../../../../common/constants';
import type { RootState } from '../../../../core/store';
import type { PanelTab } from '@microsoft/designer-ui';
import { useSelector } from 'react-redux';

export const ParametersTab = () => {
  // TODO: Retrieve logic from a redux store?
  const selectedNode = useSelector((state: RootState) => state.panel.selectedNode);
  const parameters = useSelector((state: RootState) => state.operations.inputParameters[selectedNode]);
  if (parameters?.isLoading) {
    return <div>Loading</div>;
  }

  return (
    <>
      {Object.keys(parameters?.parameterGroups ?? {}).map((key) => {
        return (
          <>
            {key === 'default' ? null : <h3>{key}</h3>}
            {parameters.parameterGroups[key]?.parameters?.map((x) => {
              return (
                <>
                  <div>{x.label}</div> <pre>{JSON.stringify(x.value, null, 2)}</pre>
                </>
              );
            })}
          </>
        );
      })}
    </>
  );
};

export const parametersTab: PanelTab = {
  title: 'Parameters',
  name: constants.PANEL_TAB_NAMES.PARAMETERS,
  description: 'Request History',
  enabled: true,
  content: <ParametersTab />,
  order: 0,
  icon: 'Info',
};
