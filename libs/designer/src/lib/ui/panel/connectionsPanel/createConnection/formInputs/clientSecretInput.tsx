import { TextField } from '@fluentui/react';
import { Label } from '@microsoft/designer-ui';
import type React from 'react';
import { useIntl } from 'react-intl';

export interface ClientSecretInputProps {
  isLoading: boolean | undefined;
  parameterKey: string;
  setValue: (value: any) => void;
  value: any;
}

export interface IClientCertificateMetadata {
  pfx: string;
  password: string;
}

async function getBase64String(file: File): Promise<string> {
  return new Promise<string>((resolve, reject): void => {
    const reader = new FileReader();
    reader.onload = () => {
      const binaryData = reader.result as ArrayBuffer;
      const bytes = Array.from(new Uint8Array(binaryData));
      const base64String = btoa(bytes.map((item) => String.fromCharCode(item)).join(''));
      resolve(base64String);
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

const ClientSecretInput = (props: ClientSecretInputProps) => {
  const { parameterKey, setValue, value } = props;
  const intl = useIntl();

  const onFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];

      getBase64String(file).then((fileContent: string) => {
        const newValue = {
          ...value,
          pfx: fileContent,
        };

        setValue(newValue);
      });
    }
  };

  const onPasswordChange = (newPassword: string) => {
    const newValue = {
      ...value,
      password: newPassword,
    };

    setValue(newValue);
  };

  const uploadFileLabelText = intl.formatMessage({
    defaultMessage: 'Upload PFX File',
    id: 'ms78da7d57a593',
    description: 'Label for uploading certificate file for authentication',
  });

  const passwordLabelText = intl.formatMessage({
    defaultMessage: 'Password',
    id: 'ms8a852ae90417',
    description: 'Label for the password field for the selected certificate file',
  });

  const passwordPlaceholderText = intl.formatMessage({
    defaultMessage: '(Optional) Password for PFX file',
    id: 'ms509868d235e3',
    description: 'Placeholder for the optional password field for the selected certificate file',
  });

  return (
    <div style={{ width: 'inherit' }}>
      <Label text={uploadFileLabelText} htmlFor={`${parameterKey}-pfxFileInput`} isRequiredField={true} requiredMarkerSide={'right'} />
      <input className="connection-parameter-input" type="file" id={`${parameterKey}-pfxFileInput`} accept=".pfx" onChange={onFileChange} />
      <Label text={passwordLabelText} htmlFor={`${parameterKey}-pfxPasswordInput`} isRequiredField={false} />
      <TextField
        type="password"
        id={`${parameterKey}-pfxPasswordInput`}
        className="connection-parameter-input"
        autoComplete="off"
        rows={1}
        multiline={false}
        placeholder={passwordPlaceholderText}
        onBlur={(e) => onPasswordChange(e.target.value)}
      />
    </div>
  );
};

export default ClientSecretInput;
