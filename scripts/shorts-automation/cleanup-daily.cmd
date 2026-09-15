@echo off
REM Continua o desagendamento da campanha ate a cota diaria acabar.
cd /d "%~dp0..\.."
echo. >> "data\shorts-cleanup.log"
echo ===== %DATE% %TIME% ===== >> "data\shorts-cleanup.log"
call pnpm shorts:unschedule >> "data\shorts-cleanup.log" 2>&1
