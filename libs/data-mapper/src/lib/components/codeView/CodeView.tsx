import { Stack } from '@fluentui/react';
import { Button, Text } from '@fluentui/react-components';
import { Code20Regular, Dismiss20Regular } from '@fluentui/react-icons';
import { EditorLanguage, MonacoEditor } from '@microsoft/designer-ui';
import { useIntl } from 'react-intl';

export interface CodeViewProps {
  dataMapDefYaml: string;
  isCodeViewOpen: boolean;
  setIsCodeViewOpen: (isOpen: boolean) => void;
}

export const CodeView = ({ dataMapDefYaml, isCodeViewOpen, setIsCodeViewOpen }: CodeViewProps) => {
  const intl = useIntl();

  const codeViewLoc = intl.formatMessage({
    defaultMessage: 'Code view',
    description: 'Code view title',
  });

  return (
    <div style={{ display: isCodeViewOpen ? 'block' : 'hidden' }}>
      <Stack horizontal verticalAlign="center">
        <Stack horizontal verticalAlign="center">
          <Code20Regular />
          <Text>{codeViewLoc}</Text>
        </Stack>

        <Button icon={<Dismiss20Regular />} onClick={() => setIsCodeViewOpen(false)} />
      </Stack>

      <MonacoEditor
        language={EditorLanguage.templateExpressionLanguage}
        value={dataMapDefYaml}
        lineNumbers="on"
        scrollbar={{ horizontal: 'auto', vertical: 'hidden' }}
        readOnly
      />
    </div>
  );
};
