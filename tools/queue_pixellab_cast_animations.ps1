param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("brant", "milla", "nix")]
    [string]$Unit,

    [int]$Offset = 0,
    [int]$Count = 10
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$promptPath = Join-Path $root "design\cast-production\animation-prompts\$Unit.json"
$recordPath = Join-Path $root "design\cast-production\production-records\$Unit-animation-jobs.json"
$helper = Join-Path $root "tools\invoke_pixellab_mcp.ps1"

$spec = Get-Content -LiteralPath $promptPath -Raw | ConvertFrom-Json
$selected = @(
    @($spec.jobs) | Select-Object -Skip $Offset -First $Count
)
if (-not $selected.Count) {
    throw "No jobs selected for $Unit at offset $Offset."
}

$records = @()
if (Test-Path -LiteralPath $recordPath) {
    $loaded = Get-Content -LiteralPath $recordPath -Raw | ConvertFrom-Json
    foreach ($entry in $loaded) {
        if ($entry.PSObject.Properties.Name -contains "value") {
            foreach ($nested in $entry.value) {
                $records += $nested
            }
        } else {
            $records += $entry
        }
    }
}

foreach ($job in $selected) {
    $arguments = @{
        character_id = $spec.characterStateId
        action_description = $job.prompt
        animation_name = $job.name
        directions = @($spec.direction)
        mode = "v3"
        frame_count = [int]$job.frames
        keep_first_frame = $true
    } | ConvertTo-Json -Depth 10 -Compress

    $raw = (& $helper -Tool animate_character -ArgumentsJson $arguments) | Out-String
    $response = $raw | ConvertFrom-Json
    $text = [string]$response.result.content[0].text
    $idMatch = [regex]::Match($text, '(?m)^(?:id|job_id):\s*([0-9a-f-]{36})')
    $records += [pscustomobject]@{
        name = $job.name
        frames = [int]$job.frames
        direction = $spec.direction
        submittedAt = (Get-Date).ToString("o")
        jobId = if ($idMatch.Success) { $idMatch.Groups[1].Value } else { $null }
        response = $text
    }
    Write-Host "$Unit queued: $($job.name)"
}

$json = $records | ConvertTo-Json -Depth 10
[IO.File]::WriteAllText(
    $recordPath,
    $json,
    [Text.UTF8Encoding]::new($false)
)

Write-Host "Recorded $($records.Count) submitted jobs in $recordPath"
