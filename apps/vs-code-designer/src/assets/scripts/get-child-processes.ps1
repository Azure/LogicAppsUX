$parentProcessId = $args[0]

try {
    # Query all processes ONCE - much faster than recursive CIM queries
    $allProcs = @(Get-CimInstance -ClassName Win32_Process -Property ProcessId,Name,ParentProcessId -ErrorAction SilentlyContinue)

    # Return only direct children of the given parent PID.
    $children = @()
    foreach ($proc in $allProcs) {
        if ([int]$proc.ParentProcessId -eq [int]$parentProcessId) {
            $children += [PSCustomObject]@{
                ProcessId = $proc.ProcessId
                Name = $proc.Name
                ParentProcessId = $proc.ParentProcessId
            }
        }
    }

    if ($children.Count -gt 0) {
        $children | ConvertTo-Json -Depth 2 -Compress
    } else {
        '[]'
    }
} catch {
    '[]'
}
