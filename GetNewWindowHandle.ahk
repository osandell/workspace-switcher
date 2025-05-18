#Requires AutoHotkey v2.0

; Function to get the window handle of a newly launched application
; Returns: The window handle (HWND) of the new window, or 0 if timeout
; Parameters:
;   processName - Name of the executable (e.g., "WindowsTerminal.exe")
;   launchCommand - Command to launch the application
;   timeoutSeconds - Maximum time to wait for the new window (default: 10 seconds)
GetNewWindowHandle(processName, launchCommand, timeoutSeconds := 10) {
    ; Get list of existing real window handles
    existingWindows := GetRealWindows(processName)

    ; Launch the application
    Run(launchCommand)

    ; Poll until new window appears or timeout
    startTime := A_TickCount
    timeout := timeoutSeconds * 1000

    loop {
        ; Check if we've timed out
        if (A_TickCount - startTime > timeout)
            return 0

        ; Get current real windows and look for new ones
        newWindows := GetRealWindows(processName)

        ; Find first new window that wasn't in the existing list
        for _, newHwnd in newWindows {
            isNew := true
            for _, oldHwnd in existingWindows {
                if (newHwnd = oldHwnd) {
                    isNew := false
                    break
                }
            }

            if (isNew)
                return newHwnd
        }

        ; Wait before checking again
        Sleep(100)
    }
}

; Function to get only real windows (visible, non-tool windows with titles)
GetRealWindows(processName) {
    realWindows := []
    allWindows := WinGetList("ahk_exe " . processName)

    for hwnd in allWindows {
        if WinGetTitle("ahk_id " hwnd) &&
        (WinGetStyle("ahk_id " hwnd) & 0x10000000) &&
        !(WinGetExStyle("ahk_id " hwnd) & 0x00000080) {
            realWindows.Push(hwnd)
        }
    }

    return realWindows
}
