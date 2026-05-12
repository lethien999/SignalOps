param(
    [string]$BaseUrl = 'http://localhost:3000',
    [string]$ApiKey = $env:API_KEY,
    [string]$DeviceId = 'dev-test-01',
    [int]$WaitSeconds = 7
)

if (-not $ApiKey) {
    throw 'API key is required. Set API_KEY or pass -ApiKey.'
}

$headers = @{ 'x-api-key' = $ApiKey; 'Content-Type' = 'application/json' }

function Post-Event {
    param(
        [string]$DeviceId,
        [int]$Latency,
        [int]$PacketLoss,
        [int]$SignalStrength
    )

    $body = @{
        deviceId = $DeviceId
        location = @{ lat = 10.762622; lng = 106.660172; name = 'Ho Chi Minh City' }
        metrics = @{ latency = $Latency; packetLoss = $PacketLoss; signalStrength = $SignalStrength }
    } | ConvertTo-Json -Depth 6

    Invoke-RestMethod -Uri "$BaseUrl/api/events" -Method Post -Headers $headers -Body $body -ContentType 'application/json'
}

$profiles = @(
    @{ Count = 5; Latency = 150; PacketLoss = 2; SignalStrength = -85 },
    @{ Count = 5; Latency = 300; PacketLoss = 8; SignalStrength = -75 },
    @{ Count = 5; Latency = 500; PacketLoss = 15; SignalStrength = -50 }
)

Write-Host "Sending events for $DeviceId..."
foreach ($profile in $profiles) {
    1..$profile.Count | ForEach-Object {
        Post-Event -DeviceId $DeviceId -Latency $profile.Latency -PacketLoss $profile.PacketLoss -SignalStrength $profile.SignalStrength | Out-Null
    }
}

Write-Host "Waiting $WaitSeconds seconds..."
Start-Sleep -Seconds $WaitSeconds

$alertsResponse = Invoke-RestMethod -Uri "$BaseUrl/api/alerts?limit=50" -Method Get -Headers $headers
$testAlerts = @($alertsResponse.data | Where-Object { $_.deviceId -eq $DeviceId })

if ($testAlerts.Count -gt 0) {
    $testAlerts | Select-Object id, severity, anomalyScore, anomalyLabel, createdAt | Format-Table -AutoSize
    Write-Host 'Summary:'
    $normal = ($testAlerts | Where-Object { $_.severity -eq 'low' -or $_.anomalyLabel -eq 'normal' }).Count
    $critical = ($testAlerts | Where-Object { $_.severity -match 'high|critical' }).Count
    Write-Host "Normal: $normal, High/Critical: $critical"
} else {
    Write-Host "No alerts for $DeviceId"
}

Write-Host 'Worker Logs:'
docker logs signalops-worker --tail 100 | Select-String -Pattern 'anomaly|score|alert created' | Select-Object -Last 10
