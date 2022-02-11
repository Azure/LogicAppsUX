import Editor, { loader } from '@monaco-editor/react';
import React, { useEffect } from 'react';

// TODO: Add more languages
export enum EditorLanguage {
  javascript = 'javascript',
}

export interface EditorProps {
  height: string;
  width: string;
  language?: EditorLanguage;
  value?: string;
  defaultValue?: string;
}

const CustomEditor: React.FC<EditorProps> = (props) => {
  const { height, width, value, language, defaultValue } = props;

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
      value={value}
      defaultValue={defaultValue}
      defaultLanguage={language ? language.toString() : undefined}
    />
  );
};

export default CustomEditor;
