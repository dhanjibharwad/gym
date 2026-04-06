$base = "http://localhost:8004"

Write-Host "`nLogging in..." -ForegroundColor Cyan
$loginBody = '{"email":"enjoy@gmail.com","password":"12345678"}'
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession

try {
  $login = Invoke-WebRequest -Uri "$base/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json" -WebSession $session -UseBasicParsing -ErrorAction Stop
  $loginData = $login.Content | ConvertFrom-Json
  Write-Host "Logged in as: $($loginData.user.name) | Role: $($loginData.user.role)" -ForegroundColor Green
} catch {
  Write-Host "Login failed: $_" -ForegroundColor Red
  exit 1
}

$apis = @(
  "/api/auth/me",
  "/api/dashboard/stats",
  "/api/membership-plans",
  "/api/admin/staff",
  "/api/admin/roles",
  "/api/payments",
  "/api/members?limit=20",
  "/api/settings/payment-modes",
  "/api/settings",
  "/api/admin/permissions",
  "/api/reports/overall?period=month",
  "/api/audit-logs?page=1&limit=50"
)

Write-Host "`n=== API TIMING TEST ===" -ForegroundColor Cyan
Write-Host ("API".PadRight(50) + "| Status | Time") -ForegroundColor Yellow
Write-Host ("-" * 75) -ForegroundColor Gray

foreach ($api in $apis) {
  $sw = [System.Diagnostics.Stopwatch]::StartNew()
  try {
    $r = Invoke-WebRequest -Uri "$base$api" -UseBasicParsing -WebSession $session -TimeoutSec 15 -ErrorAction Stop
    $sw.Stop()
    $ms = $sw.ElapsedMilliseconds
    $color = if ($ms -gt 1000) { "Red" } elseif ($ms -gt 300) { "Yellow" } else { "Green" }
    Write-Host ($api.PadRight(50) + "| $($r.StatusCode)    | ${ms}ms") -ForegroundColor $color
  } catch {
    $sw.Stop()
    Write-Host ($api.PadRight(50) + "| ERR    | $($sw.ElapsedMilliseconds)ms - $($_.Exception.Message.Substring(0,[Math]::Min(40,$_.Exception.Message.Length)))") -ForegroundColor Red
  }
}
Write-Host ("-" * 75) -ForegroundColor Gray
Write-Host "Done" -ForegroundColor Cyan
