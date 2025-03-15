#Requires AutoHotkey v2.0

if (A_Args.Length < 1) {
    MsgBox("Please provide a file path as an argument.")
    ExitApp
}

targetPath := A_Args[1]
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

; Calculate right half dimensions with top offset
halfWidth := screenWidth // 2
oneThirdWidth := screenWidth // 3
leftPosition := oneThirdWidth + 10 ; Start at the middle of the screen
topPosition := 38
windowWidth := oneThirdWidth * 2 + 16
windowHeight := screenHeight - topPosition

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
    ; Optional: Add a message or log that no matching window was found
    ; MsgBox("No window matching path: " . targetPath)
}

; Always exit the script when done
ExitApp
