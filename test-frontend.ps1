```powershell
# Frontend Testing Script for DesiBazaar
param(
    [string]$baseUrl = "http://localhost:5000"
)

function Write-Log {
    param([string]$message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "$timestamp - $message"
    Add-Content -Path "frontend-test-results.log" -Value "$timestamp - $message"
}

function Test-ComponentRendering {
    param([string]$url, [string]$componentName)
    try {
        $response = Invoke-WebRequest -Uri $url -UseBasicParsing
        if ($response.StatusCode -eq 200) {
            Write-Log "✅ $componentName rendered successfully"
            return $true
        }
        Write-Log "❌ Failed to render $componentName - Status: $($response.StatusCode)"
        return $false
    }
    catch {
        Write-Log "❌ Error testing $componentName - $($_.Exception.Message)"
        return $false
    }
}

function Test-AuthFlow {
    param([hashtable]$credentials)
    try {
        # Test registration
        $regResponse = Invoke-RestMethod -Uri "$baseUrl/api/register" -Method Post -Body ($credentials | ConvertTo-Json) -ContentType "application/json"
        Write-Log "✅ Registration response: $($regResponse | ConvertTo-Json)"

        # Test login
        $loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/login" -Method Post -Body ($credentials | ConvertTo-Json) -ContentType "application/json"
        Write-Log "✅ Login response: $($loginResponse | ConvertTo-Json)"

        # Check dashboard redirect
        if ($loginResponse.user.role -eq "business") {
            $dashboardUrl = "$baseUrl/dashboard/$($loginResponse.user.business.id)"
            $dashResponse = Invoke-WebRequest -Uri $dashboardUrl -UseBasicParsing
            Write-Log "✅ Dashboard redirect check: $($dashResponse.StatusCode)"
        }

        return $true
    }
    catch {
        Write-Log "❌ Auth flow error: $($_.Exception.Message)"
        return $false
    }
}

Write-Log "🔍 Starting Frontend Tests for DesiBazaar"
Write-Log "Base URL: $baseUrl"
Write-Log ""

# Test 1: Basic Component Rendering
Write-Log "📋 Test 1: Component Rendering"
$components = @{
    "Landing Page" = "/"
    "Auth Page" = "/auth"
    "404 Page" = "/nonexistent"
}

foreach ($component in $components.GetEnumerator()) {
    Test-ComponentRendering -url "$baseUrl$($component.Value)" -componentName $component.Key
}

# Test 2: Industry-specific Landing Pages
Write-Log "`n📋 Test 2: Industry Landing Pages"
$industries = @("salon", "restaurant", "event", "realestate", "retail", "professional")
foreach ($industry in $industries) {
    Test-ComponentRendering -url "$baseUrl/?type=$industry" -componentName "$industry landing page"
}

# Test 3: Authentication Flow
Write-Log "`n📋 Test 3: Authentication Flow Testing"
$testUsers = @(
    @{
        username = "testsalon$(Get-Random)"
        password = "testpass123"
        email = "test$(Get-Random)@example.com"
        role = "business"
        businessType = "salon"
    }
)

foreach ($user in $testUsers) {
    Write-Log "Testing auth flow for $($user.username)"
    Test-AuthFlow -credentials $user
}

Write-Log "`n✨ Frontend Tests Completed"
Write-Log "Results saved to: $(Get-Location)\frontend-test-results.log"
Write-Log ""
Write-Log "📌 How to use this script:"
Write-Log "1. Make sure the DesiBazaar application is running"
Write-Log "2. Run the script in PowerShell: .\test-frontend.ps1"
Write-Log "3. Check the log file for detailed results and any errors"
Write-Log "4. Look for ❌ symbols to quickly identify failed tests"
```
