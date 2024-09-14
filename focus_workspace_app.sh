#!/usr/bin/env bash

focused_workspace_app=$(cat /tmp/focused_workspace_app.txt)

case $focused_workspace_app in
'kitty-main')
    open -a 'kitty-main'
    open -a 'Cursor'
    open -a 'Electron'
    # Make sure kitty-main is focused
    sleep 0.2
    open -a 'kitty-main'
    sleep 0.2
    open -a 'kitty-main'
    ;;
'kitty-lazygit')
    open -a 'Electron'
    open -a 'kitty-lazygit'
    ;;
'vscode')
    open -a 'Cursor'
    open -a 'kitty-main'
    open -a 'Electron'
    # Make sure VSCode is focused
    sleep 0.2
    open -a 'Cursor'
    sleep 0.2
    open -a 'Cursor'
    ;;
*)
    echo "Application not recognized or not specified"
    ;;
esac
