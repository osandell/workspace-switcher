#Requires AutoHotkey v2.0
#SingleInstance
#Include GetNewWindowHandle.ahk

; --- helpers ---------------------------------------------------------------

ToFileUri(path) {
    ; Windows path -> file:// URI
    ; C:\foo\bar -> file:///C:/foo/bar
    ; \\server\share\dir -> file://server/share/dir
    p := path
    if (SubStr(p, 1, 2) = "\\") {
        p := StrReplace(SubStr(p, 3), "\", "/")
        return "file://" . p
    }
    p := StrReplace(p, "\", "/")
    if RegExMatch(p, "^[A-Za-z]:/") {
        return "file:///" . p
    }
    return "file:///" . p
}

ToWslUri(distro, unixPath) {
    ; /home/olof/... -> vscode-remote://wsl+<distro>/home/olof/...
    return "vscode-remote://wsl+" . distro . unixPath
}

; --- main -----------------------------------------------------------------

if FileExist("temp_hwnd.txt")
    FileDelete("temp_hwnd.txt")

if (A_Args.Length < 2) {
    MsgBox("Please provide a window ID and a file path as arguments.")
    ExitApp
}

targetHwnd := A_Args[1]
targetPath := A_Args[2]
foundMatch := false

; Prepare display variants for title matching
targetPathShort := ""
if InStr(targetPath, "/home/olof/") {
    targetPathShort := RegExReplace(targetPath, "^/home/olof/", "~\/")
} else if InStr(targetPath, "/mnt/c/") {
    targetPath := RegExReplace(targetPath, "^/mnt/c/", "C:\")
    targetPath := StrReplace(targetPath, "/", "\")
}

cursorWindows := WinGetList("ahk_exe cursor.exe")

; 1) If the target window handle exists, activate it and exit
for _, hwnd in cursorWindows {
    if (hwnd = targetHwnd) {
        WinActivate("ahk_id " . targetHwnd)
        ExitApp
    }
}

; 2) If any existing Cursor window title matches the path, focus it
for _, hwnd in cursorWindows {
    title := WinGetTitle("ahk_id " . hwnd)
    titlePath := RegExReplace(title, " \(.*\)$", "")
    if (titlePath == targetPathShort || titlePath == targetPath) {
        WinActivate("ahk_id " . hwnd)
        foundMatch := true
        ; Could not reliably write to stdout here; write to a temp file
        FileAppend(hwnd, "temp_hwnd.txt")
        break
    }
}

; 3) Otherwise launch a new Cursor window with --folder-uri
if (!foundMatch) {
    cursorPath := "C:\Users\Olof.Sandell\AppData\Local\Programs\cursor\Cursor.exe"

    try {
        uri := ""
        if InStr(targetPath, "/home/olof/AiQu") {
            ; special-case distro name "AiQu"
            uri := ToWslUri("AiQu", targetPath)
        } else if InStr(targetPath, "/home/olof/") {
            ; default Ubuntu WSL
            uri := ToWslUri("Ubuntu", targetPath)
        } else {
            ; Windows path -> file:// URI
            uri := ToFileUri(targetPath)
        }

        command := '"' . cursorPath . '" --new-window --folder-uri "' . uri . '"'

        ; Allow up to 30s for new window to appear
        newHwnd := GetNewWindowHandle("cursor.exe", command, 30000)

        if (newHwnd) {
            FileAppend(newHwnd, "*") ; write new handle to stdout
        } else {
            MsgBox("Could not identify new window within the timeout period.")
        }
    } catch Error as e {
        MsgBox("Error launching Cursor: " . e.Message)
    }
}
