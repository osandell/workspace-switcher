#Requires AutoHotkey v2.0
#SingleInstance Force

if (A_Args.Length < 1) {
    MsgBox("Please provide a window ID as an argument.")
    ExitApp
}

targetHwnd := A_Args[1]
targetPath := A_Args[2]
fullScreen := A_Args[3]
currentDisplay := A_Args[4]
windowFound := 0

; Prepare display variants for title matching
targetPathShort := ""
if InStr(targetPath, "/home/olof/") {
    targetPathShort := RegExReplace(targetPath, "^/home/olof/", "~/")
} else if InStr(targetPath, "/mnt/c/") {
    targetPath := RegExReplace(targetPath, "^/mnt/c/", "C:\")
    targetPath := StrReplace(targetPath, "/", "\")
}

; Get screen dimensions
screenWidth := A_ScreenWidth
screenHeight := A_ScreenHeight

if (screenWidth == 2560 && screenHeight == 1440) {
    currentDisplay := "thinkvision"
}

halfWidth := screenWidth // 2
oneThirdWidth := screenWidth // 3

; Calculate padding percentages for external display
leftPadding := Integer(screenWidth * 0.03)  ; 10% of screen width
rightPadding := Integer(screenWidth * 0.03)  ; 10% of screen width
topPadding := Integer(screenHeight * 0.05)   ; 5% of screen height
bottomPadding := Integer(screenHeight * 0.052) ; 5% of screen height
leftOffset := Integer(screenWidth * 0.003)
widthOffset := Integer(screenWidth * -0.003)

if (currentDisplay == "thinkvision") {
    if (fullScreen == "true") {
        leftPosition := leftPadding + leftOffset - 10
        topPosition := topPadding - 2
        windowWidth := screenWidth - (leftPadding + rightPadding) + widthOffset + 22
        windowHeight := screenHeight - (topPadding + bottomPadding) + 6
    } else {
        ; For two windows side by side with padding around the combined whole
        leftPosition := leftPadding
        topPosition := topPadding - 2

        ; Calculate the width for windows with only outer padding
        totalUsableWidth := screenWidth - (leftPadding + rightPadding)

        ; Left window should take 65% of usable width
        leftWidth := Integer(totalUsableWidth * 0.325)

        ; Right window gets the remaining space
        rightWidth := totalUsableWidth - leftWidth

        ; Position on the right side
        leftPosition := leftPadding + leftWidth + 2
        windowWidth := rightWidth + 10

        windowHeight := screenHeight - (topPadding + bottomPadding) + 5
    }
} else if (currentDisplay == "internal") {
    if (fullScreen == "true") {
        leftPosition := -10
        topPosition := 34
        windowWidth := screenWidth + 20
        windowHeight := screenHeight - topPosition + 10
    } else {
        leftPosition := oneThirdWidth + 20
        topPosition := 41
        windowWidth := oneThirdWidth * 2 - 10
        windowHeight := screenHeight - topPosition - 1
    }
} else { ; External monitor
    if (fullScreen == "true") {
        leftPosition := leftPadding + leftOffset
        topPosition := topPadding
        windowWidth := screenWidth - (leftPadding + rightPadding) + widthOffset
        windowHeight := screenHeight - (topPadding + bottomPadding)
    } else {
        ; For two windows side by side with padding around the combined whole
        leftPosition := leftPadding
        topPosition := topPadding

        ; Calculate the width for windows with only outer padding
        totalUsableWidth := screenWidth - (leftPadding + rightPadding)

        ; Left window should take 65% of usable width
        leftWidth := Integer(totalUsableWidth * 0.325)

        ; Right window gets the remaining space
        rightWidth := totalUsableWidth - leftWidth

        ; Check if we should position on left or right side
        hasWindowOnLeft := 0

        ; Scan windows to check if there's already a positioned window
        for index, hwnd in WinGetList("ahk_exe cursor.exe") {
            WinGetPos(&wx, &wy, &ww, &wh, "ahk_id " . hwnd)
            if (wx >= leftPadding && wx < screenWidth / 2 &&
                wy >= topPadding && wy < screenHeight - bottomPadding) {
                hasWindowOnLeft := 1
                break
            }
        }

        if (hasWindowOnLeft) {
            ; Position on the right side
            leftPosition := leftPadding + leftWidth + 10
            windowWidth := rightWidth
        } else {
            ; Position on the left side
            leftPosition := leftPadding
            windowWidth := leftWidth
        }

        windowHeight := screenHeight - (topPadding + bottomPadding)
    }
}

; Find and position the specific window
existingWindows := WinGetList("ahk_exe cursor.exe")

debugFile := "position-cursor-debug.txt"
FileAppend("=== " . A_Now . " ===`n", debugFile)
FileAppend("Looking for hwnd: " . targetHwnd . " path: " . targetPath . "`n", debugFile)
FileAppend("Fullscreen: " . fullScreen . "`n", debugFile)
FileAppend("Position: " . leftPosition . "," . topPosition . " Size: " . windowWidth . "x" . windowHeight . "`n", debugFile)
FileAppend("Found " . existingWindows.Length . " Cursor windows`n", debugFile)

; Try 1: Find by exact hwnd AND verify the path matches
for _, hwnd in existingWindows {
    FileAppend("Checking hwnd: " . hwnd . "`n", debugFile)
    if (hwnd = targetHwnd) {
        ; Verify the window title matches the expected path
        title := WinGetTitle("ahk_id " . hwnd)
        titlePath := RegExReplace(title, " \(.*\)$", "")
        FileAppend("  Found hwnd match, verifying title: " . titlePath . "`n", debugFile)

        if (titlePath == targetPathShort || titlePath == targetPath) {
            FileAppend("MATCH by hwnd AND title verified! Moving window`n", debugFile)
            WinMove(leftPosition, topPosition, windowWidth, windowHeight, "ahk_id " . targetHwnd)
            WinActivate("ahk_id " . targetHwnd)
            windowFound := 1
            FileAppend("Window moved successfully`n", debugFile)
            break
        } else {
            FileAppend("  Hwnd matches but title doesn't match (expected " . targetPathShort . " or " . targetPath . "), continuing search`n", debugFile)
        }
    }
}

; Try 2: If not found by hwnd, find by matching window title with path
if (!windowFound) {
    FileAppend("Not found by hwnd, trying by title match...`n", debugFile)
    for _, hwnd in existingWindows {
        title := WinGetTitle("ahk_id " . hwnd)
        titlePath := RegExReplace(title, " \(.*\)$", "")
        FileAppend("  Checking title: " . titlePath . "`n", debugFile)
        if (titlePath == targetPathShort || titlePath == targetPath) {
            FileAppend("MATCH by title! Moving window with new hwnd: " . hwnd . "`n", debugFile)
            WinMove(leftPosition, topPosition, windowWidth, windowHeight, "ahk_id " . hwnd)
            WinActivate("ahk_id " . hwnd)
            windowFound := 1
            ; Write the new hwnd to temp file so main.js can update the stored value
            FileAppend(hwnd, "temp_position_hwnd.txt")
            FileAppend("Window moved successfully, wrote new hwnd to temp file`n", debugFile)
            break
        }
    }
}

if (!windowFound) {
    FileAppend("ERROR: Window not found by hwnd or title!`n", debugFile)
}

; Always exit the script when done
ExitApp
