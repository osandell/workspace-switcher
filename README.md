# Create a system service

´/etc/systemd/system/workspace-switcher.service´

´´´
[Unit]
Description=Workspace Switcher Service

[Service]
Type=simple
User=<username>
WorkingDirectory=/home/olof/dev/osandell/workspace-switcher
Environment=DISPLAY=:1
Environment=XAUTHORITY=/run/user/1000/gdm/Xauthority
Environment=DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/1000/bus
Environment=XDG_RUNTIME_DIR=/run/user/1000
ExecStart=/opt/electron/electron .

[Install]
WantedBy=multi-user.target
´´´
