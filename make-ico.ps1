Add-Type -AssemblyName System.Drawing

$basePath = 'C:\Users\niyazi\Desktop\muhasibat proqrami\assets'
$src = [System.Drawing.Image]::FromFile("$basePath\logo.png")

# Hər ölçüdə narıncı fonda ağ "SQ" yazılı icon yaradır
function Make-SQIcon($size) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic

    # Narıncı gradient fon
    $rect = New-Object System.Drawing.Rectangle(0, 0, $size, $size)
    $c1 = [System.Drawing.Color]::FromArgb(245, 130, 32)
    $c2 = [System.Drawing.Color]::FromArgb(210, 85, 5)
    $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect, $c1, $c2, [System.Drawing.Drawing2D.LinearGradientMode]::ForwardDiagonal)

    # Yumru künclü düzbucaq
    $radius = [Math]::Max(2, [int]($size * 0.20))
    $d = $radius * 2
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $path.AddArc(0, 0, $d, $d, 180, 90)
    $path.AddArc($size - $d, 0, $d, $d, 270, 90)
    $path.AddArc($size - $d, $size - $d, $d, $d, 0, 90)
    $path.AddArc(0, $size - $d, $d, $d, 90, 90)
    $path.CloseFigure()
    $g.FillPath($brush, $path)

    # "SQ" yazısı - ağ, qalın
    $fontSize = [float][Math]::Max(6, [int]($size * 0.42))
    $font = New-Object System.Drawing.Font('Segoe UI', $fontSize, [System.Drawing.FontStyle]::Bold)
    $textBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
    $sf = New-Object System.Drawing.StringFormat
    $sf.Alignment = [System.Drawing.StringAlignment]::Center
    $sf.LineAlignment = [System.Drawing.StringAlignment]::Center
    $textRect = New-Object System.Drawing.RectangleF(0, 0, $size, $size)
    $g.DrawString('SQ', $font, $textBrush, $textRect, $sf)

    $g.Dispose()
    return $bmp
}

# ICO yarat
$allSizes = @(16, 24, 32, 48, 64, 128, 256)

$ms = New-Object System.IO.MemoryStream
$bw = New-Object System.IO.BinaryWriter($ms)
$bw.Write([UInt16]0)
$bw.Write([UInt16]1)
$bw.Write([UInt16]$allSizes.Count)

$headerSize = 6 + ($allSizes.Count * 16)
$offset = $headerSize
$imgList = New-Object System.Collections.ArrayList

foreach ($s in $allSizes) {
    $bmp = Make-SQIcon $s

    $pms = New-Object System.IO.MemoryStream
    $bmp.Save($pms, [System.Drawing.Imaging.ImageFormat]::Png)
    $data = $pms.ToArray()
    [void]$imgList.Add($data)

    $w = if ($s -eq 256) { 0 } else { $s }
    $bw.Write([byte]$w)
    $bw.Write([byte]$w)
    $bw.Write([byte]0)
    $bw.Write([byte]0)
    $bw.Write([UInt16]1)
    $bw.Write([UInt16]32)
    $bw.Write([UInt32]$data.Length)
    $bw.Write([UInt32]$offset)
    $offset += $data.Length

    $bmp.Dispose()
    $pms.Dispose()
}

foreach ($d in $imgList) { $bw.Write($d) }
$bw.Flush()

$icoPath = "$basePath\logo.ico"
[System.IO.File]::WriteAllBytes($icoPath, $ms.ToArray())
$bw.Dispose()
$ms.Dispose()

# ---- Installer Welcome bitmap (164x314) ----
$bmpW = New-Object System.Drawing.Bitmap(164, 314)
$gW = [System.Drawing.Graphics]::FromImage($bmpW)
$gW.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$gW.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
$gW.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$gW.Clear([System.Drawing.Color]::White)

# Logo şəklini mərkəzdə çək
$logoSize = 130
$lx = (164 - $logoSize) / 2
$gW.DrawImage($src, [int]$lx, 30, $logoSize, [int]($logoSize * $src.Height / $src.Width))

# "Smart" yazısı - TÜnd boz (əvvəl ağ idi, indi görünəcək)
$fontSmart = New-Object System.Drawing.Font('Segoe UI', [float]16)
$fontQeyd = New-Object System.Drawing.Font('Segoe UI', [float]16, [System.Drawing.FontStyle]::Bold)
$darkBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(80, 80, 80))
$orangeBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(240, 120, 20))
$sfC = New-Object System.Drawing.StringFormat
$sfC.Alignment = [System.Drawing.StringAlignment]::Center

$smartW = $gW.MeasureString('Smart', $fontSmart)
$qeydW = $gW.MeasureString('Qeyd', $fontQeyd)
$totalW = $smartW.Width + $qeydW.Width - 8
$startX = (164 - $totalW) / 2
$textY = 120
$gW.DrawString('Smart', $fontSmart, $darkBrush, $startX, $textY)
$gW.DrawString('Qeyd', $fontQeyd, $orangeBrush, $startX + $smartW.Width - 8, $textY)

# Alt yazı
$fontSub = New-Object System.Drawing.Font('Segoe UI', [float]7)
$subBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(150, 150, 150))
$gW.DrawString('Biznes Idareetme Sistemi', $fontSub, $subBrush, 82, 148, $sfC)

$gW.Dispose()
$bmpW.Save("$basePath\installer-welcome.bmp", [System.Drawing.Imaging.ImageFormat]::Bmp)
$bmpW.Dispose()

$src.Dispose()

$fileSize = (Get-Item $icoPath).Length
Write-Host "ICO yaradildi: $fileSize bytes ($($allSizes.Count) olcu)"
Write-Host "Installer bitmap yenilendi (Smart = tund reng)"
