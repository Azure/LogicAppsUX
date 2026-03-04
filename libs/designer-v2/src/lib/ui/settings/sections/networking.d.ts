/// <reference types="react" />
import type { DownloadChunkMetadata, UploadChunkMetadata } from '@microsoft/logic-apps-shared';
import type { DropdownSelectionChangeHandler, SectionProps, TextChangeHandler, ToggleHandler } from '..';
export interface NetworkingSectionProps extends SectionProps {
    chunkedTransferMode: boolean;
    uploadChunkMetadata: UploadChunkMetadata | undefined;
    downloadChunkMetadata: DownloadChunkMetadata | undefined;
    hideContentTransferSettings: boolean | undefined;
    onAsyncPatternToggle: ToggleHandler;
    onAsyncResponseToggle: ToggleHandler;
    onRequestOptionsChange: TextChangeHandler;
    onSuppressHeadersToggle: ToggleHandler;
    onPaginationToggle: ToggleHandler;
    onPaginationValueChange: TextChangeHandler;
    onHeadersOnResponseToggle: ToggleHandler;
    onContentTransferToggle: ToggleHandler;
    onRetryPolicyChange: DropdownSelectionChangeHandler;
    onRetryCountChange: TextChangeHandler;
    onRetryIntervalChange: TextChangeHandler;
    onRetryMinIntervalChange: TextChangeHandler;
    onRetryMaxIntervalChange: TextChangeHandler;
    onUploadChunkSizeChange: TextChangeHandler;
    onDownloadChunkSizeChange: TextChangeHandler;
}
export declare const Networking: ({ nodeId, readOnly, expanded, validationErrors, retryPolicy, suppressWorkflowHeaders, suppressWorkflowHeadersOnResponse, paging, uploadChunk, uploadChunkMetadata, downloadChunkMetadata, downloadChunkSize, asynchronous, disableAsyncPattern, requestOptions, chunkedTransferMode, hideContentTransferSettings, onAsyncPatternToggle, onAsyncResponseToggle, onRequestOptionsChange, onSuppressHeadersToggle, onPaginationToggle, onPaginationValueChange, onHeadersOnResponseToggle, onContentTransferToggle, onUploadChunkSizeChange, onDownloadChunkSizeChange, onRetryPolicyChange, onRetryCountChange, onRetryIntervalChange, onRetryMinIntervalChange, onRetryMaxIntervalChange, onHeaderClick, }: NetworkingSectionProps) => JSX.Element;
