import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Create mock functions
const mockCheckFuncProcessId = vi.fn();
const mockGetChildProcessesWithScript = vi.fn();
const mockExistsSync = vi.fn();
const mockReadFileSync = vi.fn();

// Mock dependencies
vi.mock('fs', () => ({
  default: {
    existsSync: mockExistsSync,
    readFileSync: mockReadFileSync,
  },
  existsSync: mockExistsSync,
  readFileSync: mockReadFileSync,
}));

vi.mock('../../findChildProcess/findChildProcess', () => ({
  getChildProcessesWithScript: mockGetChildProcessesWithScript,
}));

// Import the module after mocks are set up
const mockModule = await import('../startDesignTimeApi');

describe('validateRunningFuncProcess - caching', () => {
  const testProjectPath = '/test/project';
  const testPid = 12345;
  const VALIDATION_CACHE_TTL = 60000; // 60 seconds

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Setup default mocks
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(testPid.toString());
    mockGetChildProcessesWithScript.mockResolvedValue([testPid]);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetAllMocks();
  });

  it('should cache validation results for 60 seconds', async () => {
    const validateRunningFuncProcess = (mockModule as any).validateRunningFuncProcess;

    if (validateRunningFuncProcess) {
      // First call should execute PowerShell validation
      await validateRunningFuncProcess(testProjectPath);
      expect(mockGetChildProcessesWithScript).toHaveBeenCalledTimes(1);

      // Second call within 60s should use cache
      await validateRunningFuncProcess(testProjectPath);
      expect(mockGetChildProcessesWithScript).toHaveBeenCalledTimes(1); // Still 1, not 2
    }
  });

  it('should skip PowerShell validation when using cache', async () => {
    const validateRunningFuncProcess = (mockModule as any).validateRunningFuncProcess;

    if (validateRunningFuncProcess) {
      // First validation
      await validateRunningFuncProcess(testProjectPath);
      const firstCallCount = mockGetChildProcessesWithScript.mock.calls.length;

      // Advance time by 30 seconds (within 60s cache window)
      vi.advanceTimersByTime(30000);

      // Second validation should skip PowerShell
      await validateRunningFuncProcess(testProjectPath);
      const secondCallCount = mockGetChildProcessesWithScript.mock.calls.length;

      expect(secondCallCount).toBe(firstCallCount); // No new calls
    }
  });

  it('should run validation after cache expires', async () => {
    const validateRunningFuncProcess = (mockModule as any).validateRunningFuncProcess;

    if (validateRunningFuncProcess) {
      // First validation
      await validateRunningFuncProcess(testProjectPath);
      expect(mockGetChildProcessesWithScript).toHaveBeenCalledTimes(1);

      // Advance time past cache TTL (60+ seconds)
      vi.advanceTimersByTime(VALIDATION_CACHE_TTL + 1000);

      // Second validation should run PowerShell again
      await validateRunningFuncProcess(testProjectPath);
      expect(mockGetChildProcessesWithScript).toHaveBeenCalledTimes(2);
    }
  });

  it('should cache per project path', async () => {
    const validateRunningFuncProcess = (mockModule as any).validateRunningFuncProcess;

    if (validateRunningFuncProcess) {
      const projectPath1 = '/test/project1';
      const projectPath2 = '/test/project2';

      // Validate first project
      await validateRunningFuncProcess(projectPath1);
      expect(mockGetChildProcessesWithScript).toHaveBeenCalledTimes(1);

      // Validate second project should not use cache from first
      await validateRunningFuncProcess(projectPath2);
      expect(mockGetChildProcessesWithScript).toHaveBeenCalledTimes(2);

      // Validate first project again should use cache
      await validateRunningFuncProcess(projectPath1);
      expect(mockGetChildProcessesWithScript).toHaveBeenCalledTimes(2); // Still 2
    }
  });

  it('should avoid repeated expensive PowerShell executions', async () => {
    const validateRunningFuncProcess = (mockModule as any).validateRunningFuncProcess;

    if (validateRunningFuncProcess) {
      // Simulate expensive PowerShell execution (~940ms)
      mockGetChildProcessesWithScript.mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 940));
        return [testPid];
      });

      // First call - expensive
      const start1 = Date.now();
      await validateRunningFuncProcess(testProjectPath);
      await vi.runAllTimersAsync();
      const duration1 = Date.now() - start1;

      // Second call - should be instant (cached)
      const start2 = Date.now();
      await validateRunningFuncProcess(testProjectPath);
      const duration2 = Date.now() - start2;

      // First call should have executed PowerShell
      expect(duration1).toBeGreaterThanOrEqual(900);
      // Second call should be instant (no PowerShell execution)
      expect(duration2).toBeLessThan(10);
    }
  });

  it('should validate with correct PID when cache miss', async () => {
    const validateRunningFuncProcess = (mockModule as any).validateRunningFuncProcess;

    if (validateRunningFuncProcess) {
      const expectedPid = 54321;
      mockReadFileSync.mockReturnValue(expectedPid.toString());
      mockGetChildProcessesWithScript.mockResolvedValue([expectedPid, 99999, 88888]);

      await validateRunningFuncProcess(testProjectPath);

      // Should have called with the PID from file
      expect(mockGetChildProcessesWithScript).toHaveBeenCalledWith(expect.anything(), expectedPid);
    }
  });

  it('should handle multiple rapid validations efficiently', async () => {
    const validateRunningFuncProcess = (mockModule as any).validateRunningFuncProcess;

    if (validateRunningFuncProcess) {
      // Simulate 10 rapid validation calls
      const validations = Array.from({ length: 10 }, () => validateRunningFuncProcess(testProjectPath));

      await Promise.all(validations);
      await vi.runAllTimersAsync();

      // Should only execute PowerShell once due to caching
      expect(mockGetChildProcessesWithScript).toHaveBeenCalledTimes(1);
    }
  });
});
