@echo off
setlocal

call npm install -g --ignore-scripts @earendil-works/pi-coding-agent

call pi install "npm:pi-web-access"
call pi install "npm:@wkqco33/pi-loop-guard"

call pi install "npm:@momenttttt/pi-read-guard"
call pi install "npm:@diegopetrucci/pi-permission-gate"

call pi install "npm:@mrclrchtr/supi-code-intelligence"

call pi install "npm:pi-open-agents"

call pi install "npm:@betterlmy/pi-auto-compact"

call pi install "npm:pi-footer"

call pi install "npm:pi-our-free-model"

call pi install "%~dp0\pi-windows-shell"

call pi install "%~dp0\pi-local-llm"

endlocal
