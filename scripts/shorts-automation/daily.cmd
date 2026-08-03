@echo off
REM Execucao diaria da campanha de Shorts (Agendador de Tarefas do Windows).
REM %~dp0 evita digitar o caminho do repo, que tem acento.
cd /d "%~dp0..\.."
echo. >> "data\shorts-cron.log"
echo ===== %DATE% %TIME% ===== >> "data\shorts-cron.log"
call pnpm shorts:batch >> "data\shorts-cron.log" 2>&1
