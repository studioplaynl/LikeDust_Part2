#!/bin/bash
# Double-click in Finder (or run ./Start_Dashboard.command in Terminal)
# to launch the Python script that starts the www servers and opens the Dashboard page.

cd "$(dirname "$0")" || exit 1
exec python3 "$PWD/start_dashboard.py"

