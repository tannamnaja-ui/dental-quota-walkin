<#
.SYNOPSIS
    Build script for dentalquotaWalkin installer.
    Output: build\dentalquotaWalkin.exe  (offline installer - no internet needed on target)
#>

$ErrorActionPreference = "Stop"

$ProjectRoot  = Resolve-Path "$PSScriptRoot\.."
$BuildDir     = $PSScriptRoot
$InstallFiles = "$BuildDir\install_files"

function Step($n, $msg) { Write-Host "" ; Write-Host "[$n] $msg" -ForegroundColor Cyan }
function Ok($msg)        { Write-Host "    OK: $msg" -ForegroundColor Green }
function Fail($msg)      { Write-Host "    ERROR: $msg" -ForegroundColor Red ; exit 1 }

Write-Host ""
Write-Host "=================================================" -ForegroundColor White
Write-Host "   dentalquotaWalkin Installer Builder" -ForegroundColor White
Write-Host "=================================================" -ForegroundColor White

# Step 1: Build Frontend
Step 1 "Building React frontend..."
Set-Location "$ProjectRoot\frontend"
npm install --silent
if ($LASTEXITCODE -ne 0) { Fail "npm install failed in frontend" }
npm run build
if ($LASTEXITCODE -ne 0) { Fail "npm run build failed" }
Ok "Frontend built -> frontend/dist"

# Step 2: Prepare install_files directory
Step 2 "Preparing install_files directory..."
if (Test-Path $InstallFiles) { Remove-Item $InstallFiles -Recurse -Force }
New-Item -ItemType Directory -Path "$InstallFiles\public" -Force | Out-Null

Copy-Item "$ProjectRoot\frontend\dist\*" "$InstallFiles\public\" -Recurse -Force
Ok "Frontend copied to install_files/public/"

Copy-Item "$BuildDir\launch.vbs" "$InstallFiles\" -Force
Copy-Item "$BuildDir\stop.vbs"   "$InstallFiles\" -Force
Ok "VBS scripts copied"

# Step 3: Install backend npm packages
Step 3 "Installing backend dependencies..."
Set-Location "$ProjectRoot\backend"
npm install --silent
if ($LASTEXITCODE -ne 0) { Fail "npm install failed in backend" }
Ok "Backend dependencies ready"

# Step 4: Install @yao-pkg/pkg locally
Step 4 "Installing @yao-pkg/pkg..."
Set-Location "$ProjectRoot\backend"
npm install --save-dev @yao-pkg/pkg --silent
if ($LASTEXITCODE -ne 0) { Fail "Failed to install @yao-pkg/pkg" }
Ok "@yao-pkg/pkg installed"

# Step 5: Package backend into standalone exe
Step 5 "Packaging backend with pkg (includes Node.js runtime)..."
Set-Location "$ProjectRoot\backend"
npx pkg src/app.js --target node18-win-x64 --output "$InstallFiles\dental-quota-walkin.exe"
if ($LASTEXITCODE -ne 0) { Fail "pkg packaging failed" }
$exeMB = [math]::Round((Get-Item "$InstallFiles\dental-quota-walkin.exe").Length / 1MB, 1)
Ok "Executable created ($exeMB MB)"

# Step 6: Find or install Inno Setup
Step 6 "Locating Inno Setup compiler..."
$isccPaths = @(
    "${env:ProgramFiles(x86)}\Inno Setup 6\ISCC.exe",
    "${env:ProgramFiles}\Inno Setup 6\ISCC.exe",
    "${env:ProgramFiles(x86)}\Inno Setup 5\ISCC.exe",
    "${env:ProgramFiles}\Inno Setup 5\ISCC.exe"
)
$iscc = $null
foreach ($p in $isccPaths) {
    if (Test-Path $p) { $iscc = $p ; break }
}

if (-not $iscc) {
    Write-Host "    Inno Setup not found - downloading..." -ForegroundColor Yellow
    $tmpSetup = "$env:TEMP\innosetup-install.exe"
    Invoke-WebRequest "https://files.jrsoftware.org/is/6/innosetup-6.3.3.exe" -OutFile $tmpSetup -UseBasicParsing
    Start-Process $tmpSetup -ArgumentList "/VERYSILENT /NORESTART /SUPPRESSMSGBOXES" -Wait
    Remove-Item $tmpSetup -Force
    $iscc = "${env:ProgramFiles(x86)}\Inno Setup 6\ISCC.exe"
    if (-not (Test-Path $iscc)) { Fail "Inno Setup installation failed" }
}
Ok "Inno Setup: $iscc"

# Step 7: Compile installer
Step 7 "Compiling installer..."
Set-Location $BuildDir
& $iscc "installer.iss"
if ($LASTEXITCODE -ne 0) { Fail "Inno Setup compilation failed" }

$outFile = "$BuildDir\dentalquotaWalkin.exe"
$sizeMB  = [math]::Round((Get-Item $outFile).Length / 1MB, 1)

Write-Host ""
Write-Host "=================================================" -ForegroundColor Green
Write-Host "   BUILD COMPLETE!" -ForegroundColor Green
Write-Host "   Installer: build\dentalquotaWalkin.exe ($sizeMB MB)" -ForegroundColor Green
Write-Host "   Runs OFFLINE on any Windows 7+ 64-bit PC." -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Green
