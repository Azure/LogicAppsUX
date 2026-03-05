# Kill any stuck test VS Code / ChromeDriver processes
Write-Host "=== Cleaning up old processes ==="
Get-Process | Where-Object { $_.Path -and $_.Path -like "*test-resources*" } | ForEach-Object {
    Write-Host "  Killing: $($_.ProcessName) PID=$($_.Id)"
    Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
}
Start-Sleep 3

# Compile TypeScript test
Write-Host "`n=== Compiling test ==="
Set-Location d:\dev\LogicAppsUX\apps\vs-code-designer
npx tsc src/test/ui/createWorkspace.test.ts --outDir out/test --esModuleInterop --module commonjs --target es2020 --moduleResolution node --skipLibCheck
Write-Host "Compile exit code: $LASTEXITCODE"

# Remove any auto-updated marketplace versions of our extension
Write-Host "`n=== Cleaning stale extension versions ==="
$extDir = "d:\dev\LogicAppsUX\apps\vs-code-designer\dist\test-extensions"
Get-ChildItem $extDir -Directory -ErrorAction SilentlyContinue | Where-Object {
    $_.Name -like "ms-azuretools.vscode-azurelogicapps-*" -and $_.Name -ne "ms-azuretools.vscode-azurelogicapps-5.110.0"
} | ForEach-Object {
    Write-Host "  Removing: $($_.Name)"
    Remove-Item $_.FullName -Recurse -Force
}

# Run the E2E tests, capturing output to a log file
Write-Host "`n=== Running E2E tests ==="
$logFile = "d:\dev\LogicAppsUX\apps\vs-code-designer\out\test\e2e-results.log"
node src/test/ui/run-e2e.js 2>&1 | Tee-Object -FilePath $logFile

Write-Host "`n=== Test run complete ==="
Write-Host "Results saved to: $logFile"
