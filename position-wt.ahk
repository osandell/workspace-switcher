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

; Calculate padding percentages for external display
leftPadding := Integer(screenWidth * 0.03)  ; 3% of screen width
rightPadding := Integer(screenWidth * 0.03)  ; 3% of screen width
topPadding := Integer(screenHeight * 0.0508)   ; 5% of screen height
bottomPadding := Integer(screenHeight * 0.055) ; 5% of screen height
heightOffset := Integer(screenHeight * 0.004)
widthOffset := Integer(screenWidth * 0.002)

if (currentDisplay == "internal") {
    if (fullScreen == "true") {
        leftPosition := -10
        topPosition := 0  ; Removed the 34 offset
        windowWidth := screenWidth + 20
        windowHeight := screenHeight - topPosition + 10
    } else {
        leftPosition := -10
        topPosition := 0  ; Removed the 34 offset
        windowWidth := Integer(screenWidth * 0.3457)
        windowHeight := screenHeight - topPosition + 10
    }
} else { ; External monitor
    if (fullScreen == "true") {
        leftPosition := leftPadding
        topPosition := topPadding
        windowWidth := screenWidth - (leftPadding + rightPadding) + widthOffset
        windowHeight := screenHeight - (topPadding + bottomPadding) + heightOffset
    } else {
        ; For terminal, keep it on the left side always with padding
        leftPosition := leftPadding
        topPosition := topPadding

        ; Calculate width based on 35% of usable space
        totalUsableWidth := screenWidth - (leftPadding + rightPadding)
        windowWidth := Integer(totalUsableWidth * 0.3273)

        windowHeight := screenHeight - (topPadding + bottomPadding) + heightOffset
    }
}

; Find and position the specific window
existingWindows := WinGetList("ahk_exe alacritty.exe")

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
