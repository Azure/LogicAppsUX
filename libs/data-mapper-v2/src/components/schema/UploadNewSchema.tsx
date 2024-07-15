import type { FileWithVsCodePath, SchemaFile } from '../../models/Schema';
import { Button, Input } from '@fluentui/react-components';
import { StackShim } from '@fluentui/react-migration-v8-v9';
import type { SchemaType } from '@microsoft/logic-apps-shared';
import { useRef } from 'react';
import { useIntl } from 'react-intl';

export type UploadNewSchemaProps = {
  acceptedSchemaFileInputExtensions: string;
  setSelectedSchemaFile: (item: SchemaFile) => void;
  schemaType?: SchemaType;
  selectedSchemaFile?: SchemaFile;
};

export const UploadNewSchema = (props: UploadNewSchemaProps) => {
  const schemaFileInputRef = useRef<HTMLInputElement>(null);

  // intl
  const intl = useIntl();
  const uploadMessage = intl.formatMessage({
    defaultMessage: 'Select a file to upload',
    id: '2CXCOt',
    description: 'Placeholder for input to load a schema file',
  });
  const browseLoc = intl.formatMessage({
    defaultMessage: 'Browse',
    id: 'syiNc+',
    description: 'Browse for file',
  });

  const onSelectSchemaFile = (event: React.FormEvent<HTMLInputElement>) => {
    if (!event?.currentTarget?.files) {
      console.error('Files array is empty');
      return;
    }

    const schemaFile = event.currentTarget.files[0] as FileWithVsCodePath;
    if (!schemaFile.path) {
      console.log('Path property is missing from file (should only occur in browser/standalone)');
    } else if (props.schemaType) {
      props.setSelectedSchemaFile({
        name: schemaFile.name,
        path: schemaFile.path,
        type: props.schemaType,
      });
    } else {
      console.error('Missing schemaType');
    }
  };

  return (
    <div>
      <input type="file" ref={schemaFileInputRef} onInput={onSelectSchemaFile} accept={props.acceptedSchemaFileInputExtensions} hidden />
      <StackShim horizontal>
        <Input size="small" value={props.selectedSchemaFile?.name} placeholder={uploadMessage} readOnly />
        <Button
          size="small"
          shape="square"
          appearance="secondary"
          onClick={() => schemaFileInputRef.current?.click()}
          style={{ marginLeft: 8 }}
        >
          {browseLoc}
        </Button>
      </StackShim>
    </div>
  );
};
