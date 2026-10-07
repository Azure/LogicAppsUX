# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License. See License.txt in the project root for license information.

$ErrorActionPreference = 'Stop'

try {
    [Console]::InputEncoding = New-Object System.Text.UTF8Encoding($false)
    $connection = [Console]::In.ReadToEnd() | ConvertFrom-Json

    if ($connection.rootFolder -isnot [string] -or
        -not $connection.rootFolder.StartsWith('\\', [StringComparison]::Ordinal) -or
        $connection.username -isnot [string] -or
        $connection.username.Length -eq 0 -or
        $connection.password -isnot [string] -or
        $connection.rootFolder.Contains([char]0) -or
        $connection.username.Contains([char]0) -or
        $connection.password.Contains([char]0)) {
        throw 'Invalid SMB connection parameters.'
    }

    # Only static interop code is compiled; credentials remain stdin data, never executable text.
    Add-Type -TypeDefinition @'
using System.Runtime.InteropServices;

public static class LogicAppsSmbConnection
{
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    private struct NetResource
    {
        public uint Scope;
        public uint Type;
        public uint DisplayType;
        public uint Usage;
        public string LocalName;
        public string RemoteName;
        public string Comment;
        public string Provider;
    }

    [DllImport("mpr.dll", CharSet = CharSet.Unicode, ExactSpelling = true)]
    private static extern uint WNetAddConnection2W(
        ref NetResource resource, string password, string username, uint flags);

    public static uint Connect(string remoteName, string username, string password)
    {
        var resource = new NetResource { Type = 1, RemoteName = remoteName };
        // CONNECT_TEMPORARY, with no drive letter, prompts, or credential persistence.
        return WNetAddConnection2W(ref resource, password, username, 4);
    }
}
'@

    $status = [LogicAppsSmbConnection]::Connect($connection.rootFolder, $connection.username, $connection.password)
    [Console]::Out.WriteLine($status.ToString([Globalization.CultureInfo]::InvariantCulture))
} catch {
    # Never expose provider diagnostics, input, or exception details.
    [Console]::Error.WriteLine('Unable to create the file system connection.')
    exit 1
} finally {
    $connection = $null
}
