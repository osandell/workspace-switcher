#!/usr/bin/env bash

focused_workspace_app=$(cat /tmp/focused_workspace_app.txt)

case $focused_workspace_app in
'kitty-main')
    open -a 'Visual Studio Code'
    open -a 'kitty-main'
    ;;
'kitty-lazygit')
    open -a 'kitty-lazygit'
    ;;
'vscode')
    open -a 'kitty-main'
    open -a 'Visual Studio Code'
    ;;
*)
    echo "Application not recognized or not specified"
    ;;
esac
