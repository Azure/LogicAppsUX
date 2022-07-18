import { ExtensionCommand } from '../../../run-service';
import type { RootState } from '../../../state/store';
import type { InitializedVscodeState } from '../../../state/vscodeSlice';
import { VSCodeContext } from '../../../webviewCommunication';
import { PrimaryButton, Text, TextField } from '@fluentui/react';
import { useContext, useMemo } from 'react';
import { useIntl } from 'react-intl';
import { useSelector } from 'react-redux';

export const Summary: React.FC = () => {
  const intl = useIntl();
  const vscode = useContext(VSCodeContext);
  const vscodeState = useSelector((state: RootState) => state.vscode);
  const { exportData } = vscodeState as InitializedVscodeState;
  const { exportPath } = exportData;

  const intlText = {
    COMPLETE_EXPORT_TITLE: intl.formatMessage({
      defaultMessage: 'Complete Export',
      description: 'Complete export title',
    }),
    SELECT_LOCATION: intl.formatMessage({
      defaultMessage: 'Select a location to export your logic apps to',
      description: 'Select a location description',
    }),
    OPEN_FILE_EXPLORER: intl.formatMessage({
      defaultMessage: 'Open file explorer',
      description: 'Open file explorer text',
    }),
    EXPORT_LOCATION: intl.formatMessage({
      defaultMessage: 'Export location',
      description: 'Export location text',
    }),
  };

  const onOpenExplorer = () => {
    vscode.postMessage({
      command: ExtensionCommand.select_folder,
    });
  };

  const locationText = useMemo(() => {
    return (
      <TextField label={intlText.EXPORT_LOCATION} placeholder={exportPath} disabled className="msla-export-summary-file-location-button" />
    );
  }, [exportPath]);

  return (
    <div className="msla-export-summary">
      <Text variant="xLarge" nowrap block>
        {intlText.COMPLETE_EXPORT_TITLE}
      </Text>
      <Text variant="large" nowrap block>
        {intlText.SELECT_LOCATION}
      </Text>
      <div className="msla-export-summary-file-location">
        {locationText}
        <PrimaryButton text={intlText.OPEN_FILE_EXPLORER} ariaLabel={intlText.OPEN_FILE_EXPLORER} onClick={onOpenExplorer} />
      </div>
    </div>
  );
};
