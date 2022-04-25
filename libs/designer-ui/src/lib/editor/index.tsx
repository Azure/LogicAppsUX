import Editor, { loader } from '@monaco-editor/react';
import { useEffect } from 'react';

export * from './models/parameter';

// TODO: Add more languages
export enum EditorLanguage {
  javascript = 'javascript',
  json = 'json',
  xml = 'xml',
}

export interface EditorProps {
  defaultValue?: string;
  folding?: boolean;
  height?: number | string;
  language?: EditorLanguage;
  lineNumbers?: 'on' | 'off' | 'relative' | 'interval' | ((lineNumber: number) => string);
  minimapEnabled?: boolean;
  readOnly?: boolean;
  width?: number | string;
  value?: string;
}

const CustomEditor: React.FC<EditorProps> = (props) => {
  const {
    folding = true,
    height = '100%',
    width = '100%',
    lineNumbers = 'on',
    minimapEnabled = true,
    readOnly = false,
    value,
    language,
    defaultValue,
  } = props;

  const initEditor = () => {
    loader.init().then((monaco) => {
      // TODO: init monaco and add custom lang
    });
  };

  useEffect(() => {
    initEditor();
  }, []);

  return (
    <Editor
      height={height}
      width={width}
      options={{ folding, lineNumbers, minimap: { enabled: minimapEnabled }, readOnly }}
      value={value}
      defaultValue={defaultValue}
      defaultLanguage={language ? language.toString() : undefined}
    />
  );
};

export default CustomEditor;
