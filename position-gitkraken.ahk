#Requires AutoHotkey v2.0
#SingleInstance Force

targetHwnd := A_Args[1]
fullScreen := A_Args[2]
currentDisplay := A_Args[3]
windowFound := false

; Get screen dimensions
screenWidth := A_ScreenWidth
screenHeight := A_ScreenHeight

; Calculate left half dimensions with top offset
halfWidth := screenWidth // 2
oneThirdWidth := screenWidth // 3
leftPosition := -10

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
} else {
    topPosition := 38
    windowWidth := oneThirdWidth + 32
    windowHeight := screenHeight - topPosition + 10
}

; Find and position the specific window
existingWindows := WinGetList("ahk_exe GitKraken.exe")

For _, hwnd in existingWindows {
    if (hwnd = targetHwnd) {
        WinMove(leftPosition, topPosition, windowWidth, windowHeight, "ahk_id " . targetHwnd)
        WinActivate("ahk_id " . targetHwnd)
        windowFound := true
        break
    }
}

; If no matching window was found, we'll exit without doing anything
if (!windowFound) {
    WinMove(leftPosition, topPosition, windowWidth, windowHeight, "A")
}


; Always exit the script when done
ExitApp
