Add-Type -AssemblyName System.Drawing

$buildDir = Join-Path $PSScriptRoot "..\build"
if (-not (Test-Path $buildDir)) {
    New-Item -ItemType Directory -Path $buildDir | Out-Null
}

$sourceImg = "C:\Users\PC\.gemini\antigravity-ide\brain\620313b4-875f-41e8-a99a-3113f0d35072\studyflow_app_icon_1788542977222.jpg"
$img = [System.Drawing.Image]::FromFile($sourceImg)
$bmp = New-Object System.Drawing.Bitmap $img, 256, 256

# Save PNG
$pngPath = Join-Path $buildDir "icon.png"
$bmp.Save($pngPath, [System.Drawing.Imaging.ImageFormat]::Png)

# Save ICO
$icoPath = Join-Path $buildDir "icon.ico"
$hIcon = $bmp.GetHicon()
$icon = [System.Drawing.Icon]::FromHandle($hIcon)
$fs = New-Object System.IO.FileStream $icoPath, ([System.IO.FileMode]::Create)
$icon.Save($fs)
$fs.Close()
$icon.Dispose()
$bmp.Dispose()
$img.Dispose()

Write-Host "Icons generated successfully at: $buildDir"
