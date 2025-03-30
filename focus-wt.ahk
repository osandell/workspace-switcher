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

existingWindows := WinGetList("ahk_exe WindowsTerminal.exe")
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
        command := '"' . 'wt.exe' . '" -p "AiQu" -- wsl.exe -d AiQu zsh -c "cd \"' . wslPath .
            '\" && exec zsh -c tmux"'
    } else if (isDirectory) {
        command := '"' . 'wt.exe' . '" -p "Ubuntu" -- wsl.exe -d Ubuntu zsh -c "cd \"' . wslPath .
            '\" && exec zsh -c tmux"'
    } else {
        parentDir := RegExReplace(wslPath, "/[^/]+$", "")
        command := '"' . 'wt.exe' . '" -p "Ubuntu" -- wsl.exe -d Ubuntu zsh -c "cd \"' . parentDir .
            '\" && exec zsh -c tmux"'
    }
} catch Error as e {
    MsgBox("Error preparing Windows Terminal command: " . e.Message)
    ExitApp
}

try {
    ; Use the imported function to launch and get the new window handle
    newHwnd := GetNewWindowHandle("WindowsTerminal.exe", command)

    if (newHwnd) {
        FileAppend(newHwnd, "*") ; Write to stdout
    } else {
        MsgBox("Could not identify new window within the timeout period.")
    }
} catch Error as e {
    MsgBox("Error launching Windows Terminal: " . e.Message)
}
