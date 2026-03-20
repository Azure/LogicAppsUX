import type { UploadFile } from '@microsoft/logic-apps-shared';
import { useRef, useState, useCallback, type DragEvent, type ChangeEvent } from 'react';
import { Text, tokens, mergeClasses } from '@fluentui/react-components';
import { ArrowUpload24Regular, DocumentAdd24Regular } from '@fluentui/react-icons';
import { useIntl } from 'react-intl';
import { useStyles } from './styles';

type FileHandler = (file: UploadFile) => void;
export interface FileDropZoneProps {
  accept: string;
  disabled?: boolean;
  isMultiUpload: boolean;
  onAdd: FileHandler;
  onRemove?: FileHandler;
}

export const FileDropZone = ({ accept, disabled, onAdd }: FileDropZoneProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);
  const intl = useIntl();
  const styles = useStyles();

  const INTL_TEXT = {
    ariaLabel: intl.formatMessage({
      defaultMessage: 'Drop files here or select to browse.',
      id: '6Y7uWR',
      description: 'The aria label for the file drop zone component',
    }),
    mainText: intl.formatMessage({
      defaultMessage: 'Drag and drop files here.',
      id: 'nZF+C5',
      description: 'The main instruction text for the file drop zone component',
    }),
    subText: intl.formatMessage({
      defaultMessage: 'or ',
      id: 'nr5F3I',
      description: 'The sub instruction text for the file drop zone component',
    }),
    draggingText: intl.formatMessage({
      defaultMessage: 'Drop files here.',
      id: 'Mb950s',
      description: 'The instruction text when dragging files over the drop zone',
    }),
    browseLinkText: intl.formatMessage({
      defaultMessage: 'browse to upload.',
      id: 'AwnX1W',
      description: 'The text for the link that opens the file browser in the file drop zone component',
    }),
    acceptText: intl.formatMessage(
      {
        defaultMessage: 'Accepted formats: {formats}',
        id: '33ZkJ+',
        description: 'The text that describes the accepted file formats, with a placeholder for the formats',
      },
      { formats: accept }
    ),
  };

  const handleDragEnter = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) {
        dragCounterRef.current++;
        if (dragCounterRef.current === 1) {
          setIsDragging(true);
        }
      }
    },
    [disabled]
  );

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current = 0;
      setIsDragging(false);

      if (disabled) {
        return;
      }

      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        const file = files[0];
        if (accept) {
          const acceptedTypes = accept.split(',').map((t) => t.trim());
          const fileExtension = `.${file.name.split('.').pop()?.toLowerCase()}`;
          const isAccepted = acceptedTypes.some((type) => type === file.type || type === fileExtension || type === '*/*');
          if (!isAccepted) {
            return;
          }
        }
        onAdd({ uuid: Date.now(), file });
      }
    },
    [accept, disabled, onAdd]
  );

  const handleFileSelect = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        onAdd({ uuid: Date.now(), file });
      }
      // Reset input value to allow selecting the same file again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [onAdd]
  );

  const handleClick = useCallback(() => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [disabled]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
        e.preventDefault();
        fileInputRef.current?.click();
      }
    },
    [disabled]
  );

  return (
    <div
      className={mergeClasses(styles.container, isDragging ? styles.dragging : undefined, disabled ? styles.disabled : undefined)}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label={INTL_TEXT.ariaLabel}
      aria-disabled={disabled}
    >
      <input ref={fileInputRef} type="file" accept={accept} disabled={disabled} onChange={handleFileSelect} style={{ display: 'none' }} />
      <div className={styles.icon}>
        {isDragging ? (
          <DocumentAdd24Regular primaryFill={tokens.colorBrandForeground1} />
        ) : (
          <ArrowUpload24Regular primaryFill={tokens.colorBrandForeground1} />
        )}
      </div>
      <Text weight="semibold" className={styles.mainText}>
        {isDragging ? INTL_TEXT.draggingText : INTL_TEXT.mainText}
      </Text>
      <Text size={200} className={styles.subText}>
        {INTL_TEXT.subText}
        <span className={styles.linkText}>{INTL_TEXT.browseLinkText}</span>
      </Text>
      {accept && (
        <Text size={100} className={styles.acceptText}>
          {INTL_TEXT.acceptText}
        </Text>
      )}
    </div>
  );
};
