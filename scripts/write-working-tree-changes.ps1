param(
    [string]$OutputPath = "working-tree-changes.txt",
    [string]$BaseRef = "HEAD",
    [switch]$SkipUntracked
)

$ErrorActionPreference = "Stop"

function Get-GitOutput {
    param(
        [Parameter(Mandatory = $true)]
        [string[]]$Arguments,
        [switch]$AllowFailure
    )

    $startInfo = [System.Diagnostics.ProcessStartInfo]::new()
    $startInfo.FileName = "git"
    $startInfo.Arguments = ($Arguments | ForEach-Object {
            if ($_ -match '\s|"') {
                '"' + ($_ -replace '"', '\"') + '"'
            } else {
                $_
            }
        }) -join ' '
    $startInfo.RedirectStandardOutput = $true
    $startInfo.RedirectStandardError = $true
    $startInfo.UseShellExecute = $false
    $startInfo.CreateNoWindow = $true

    $process = [System.Diagnostics.Process]::new()
    $process.StartInfo = $startInfo
    [void]$process.Start()
    $stdout = $process.StandardOutput.ReadToEnd()
    $stderr = $process.StandardError.ReadToEnd()
    $process.WaitForExit()
    $exitCode = $process.ExitCode
    $result = ($stdout, $stderr) -join ""

    if (-not $AllowFailure -and $exitCode -ne 0) {
        throw "git $($Arguments -join ' ') failed with exit code $exitCode.`n$result"
    }

    return [string]::Join([Environment]::NewLine, $result)
}

$repoRoot = Get-GitOutput -Arguments @("rev-parse", "--show-toplevel")
if (-not $repoRoot) {
    throw "Unable to determine the git repository root."
}

Set-Location $repoRoot.Trim()

$resolvedOutputPath = if ([System.IO.Path]::IsPathRooted($OutputPath)) {
    $OutputPath
} else {
    Join-Path $repoRoot.Trim() $OutputPath
}

$outputDirectory = Split-Path -Parent $resolvedOutputPath
if ($outputDirectory) {
    New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null
}

$statusOutput = Get-GitOutput -Arguments @("status", "--short", "--untracked-files=all")
$diffOutput = Get-GitOutput -Arguments @("diff", "--no-ext-diff", "--binary", $BaseRef, "--")
$untrackedFiles = @()

if (-not $SkipUntracked) {
    $untrackedOutput = Get-GitOutput -Arguments @("ls-files", "--others", "--exclude-standard") -AllowFailure
    if ($untrackedOutput) {
        $untrackedFiles = $untrackedOutput -split "(`r`n|`n|`r)" | Where-Object { $_.Trim() }
    }
}

$builder = [System.Text.StringBuilder]::new()
[void]$builder.AppendLine("# Working Tree Changes")
[void]$builder.AppendLine()
[void]$builder.AppendLine("Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss zzz')")
[void]$builder.AppendLine("Repository: $($repoRoot.Trim())")
[void]$builder.AppendLine("Base Ref: $BaseRef")
[void]$builder.AppendLine()
[void]$builder.AppendLine("## Git Status")
[void]$builder.AppendLine()
[void]$builder.AppendLine('```text')
[void]$builder.AppendLine(($statusOutput.TrimEnd()))
[void]$builder.AppendLine('```')
[void]$builder.AppendLine()
[void]$builder.AppendLine("## Diff vs $BaseRef")
[void]$builder.AppendLine()
[void]$builder.AppendLine('```diff')
[void]$builder.AppendLine(($diffOutput.TrimEnd()))
[void]$builder.AppendLine('```')

if ($untrackedFiles.Count -gt 0) {
    [void]$builder.AppendLine()
    [void]$builder.AppendLine("## Untracked Files")
    [void]$builder.AppendLine()

    foreach ($relativePath in $untrackedFiles) {
        $untrackedDiff = Get-GitOutput -Arguments @("diff", "--no-index", "--binary", "--", "/dev/null", $relativePath) -AllowFailure
        [void]$builder.AppendLine("### $relativePath")
        [void]$builder.AppendLine()
        [void]$builder.AppendLine('```diff')
        [void]$builder.AppendLine(($untrackedDiff.TrimEnd()))
        [void]$builder.AppendLine('```')
        [void]$builder.AppendLine()
    }
}

[System.IO.File]::WriteAllText($resolvedOutputPath, $builder.ToString())
Write-Host "Wrote working tree changes to $resolvedOutputPath"
