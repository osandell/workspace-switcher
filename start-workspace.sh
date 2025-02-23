#!/bin/bash

# Source all environment settings
source /home/olof/.profile
source /home/olof/.bashrc

# Export display settings
export DISPLAY=:0
export XAUTHORITY=/home/olof/.Xauthority
export XDG_RUNTIME_DIR=/run/user/1000
export DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/1000/bus

# Debug info
echo "Starting workspace-switcher with:"
echo "DISPLAY=$DISPLAY"
echo "XAUTHORITY=$XAUTHORITY"
echo "USER=$USER"
echo "PATH=$PATH"
echo "PWD=$(pwd)"

cd /home/olof/dev/osandell/workspace-switcher

# Run electron with --no-sandbox
exec /opt/electron/electron --no-sandbox . 2>&1
