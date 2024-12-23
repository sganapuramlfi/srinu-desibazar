# Authentication Flow Testing Script for DesiBazaar
param(
    [string]$baseUrl = "http://localhost:5000"
)

function Write-Log {
    param([string]$message, [string]$type = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "$timestamp [$type] $message"
    Add-Content -Path "auth-test-results.log" -Value "$timestamp [$type] $message"
}

function Test-Endpoint {
    param(
        [string]$endpoint,
        [string]$method = "GET",
        [object]$body = $null,
        [string]$description
    )
    try {
        $params = @{
            Uri = "$baseUrl$endpoint"
            Method = $method
            ContentType = "application/json"
            UseBasicParsing = $true
        }
        
        if ($body) {
            $params.Body = $body | ConvertTo-Json
        }

        Write-Log "Testing $description ($method $endpoint)"
        Write-Log "Request body: $($body | ConvertTo-Json)" "DEBUG"
        
        $response = Invoke-WebRequest @params
        $content = $response.Content | ConvertFrom-Json
        Write-Log "Response: $($response.Content)" "DEBUG"
        Write-Log "✅ $description succeeded with status $($response.StatusCode)" "SUCCESS"
        return @{
            success = $true
            data = $content
            statusCode = $response.StatusCode
        }
    }
    catch {
        $errorResponse = $_.Exception.Response
        $errorMessage = if ($_.ErrorDetails.Message) {
            $_.ErrorDetails.Message
        } else {
            $_.Exception.Message
        }
        Write-Log "❌ $description failed: $errorMessage" "ERROR"
        Write-Log "Status code: $($errorResponse.StatusCode)" "ERROR"
        return @{
            success = $false
            error = $errorMessage
            statusCode = $errorResponse.StatusCode
        }
    }
}

Write-Log "🔍 Starting Authentication Flow Tests" "INFO"

# Test 1: Get current user (should be not logged in)
$userCheck = Test-Endpoint -endpoint "/api/user" -description "Initial user check"
Write-Log "Initial auth state: $($userCheck.data | ConvertTo-Json)" "INFO"

# Test 2: Test registration flow
$testUser = @{
    username = "testuser_$(Get-Random)"
    password = "testpass123"
    email = "test$(Get-Random)@example.com"
    role = "business"
    business = @{
        name = "Test Business $(Get-Random)"
        industryType = "salon"
        description = "Test business description"
    }
}

$registrationResult = Test-Endpoint `
    -endpoint "/api/register" `
    -method "POST" `
    -body $testUser `
    -description "User registration"

if ($registrationResult.success) {
    Write-Log "Created test user: $($testUser.username)" "SUCCESS"
    
    # Test 3: Attempt login with created user
    $loginResult = Test-Endpoint `
        -endpoint "/api/login" `
        -method "POST" `
        -body @{
            username = $testUser.username
            password = $testUser.password
        } `
        -description "Login with created user"

    if ($loginResult.success) {
        Write-Log "Successfully logged in as: $($loginResult.data.user.username)" "SUCCESS"
        
        # Test 4: Verify user session
        $sessionCheck = Test-Endpoint -endpoint "/api/user" -description "Session verification"
        Write-Log "Session state: $($sessionCheck.data | ConvertTo-Json)" "INFO"

        # Test 5: Test logout
        $logoutResult = Test-Endpoint `
            -endpoint "/api/logout" `
            -method "POST" `
            -description "User logout"

        if ($logoutResult.success) {
            Write-Log "Successfully logged out" "SUCCESS"
            
            # Test 6: Verify logged out state
            $finalCheck = Test-Endpoint -endpoint "/api/user" -description "Final state check"
            Write-Log "Final auth state: $($finalCheck.data | ConvertTo-Json)" "INFO"
        }
    }
}

Write-Log "`n✨ Authentication Flow Tests Completed" "INFO"
Write-Log "Results saved to: $(Get-Location)\auth-test-results.log" "INFO"
Write-Log "Check the log file for detailed results and any errors" "INFO"
