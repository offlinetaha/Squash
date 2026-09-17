Add-Type -AssemblyName System.Drawing

$sizes = @(16, 32, 48, 128)
$targetDir = 'c:\Users\Yasee\Desktop\Squash\icons'
if (-not (Test-Path $targetDir)) {
    New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
}

foreach ($sz in $sizes) {
    $bmp = New-Object System.Drawing.Bitmap($sz, $sz)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)

    # Rounded background
    $rect = New-Object System.Drawing.Rectangle(0, 0, $sz, $sz)
    $colorTop = [System.Drawing.Color]::FromArgb(255, 16, 185, 129)    # Emerald #10B981
    $colorBottom = [System.Drawing.Color]::FromArgb(255, 99, 102, 241) # Indigo #6366F1
    $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect, $colorTop, $colorBottom, 45.0)

    $radius = [Math]::Max(2, [int]($sz * 0.22))
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $d = $radius * 2
    $pad = [Math]::Max(1, [int]($sz * 0.04))
    $innerW = $sz - ($pad * 2)
    $innerH = $sz - ($pad * 2)

    $path.AddArc($pad, $pad, $d, $d, 180, 90)
    $path.AddArc($pad + $innerW - $d, $pad, $d, $d, 270, 90)
    $path.AddArc($pad + $innerW - $d, $pad + $innerH - $d, $d, $d, 0, 90)
    $path.AddArc($pad, $pad + $innerH - $d, $d, $d, 90, 90)
    $path.CloseFigure()
    $g.FillPath($brush, $path)

    # Inward compression bars
    $whiteBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 255, 255, 255))
    $barW = [Math]::Max(2, [int]($sz * 0.54))
    $barH = [Math]::Max(1, [int]($sz * 0.12))
    $barX = [int](($sz - $barW) / 2)
    $centerOffset = [Math]::Max(1, [int]($sz * 0.19))
    $centerY = [int]($sz / 2)

    # Top plate (moving down)
    $topBarY = $centerY - $centerOffset - [int]($barH / 2)
    $g.FillRectangle($whiteBrush, $barX, $topBarY, $barW, $barH)

    # Bottom plate (moving up)
    $botBarY = $centerY + $centerOffset - [int]($barH / 2)
    $g.FillRectangle($whiteBrush, $barX, $botBarY, $barW, $barH)

    # Middle center collapsed core (amber pill)
    $coreW = [Math]::Max(2, [int]($sz * 0.38))
    $coreH = [Math]::Max(1, [int]($sz * 0.11))
    $coreX = [int](($sz - $coreW) / 2)
    $coreY = [int]($centerY - ($coreH / 2))
    $accentBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(240, 254, 240, 138))
    $g.FillRectangle($accentBrush, $coreX, $coreY, $coreW, $coreH)

    # Subtle inward arrow pointers for larger sizes
    if ($sz -ge 32) {
        $arrowSz = [Math]::Max(2, [int]($sz * 0.08))
        # Top down arrow
        $p1 = New-Object System.Drawing.Point([int]($sz / 2), [int]($topBarY + $barH + $arrowSz))
        $p2 = New-Object System.Drawing.Point([int]($sz / 2 - $arrowSz), [int]($topBarY + $barH))
        $p3 = New-Object System.Drawing.Point([int]($sz / 2 + $arrowSz), [int]($topBarY + $barH))
        $g.FillPolygon($whiteBrush, @($p1, $p2, $p3))

        # Bottom up arrow
        $bp1 = New-Object System.Drawing.Point([int]($sz / 2), [int]($botBarY - $arrowSz))
        $bp2 = New-Object System.Drawing.Point([int]($sz / 2 - $arrowSz), [int]($botBarY))
        $bp3 = New-Object System.Drawing.Point([int]($sz / 2 + $arrowSz), [int]($botBarY))
        $g.FillPolygon($whiteBrush, @($bp1, $bp2, $bp3))
    }

    $outPath = Join-Path $targetDir ("icon-" + $sz + ".png")
    $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
    Write-Output "Generated: $outPath ($sz x $sz)"
}
