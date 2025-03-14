#Requires AutoHotkey v2.0
#SingleInstance

if (A_Args.Length < 1) {
    MsgBox("Please provide a file path as an argument.")
    ExitApp
}

targetPath := A_Args[1]
foundMatch := false

if InStr(targetPath, "/home/olof/") {
    targetPath := RegExReplace(targetPath, "/home/olof/", "\\wsl.localhost\Ubuntu\home\olof\")
    targetPath := RegExReplace(targetPath, "/", "\")
} else if InStr(targetPath, "/mnt/c/") {
    targetPath := RegExReplace(targetPath, "/mnt/c/", "C:\")
    targetPath := RegExReplace(targetPath, "/", "\")
}

cursorWindows := WinGetList("ahk_exe cursor.exe")
totalWindows := cursorWindows.Length

For index, hwnd in cursorWindows {
    title := WinGetTitle("ahk_id " . hwnd)
    titlePath := RegExReplace(title, " \(.*\)$", "")

    if (titlePath == targetPath) {
        ; Focus this window
        WinActivate("ahk_id " . hwnd)
        foundMatch := true
        ; Write "focused" to stdout
        FileAppend("focused", "*")
        break
    }
}

if (!foundMatch) {
    cursorPath := "C:\Users\Olof\AppData\Local\Programs\cursor\Cursor.exe"

    try {
        Run('"' . cursorPath . '" "' . targetPath . '"')
        ; Write "new" to stdout
        FileAppend("new", "*")
    } catch Error as e {
        MsgBox("Error launching Cursor: " . e.Message)
    }
}
