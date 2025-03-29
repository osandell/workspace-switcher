#Requires AutoHotkey v2.0
#SingleInstance

if (A_Args.Length < 1) {
    MsgBox("Please provide a window ID as an argument.")
    ExitApp
}

targetHwnd := A_Args[1]
windowFound := false

; Find and close the specific window
existingWindows := WinGetList("ahk_exe cursor.exe")

for _, hwnd in existingWindows {
    if (hwnd = targetHwnd) {
        ; Found the window, close it
        WinClose("ahk_id " . targetHwnd)
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
