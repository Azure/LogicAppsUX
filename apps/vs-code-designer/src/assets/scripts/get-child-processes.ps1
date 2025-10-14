$parentProcessId = $args[0]

try {
    function Get-ChildProcesses ($ParentProcessId) {
        $filter = "parentprocessid = '$($ParentProcessId)'"
        Get-CIMInstance -ClassName win32_process -filter $filter | Foreach-Object {
            $_
            if ($_.ParentProcessId -ne $_.ProcessId) {
                Get-ChildProcesses $_.ProcessId
            }
        }
    }
    $processes = Get-ChildProcesses $parentProcessId | Select ProcessId, Name, ParentProcessId
    if ($processes) {
        $processes | ConvertTo-Json -Depth 2
    } else {
        '[]'
    }
} catch {
    '[]'
}