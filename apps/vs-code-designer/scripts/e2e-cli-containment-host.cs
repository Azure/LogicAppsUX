using System;
using System.Collections.Generic;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;

public static class E2eCliContainmentHost
{
    private const uint CREATE_SUSPENDED = 0x00000004;
    private const uint STARTF_USESTDHANDLES = 0x00000100;
    private const uint JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE = 0x00002000;
    private const int JobObjectBasicAccountingInformation = 1;
    private const int JobObjectExtendedLimitInformation = 9;
    private const int CONTAINMENT_DRAIN_ATTEMPTS = 100;
    private const int CONTAINMENT_DRAIN_DELAY_MS = 100;
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

    private static void WriteReceipt(string path, uint rootPid, uint rootExitCode, uint activeProcesses)
    {
        var empty = activeProcesses == 0 ? "true" : "false";
        File.WriteAllText(
            path,
            "{\"schemaVersion\":1,\"mechanism\":\"windows-job-object\",\"containmentEstablished\":true," +
            "\"rootPid\":" + rootPid + ",\"rootExitCode\":" + rootExitCode + ",\"rootSignal\":null," +
            "\"containmentEmpty\":" + empty + ",\"retainedOriginalIdentitiesVerified\":" + empty + "," +
            "\"escapedDescendants\":[],\"activeContainedProcessCount\":" + activeProcesses + "}\n");
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
            for (var attempt = 0; attempt < CONTAINMENT_DRAIN_ATTEMPTS && active > 0; attempt++)
            {
                Thread.Sleep(CONTAINMENT_DRAIN_DELAY_MS);
                active = ActiveProcesses(job);
            }
            WriteReceipt(receiptPath, process.dwProcessId, rootExitCode, active);
            if (active > 0)
            {
                TerminateJobObject(job, 125);
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
