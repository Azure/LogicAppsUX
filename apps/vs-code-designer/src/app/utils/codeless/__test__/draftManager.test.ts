import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as path from 'path';

vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  unlinkSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

vi.mock('../../../../constants', () => ({
  draftWorkflowFileName: 'workflow.draft.json',
  draftConnectionsFileName: 'connections.draft.json',
  draftParametersFileName: 'parameters.draft.json',
}));

import { existsSync, readFileSync, writeFileSync, unlinkSync, mkdirSync } from 'fs';
import {
  getDraftWorkflowPath,
  getDraftConnectionsPath,
  getDraftParametersPath,
  hasDraft,
  saveDraft,
  loadDraft,
  discardDraft,
} from '../draftManager';

const workflowFilePath = path.join('/project', 'myWorkflow', 'workflow.json');
const workflowDir = path.dirname(workflowFilePath);

describe('draftManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('path helpers', () => {
    it('getDraftWorkflowPath returns workflow.draft.json in the same directory', () => {
      expect(getDraftWorkflowPath(workflowFilePath)).toBe(path.join(workflowDir, 'workflow.draft.json'));
    });

    it('getDraftConnectionsPath returns connections.draft.json in the same directory', () => {
      expect(getDraftConnectionsPath(workflowFilePath)).toBe(path.join(workflowDir, 'connections.draft.json'));
    });

    it('getDraftParametersPath returns parameters.draft.json in the same directory', () => {
      expect(getDraftParametersPath(workflowFilePath)).toBe(path.join(workflowDir, 'parameters.draft.json'));
    });
  });

  describe('hasDraft', () => {
    it('returns true when draft workflow file exists', () => {
      vi.mocked(existsSync).mockReturnValue(true);
      expect(hasDraft(workflowFilePath)).toBe(true);
      expect(existsSync).toHaveBeenCalledWith(path.join(workflowDir, 'workflow.draft.json'));
    });

    it('returns false when draft workflow file does not exist', () => {
      vi.mocked(existsSync).mockReturnValue(false);
      expect(hasDraft(workflowFilePath)).toBe(false);
    });
  });

  describe('saveDraft', () => {
    const definition = { triggers: {}, actions: { action1: { type: 'Http' } } };
    const connectionReferences = { conn1: { api: { id: '/providers/test' } } };
    const parameters = { param1: { type: 'String', value: 'hello' } };

    it('creates directory and writes definition file', () => {
      saveDraft(workflowFilePath, { definition });

      expect(mkdirSync).toHaveBeenCalledWith(workflowDir, { recursive: true });
      expect(writeFileSync).toHaveBeenCalledWith(
        path.join(workflowDir, 'workflow.draft.json'),
        JSON.stringify(definition, null, 4),
        'utf8'
      );
    });

    it('writes connections file when connectionReferences provided', () => {
      saveDraft(workflowFilePath, { definition, connectionReferences });

      expect(writeFileSync).toHaveBeenCalledWith(
        path.join(workflowDir, 'connections.draft.json'),
        JSON.stringify(connectionReferences, null, 4),
        'utf8'
      );
    });

    it('writes parameters file when parameters provided', () => {
      saveDraft(workflowFilePath, { definition, parameters });

      expect(writeFileSync).toHaveBeenCalledWith(
        path.join(workflowDir, 'parameters.draft.json'),
        JSON.stringify(parameters, null, 4),
        'utf8'
      );
    });

    it('does not write connections file when connectionReferences is undefined', () => {
      saveDraft(workflowFilePath, { definition });

      const writeCallPaths = vi.mocked(writeFileSync).mock.calls.map((call) => call[0]);
      expect(writeCallPaths).not.toContain(path.join(workflowDir, 'connections.draft.json'));
    });

    it('does not write parameters file when parameters is undefined', () => {
      saveDraft(workflowFilePath, { definition });

      const writeCallPaths = vi.mocked(writeFileSync).mock.calls.map((call) => call[0]);
      expect(writeCallPaths).not.toContain(path.join(workflowDir, 'parameters.draft.json'));
    });

    it('writes all three files when all data provided', () => {
      saveDraft(workflowFilePath, { definition, connectionReferences, parameters });

      expect(writeFileSync).toHaveBeenCalledTimes(3);
    });
  });

  describe('loadDraft', () => {
    const definition = { triggers: {}, actions: {} };
    const connections = { conn1: { api: { id: '/test' } } };
    const parameters = { param1: { type: 'String' } };

    it('returns hasDraft false when no draft file exists', () => {
      vi.mocked(existsSync).mockReturnValue(false);

      const result = loadDraft(workflowFilePath);

      expect(result).toEqual({ hasDraft: false });
    });

    it('loads only workflow definition when only draft workflow exists', () => {
      vi.mocked(existsSync).mockImplementation((p: any) => {
        return p === path.join(workflowDir, 'workflow.draft.json');
      });
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(definition));

      const result = loadDraft(workflowFilePath);

      expect(result.hasDraft).toBe(true);
      expect(result.draftWorkflow).toEqual(definition);
      expect(result.draftConnections).toBeUndefined();
      expect(result.draftParameters).toBeUndefined();
    });

    it('loads all draft artifacts when all files exist', () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockImplementation((p: any) => {
        if (String(p).includes('workflow.draft.json')) {
          return JSON.stringify(definition);
        }
        if (String(p).includes('connections.draft.json')) {
          return JSON.stringify(connections);
        }
        if (String(p).includes('parameters.draft.json')) {
          return JSON.stringify(parameters);
        }
        return '{}';
      });

      const result = loadDraft(workflowFilePath);

      expect(result.hasDraft).toBe(true);
      expect(result.draftWorkflow).toEqual(definition);
      expect(result.draftConnections).toEqual(connections);
      expect(result.draftParameters).toEqual(parameters);
    });

    it('loads workflow and connections without parameters', () => {
      vi.mocked(existsSync).mockImplementation((p: any) => {
        return !String(p).includes('parameters.draft.json');
      });
      vi.mocked(readFileSync).mockImplementation((p: any) => {
        if (String(p).includes('workflow.draft.json')) {
          return JSON.stringify(definition);
        }
        if (String(p).includes('connections.draft.json')) {
          return JSON.stringify(connections);
        }
        return '{}';
      });

      const result = loadDraft(workflowFilePath);

      expect(result.hasDraft).toBe(true);
      expect(result.draftWorkflow).toEqual(definition);
      expect(result.draftConnections).toEqual(connections);
      expect(result.draftParameters).toBeUndefined();
    });
  });

  describe('discardDraft', () => {
    it('deletes all existing draft files', () => {
      vi.mocked(existsSync).mockReturnValue(true);

      discardDraft(workflowFilePath);

      expect(unlinkSync).toHaveBeenCalledTimes(3);
      expect(unlinkSync).toHaveBeenCalledWith(path.join(workflowDir, 'workflow.draft.json'));
      expect(unlinkSync).toHaveBeenCalledWith(path.join(workflowDir, 'connections.draft.json'));
      expect(unlinkSync).toHaveBeenCalledWith(path.join(workflowDir, 'parameters.draft.json'));
    });

    it('only deletes files that exist', () => {
      vi.mocked(existsSync).mockImplementation((p: any) => {
        return String(p).includes('workflow.draft.json');
      });

      discardDraft(workflowFilePath);

      expect(unlinkSync).toHaveBeenCalledTimes(1);
      expect(unlinkSync).toHaveBeenCalledWith(path.join(workflowDir, 'workflow.draft.json'));
    });

    it('does nothing when no draft files exist', () => {
      vi.mocked(existsSync).mockReturnValue(false);

      discardDraft(workflowFilePath);

      expect(unlinkSync).not.toHaveBeenCalled();
    });
  });
});
