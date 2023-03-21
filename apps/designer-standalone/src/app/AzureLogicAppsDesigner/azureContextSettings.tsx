import type { RootState, AppDispatch } from '../../state/store';
import { clearWorkflowDetails, setDarkMode, setIsLocalSelected, setReadOnly } from '../../state/workflowLoadingSlice';
import { Checkbox } from '@fluentui/react';
import { useDispatch, useSelector } from 'react-redux';

const AzureContextSettings = () => {
  const { readOnly, monitoringView, darkMode, isLocalSelected } = useSelector((state: RootState) => {
    return state.workflowLoader;
  });
  const dispatch = useDispatch<AppDispatch>();

  const handleCheckLocalSetting = (checked?: boolean) => {
    if (!checked) {
      dispatch(clearWorkflowDetails());
    }
    dispatch(setIsLocalSelected(!!checked));
  };

  return (
    <div style={{ display: 'flex', gap: '24px' }}>
      <Checkbox
        label="Read Only"
        disabled={monitoringView}
        checked={readOnly}
        onChange={(_, checked) => dispatch(setReadOnly(!!checked))}
      />
      <Checkbox label="Dark Mode" checked={darkMode} onChange={(_, checked) => dispatch(setDarkMode(!!checked))} />
      <Checkbox label="isLocal" checked={isLocalSelected} onChange={(_, checked) => handleCheckLocalSetting(checked)} />
    </div>
  );
};

export default AzureContextSettings;
