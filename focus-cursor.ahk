#Requires AutoHotkey v2.0
#SingleInstance
#Include GetNewWindowHandle.ahk

if (A_Args.Length < 2) {
    MsgBox("Please provide a window ID and a file path as arguments.")
    ExitApp
}

targetHwnd := A_Args[1]
targetPath := A_Args[2]
foundMatch := false

targetPathShort := ""
if InStr(targetPath, "/home/olof/") {
    targetPathShort := RegExReplace(targetPath, "/home/olof/", "~/")
} else if InStr(targetPath, "/mnt/c/") {
    targetPath := RegExReplace(targetPath, "/mnt/c/", "C:\")
    targetPath := RegExReplace(targetPath, "/", "\")
}

cursorWindows := WinGetList("ahk_exe cursor.exe")
totalWindows := cursorWindows.Length

; First check if the target window handle exists
for _, hwnd in cursorWindows {
    if (hwnd = targetHwnd) {
        WinActivate("ahk_id " . targetHwnd)
        FileAppend(targetHwnd, "*")
        ExitApp
    }
}

; If we didn't find the specific handle, check if any window has the file open
for index, hwnd in cursorWindows {
    title := WinGetTitle("ahk_id " . hwnd)
    titlePath := RegExReplace(title, " \(.*\)$", "")

    if (titlePath == targetPathShort || titlePath == targetPath) {
        ; Focus this window
        WinActivate("ahk_id " . hwnd)
        foundMatch := true
        ; Write window handle to stdout
        FileAppend(hwnd, "*")
        break
    }
}

if (!foundMatch) {
    cursorPath := "C:\Users\Olof.Sandell\AppData\Local\Programs\cursor\Cursor.exe"

    try {
        ; Use the imported function to launch and get the new window handle
        if InStr(targetPath, "/home/olof/AiQu") {
            command := '"' . cursorPath . '" --remote wsl+AiQu "' . targetPath . '"'
        } else if InStr(targetPath, "/home/olof/") {
            command := '"' . cursorPath . '" --remote wsl+Ubuntu "' . targetPath . '"'
        } else {
            command := '"' . cursorPath . '" "' . targetPath . '"'
        }

        ; It can sometimes take a while for Cursor to open a new window, so we give it 30 seconds
        newHwnd := GetNewWindowHandle("cursor.exe", command, 30000)

        if (newHwnd) {
            FileAppend(newHwnd, "*") ; Write new handle to stdout
        } else {
            MsgBox("Could not identify new window within the timeout period.")
        }
    } catch Error as e {
        MsgBox("Error launching Cursor: " . e.Message)
    }
}
