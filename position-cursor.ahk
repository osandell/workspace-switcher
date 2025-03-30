#Requires AutoHotkey v2.0
#SingleInstance Force

if (A_Args.Length < 1) {
    MsgBox("Please provide a window ID as an argument.")
    ExitApp
}

targetHwnd := A_Args[1]
fullScreen := A_Args[2]
currentDisplay := A_Args[3]
windowFound := 0

; Get screen dimensions
screenWidth := A_ScreenWidth
screenHeight := A_ScreenHeight

; Get screen dimensions
screenWidth := A_ScreenWidth
screenHeight := A_ScreenHeight

halfWidth := screenWidth // 2
oneThirdWidth := screenWidth // 3

; Calculate padding percentages for external display
leftPadding := Integer(screenWidth * 0.10)  ; 10% of screen width
rightPadding := Integer(screenWidth * 0.10)  ; 10% of screen width
topPadding := Integer(screenHeight * 0.05)   ; 5% of screen height
bottomPadding := Integer(screenHeight * 0.05) ; 5% of screen height
leftOffset := Integer(screenWidth * 0.003)
widthOffset := Integer(screenWidth * -0.003)

if (currentDisplay == "internal") {
    if (fullScreen == "true") {
        leftPosition := -10
        topPosition := 34
        windowWidth := screenWidth + 20
        windowHeight := screenHeight - topPosition + 10
    } else {
        leftPosition := oneThirdWidth + 12
        topPosition := 34
        windowWidth := oneThirdWidth * 2
        windowHeight := screenHeight - topPosition + 10
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
        leftWidth := Integer(totalUsableWidth * 0.33)

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
            leftPosition := leftPadding + leftWidth
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

for _, hwnd in existingWindows {
    if (hwnd = targetHwnd) {
        WinMove(leftPosition, topPosition, windowWidth, windowHeight, "ahk_id " . targetHwnd)
        WinActivate("ahk_id " . targetHwnd)
        windowFound := 1
        break
    }
}

; Always exit the script when done
ExitApp
