import type { SchemaType } from '../../models';
import type { FileWithVsCodePath, SchemaFile } from './AddOrUpdateSchemaView';
import { Button, Input } from '@fluentui/react-components';
import { StackShim } from '@fluentui/react-migration-v8-v9';
import { useRef } from 'react';
import { useIntl } from 'react-intl';

export type UploadNewSchemaProps = {
  acceptedSchemaFileInputExtensions: string;
  setSelectedSchemaFile: (item?: SchemaFile) => void;
  schemaType?: SchemaType;
  selectedSchemaFile?: SchemaFile;
};

export const UploadNewSchema = (props: UploadNewSchemaProps) => {
  const schemaFileInputRef = useRef<HTMLInputElement>(null);

  // intl
  const intl = useIntl();
  const uploadMessage = intl.formatMessage({
    defaultMessage: 'Select a file to upload',
    description: 'Placeholder for input to load a schema file',
  });
  const browseLoc = intl.formatMessage({
    defaultMessage: 'Browse',
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
    } else if (!props.schemaType) {
      console.error('Missing schemaType');
    } else {
      props.setSelectedSchemaFile({ name: schemaFile.name, path: schemaFile.path, type: props.schemaType });
    }
  };

  return (
    <div>
      <input type="file" ref={schemaFileInputRef} onInput={onSelectSchemaFile} accept={props.acceptedSchemaFileInputExtensions} hidden />
      <StackShim horizontal>
        <Input value={props.selectedSchemaFile?.name} placeholder={uploadMessage} readOnly />
        <Button appearance="primary" onClick={() => schemaFileInputRef.current?.click()} style={{ marginLeft: 8 }}>
          {browseLoc}
        </Button>
      </StackShim>
    </div>
  );
};
