#Requires AutoHotkey v2.0
#SingleInstance
#Include GetNewWindowHandle.ahk

if (A_Args.Length < 2) {
    MsgBox("Please provide a window ID and a file path as arguments.")
    ExitApp
}

targetHwnd := A_Args[1]
targetPath := A_Args[2]

driveLetter := SubStr(targetPath, 1, 1)
if InStr(targetPath, "wsl.localhost") {
    wslPath := RegExReplace(targetPath, "\\\\wsl\.localhost\\Ubuntu", "")
    wslPath := RegExReplace(SubStr(wslPath, 1), "\\", "/")
} else if InStr(targetPath, "C:\") {
    wslPath := RegExReplace(SubStr(targetPath, 3), "\\", "/")
    wslPath := "/mnt/" . StrLower(driveLetter) . wslPath
} else {
    wslPath := targetPath
}

existingWindows := WinGetList("ahk_exe alacritty.exe")
windowFound := false

for _, hwnd in existingWindows {
    if (hwnd = targetHwnd) {
        WinActivate("ahk_id " . targetHwnd)
        ExitApp
    }
}

winPath := wslPath
if InStr(winPath, "/home/olof/AiQu") {
    winPath := RegExReplace(winPath, "/home/olof/", "\\wsl.localhost\AiQu\home\olof\")
    winPath := RegExReplace(winPath, "/", "\")
} else if InStr(winPath, "/home/olof/") {
    winPath := RegExReplace(winPath, "/home/olof/", "\\wsl.localhost\Ubuntu\home\olof\")
    winPath := RegExReplace(winPath, "/", "\")
} else if InStr(winPath, "/mnt/") {
    winPath := RegExReplace(winPath, "/mnt/c/", "C:\")
    winPath := RegExReplace(winPath, "/", "\")
}

isDirectory := DirExist(winPath)
try {
    if (isDirectory && InStr(targetPath, "/home/olof/AiQu")) {
        command := '"' . 'c:\portableapps\alacritty\alacritty.exe' .
            '" --command wsl -d AiQu --cd \"' . wslPath . '\" tmux"'
    } else if (isDirectory) {
        command := '"' . 'c:\portableapps\alacritty\alacritty.exe' .
            '" --command wsl -d Ubuntu --cd \"' . wslPath . '\" tmux"'
    } else {
        parentDir := RegExReplace(wslPath, "/[^/]+$", "")
        command := '"' . 'c:\portableapps\alacritty\alacritty.exe' .
            '" --command wsl -d Ubuntu --cd \"' . parentDir . '\" tmux"'
    }
} catch Error as e {
    MsgBox("Error preparing Windows Terminal command: " . e.Message)
    ExitApp
}

try {
    ; Launch Alacritty and get the new window handle
    newHwnd := GetNewWindowHandle("alacritty.exe", command)

    if (newHwnd) {
        ; Set Alacritty to borderless (remove title bar and borders)
        style := DllCall("GetWindowLongPtr", "ptr", newHwnd, "int", -16, "ptr")
        style := style & ~0x00C00000 ; remove WS_CAPTION
        style := style & ~0x00040000 ; remove WS_SIZEBOX
        style := style & ~0x00080000 ; remove WS_BORDER
        DllCall("SetWindowLongPtr", "ptr", newHwnd, "int", -16, "ptr", style)

        ; Force redraw for new style to apply
        DllCall("SetWindowPos", "ptr", newHwnd, "ptr", 0, "int", 0, "int", 0, "int", 0, "int", 0, "uint", 0x27)

        FileAppend(newHwnd, "*") ; Write to stdout
    } else {
        MsgBox("Could not identify new window within the timeout period.")
    }
} catch Error as e {
    MsgBox("Error launching Alacritty: " . e.Message)
}
