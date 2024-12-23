# API Testing Script for DesiBazaar
$baseUrl = "http://localhost:5000"
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
        $ExpectedStatus = 200,
        $Description = ""
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
        Write-Log "$symbol $Method $Endpoint - $Description - Status: $($response.StatusCode) (Expected: $ExpectedStatus)"
        Write-Log "Response: $($response.Content)"

        return $response
    }
    catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        $errorMessage = $_.Exception.Message
        Write-Log "❌ $Method $Endpoint - $Description - Error: $statusCode - $errorMessage"
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

# Test 1: Authentication Flow
Write-Log "`n📋 Test 1: Authentication Flow"

$testUser = @{
    username = "testuser$(Get-Random)"
    password = "Test@123"
    email = "test$(Get-Random)@example.com"
    role = "business"
    business = @{
        name = "Test Salon"
        industryType = "salon"
        description = "Test salon business"
    }
}

# Register new business user
$registerResponse = Test-Endpoint -Method "POST" -Endpoint "/api/register" -Body $testUser -Description "Register new salon business"

if ($registerResponse) {
    $registerData = $registerResponse.Content | ConvertFrom-Json

    # Test login
    $loginData = @{
        username = $testUser.username
        password = $testUser.password
    }
    $loginResponse = Test-Endpoint -Method "POST" -Endpoint "/api/login" -Body $loginData -Description "Login with salon business account"

    if ($loginResponse) {
        $userData = ($loginResponse.Content | ConvertFrom-Json).user
        $businessId = $userData.business.id

        # Test 2: Salon Service Management
        Write-Log "`n📋 Test 2: Salon Service Management"

        # Create new service
        $newService = @{
            name = "Haircut"
            description = "Basic haircut service"
            duration = 30
            price = 25.00
            category = "hair"
        }
        $createServiceResponse = Test-Endpoint -Method "POST" -Endpoint "/api/businesses/$businessId/services" -Body $newService -Description "Create new salon service"

        if ($createServiceResponse) {
            $serviceData = $createServiceResponse.Content | ConvertFrom-Json
            $serviceId = $serviceData.id

            # Get services list
            Test-Endpoint -Method "GET" -Endpoint "/api/businesses/$businessId/services" -Description "Get salon services list"

            # Get specific service
            Test-Endpoint -Method "GET" -Endpoint "/api/businesses/$businessId/services/$serviceId" -Description "Get specific salon service"

            # Update service
            $updateService = @{
                price = 30.00
                description = "Updated haircut service"
            }
            Test-Endpoint -Method "PUT" -Endpoint "/api/businesses/$businessId/services/$serviceId" -Body $updateService -Description "Update salon service"

            # Delete service (added for completeness)
            Test-Endpoint -Method "DELETE" -Endpoint "/api/businesses/$businessId/services/$serviceId" -Description "Delete salon service"
        }


        # Test 3: Staff Management
        Write-Log "`n📋 Test 3: Staff Management"

        # Create new staff
        $newStaff = @{
            name = "John Doe"
            email = "john$(Get-Random)@example.com"
            phone = "+1234567890"
            specialization = "Hair Stylist"
            schedule = @{
                "monday" = @{
                    start = "09:00"
                    end = "17:00"
                }
            }
        }
        $createStaffResponse = Test-Endpoint -Method "POST" -Endpoint "/api/businesses/$businessId/staff" -Body $newStaff -Description "Create new staff member"

        if ($createStaffResponse) {
            $staffData = $createStaffResponse.Content | ConvertFrom-Json
            $staffId = $staffData.id

            # Get staff list
            Test-Endpoint -Method "GET" -Endpoint "/api/businesses/$businessId/staff" -Description "Get staff list"

            # Get specific staff member
            Test-Endpoint -Method "GET" -Endpoint "/api/businesses/$businessId/staff/$staffId" -Description "Get specific staff member"

            # Update staff member (added for completeness)
            $updateStaff = @{
                name = "Jane Doe"
            }
            Test-Endpoint -Method "PUT" -Endpoint "/api/businesses/$businessId/staff/$staffId" -Body $updateStaff -Description "Update staff member"

            # Delete staff member (added for completeness)
            Test-Endpoint -Method "DELETE" -Endpoint "/api/businesses/$businessId/staff/$staffId" -Description "Delete staff member"


            # Test 4: Staff Skills Management
            Write-Log "`n📋 Test 4: Staff Skills Management"

            if ($serviceId) {
                # Add skill to staff
                $newSkill = @{
                    serviceId = $serviceId
                    proficiencyLevel = "expert"
                }
                $addSkillResponse = Test-Endpoint -Method "POST" -Endpoint "/api/businesses/$businessId/staff/$staffId/skills" -Body $newSkill -Description "Add skill to staff member"

                if ($addSkillResponse) {
                    # Get staff skills
                    Test-Endpoint -Method "GET" -Endpoint "/api/businesses/$businessId/staff/$staffId/skills" -Description "Get staff skills"

                    # Remove skill from staff (added for completeness)
                    Test-Endpoint -Method "DELETE" -Endpoint "/api/businesses/$businessId/staff/$staffId/skills/$($addSkillResponse.Content | ConvertFrom-Json).id" -Description "Remove skill from staff member"
                }
            }
        }

        # Test 5: Logout
        Write-Log "`n📋 Test 5: Logout"
        Test-Endpoint -Method "POST" -Endpoint "/api/logout" -Description "Logout user"
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