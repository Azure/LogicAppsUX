import { useState, useRef, useEffect } from 'react';
import { Input } from '@fluentui/react-components';

interface EditableFileNameProps {
  fileExtension: string;
  initialFileName: string;
  handleFileNameChange: (fileName: string) => void;
}

const EditableFileName = ({ fileExtension, initialFileName, handleFileNameChange }: EditableFileNameProps) => {
  const [fileName, setFileName] = useState(initialFileName);
  const [inputWidth, setInputWidth] = useState(1);
  const spanRef = useRef<HTMLSpanElement>(null);

  const getFileNameWithoutExtension = (fileName: string) => fileName.slice(0, fileName.lastIndexOf('.'));

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const base = event.target.value;
    const newFileName = `${base}${fileExtension}`;
    setFileName(newFileName);
  };

  const handleBlur = () => {
    handleFileNameChange(fileName);
  };

  // Dynamically adjust the width of the input
  useEffect(() => {
    if (spanRef.current) {
      setInputWidth(spanRef.current.offsetWidth + 20);
    }
  }, [fileName]);

  return (
    <div className="msla-custom-code-editor-fileName" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
      {/* Hidden span to measure text width */}
      <span
        ref={spanRef}
        style={{
          position: 'absolute',
          visibility: 'hidden',
          whiteSpace: 'pre',
          fontSize: '14px',
          fontFamily: 'inherit',
        }}
      >
        {getFileNameWithoutExtension(fileName) || ' '}
      </span>
      <Input
        value={getFileNameWithoutExtension(fileName)}
        onChange={handleInputChange}
        onBlur={handleBlur}
        size="small"
        appearance="outline"
        style={{
          width: `${inputWidth}px`,
          minWidth: '50px',
        }}
      />
      <span>{fileExtension}</span>
    </div>
  );
};

export default EditableFileName;
