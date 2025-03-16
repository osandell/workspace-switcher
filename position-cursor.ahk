#Requires AutoHotkey v2.0
#SingleInstance Force

targetPath := A_Args[1]
fullScreen := A_Args[2]
currentDisplay := A_Args[3]

foundMatch := false

; Convert path formats if needed
if InStr(targetPath, "/home/olof/") {
    targetPath := RegExReplace(targetPath, "/home/olof/", "\\wsl.localhost\Ubuntu\home\olof\")
    targetPath := RegExReplace(targetPath, "/", "\")
} else if InStr(targetPath, "/mnt/c/") {
    targetPath := RegExReplace(targetPath, "/mnt/c/", "C:\")
    targetPath := RegExReplace(targetPath, "/", "\")
}

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
        topPosition := 38
        windowWidth := screenWidth + 20
        windowHeight := screenHeight - topPosition + 10
    } else {
        leftPosition := oneThirdWidth + 10
        topPosition := 38
        windowWidth := oneThirdWidth * 2 + 16
        windowHeight := screenHeight - topPosition
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
        For index, hwnd in WinGetList("ahk_exe cursor.exe") {
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

; Find cursor windows matching the path
cursorWindows := WinGetList("ahk_exe cursor.exe")
totalWindows := cursorWindows.Length

For index, hwnd in cursorWindows {
    title := WinGetTitle("ahk_id " . hwnd)
    titlePath := RegExReplace(title, " \(.*\)$", "")

    if (titlePath == targetPath) {
        ; Found matching window, position it
        WinMove(leftPosition, topPosition, windowWidth, windowHeight, "ahk_id " . hwnd)
        WinActivate("ahk_id " . hwnd)
        foundMatch := true
        break
    }
}

; If no matching window was found, we'll move the active window
if (!foundMatch) {
    WinMove(leftPosition, topPosition, windowWidth, windowHeight, "A")
}

; Always exit the script when done
ExitApp
