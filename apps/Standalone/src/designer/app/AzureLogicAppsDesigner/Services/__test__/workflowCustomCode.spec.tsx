// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';
import type { VFSObject } from '@microsoft/logic-apps-shared';
import { useAllCustomCodeFiles, useAllCustomCodeFilesWithMetadata } from '../WorkflowAndArtifacts';
import { fetchFileData, fetchFilesFromFolder } from '../vfsService';

vi.mock('../vfsService', () => ({
  fetchFileData: vi.fn(),
  fetchFilesFromFolder: vi.fn(),
}));
vi.mock('@microsoft/logic-apps-designer', () => ({}));
vi.mock('@microsoft/logic-apps-shared', () => ({}));
vi.mock('../HttpClient', () => ({}));
vi.mock('../ConsumptionSerializationHelpers', () => ({}));
vi.mock('../../Utilities/HybridAppUtilities', () => ({ hybridApiVersion: 'test' }));
vi.mock('../../Utilities/ArmParser', () => ({}));
vi.mock('../StandardManagement', () => ({
  armOnlyStandardManagement: {},
  getStandardManagementCacheKey: () => 'arm',
}));

describe('custom code metadata for draft freshness', () => {
  let queryClient: QueryClient;
  const wrapper = ({ children }: PropsWithChildren) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  const file = (name: string, mtime: string): VFSObject => ({
    name,
    mtime,
    crtime: mtime,
    size: 1,
    mime: 'application/json',
    href: name,
    path: name,
  });
  const productionFile = file('workflow.json', '2026-10-26T12:00:00Z');
  const draftFile = file('workflow-draft.json', '2026-10-20T12:00:00Z');

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, cacheTime: 0 } } });
    vi.mocked(fetchFilesFromFolder).mockResolvedValue([productionFile, draftFile]);
    vi.mocked(fetchFileData).mockResolvedValue('draft-content');
  });

  afterEach(() => {
    cleanup();
    queryClient.clear();
  });

  it('retains production and draft timestamps without loading production as custom code', async () => {
    const { result } = renderHook(() => useAllCustomCodeFilesWithMetadata('/app', 'workflow'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({
      files: { 'workflow-draft.json': 'draft-content' },
      metadata: { 'workflow.json': productionFile, 'workflow-draft.json': draftFile },
    });
    expect(fetchFileData).toHaveBeenCalledOnce();
    expect(fetchFileData).toHaveBeenCalledWith('https://management.azure.com/app/hostruntime/admin/vfs/workflow/workflow-draft.json');
  });

  it('shares the query with legacy consumers and keeps their refetch result content-only', async () => {
    const { result } = renderHook(
      () => ({
        content: useAllCustomCodeFiles('/app', 'workflow'),
        metadata: useAllCustomCodeFilesWithMetadata('/app', 'workflow'),
      }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.content.isSuccess).toBe(true));
    expect(fetchFilesFromFolder).toHaveBeenCalledOnce();
    expect(result.current.content.data).toEqual({ 'workflow-draft.json': 'draft-content' });
    await act(async () => {
      const refreshed = await result.current.content.refetch();
      expect(refreshed.data).toEqual({ 'workflow-draft.json': 'draft-content' });
    });
    expect(result.current.metadata.data?.metadata['workflow.json']).toEqual(productionFile);
  });

  it('does not use VFS for hybrid workflows', async () => {
    const { result } = renderHook(() => useAllCustomCodeFilesWithMetadata('/app', 'workflow', true), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ files: {}, metadata: {} });
    expect(fetchFilesFromFolder).not.toHaveBeenCalled();
    expect(fetchFileData).not.toHaveBeenCalled();
  });
});
