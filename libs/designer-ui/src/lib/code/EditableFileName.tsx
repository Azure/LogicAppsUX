import { useState } from 'react';

interface EditableFileNameProps {
  fileExtension: string;
  initialFileName: string;
  handleFileNameChange: (fileName: string) => void;
}

const EditableFileName = ({ fileExtension, initialFileName, handleFileNameChange }: EditableFileNameProps) => {
  const [fileName, setFileName] = useState(initialFileName);

  const getFileNameWithoutExtension = (fileName: string) => fileName.slice(0, fileName.lastIndexOf('.'));

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const base = event.target.value;
    const newFileName = `${base}${fileExtension}`;
    setFileName(newFileName);
  };
  const handleBlur = () => {
    handleFileNameChange(fileName);
  };

  return (
    <div className="msla-custom-code-editor-fileName">
      <input
        type="text"
        value={getFileNameWithoutExtension(fileName)}
        onChange={handleInputChange}
        onBlur={handleBlur}
        style={{ display: 'inline-block', border: '1px solid gray', padding: '2px' }}
        size={getFileNameWithoutExtension(fileName).length || 1}
      />
      {fileExtension}
    </div>
  );
};

export default EditableFileName;
