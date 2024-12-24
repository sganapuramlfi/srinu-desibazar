# PowerShell script to test salon dashboard functionality
$baseUrl = "https://fffba076-bb1a-40f5-bb6b-17e794181c88-00-3p6nq8vhuxh28.kirk.replit.dev"
$businessId = 19
$outputFile = "salon-dashboard-test-results.txt"

# Function to write output with timestamp
function Write-Log {
    param($Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "$timestamp - $Message" | Tee-Object -FilePath $outputFile -Append
}

# Function to make HTTP requests and handle responses
function Invoke-ApiRequest {
    param(
        [string]$Method,
        [string]$Endpoint,
        [object]$Body = $null
    )
    
    $uri = "$baseUrl$Endpoint"
    $headers = @{
        "Content-Type" = "application/json"
    }
    
    try {
        if ($Body) {
            $response = Invoke-WebRequest -Uri $uri -Method $Method -Headers $headers -Body ($Body | ConvertTo-Json) -SessionVariable 'Session' -UseBasicParsing
        } else {
            $response = Invoke-WebRequest -Uri $uri -Method $Method -Headers $headers -SessionVariable 'Session' -UseBasicParsing
        }
        
        Write-Log "Request: $Method $Endpoint"
        Write-Log "Response Status: $($response.StatusCode)"
        Write-Log "Response Body: $($response.Content)"
        Write-Log "---"
        
        return $response
    }
    catch {
        Write-Log "Error in $Method $Endpoint"
        Write-Log "Status Code: $($_.Exception.Response.StatusCode.value__)"
        Write-Log "Error Message: $($_.Exception.Message)"
        Write-Log "Response: $($_.ErrorDetails.Message)"
        Write-Log "---"
        return $null
    }
}

# Clear previous results
if (Test-Path $outputFile) {
    Remove-Item $outputFile
}

Write-Log "Starting Salon Dashboard API Tests"
Write-Log "---"

# Test 1: Authentication
Write-Log "Testing Authentication"
$loginBody = @{
    username = "stest"
    password = "Test@1234"
}
$loginResponse = Invoke-ApiRequest -Method "POST" -Endpoint "/api/login" -Body $loginBody

if ($loginResponse) {
    Write-Log "Authentication successful"
} else {
    Write-Log "Authentication failed"
    exit
}

# Test 2: Service Management
Write-Log "Testing Service Management"

# Get all services
$servicesResponse = Invoke-ApiRequest -Method "GET" -Endpoint "/api/businesses/$businessId/services"

# Create a new service
$newService = @{
    name = "Test Service $(Get-Random)"
    description = "Test Description"
    duration = 60
    price = "50.00"
    category = "hair"
    isActive = $true
}
$createServiceResponse = Invoke-ApiRequest -Method "POST" -Endpoint "/api/businesses/$businessId/services" -Body $newService

# If service was created, test update and delete
if ($createServiceResponse) {
    $serviceId = ($createServiceResponse.Content | ConvertFrom-Json).id
    
    # Update service
    $updateService = @{
        name = "Updated Test Service"
        price = "55.00"
    }
    Invoke-ApiRequest -Method "PUT" -Endpoint "/api/businesses/$businessId/services/$serviceId" -Body $updateService
    
    # Delete service
    Invoke-ApiRequest -Method "DELETE" -Endpoint "/api/businesses/$businessId/services/$serviceId"
}

# Test 3: Staff Management
Write-Log "Testing Staff Management"

# Get all staff
$staffResponse = Invoke-ApiRequest -Method "GET" -Endpoint "/api/businesses/$businessId/staff"

# Create a new staff member
$newStaff = @{
    name = "Test Staff $(Get-Random)"
    email = "test.staff@example.com"
    phone = "1234567890"
    specialization = "Hair Styling"
    status = "active"
}
$createStaffResponse = Invoke-ApiRequest -Method "POST" -Endpoint "/api/businesses/$businessId/staff" -Body $newStaff

# Test 4: Staff Skills
Write-Log "Testing Staff Skills"

# Get all staff skills
$staffSkillsResponse = Invoke-ApiRequest -Method "GET" -Endpoint "/api/businesses/$businessId/staff-skills"

if ($createStaffResponse) {
    $staffId = ($createStaffResponse.Content | ConvertFrom-Json).id
    
    # Update staff skills
    $updateSkills = @{
        serviceIds = @(1, 2) # Replace with actual service IDs from your system
    }
    Invoke-ApiRequest -Method "PUT" -Endpoint "/api/businesses/$businessId/staff/$staffId/skills" -Body $updateSkills
}

# Test 5: Shift Templates
Write-Log "Testing Shift Templates"

# Get all shift templates
$templatesResponse = Invoke-ApiRequest -Method "GET" -Endpoint "/api/businesses/$businessId/shift-templates"

# Create a new shift template
$newTemplate = @{
    name = "Test Template $(Get-Random)"
    startTime = "09:00"
    endTime = "17:00"
    breaks = @(
        @{
            startTime = "12:00"
            endTime = "13:00"
            duration = 60
            type = "lunch"
        }
    )
    type = "regular"
    isActive = $true
}
$createTemplateResponse = Invoke-ApiRequest -Method "POST" -Endpoint "/api/businesses/$businessId/shift-templates" -Body $newTemplate

# Test 6: Roster Management
Write-Log "Testing Roster Management"

# Get roster
$rosterResponse = Invoke-ApiRequest -Method "GET" -Endpoint "/api/businesses/$businessId/roster"

if ($staffResponse -and $templatesResponse) {
    $staffId = ($staffResponse.Content | ConvertFrom-Json)[0].id
    $templateId = ($templatesResponse.Content | ConvertFrom-Json)[0].id
    
    # Assign shift
    $assignShift = @{
        staffId = $staffId
        templateId = $templateId
        date = (Get-Date).ToString("yyyy-MM-dd")
    }
    Invoke-ApiRequest -Method "POST" -Endpoint "/api/businesses/$businessId/roster/assign" -Body $assignShift
}

Write-Log "Testing Complete"
Write-Log "Results saved to $outputFile"
