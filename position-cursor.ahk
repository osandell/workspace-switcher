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

; If no matching window was found, we'll exit without doing anything
if (!foundMatch) {
    WinMove(leftPosition, topPosition, windowWidth, windowHeight, "A")
}

; Always exit the script when done
ExitApp
