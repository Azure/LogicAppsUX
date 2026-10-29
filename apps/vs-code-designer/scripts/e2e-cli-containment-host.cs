using System;
using System.Collections.Generic;
using System.IO;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text;
using System.Threading;

public static class E2eCliContainmentHost
{
    private const uint CREATE_SUSPENDED = 0x00000004;
    private const uint STARTF_USESTDHANDLES = 0x00000100;
    private const uint JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE = 0x00002000;
    private const uint PROCESS_QUERY_LIMITED_INFORMATION = 0x00001000;
    private const int JobObjectBasicAccountingInformation = 1;
    private const int JobObjectBasicProcessIdList = 3;
    private const int JobObjectExtendedLimitInformation = 9;
    private const int ProcessBasicInformation = 0;
    private const int ProcessCommandLineInformation = 60;
    private const uint INFINITE = 0xffffffff;

    [StructLayout(LayoutKind.Sequential)]
    private struct SECURITY_ATTRIBUTES
    {
        public int nLength;
        public IntPtr lpSecurityDescriptor;
        public int bInheritHandle;
    }

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    private struct STARTUPINFO
    {
        public int cb;
        public string lpReserved;
        public string lpDesktop;
        public string lpTitle;
        public uint dwX;
        public uint dwY;
        public uint dwXSize;
        public uint dwYSize;
        public uint dwXCountChars;
        public uint dwYCountChars;
        public uint dwFillAttribute;
        public uint dwFlags;
        public short wShowWindow;
        public short cbReserved2;
        public IntPtr lpReserved2;
        public IntPtr hStdInput;
        public IntPtr hStdOutput;
        public IntPtr hStdError;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct PROCESS_INFORMATION
    {
        public IntPtr hProcess;
        public IntPtr hThread;
        public uint dwProcessId;
        public uint dwThreadId;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct JOBOBJECT_BASIC_LIMIT_INFORMATION
    {
        public long PerProcessUserTimeLimit;
        public long PerJobUserTimeLimit;
        public uint LimitFlags;
        public UIntPtr MinimumWorkingSetSize;
        public UIntPtr MaximumWorkingSetSize;
        public uint ActiveProcessLimit;
        public UIntPtr Affinity;
        public uint PriorityClass;
        public uint SchedulingClass;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct IO_COUNTERS
    {
        public ulong ReadOperationCount;
        public ulong WriteOperationCount;
        public ulong OtherOperationCount;
        public ulong ReadTransferCount;
        public ulong WriteTransferCount;
        public ulong OtherTransferCount;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct JOBOBJECT_EXTENDED_LIMIT_INFORMATION
    {
        public JOBOBJECT_BASIC_LIMIT_INFORMATION BasicLimitInformation;
        public IO_COUNTERS IoInfo;
        public UIntPtr ProcessMemoryLimit;
        public UIntPtr JobMemoryLimit;
        public UIntPtr PeakProcessMemoryUsed;
        public UIntPtr PeakJobMemoryUsed;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct JOBOBJECT_BASIC_ACCOUNTING_INFORMATION
    {
        public long TotalUserTime;
        public long TotalKernelTime;
        public long ThisPeriodTotalUserTime;
        public long ThisPeriodTotalKernelTime;
        public uint TotalPageFaultCount;
        public uint TotalProcesses;
        public uint ActiveProcesses;
        public uint TotalTerminatedProcesses;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct UNICODE_STRING
    {
        public ushort Length;
        public ushort MaximumLength;
        public IntPtr Buffer;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct PROCESS_BASIC_INFORMATION
    {
        public IntPtr Reserved1;
        public IntPtr PebBaseAddress;
        public IntPtr Reserved2_0;
        public IntPtr Reserved2_1;
        public IntPtr UniqueProcessId;
        public IntPtr InheritedFromUniqueProcessId;
    }

    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern bool CreateProcess(
        string lpApplicationName,
        string lpCommandLine,
        ref SECURITY_ATTRIBUTES lpProcessAttributes,
        ref SECURITY_ATTRIBUTES lpThreadAttributes,
        bool bInheritHandles,
        uint dwCreationFlags,
        IntPtr lpEnvironment,
        string lpCurrentDirectory,
        ref STARTUPINFO lpStartupInfo,
        out PROCESS_INFORMATION lpProcessInformation);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern IntPtr CreateJobObject(IntPtr lpJobAttributes, string lpName);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool SetInformationJobObject(IntPtr hJob, int infoClass, IntPtr lpInfo, uint cbInfo);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool AssignProcessToJobObject(IntPtr hJob, IntPtr hProcess);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern uint ResumeThread(IntPtr hThread);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern uint WaitForSingleObject(IntPtr hHandle, uint milliseconds);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool GetExitCodeProcess(IntPtr hProcess, out uint exitCode);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool QueryInformationJobObject(IntPtr hJob, int infoClass, IntPtr lpInfo, uint cbInfo, out uint returnLength);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool TerminateJobObject(IntPtr hJob, uint exitCode);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool TerminateProcess(IntPtr hProcess, uint exitCode);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern IntPtr OpenProcess(uint desiredAccess, bool inheritHandle, uint processId);

    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern bool QueryFullProcessImageName(IntPtr process, uint flags, StringBuilder executablePath, ref uint size);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool IsProcessInJob(IntPtr process, IntPtr job, out bool result);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool GetProcessTimes(
        IntPtr process,
        out long creationTime,
        out long exitTime,
        out long kernelTime,
        out long userTime);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool ProcessIdToSessionId(uint processId, out uint sessionId);

    [DllImport("shell32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern IntPtr CommandLineToArgvW(string commandLine, out int argumentCount);

    [DllImport("kernel32.dll")]
    private static extern IntPtr LocalFree(IntPtr memory);

    [DllImport("ntdll.dll")]
    private static extern int NtQueryInformationProcess(
        IntPtr process,
        int processInformationClass,
        IntPtr processInformation,
        uint processInformationLength,
        out uint returnLength);

    [DllImport("kernel32.dll")]
    private static extern IntPtr GetStdHandle(int nStdHandle);

    [DllImport("kernel32.dll")]
    private static extern bool CloseHandle(IntPtr hObject);

    private static string Quote(string value)
    {
        if (value.Length > 0 && value.IndexOfAny(new[] { ' ', '\t', '\n', '\v', '"' }) < 0)
        {
            return value;
        }
        var result = new StringBuilder("\"");
        var backslashes = 0;
        foreach (var character in value)
        {
            if (character == '\\')
            {
                backslashes++;
                continue;
            }
            if (character == '"')
            {
                result.Append('\\', backslashes * 2 + 1);
                result.Append('"');
                backslashes = 0;
                continue;
            }
            result.Append('\\', backslashes);
            backslashes = 0;
            result.Append(character);
        }
        result.Append('\\', backslashes * 2);
        result.Append('"');
        return result.ToString();
    }

    private static uint ActiveProcesses(IntPtr job)
    {
        var size = Marshal.SizeOf(typeof(JOBOBJECT_BASIC_ACCOUNTING_INFORMATION));
        var pointer = Marshal.AllocHGlobal(size);
        try
        {
            uint returned;
            if (!QueryInformationJobObject(job, JobObjectBasicAccountingInformation, pointer, (uint)size, out returned))
            {
                throw new InvalidOperationException("QueryInformationJobObject failed: " + Marshal.GetLastWin32Error());
            }
            return ((JOBOBJECT_BASIC_ACCOUNTING_INFORMATION)Marshal.PtrToStructure(
                pointer,
                typeof(JOBOBJECT_BASIC_ACCOUNTING_INFORMATION))).ActiveProcesses;
        }
        finally
        {
            Marshal.FreeHGlobal(pointer);
        }
    }

    private static List<uint> ActiveProcessIds(IntPtr job)
    {
        const int capacity = 1024;
        var headerSize = sizeof(uint) * 2;
        var size = headerSize + capacity * IntPtr.Size;
        var pointer = Marshal.AllocHGlobal(size);
        try
        {
            uint returned;
            if (!QueryInformationJobObject(job, JobObjectBasicProcessIdList, pointer, (uint)size, out returned))
            {
                throw new InvalidOperationException("QueryInformationJobObject process list failed: " + Marshal.GetLastWin32Error());
            }
            var listed = Marshal.ReadInt32(pointer, sizeof(uint));
            if (listed < 0 || listed > capacity)
            {
                throw new InvalidOperationException("Job process list exceeded its bounded diagnostic capacity");
            }
            var processes = new List<uint>(listed);
            for (var index = 0; index < listed; index++)
            {
                var processId = Marshal.ReadIntPtr(pointer, headerSize + index * IntPtr.Size).ToInt64();
                if (processId > 0 && processId <= uint.MaxValue)
                {
                    processes.Add((uint)processId);
                }
            }
            return processes;
        }
        finally
        {
            Marshal.FreeHGlobal(pointer);
        }
    }

    private static string JsonString(string value)
    {
        if (value == null)
        {
            return "null";
        }
        var result = new StringBuilder("\"");
        foreach (var character in value)
        {
            switch (character)
            {
                case '"': result.Append("\\\""); break;
                case '\\': result.Append("\\\\"); break;
                case '\b': result.Append("\\b"); break;
                case '\f': result.Append("\\f"); break;
                case '\n': result.Append("\\n"); break;
                case '\r': result.Append("\\r"); break;
                case '\t': result.Append("\\t"); break;
                default:
                    if (character < 0x20)
                    {
                        result.Append("\\u").Append(((int)character).ToString("x4"));
                    }
                    else
                    {
                        result.Append(character);
                    }
                    break;
            }
        }
        return result.Append('"').ToString();
    }

    private static string QueryProcessCommandLine(IntPtr process)
    {
        uint required;
        NtQueryInformationProcess(process, ProcessCommandLineInformation, IntPtr.Zero, 0, out required);
        if (required == 0 || required > 1024 * 1024)
        {
            return "";
        }
        var pointer = Marshal.AllocHGlobal((int)required);
        try
        {
            uint returned;
            var status = NtQueryInformationProcess(process, ProcessCommandLineInformation, pointer, required, out returned);
            if (status < 0)
            {
                return "";
            }
            var commandLine = (UNICODE_STRING)Marshal.PtrToStructure(pointer, typeof(UNICODE_STRING));
            return commandLine.Buffer == IntPtr.Zero ? "" : Marshal.PtrToStringUni(commandLine.Buffer, commandLine.Length / 2);
        }
        finally
        {
            Marshal.FreeHGlobal(pointer);
        }
    }

    private static string Sha256(string value)
    {
        using (var hash = SHA256.Create())
        {
            var bytes = hash.ComputeHash(Encoding.UTF8.GetBytes(value ?? ""));
            var result = new StringBuilder(bytes.Length * 2);
            foreach (var valueByte in bytes)
            {
                result.Append(valueByte.ToString("x2"));
            }
            return result.ToString();
        }
    }

    private static List<string> ParseCommandLine(string commandLine)
    {
        var arguments = new List<string>();
        if (String.IsNullOrEmpty(commandLine))
        {
            return arguments;
        }
        int argumentCount;
        var pointer = CommandLineToArgvW(commandLine, out argumentCount);
        if (pointer == IntPtr.Zero)
        {
            return arguments;
        }
        try
        {
            for (var index = 0; index < argumentCount && index < 256; index++)
            {
                arguments.Add(Marshal.PtrToStringUni(Marshal.ReadIntPtr(pointer, index * IntPtr.Size)) ?? "");
            }
        }
        finally
        {
            LocalFree(pointer);
        }
        return arguments;
    }

    private static string JsonStringArray(List<string> values)
    {
        var result = new StringBuilder("[");
        for (var index = 0; index < values.Count; index++)
        {
            if (index > 0)
            {
                result.Append(',');
            }
            result.Append(JsonString(values[index]));
        }
        return result.Append(']').ToString();
    }

    private static string SafeCommandSummary(string commandLine)
    {
        var arguments = ParseCommandLine(commandLine);
        var safeMarkers = new List<string>();
        var moduleBasenames = new List<string>();
        foreach (var argument in arguments)
        {
            if (safeMarkers.Count < 16 &&
                (argument.StartsWith("--type=", StringComparison.Ordinal) ||
                 argument.StartsWith("--utility-sub-type=", StringComparison.Ordinal) ||
                 argument == "--ms-enable-electron-run-as-node" ||
                 argument == "--stateless-variables-lifecycle" ||
                 argument == "--extensionDevelopmentPath"))
            {
                safeMarkers.Add(argument);
            }
            if (moduleBasenames.Count >= 16)
            {
                continue;
            }
            var extension = Path.GetExtension(argument);
            if (extension.Equals(".js", StringComparison.OrdinalIgnoreCase) ||
                extension.Equals(".cjs", StringComparison.OrdinalIgnoreCase) ||
                extension.Equals(".mjs", StringComparison.OrdinalIgnoreCase) ||
                extension.Equals(".dll", StringComparison.OrdinalIgnoreCase) ||
                extension.Equals(".exe", StringComparison.OrdinalIgnoreCase))
            {
                var basename = Path.GetFileName(argument);
                if (!String.IsNullOrEmpty(basename) && basename.Length <= 128 && !moduleBasenames.Contains(basename))
                {
                    moduleBasenames.Add(basename);
                }
            }
        }
        return "{\"argumentCount\":" + arguments.Count +
            ",\"safeMarkers\":" + JsonStringArray(safeMarkers) +
            ",\"scriptOrModuleBasenames\":" + JsonStringArray(moduleBasenames) +
            ",\"sha256\":" + JsonString(Sha256(commandLine)) + "}";
    }

    private static uint ParentProcessId(IntPtr process)
    {
        var size = Marshal.SizeOf(typeof(PROCESS_BASIC_INFORMATION));
        var pointer = Marshal.AllocHGlobal(size);
        try
        {
            uint returned;
            if (NtQueryInformationProcess(process, ProcessBasicInformation, pointer, (uint)size, out returned) < 0)
            {
                return 0;
            }
            var information = (PROCESS_BASIC_INFORMATION)Marshal.PtrToStructure(pointer, typeof(PROCESS_BASIC_INFORMATION));
            var parent = information.InheritedFromUniqueProcessId.ToInt64();
            return parent > 0 && parent <= uint.MaxValue ? (uint)parent : 0;
        }
        finally
        {
            Marshal.FreeHGlobal(pointer);
        }
    }

    private static string DescribeProcess(IntPtr job, uint processId)
    {
        var process = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, processId);
        if (process == IntPtr.Zero)
        {
            return "{\"pid\":" + processId +
                ",\"metadataStatus\":\"exited-before-inspection\",\"win32Error\":" + Marshal.GetLastWin32Error() + "}";
        }
        try
        {
            bool inJob;
            if (!IsProcessInJob(process, job, out inJob))
            {
                return "{\"pid\":" + processId +
                    ",\"metadataStatus\":\"membership-query-failed\",\"win32Error\":" + Marshal.GetLastWin32Error() + "}";
            }
            if (!inJob)
            {
                return "{\"pid\":" + processId + ",\"metadataStatus\":\"not-in-job\"}";
            }
            var executablePath = new StringBuilder(32768);
            uint executablePathLength = (uint)executablePath.Capacity;
            var path = QueryFullProcessImageName(process, 0, executablePath, ref executablePathLength)
                ? executablePath.ToString()
                : "";
            var commandLine = QueryProcessCommandLine(process);
            long creationTime;
            long exitTime;
            long kernelTime;
            long userTime;
            var createdAtUtc = GetProcessTimes(process, out creationTime, out exitTime, out kernelTime, out userTime)
                ? DateTime.FromFileTimeUtc(creationTime).ToString("o")
                : "";
            uint sessionId;
            var hasSessionId = ProcessIdToSessionId(processId, out sessionId);
            var parentProcessId = ParentProcessId(process);
            return "{\"pid\":" + processId +
                ",\"parentPid\":" + (parentProcessId == 0 ? "null" : parentProcessId.ToString()) +
                ",\"imageName\":" + JsonString(path.Length == 0 ? "" : Path.GetFileName(path)) +
                ",\"createdAtUtc\":" + JsonString(createdAtUtc) +
                ",\"sessionId\":" + (hasSessionId ? sessionId.ToString() : "null") +
                ",\"metadataStatus\":\"captured\",\"commandSummary\":" + SafeCommandSummary(commandLine) + "}";
        }
        finally
        {
            CloseHandle(process);
        }
    }

    private static List<string> DescribeProcesses(IntPtr job, List<uint> processIds)
    {
        processIds.Sort();
        var descriptions = new List<string>(processIds.Count);
        foreach (var processId in processIds)
        {
            try
            {
                descriptions.Add(DescribeProcess(job, processId));
            }
            catch
            {
                descriptions.Add("{\"pid\":" + processId + ",\"metadataStatus\":\"inspection-failed\"}");
            }
        }
        return descriptions;
    }

    private static void WriteReceipt(
        string path,
        uint rootPid,
        uint rootExitCode,
        uint activeProcesses,
        List<string> activeProcessDescriptions,
        bool activeProcessDescriptionsTruncated,
        bool forcedTerminationAttempted,
        bool forcedTerminationSucceeded,
        int forcedTerminationError,
        uint postTerminationActiveProcesses)
    {
        var empty = activeProcesses == 0 ? "true" : "false";
        var processDescriptions = new StringBuilder("[");
        for (var index = 0; index < activeProcessDescriptions.Count; index++)
        {
            if (index > 0)
            {
                processDescriptions.Append(',');
            }
            processDescriptions.Append(activeProcessDescriptions[index]);
        }
        processDescriptions.Append(']');
        var content =
            "{\"schemaVersion\":1,\"mechanism\":\"windows-job-object\",\"containmentEstablished\":true," +
            "\"rootPid\":" + rootPid + ",\"rootExitCode\":" + rootExitCode + ",\"rootSignal\":null," +
            "\"containmentEmpty\":" + empty + ",\"retainedOriginalIdentitiesVerified\":" + empty + "," +
            "\"escapedDescendants\":[],\"activeContainedProcessCount\":" + activeProcesses + "," +
            "\"activeContainedProcesses\":" + processDescriptions + "," +
            "\"activeContainedProcessesTruncated\":" + (activeProcessDescriptionsTruncated ? "true" : "false") + "," +
            "\"metadataCapturedAtUtc\":" + JsonString(DateTime.UtcNow.ToString("o")) + "," +
            "\"forcedTerminationAttempted\":" + (forcedTerminationAttempted ? "true" : "false") + "," +
            "\"forcedTerminationSucceeded\":" + (forcedTerminationSucceeded ? "true" : "false") + "," +
            "\"forcedTerminationError\":" + forcedTerminationError + "," +
            "\"postTerminationActiveProcessCount\":" + postTerminationActiveProcesses + "}\n";
        var temporaryPath = path + ".tmp." + System.Diagnostics.Process.GetCurrentProcess().Id;
        File.WriteAllText(temporaryPath, content);
        if (File.Exists(path))
        {
            File.Delete(path);
        }
        File.Move(temporaryPath, path);
    }

    public static int Main(string[] args)
    {
        if (args.Length < 2)
        {
            return 126;
        }
        var receiptPath = args[0];
        var executable = args[1];
        var commandLine = new StringBuilder(Quote(executable));
        for (var index = 2; index < args.Length; index++)
        {
            commandLine.Append(' ').Append(Quote(args[index]));
        }

        var job = CreateJobObject(IntPtr.Zero, null);
        if (job == IntPtr.Zero)
        {
            return 126;
        }
        var process = new PROCESS_INFORMATION();
        try
        {
            var limits = new JOBOBJECT_EXTENDED_LIMIT_INFORMATION();
            limits.BasicLimitInformation.LimitFlags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;
            var limitsSize = Marshal.SizeOf(typeof(JOBOBJECT_EXTENDED_LIMIT_INFORMATION));
            var limitsPointer = Marshal.AllocHGlobal(limitsSize);
            try
            {
                Marshal.StructureToPtr(limits, limitsPointer, false);
                if (!SetInformationJobObject(job, JobObjectExtendedLimitInformation, limitsPointer, (uint)limitsSize))
                {
                    return 126;
                }
            }
            finally
            {
                Marshal.FreeHGlobal(limitsPointer);
            }

            var processAttributes = new SECURITY_ATTRIBUTES { nLength = Marshal.SizeOf(typeof(SECURITY_ATTRIBUTES)) };
            var threadAttributes = new SECURITY_ATTRIBUTES { nLength = Marshal.SizeOf(typeof(SECURITY_ATTRIBUTES)) };
            var startup = new STARTUPINFO
            {
                cb = Marshal.SizeOf(typeof(STARTUPINFO)),
                dwFlags = STARTF_USESTDHANDLES,
                hStdInput = GetStdHandle(-10),
                hStdOutput = GetStdHandle(-11),
                hStdError = GetStdHandle(-12),
            };
            if (!CreateProcess(
                executable,
                commandLine.ToString(),
                ref processAttributes,
                ref threadAttributes,
                true,
                CREATE_SUSPENDED,
                IntPtr.Zero,
                null,
                ref startup,
                out process))
            {
                return 126;
            }
            if (!AssignProcessToJobObject(job, process.hProcess))
            {
                TerminateProcess(process.hProcess, 126);
                WaitForSingleObject(process.hProcess, INFINITE);
                return 126;
            }
            if (ResumeThread(process.hThread) == 0xffffffff)
            {
                return 126;
            }
            WaitForSingleObject(process.hProcess, INFINITE);
            uint rootExitCode;
            if (!GetExitCodeProcess(process.hProcess, out rootExitCode))
            {
                return 126;
            }

            uint active = ActiveProcesses(job);
            for (var attempt = 0; attempt < 50 && active > 0; attempt++)
            {
                Thread.Sleep(100);
                active = ActiveProcesses(job);
            }
            var activeProcessIds = new List<uint>();
            var activeProcessDescriptionsTruncated = false;
            if (active > 0)
            {
                try
                {
                    activeProcessIds = ActiveProcessIds(job);
                    if (activeProcessIds.Count > 32)
                    {
                        activeProcessIds = activeProcessIds.GetRange(0, 32);
                        activeProcessDescriptionsTruncated = true;
                    }
                }
                catch
                {
                    activeProcessDescriptionsTruncated = true;
                }
            }
            var activeProcessDescriptions = DescribeProcesses(job, activeProcessIds);
            var forcedTerminationAttempted = active > 0;
            var forcedTerminationSucceeded = false;
            var forcedTerminationError = 0;
            var postTerminationActiveProcesses = active;
            if (active > 0)
            {
                forcedTerminationSucceeded = TerminateJobObject(job, 125);
                if (!forcedTerminationSucceeded)
                {
                    forcedTerminationError = Marshal.GetLastWin32Error();
                }
                for (var attempt = 0; attempt < 20 && postTerminationActiveProcesses > 0; attempt++)
                {
                    Thread.Sleep(100);
                    postTerminationActiveProcesses = ActiveProcesses(job);
                }
            }
            WriteReceipt(
                receiptPath,
                process.dwProcessId,
                rootExitCode,
                active,
                activeProcessDescriptions,
                activeProcessDescriptionsTruncated,
                forcedTerminationAttempted,
                forcedTerminationSucceeded,
                forcedTerminationError,
                postTerminationActiveProcesses);
            if (active > 0)
            {
                return 125;
            }
            return unchecked((int)rootExitCode);
        }
        finally
        {
            if (process.hThread != IntPtr.Zero) CloseHandle(process.hThread);
            if (process.hProcess != IntPtr.Zero) CloseHandle(process.hProcess);
            CloseHandle(job);
        }
    }
}
