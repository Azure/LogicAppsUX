import React, { useRef } from 'react';

interface FileUploadProps {
  onFileSelect: (files: FileList) => void;
  maxFileSize?: number;
  allowedFileTypes?: string[];
  disabled?: boolean;
}

export function FileUpload({
  onFileSelect,
  maxFileSize = 10 * 1024 * 1024, // 10MB default
  allowedFileTypes,
  disabled,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    if (inputRef.current && !disabled) {
      inputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    if (input.files && input.files.length > 0) {
      const validFiles: File[] = [];

      for (let i = 0; i < input.files.length; i++) {
        const file = input.files[i];

        // Check file size
        if (file.size > maxFileSize) {
          alert(`File "${file.name}" is too large. Maximum size is ${formatFileSize(maxFileSize)}`);
          continue;
        }

        // Check file type
        if (allowedFileTypes && allowedFileTypes.length > 0) {
          const fileExtension = file.name.split('.').pop()?.toLowerCase();
          const isAllowed = allowedFileTypes.some((type) => {
            if (type.includes('*')) {
              // Handle wildcard types like "image/*"
              return file.type.startsWith(type.replace(/\*/g, ''));
            }
            return type === `.${fileExtension}` || type === file.type;
          });

          if (!isAllowed) {
            alert(`File type "${fileExtension}" is not allowed`);
            continue;
          }
        }

        validFiles.push(file);
      }

      if (validFiles.length > 0) {
        // Create a FileList-like object for the valid files
        // In tests, we need to pass the original files to maintain object identity
        if (typeof DataTransfer !== 'undefined') {
          const dataTransfer = new DataTransfer();
          validFiles.forEach((file) => dataTransfer.items.add(file));
          onFileSelect(dataTransfer.files);
        } else {
          // Fallback for environments where DataTransfer is not available (like tests)
          // Create a FileList-like array with the files
          const fileList = Object.assign(validFiles, {
            item: (index: number) => validFiles[index],
          }) as unknown as FileList;
          onFileSelect(fileList);
        }
      }

      // Reset input
      input.value = '';
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={allowedFileTypes?.join(',')}
        onChange={handleFileChange}
        className="hiddenInput"
        disabled={disabled}
      />
      <button
        type="button"
        onClick={handleClick}
        className="uploadButton"
        disabled={disabled}
        title="Attach files"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M10.5 4.5L10.5 13.5M10.5 13.5L7 10M10.5 13.5L14 10"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M5 16H16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
    </>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
