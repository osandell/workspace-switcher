#Requires AutoHotkey v2.0

if (A_Args.Length < 1) {
    MsgBox("Please provide a window ID as an argument.")
    ExitApp
}

targetHwnd := A_Args[1]
windowFound := false

; Get screen dimensions
screenWidth := A_ScreenWidth
screenHeight := A_ScreenHeight

; Calculate left half dimensions with top offset
halfWidth := screenWidth // 2
oneThirdWidth := screenWidth // 3
leftPosition := -10
topPosition := 38
windowWidth := oneThirdWidth + 32
windowHeight := screenHeight - topPosition + 10

; Find and position the specific window
existingWindows := WinGetList("ahk_exe WindowsTerminal.exe")

For _, hwnd in existingWindows {
    if (hwnd = targetHwnd) {
        ; Found the window, position it
        WinMove(leftPosition, topPosition, windowWidth, windowHeight, "ahk_id " . targetHwnd)
        WinActivate("ahk_id " . targetHwnd)
        windowFound := true
        break
    }
}

; Optionally, notify if the window was not found
if (!windowFound) {
    ; Uncomment if you want notification when window isn't found
    ; MsgBox("Window with ID " . targetHwnd . " not found.")
}

; Always exit the script when done
ExitApp
