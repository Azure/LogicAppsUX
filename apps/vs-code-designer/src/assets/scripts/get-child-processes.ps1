$parentProcessId = $args[0]

try {
    # Query all processes ONCE - much faster than recursive CIM queries
    $allProcs = @(Get-CimInstance -ClassName Win32_Process -Property ProcessId,Name,ParentProcessId -ErrorAction SilentlyContinue)
    
    # Build hashtable mapping ParentProcessId -> array of child processes
    $childMap = @{}
    foreach ($proc in $allProcs) {
        $ppid = [int]$proc.ParentProcessId
        if ($ppid -gt 0) {
            if (-not $childMap.ContainsKey($ppid)) {
                $childMap[$ppid] = @()
            }
            $childMap[$ppid] += $proc
        }
    }
    
    # Recursively get all descendants
    function Get-AllDescendants {
        param([int]$targetPid)
        $descendants = @()
        
        if ($childMap.ContainsKey($targetPid)) {
            foreach ($child in $childMap[$targetPid]) {
                $descendants += [PSCustomObject]@{
                    ProcessId = $child.ProcessId
                    Name = $child.Name
                    ParentProcessId = $child.ParentProcessId
                }
                # Recursively add this child descendants
                $grandchildren = Get-AllDescendants -targetPid ([int]$child.ProcessId)
                $descendants += $grandchildren
            }
        }
        
        return $descendants
    }
    
    $processes = Get-AllDescendants -targetPid ([int]$parentProcessId)
    if ($processes.Count -gt 0) {
        $processes | ConvertTo-Json -Depth 2 -Compress
    } else {
        '[]'
    }
} catch {
    '[]'
}
