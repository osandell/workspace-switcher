#Requires AutoHotkey v2.0
#SingleInstance

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

For _, hwnd in existingWindows {
    if (hwnd = targetHwnd) {
        WinActivate("ahk_id " . targetHwnd)
        ExitApp
    }
}


winPath := wslPath
if InStr(winPath, "/home/olof/") {
    winPath := RegExReplace(winPath, "/home/olof/", "\\wsl.localhost\Ubuntu\home\olof\")
    winPath := RegExReplace(winPath, "/", "\")
} else if InStr(winPath, "/mnt/") {
    winPath := RegExReplace(winPath, "/mnt/c/", "C:\")
    winPath := RegExReplace(winPath, "/", "\")
}

isDirectory := DirExist(winPath)
try {
    if (isDirectory) {
        command := '"' . 'wt.exe' . '" -p "Ubuntu" -- wsl.exe -d Ubuntu zsh -c "cd \"' . wslPath . '\" && exec zsh"'
    } else {
        parentDir := RegExReplace(wslPath, "/[^/]+$", "")
        command := '"' . 'wt.exe' . '" -p "Ubuntu" -- wsl.exe -d Ubuntu zsh -c "cd \"' . parentDir . '\" && exec zsh"'
    }
} catch Error as e {
    MsgBox("Error launching Windows Terminal: " . e.Message)
}

try {
    Run(command)
    Sleep(1000)

    newWindows := WinGetList("ahk_exe WindowsTerminal.exe")
    newHwnd := 0

    For index, hwnd in newWindows {
        isNew := true
        For _, oldHwnd in existingWindows {
            if (hwnd = oldHwnd) {
                isNew := false
                break
            }
        }

        if (isNew) {
            newHwnd := hwnd
            break
        }
    }

    if (newHwnd) {
        FileAppend(newHwnd, "*") ; Write to stdout
    } else {
        MsgBox("Could not definitively identify new window.")
    }
} catch Error as e {
    MsgBox("Error launching Windows Terminal: " . e.Message)
}
