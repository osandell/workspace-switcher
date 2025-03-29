#Requires AutoHotkey v2.0

; Function to get the window handle of a newly launched application
; Returns: The window handle (HWND) of the new window, or 0 if timeout
; Parameters:
;   processName - Name of the executable (e.g., "WindowsTerminal.exe")
;   launchCommand - Command to launch the application
;   timeoutSeconds - Maximum time to wait for the new window (default: 10 seconds)
GetNewWindowHandle(processName, launchCommand, timeoutSeconds := 10) {
    ; Get list of existing window handles
    existingWindows := WinGetList("ahk_exe " . processName)

    ; Launch the application
    Run(launchCommand)

    ; Poll until new window appears or timeout
    startTime := A_TickCount
    timeout := timeoutSeconds * 1000

    loop {
        ; Check if we've timed out
        if (A_TickCount - startTime > timeout)
            return 0

        ; Get current windows and look for new ones
        newWindows := WinGetList("ahk_exe " . processName)

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
