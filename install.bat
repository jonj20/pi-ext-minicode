@echo off
setlocal enabledelayedexpansion

echo call npm install -g --ignore-scripts @earendil-works/pi-coding-agent

if "%1"=="" goto :menu
if /i "%1"=="install" goto :install_all
if /i "%1"=="uninstall" goto :uninstall_all
if /i "%1"=="list" goto :list_installed
if /i "%1"=="status" goto :list_installed
goto :menu

:menu
echo.
echo ============================================================
echo  pi-ext-minicode plugin manager
echo ============================================================
echo.
echo  1) install   - install all plugins from npm
echo  2) uninstall - uninstall all plugins from npm
echo  3) list      - list installed plugins
echo  4) exit      - exit
echo.
set /p choice="Please choose [1-4]: "
if "%choice%"=="1" goto :install_all
if "%choice%"=="2" goto :uninstall_all
if "%choice%"=="3" goto :list_installed
if "%choice%"=="4" goto :eof
echo Invalid choice.
goto :menu

:install_all
echo.
echo ============================================================
echo  Installing pi-ext-minicode plugins from npm
echo ============================================================

where pi >nul 2>&1
if errorlevel 1 (
    echo [Error] pi command not found. Install @earendil-works/pi-coding-agent first.
    goto :eof
)

echo.
echo --- Installing npm plugins ---
call pi install "npm:@bacnh85/pi-checkpoint" <nul && echo [OK] pi-checkpoint || echo [FAIL] pi-checkpoint
call pi install "npm:@bacnh85/pi-checkpoint" <nul && echo [OK] pi-checkpoint || echo [FAIL] pi-checkpoint
call pi install "npm:@bacnh85/pi-checkpoint" <nul && echo [OK] pi-checkpoint || echo [FAIL] pi-checkpoint
call pi install "npm:@bacnh85/pi-evolve" <nul && echo [OK] pi-evolve || echo [FAIL] pi-evolve
call pi install "npm:@bacnh85/pi-fff" <nul && echo [OK] pi-fff || echo [FAIL] pi-fff
call pi install "npm:@bacnh85/pi-init" <nul && echo [OK] pi-init || echo [FAIL] pi-init
call pi install "npm:@bacnh85/pi-model-tools" <nul && echo [OK] pi-model-tools || echo [FAIL] pi-model-tools
call pi install "npm:@bacnh85/pi-notify" <nul && echo [OK] pi-notify || echo [FAIL] pi-notify
call pi install "npm:@bacnh85/pi-plan" <nul && echo [OK] pi-plan || echo [FAIL] pi-plan
call pi install "npm:@bacnh85/pi-review" <nul && echo [OK] pi-review || echo [FAIL] pi-review
call pi install "npm:@bacnh85/pi-serena" <nul && echo [OK] pi-serena || echo [FAIL] pi-serena
call pi install "npm:@bacnh85/pi-subagent" <nul && echo [OK] pi-subagent || echo [FAIL] pi-subagent
call pi install "npm:@bacnh85/pi-web" <nul && echo [OK] pi-web || echo [FAIL] pi-web
call pi install "npm:@taimoorchatha/pi-context-footer" <nul && echo [OK] pi-context-footer || echo [FAIL] pi-context-footer
echo call pi install "npm:@minicode26/pi-local-llm" <nul && echo [OK] pi-local-llm || echo [FAIL] pi-local-llm
echo call pi install "npm:@minicode26/pi-windows-shell" <nul && echo [OK] pi-windows-shell || echo [FAIL] pi-windows-shell

echo.
echo ============================================================
echo  Installation complete
echo ============================================================
echo Tip: After installation, use "pi config" to enable plugins as needed.
echo Recommended first: pi-serena pi-plan pi-subagent pi-model-tools pi-review pi-checkpoint pi-auto-compact
goto :eof

:uninstall_all
echo.
echo ============================================================
echo  Uninstalling pi-ext-minicode plugins from npm
echo ============================================================

echo.
echo --- Uninstalling npm plugins ---
call pi uninstall "npm:@bacnh85/pi-checkpoint" <nul && echo [OK] pi-checkpoint || echo [MANUAL] pi-checkpoint
call pi uninstall "npm:@bacnh85/pi-evolve" <nul && echo [OK] pi-evolve || echo [MANUAL] pi-evolve
call pi uninstall "npm:@bacnh85/pi-fff" <nul && echo [OK] pi-fff || echo [MANUAL] pi-fff
call pi uninstall "npm:@bacnh85/pi-init" <nul && echo [OK] pi-init || echo [MANUAL] pi-init
call pi uninstall "npm:@bacnh85/pi-model-tools" <nul && echo [OK] pi-model-tools || echo [MANUAL] pi-model-tools
call pi uninstall "npm:@bacnh85/pi-notify" <nul && echo [OK] pi-notify || echo [MANUAL] pi-notify
call pi uninstall "npm:@bacnh85/pi-plan" <nul && echo [OK] pi-plan || echo [MANUAL] pi-plan
call pi uninstall "npm:@bacnh85/pi-review" <nul && echo [OK] pi-review || echo [MANUAL] pi-review
call pi uninstall "npm:@bacnh85/pi-serena" <nul && echo [OK] pi-serena || echo [MANUAL] pi-serena
call pi uninstall "npm:@bacnh85/pi-subagent" <nul && echo [OK] pi-subagent || echo [MANUAL] pi-subagent
call pi uninstall "npm:@bacnh85/pi-web" <nul && echo [OK] pi-web || echo [MANUAL] pi-web
call pi uninstall "npm:pi-auto-compact" <nul && echo [OK] pi-auto-compact || echo [MANUAL] pi-auto-compact
call pi uninstall "npm:@taimoorchatha/pi-context-footer" <nul && echo [OK] pi-context-footer || echo [MANUAL] pi-context-footer
echo call pi uninstall "npm:@minicode26/pi-local-llm" <nul && echo [OK] pi-local-llm || echo [MANUAL] pi-local-llm
echo call pi uninstall "npm:@minicode26/pi-windows-shell" <nul && echo [OK] pi-windows-shell || echo [MANUAL] pi-windows-shell

echo.
echo ============================================================
echo  Uninstallation complete
echo ============================================================
echo Tip: If pi-hub cannot remove a package, disable it manually via "pi config".
goto :eof

:list_installed
echo.
echo ============================================================
echo  Installed plugins
echo ============================================================
pi list
goto :eof

:endlocal
goto :eof
