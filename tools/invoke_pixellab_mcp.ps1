param(
    [Parameter(Mandatory = $true)]
    [string]$Tool,

    [Parameter(Mandatory = $true)]
    [string]$ArgumentsJson
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Net.Http

$configPath = Join-Path $env:USERPROFILE ".codex\config.toml"
$config = Get-Content -LiteralPath $configPath -Raw
$match = [regex]::Match(
    $config,
    '(?ms)\[mcp_servers\.pixellab\.env\].*?AUTH_HEADER\s*=\s*"([^"]+)"'
)
if (-not $match.Success) {
    throw "PixelLab AUTH_HEADER was not found in the Codex MCP configuration."
}

$endpoint = "https://api.pixellab.ai/mcp"
$http = [System.Net.Http.HttpClient]::new()
$http.DefaultRequestHeaders.TryAddWithoutValidation(
    "Authorization",
    $match.Groups[1].Value
) | Out-Null
$http.DefaultRequestHeaders.TryAddWithoutValidation(
    "Accept",
    "application/json, text/event-stream"
) | Out-Null

function Send-McpRequest {
    param(
        [string]$Body,
        [string]$SessionId
    )

    $request = [System.Net.Http.HttpRequestMessage]::new(
        [System.Net.Http.HttpMethod]::Post,
        $endpoint
    )
    $request.Content = [System.Net.Http.StringContent]::new(
        $Body,
        [System.Text.Encoding]::UTF8,
        "application/json"
    )
    if ($SessionId) {
        $request.Headers.TryAddWithoutValidation("Mcp-Session-Id", $SessionId) | Out-Null
    }
    $response = $http.SendAsync($request).GetAwaiter().GetResult()
    $content = $response.Content.ReadAsStringAsync().GetAwaiter().GetResult()
    if (-not $response.IsSuccessStatusCode) {
        throw "PixelLab MCP returned HTTP $([int]$response.StatusCode): $content"
    }
    return [pscustomobject]@{
        Headers = $response.Headers
        Content = $content
    }
}

function Convert-McpResponse {
    param([string]$Content)

    $jsonLines = @(
        $Content -split "`r?`n" |
        Where-Object { $_ -like "data:*" } |
        ForEach-Object { $_.Substring(5).Trim() } |
        Where-Object { $_ -and $_ -ne "[DONE]" }
    )
    if ($jsonLines.Count -gt 0) {
        return ($jsonLines[-1] | ConvertFrom-Json)
    }
    return ($Content | ConvertFrom-Json)
}

$initializeBody = @{
    jsonrpc = "2.0"
    id = 1
    method = "initialize"
    params = @{
        protocolVersion = "2025-03-26"
        capabilities = @{}
        clientInfo = @{
            name = "hollow-reflections-codex"
            version = "1.0"
        }
    }
} | ConvertTo-Json -Depth 10 -Compress

$initialize = Send-McpRequest -Body $initializeBody

$sessionValues = [System.Collections.Generic.IEnumerable[string]]$null
$hasSession = $initialize.Headers.TryGetValues("Mcp-Session-Id", [ref]$sessionValues)
$sessionId = if ($hasSession) { @($sessionValues)[0] } else { $null }

$initializedBody = @{
    jsonrpc = "2.0"
    method = "notifications/initialized"
    params = @{}
} | ConvertTo-Json -Depth 5 -Compress

Send-McpRequest -Body $initializedBody -SessionId $sessionId | Out-Null

$arguments = $ArgumentsJson | ConvertFrom-Json
foreach ($mapping in @(
    @("reference_image_path", "reference_image_base64"),
    @("custom_start_frame_path", "custom_start_frame_base64"),
    @("end_frame_path", "end_frame_base64")
)) {
    $pathProperty = $mapping[0]
    $base64Property = $mapping[1]
    if ($arguments.PSObject.Properties.Name -contains $pathProperty) {
        $imagePath = $arguments.$pathProperty
        $resolvedImage = (Resolve-Path -LiteralPath $imagePath).Path
        $encodedImage = [Convert]::ToBase64String(
            [IO.File]::ReadAllBytes($resolvedImage)
        )
        $arguments.PSObject.Properties.Remove($pathProperty)
        $arguments | Add-Member -NotePropertyName $base64Property -NotePropertyValue $encodedImage
    }
}
$callBody = @{
    jsonrpc = "2.0"
    id = 2
    method = "tools/call"
    params = @{
        name = $Tool
        arguments = $arguments
    }
} | ConvertTo-Json -Depth 30 -Compress

$call = Send-McpRequest -Body $callBody -SessionId $sessionId

$response = Convert-McpResponse -Content $call.Content
$response | ConvertTo-Json -Depth 30

$http.Dispose()
