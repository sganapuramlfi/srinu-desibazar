# API Testing Script for DesiBazaar
$baseUrl = "https://fffba076-bb1a-40f5-bb6b-17e794181c88-00-3p6nq8vhuxh28.kirk.replit.dev"
$logFile = "api-test-results.log"

function Write-Log {
    param($Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "$timestamp - $Message" | Tee-Object -FilePath $logFile -Append
}

function Test-Endpoint {
    param(
        $Method,
        $Endpoint,
        $Body,
        $ExpectedStatus = 200
    )

    $session = $script:WebSession
    if (-not $session) {
        $script:WebSession = New-Object Microsoft.PowerShell.Commands.WebRequestSession
        $session = $script:WebSession
    }

    $headers = @{
        "Content-Type" = "application/json"
        "Accept" = "application/json"
    }

    $params = @{
        Method = $Method
        Uri = "$baseUrl$Endpoint"
        Headers = $headers
        UseBasicParsing = $true
        WebSession = $session
    }

    if ($Body) {
        $params["Body"] = ($Body | ConvertTo-Json)
    }

    try {
        $response = Invoke-WebRequest @params
        $statusMatch = $response.StatusCode -eq $ExpectedStatus
        $symbol = if ($statusMatch) { "✅" } else { "⚠️" }
        Write-Log "$symbol $Method $Endpoint - Status: $($response.StatusCode) (Expected: $ExpectedStatus)"
        Write-Log "Response: $($response.Content)"

        return $response
    }
    catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        $errorMessage = $_.Exception.Message
        Write-Log "❌ $Method $Endpoint - Error: $statusCode - $errorMessage"
        if ($_.Exception.Response) {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $errorBody = $reader.ReadToEnd()
            Write-Log "Error Details: $errorBody"
        }
        return $null
    }
}

# Clear previous log file
if (Test-Path $logFile) {
    Remove-Item $logFile
}

Write-Log "🔍 Starting API Tests for DesiBazaar"
Write-Log "Base URL: $baseUrl"

# Create a new WebSession
$script:WebSession = New-Object Microsoft.PowerShell.Commands.WebRequestSession

# Test 1: Check if server is up
Write-Log "`n📋 Test 1: Server Health Check"
Test-Endpoint -Method "GET" -Endpoint "/api/user" -ExpectedStatus 401

# Test 2: Test business registration for each industry type
$industries = @(
    @{type="salon"; name="Test Salon"},
    @{type="restaurant"; name="Test Restaurant"},
    @{type="event"; name="Test Event Management"},
    @{type="realestate"; name="Test Real Estate"},
    @{type="retail"; name="Test Retail Store"},
    @{type="professional"; name="Test Professional Services"}
)

Write-Log "`n📋 Test 2: Business Registration for Each Industry"
foreach ($industry in $industries) {
    Write-Log "`nTesting registration for $($industry.type)"

    # Reset WebSession for each test case
    $script:WebSession = New-Object Microsoft.PowerShell.Commands.WebRequestSession

    $businessUser = @{
        username = "test$($industry.type)$(Get-Random)"
        password = "test123456"
        email = "test$(Get-Random)@example.com"
        role = "business"
        business = @{
            name = $industry.name
            industryType = $industry.type
            description = "Test $($industry.type) business"
        }
    }

    $registerResponse = Test-Endpoint -Method "POST" -Endpoint "/api/register" -Body $businessUser
    if ($registerResponse) {
        $registerData = $registerResponse.Content | ConvertFrom-Json

        # Test login with registered user
        Write-Log "`nTesting login for $($industry.type)"
        $loginData = @{
            username = $businessUser.username
            password = $businessUser.password
        }
        $loginResponse = Test-Endpoint -Method "POST" -Endpoint "/api/login" -Body $loginData

        if ($loginResponse) {
            $loginData = $loginResponse.Content | ConvertFrom-Json

            # Test authenticated endpoints
            Write-Log "`nTesting authenticated endpoints for $($industry.type)"
            $userResponse = Test-Endpoint -Method "GET" -Endpoint "/api/user"

            if ($loginData.user.business.id) {
                $businessId = $loginData.user.business.id

                # Test business dashboard access
                Test-Endpoint -Method "GET" -Endpoint "/api/businesses/$businessId"

                # Test industry-specific endpoints
                switch ($industry.type) {
                    "salon" {
                        Test-Endpoint -Method "GET" -Endpoint "/api/businesses/$businessId/services"
                    }
                    "restaurant" {
                        Test-Endpoint -Method "GET" -Endpoint "/api/businesses/$businessId/menu"
                    }
                    "event" {
                        Test-Endpoint -Method "GET" -Endpoint "/api/businesses/$businessId/events"
                    }
                    "realestate" {
                        Test-Endpoint -Method "GET" -Endpoint "/api/businesses/$businessId/properties"
                    }
                    "retail" {
                        Test-Endpoint -Method "GET" -Endpoint "/api/businesses/$businessId/products"
                    }
                    "professional" {
                        Test-Endpoint -Method "GET" -Endpoint "/api/businesses/$businessId/services"
                    }
                }

                # Test business profile update
                $updateData = @{
                    name = "$($industry.name) Updated"
                    description = "Updated description for $($industry.type) business"
                }
                Test-Endpoint -Method "PUT" -Endpoint "/api/businesses/$businessId" -Body $updateData
            }

            # Test logout
            Test-Endpoint -Method "POST" -Endpoint "/api/logout"
        }
    }
}

Write-Log "`n✨ API Tests Completed"
Write-Log "Results saved to: $((Get-Item $logFile).FullName)"

# Display instructions
Write-Log "`n📌 How to use this script:"
Write-Log "1. Update the `$baseUrl variable if testing a different deployment"
Write-Log "2. Run the script in PowerShell: .\test-api.ps1"
Write-Log "3. Check the log file for detailed results and any errors"
Write-Log "4. Look for ❌ symbols to quickly identify failed tests"