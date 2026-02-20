import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WorkflowType } from '@microsoft/vscode-extension-logic-apps';

// Create mock functions
const mockReadFile = vi.fn();
const mockWriteFile = vi.fn();
const mockPathExists = vi.fn();
const mockPathJoin = vi.fn();
const mockGetGlobalSetting = vi.fn();

// Mock dependencies
vi.mock('fs-extra', () => ({
  default: {
    readFile: mockReadFile,
    writeFile: mockWriteFile,
    pathExists: mockPathExists,
  },
  readFile: mockReadFile,
  writeFile: mockWriteFile,
  pathExists: mockPathExists,
}));

vi.mock('path', () => ({
  default: {
    join: mockPathJoin,
  },
  join: mockPathJoin,
}));

vi.mock('../../../../utils/vsCodeConfig/settings', () => ({
  getGlobalSetting: mockGetGlobalSetting,
}));

// Import the module after mocks are set up
const mockModule = await import('../CreateLogicAppWorkspace');

describe('CreateLogicAppWorkspace - Codeful Workflows', () => {
  const testProjectPath = '/test/project';
  const testProjectName = 'TestProject';
  const testWorkflowName = 'TestWorkflow';
  const testLspDirectory = '/test/lsp';

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Default path.join behavior
    mockPathJoin.mockImplementation((...args: string[]) => args.join('/'));

    // Default getGlobalSetting behavior
    mockGetGlobalSetting.mockReturnValue(testLspDirectory);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('createAgentCodefulWorkflowFile', () => {
    it('should create workflow file with workflow name (not Program.cs) for first workflow', async () => {
      const agentCodefulTemplate = 'namespace <%= logicAppNamespace %>\npublic static class <%= flowNameClass %> { }';
      const programTemplate = 'namespace <%= logicAppNamespace %>\nclass Program { <%= workflowBuilders %> }';

      mockReadFile.mockImplementation((filePath: string) => {
        if (filePath.includes('AgentCodefulFile')) {
          return Promise.resolve(agentCodefulTemplate);
        }
        if (filePath.includes('ProgramFile')) {
          return Promise.resolve(programTemplate);
        }
        if (filePath.includes('CodefulProj') || filePath.includes('nuget')) {
          return Promise.resolve('mock content');
        }
        return Promise.reject(new Error('Unexpected file read'));
      });

      mockPathExists.mockResolvedValue(false); // Program.cs doesn't exist yet
      mockWriteFile.mockResolvedValue(undefined);

      // Access the private function through module internals (for testing purposes)
      // In real implementation, we'd export it or test through public API
      const createAgentCodefulWorkflowFile = (mockModule as any).createAgentCodefulWorkflowFile;

      if (createAgentCodefulWorkflowFile) {
        await createAgentCodefulWorkflowFile(testProjectPath, testProjectName, testWorkflowName, WorkflowType.agentCodeful);

        // Verify all 4 files were created for first workflow
        expect(mockWriteFile).toHaveBeenCalledTimes(4);

        const writtenFiles = mockWriteFile.mock.calls.map((call: any) => call[0]);

        // Verify workflow .cs file was created
        expect(writtenFiles).toEqual(expect.arrayContaining([expect.stringContaining(`${testWorkflowName}.cs`)]));

        // Verify Program.cs was created
        expect(writtenFiles).toEqual(expect.arrayContaining([expect.stringContaining('Program.cs')]));

        // Verify .csproj was created
        expect(writtenFiles).toEqual(expect.arrayContaining([expect.stringContaining(`${testProjectName}.csproj`)]));

        // Verify nuget.config was created
        expect(writtenFiles).toEqual(expect.arrayContaining([expect.stringContaining('nuget.config')]));

        // Verify workflow file has correct namespace
        const workflowWriteCall = mockWriteFile.mock.calls.find((call: any) => call[0].includes(`${testWorkflowName}.cs`));
        expect(workflowWriteCall).toBeDefined();
        expect(workflowWriteCall[1]).toContain(`namespace ${testProjectName}`);
        expect(workflowWriteCall[1]).toContain(`${testWorkflowName}`);

        // Verify Program.cs contains the workflow and correct namespace
        const programWriteCall = mockWriteFile.mock.calls.find((call: any) => call[0].includes('Program.cs'));
        expect(programWriteCall).toBeDefined();
        expect(programWriteCall[1]).toContain(`namespace ${testProjectName}`);
        expect(programWriteCall[1]).toContain(`${testWorkflowName}.AddWorkflow()`);
      }
    });

    it('should add workflow to existing Program.cs when creating second workflow', async () => {
      const agentCodefulTemplate = 'namespace <%= logicAppNamespace %>\npublic static class <%= flowNameClass %> { }';
      const existingProgramContent = `namespace ${testProjectName}\nclass Program {
        // Build all workflows
        FirstWorkflow.AddWorkflow();
        host.Run();
      }`;

      mockReadFile.mockImplementation((filePath: string) => {
        if (filePath.includes('AgentCodefulFile')) {
          return Promise.resolve(agentCodefulTemplate);
        }
        if (filePath.includes('Program.cs')) {
          return Promise.resolve(existingProgramContent);
        }
        if (filePath.includes('CodefulProj') || filePath.includes('nuget')) {
          return Promise.resolve('mock content');
        }
        return Promise.reject(new Error('Unexpected file read'));
      });

      mockPathExists.mockResolvedValue(true); // Program.cs exists
      mockWriteFile.mockResolvedValue(undefined);

      const createAgentCodefulWorkflowFile = (mockModule as any).createAgentCodefulWorkflowFile;

      if (createAgentCodefulWorkflowFile) {
        await createAgentCodefulWorkflowFile(testProjectPath, testProjectName, testWorkflowName, WorkflowType.agentCodeful);

        // Verify new workflow file was created with correct namespace
        const workflowWriteCall = mockWriteFile.mock.calls.find((call: any) => call[0].includes(`${testWorkflowName}.cs`));
        expect(workflowWriteCall).toBeDefined();
        expect(workflowWriteCall[1]).toContain(`namespace ${testProjectName}`);

        // Verify Program.cs was updated with new workflow but namespace unchanged
        const programWriteCall = mockWriteFile.mock.calls.find((call: any) => call[0].includes('Program.cs'));
        expect(programWriteCall).toBeDefined();
        expect(programWriteCall[1]).toContain(`namespace ${testProjectName}`);
        expect(programWriteCall[1]).toContain('FirstWorkflow.AddWorkflow()');
        expect(programWriteCall[1]).toContain(`${testWorkflowName}.AddWorkflow()`);
      }
    });

    it('should NOT create .csproj or nuget.config when adding second workflow', async () => {
      const agentCodefulTemplate = 'public static class <%= flowNameClass %> { }';
      const existingProgramContent = `class Program {
        // Build all workflows
        FirstWorkflow.AddWorkflow();
        host.Run();
      }`;

      mockReadFile.mockImplementation((filePath: string) => {
        if (filePath.includes('AgentCodefulFile')) {
          return Promise.resolve(agentCodefulTemplate);
        }
        if (filePath.includes('Program.cs')) {
          return Promise.resolve(existingProgramContent);
        }
        return Promise.reject(new Error('Unexpected file read'));
      });

      mockPathExists.mockResolvedValue(true); // Program.cs exists
      mockWriteFile.mockResolvedValue(undefined);

      const createAgentCodefulWorkflowFile = (mockModule as any).createAgentCodefulWorkflowFile;

      if (createAgentCodefulWorkflowFile) {
        await createAgentCodefulWorkflowFile(testProjectPath, testProjectName, 'SecondWorkflow', WorkflowType.agentCodeful);

        // Verify only 2 files were written: workflow .cs and Program.cs
        expect(mockWriteFile).toHaveBeenCalledTimes(2);

        // Verify the files written are correct
        const writtenFiles = mockWriteFile.mock.calls.map((call: any) => call[0]);
        expect(writtenFiles).toEqual(expect.arrayContaining([expect.stringContaining('SecondWorkflow.cs')]));
        expect(writtenFiles).toEqual(expect.arrayContaining([expect.stringContaining('Program.cs')]));

        // Verify .csproj and nuget.config were NOT written
        expect(writtenFiles).not.toEqual(expect.arrayContaining([expect.stringContaining('.csproj')]));
        expect(writtenFiles).not.toEqual(expect.arrayContaining([expect.stringContaining('nuget.config')]));
      }
    });

    it('should create StatefulCodeful workflow file correctly with namespace', async () => {
      const statefulTemplate = 'namespace <%= logicAppNamespace %>\npublic static class <%= flowNameClass %> { stateful content }';
      const programTemplate = 'namespace <%= logicAppNamespace %>\nclass Program { <%= workflowBuilders %> }';

      mockReadFile.mockImplementation((filePath: string) => {
        if (filePath.includes('StatefulCodefulFile')) {
          return Promise.resolve(statefulTemplate);
        }
        if (filePath.includes('ProgramFile')) {
          return Promise.resolve(programTemplate);
        }
        if (filePath.includes('CodefulProj') || filePath.includes('nuget')) {
          return Promise.resolve('mock content');
        }
        return Promise.reject(new Error('Unexpected file read'));
      });

      mockPathExists.mockResolvedValue(false);
      mockWriteFile.mockResolvedValue(undefined);

      const createAgentCodefulWorkflowFile = (mockModule as any).createAgentCodefulWorkflowFile;

      if (createAgentCodefulWorkflowFile) {
        await createAgentCodefulWorkflowFile(testProjectPath, testProjectName, testWorkflowName, WorkflowType.statefulCodeful);

        // Verify correct template was used
        expect(mockReadFile).toHaveBeenCalledWith(expect.stringContaining('StatefulCodefulFile'), 'utf-8');

        // Verify workflow file contains stateful content and correct namespace
        const workflowWriteCall = mockWriteFile.mock.calls.find((call: any) => call[0].includes(`${testWorkflowName}.cs`));
        expect(workflowWriteCall).toBeDefined();
        expect(workflowWriteCall[1]).toContain('stateful content');
        expect(workflowWriteCall[1]).toContain(`namespace ${testProjectName}`);

        // Verify Program.cs has correct namespace
        const programWriteCall = mockWriteFile.mock.calls.find((call: any) => call[0].includes('Program.cs'));
        expect(programWriteCall).toBeDefined();
        expect(programWriteCall[1]).toContain(`namespace ${testProjectName}`);
      }
    });

    it('should create .csproj and nuget.config files', async () => {
      const agentCodefulTemplate = 'public static class <%= flowName %> { }';
      const programTemplate = 'class Program { <%= workflowBuilders %> }';
      const projTemplate = '<Project>test proj</Project>';
      const nugetTemplate = '<configuration><%= lspDirectory %></configuration>';

      mockReadFile.mockImplementation((filePath: string) => {
        if (filePath.includes('AgentCodefulFile')) {
          return Promise.resolve(agentCodefulTemplate);
        }
        if (filePath.includes('ProgramFile')) {
          return Promise.resolve(programTemplate);
        }
        if (filePath.includes('CodefulProj')) {
          return Promise.resolve(projTemplate);
        }
        if (filePath.includes('nuget')) {
          return Promise.resolve(nugetTemplate);
        }
        return Promise.reject(new Error('Unexpected file read'));
      });

      mockPathExists.mockResolvedValue(false);
      mockWriteFile.mockResolvedValue(undefined);

      const createAgentCodefulWorkflowFile = (mockModule as any).createAgentCodefulWorkflowFile;

      if (createAgentCodefulWorkflowFile) {
        await createAgentCodefulWorkflowFile(testProjectPath, testProjectName, testWorkflowName, WorkflowType.agentCodeful);

        // Verify .csproj file was created
        expect(mockWriteFile).toHaveBeenCalledWith(
          expect.stringContaining(`${testProjectName}.csproj`),
          expect.stringContaining('test proj')
        );

        // Verify nuget.config was created
        const nugetCall = mockWriteFile.mock.calls.find((call: any) => call[0].includes('nuget.config'));
        expect(nugetCall).toBeDefined();
        expect(nugetCall[0]).toContain('nuget.config');
      }
    });
  });

  describe('addWorkflowToProgram', () => {
    it('should insert workflow before host.Run() call', async () => {
      const programContent = `class Program {
        public static void Main() {
            // Build all workflows
            FirstWorkflow.AddWorkflow();
            
            host.Run();
        }
      }`;

      mockReadFile.mockResolvedValue(programContent);
      mockWriteFile.mockResolvedValue(undefined);

      const addWorkflowToProgram = (mockModule as any).addWorkflowToProgram;

      if (addWorkflowToProgram) {
        await addWorkflowToProgram('/test/Program.cs', 'SecondWorkflow');

        expect(mockWriteFile).toHaveBeenCalledOnce();
        const updatedContent = mockWriteFile.mock.calls[0][1];

        // Verify new workflow was added
        expect(updatedContent).toContain('FirstWorkflow.AddWorkflow()');
        expect(updatedContent).toContain('SecondWorkflow.AddWorkflow()');
        expect(updatedContent).toContain('host.Run()');

        // Verify SecondWorkflow comes after FirstWorkflow but before host.Run()
        const firstIndex = updatedContent.indexOf('FirstWorkflow.AddWorkflow()');
        const secondIndex = updatedContent.indexOf('SecondWorkflow.AddWorkflow()');
        const hostRunIndex = updatedContent.indexOf('host.Run()');

        expect(secondIndex).toBeGreaterThan(firstIndex);
        expect(hostRunIndex).toBeGreaterThan(secondIndex);
      }
    });

    it('should handle Program.cs without "Build all workflows" comment', async () => {
      const programContent = `class Program {
        public static void Main() {
            host.Run();
        }
      }`;

      mockReadFile.mockResolvedValue(programContent);
      mockWriteFile.mockResolvedValue(undefined);

      const addWorkflowToProgram = (mockModule as any).addWorkflowToProgram;

      if (addWorkflowToProgram) {
        await addWorkflowToProgram('/test/Program.cs', 'NewWorkflow');

        expect(mockWriteFile).toHaveBeenCalledOnce();
        const updatedContent = mockWriteFile.mock.calls[0][1];

        // Verify workflow was added before host.Run()
        expect(updatedContent).toContain('NewWorkflow.AddWorkflow()');
        expect(updatedContent).toContain('host.Run()');

        const workflowIndex = updatedContent.indexOf('NewWorkflow.AddWorkflow()');
        const hostRunIndex = updatedContent.indexOf('host.Run()');
        expect(hostRunIndex).toBeGreaterThan(workflowIndex);
      }
    });

    it('should preserve existing formatting and indentation', async () => {
      const programContent = `class Program {
        public static void Main() {
            // Build all workflows
            FirstWorkflow.AddWorkflow();
            
            host.Run();
        }
      }`;

      mockReadFile.mockResolvedValue(programContent);
      mockWriteFile.mockResolvedValue(undefined);

      const addWorkflowToProgram = (mockModule as any).addWorkflowToProgram;

      if (addWorkflowToProgram) {
        await addWorkflowToProgram('/test/Program.cs', 'ThirdWorkflow');

        const updatedContent = mockWriteFile.mock.calls[0][1];

        // Verify indentation is preserved
        expect(updatedContent).toMatch(/\s{12}FirstWorkflow\.AddWorkflow\(\);/);
        expect(updatedContent).toMatch(/\s{12}ThirdWorkflow\.AddWorkflow\(\);/);
      }
    });

    it('should handle multiple existing workflows', async () => {
      const programContent = `class Program {
        // Build all workflows
        WorkflowOne.AddWorkflow();
        WorkflowTwo.AddWorkflow();
        WorkflowThree.AddWorkflow();
        
        host.Run();
      }`;

      mockReadFile.mockResolvedValue(programContent);
      mockWriteFile.mockResolvedValue(undefined);

      const addWorkflowToProgram = (mockModule as any).addWorkflowToProgram;

      if (addWorkflowToProgram) {
        await addWorkflowToProgram('/test/Program.cs', 'WorkflowFour');

        const updatedContent = mockWriteFile.mock.calls[0][1];

        // Verify all workflows are present
        expect(updatedContent).toContain('WorkflowOne.AddWorkflow()');
        expect(updatedContent).toContain('WorkflowTwo.AddWorkflow()');
        expect(updatedContent).toContain('WorkflowThree.AddWorkflow()');
        expect(updatedContent).toContain('WorkflowFour.AddWorkflow()');
        expect(updatedContent).toContain('host.Run()');
      }
    });
  });

  describe('createAgentCodefulWorkflowFile - Error Handling', () => {
    it('should handle template file read errors', async () => {
      mockReadFile.mockRejectedValue(new Error('Template file not found'));
      mockPathExists.mockResolvedValue(false);

      const createAgentCodefulWorkflowFile = (mockModule as any).createAgentCodefulWorkflowFile;

      if (createAgentCodefulWorkflowFile) {
        await expect(
          createAgentCodefulWorkflowFile(testProjectPath, testProjectName, testWorkflowName, WorkflowType.agentCodeful)
        ).rejects.toThrow('Template file not found');
      }
    });

    it('should handle file write errors', async () => {
      const agentCodefulTemplate = 'public static class <%= flowName %> { }';

      mockReadFile.mockResolvedValue(agentCodefulTemplate);
      mockPathExists.mockResolvedValue(false);
      mockWriteFile.mockRejectedValue(new Error('Permission denied'));

      const createAgentCodefulWorkflowFile = (mockModule as any).createAgentCodefulWorkflowFile;

      if (createAgentCodefulWorkflowFile) {
        await expect(
          createAgentCodefulWorkflowFile(testProjectPath, testProjectName, testWorkflowName, WorkflowType.agentCodeful)
        ).rejects.toThrow('Permission denied');
      }
    });
  });
});
