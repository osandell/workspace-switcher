#Requires AutoHotkey v2.0
#SingleInstance Force

targetHwnd := A_Args[1]
fullScreen := A_Args[2]
currentDisplay := A_Args[3]
windowFound := false

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
        MsgBox
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

        ; Position on the right side by default for GitKraken
        leftPosition := leftPadding + leftWidth
        windowWidth := rightWidth

        windowHeight := screenHeight - (topPadding + bottomPadding)
    }
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

; If no matching window was found, we'll move the active window
if (!windowFound) {
    WinMove(leftPosition, topPosition, windowWidth, windowHeight, "A")
}

; Always exit the script when done
ExitApp
