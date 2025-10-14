/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Button, Text, Field, Input, Label, useId } from '@fluentui/react-components';
import type { InputOnChangeData } from '@fluentui/react-components';
import { useCreateWorkspaceStyles } from '../createWorkspaceStyles';
import type { RootState } from '../../../state/store';
import type { CreateWorkspaceState } from '../../../state/createWorkspaceSlice';
import { setPackagePath } from '../../../state/createWorkspaceSlice';
import { useIntl } from 'react-intl';
import { useSelector, useDispatch } from 'react-redux';
import { VSCodeContext } from '../../../webviewCommunication';
import { useContext, useState, useCallback, useEffect } from 'react';
import { ExtensionCommand } from '@microsoft/vscode-extension-logic-apps';

export const PackageNameStep: React.FC = () => {
  const dispatch = useDispatch();
  const intl = useIntl();
  const vscode = useContext(VSCodeContext);
  const styles = useCreateWorkspaceStyles();
  const createWorkspaceState = useSelector((state: RootState) => state.createWorkspace) as CreateWorkspaceState;
  const { packagePath, packageValidationResults } = createWorkspaceState;
  const packagePathInputId = useId();

  // Validation state
  const [packagePathError, setPackagePathError] = useState<string | undefined>(undefined);
  const [isValidatingPath, setIsValidatingPath] = useState<boolean>(false);

  const intlText = {
    TITLE: intl.formatMessage({
      defaultMessage: 'Package Setup',
      id: 'Wxhsgj',
      description: 'Package setup step title',
    }),
    DESCRIPTION: intl.formatMessage({
      defaultMessage: 'Package',
      id: 'aExfWG',
      description: 'Package setup step description',
    }),
    PACKAGE_PATH_LABEL: intl.formatMessage({
      defaultMessage: 'Package Path',
      id: 'pyYxP0',
      description: 'Package path input label',
    }),
    BROWSE_BUTTON: intl.formatMessage({
      defaultMessage: 'Browse...',
      id: 'cR0MlP',
      description: 'Browse folder button',
    }),
    PACKAGE_PATH_EMPTY_MESSAGE: intl.formatMessage({
      defaultMessage: 'Package path cannot be empty.',
      id: 'pO1Zvz',
      description: 'Package path cannot be empty message text',
    }),
    PACKAGE_PATH_NOT_EXISTS_MESSAGE: intl.formatMessage({
      defaultMessage: 'The specified path does not exist or is not accessible.',
      id: 'LgCmeY',
      description: 'Specified path does not exist or is not accessible message text',
    }),
  };

  const validatePackagePath = useCallback(
    (path: string) => {
      if (!path) {
        return intlText.PACKAGE_PATH_EMPTY_MESSAGE;
      }

      // Check if we have a validation result for this path
      const isPathValid = packageValidationResults[path];
      if (isPathValid === false) {
        return intlText.PACKAGE_PATH_NOT_EXISTS_MESSAGE;
      }

      return undefined;
    },
    [intlText.PACKAGE_PATH_EMPTY_MESSAGE, intlText.PACKAGE_PATH_NOT_EXISTS_MESSAGE, packageValidationResults]
  );

  // Debounced path validation function
  const validatePathWithExtension = useCallback(
    (path: string, validationResults: Record<string, boolean>) => {
      if (path && path.trim() !== '') {
        if (path in validationResults) {
          setIsValidatingPath(false);
          const validationError = validatePackagePath(path);
          setPackagePathError(validationError);
          return;
        }
        setIsValidatingPath(true);
        vscode.postMessage({
          command: ExtensionCommand.validatePath,
          data: {
            path: path.trim(),
            type: ExtensionCommand.package_file,
          },
        });
      }
    },
    [vscode, validatePackagePath]
  );

  // Effect to trigger path validation when path changes
  useEffect(() => {
    if (packagePath.fsPath && packagePath.fsPath.trim() !== '') {
      const timeoutId = setTimeout(() => {
        validatePathWithExtension(packagePath.fsPath, packageValidationResults);
      }, 500);

      return () => clearTimeout(timeoutId);
    }
    return undefined;
  }, [packagePath.fsPath, packageValidationResults, validatePathWithExtension]);

  const handlePackagePathChange = (event: React.FormEvent<HTMLInputElement>, data: InputOnChangeData) => {
    dispatch(setPackagePath(data.value));
    setPackagePathError(validatePackagePath(data.value));
  };

  const onOpenExplorer = () => {
    vscode.postMessage({
      command: ExtensionCommand.update_package_path,
    });
  };

  return (
    <div className={styles.formSection}>
      <Text className={styles.sectionTitle} style={{ display: 'block' }}>
        {intlText.TITLE}
      </Text>

      <div className={styles.fieldContainer}>
        <Field
          required
          validationState={packagePathError ? 'error' : isValidatingPath ? 'warning' : undefined}
          validationMessage={packagePathError || (isValidatingPath ? 'Validating path...' : undefined)}
        >
          <Label required htmlFor={packagePathInputId}>
            {intlText.PACKAGE_PATH_LABEL}
          </Label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Input
              id={packagePathInputId}
              value={packagePath.fsPath ?? ''}
              onChange={handlePackagePathChange}
              className={styles.inputControl}
              style={{ width: '800px', fontFamily: 'monospace' }}
            />
            <Button onClick={onOpenExplorer} className={styles.browseButton} disabled={isValidatingPath}>
              {isValidatingPath ? 'Validating...' : intlText.BROWSE_BUTTON}
            </Button>
          </div>
          {packagePath.fsPath && (
            <Text
              size={200}
              style={{
                color:
                  packageValidationResults[packagePath.fsPath] === true
                    ? 'var(--colorPaletteGreenForeground1)'
                    : packageValidationResults[packagePath.fsPath] === false
                      ? 'var(--colorPaletteRedForeground1)'
                      : 'var(--colorNeutralForeground2)',
                fontFamily: 'monospace',
                marginTop: '4px',
                display: 'block',
                wordBreak: 'break-all',
              }}
            >
              {packagePath.fsPath}
              {packageValidationResults[packagePath.fsPath] === true && ' ✓ Valid path'}
              {packageValidationResults[packagePath.fsPath] === false && ' ✗ Invalid path'}
            </Text>
          )}
        </Field>
      </div>
    </div>
  );
};
