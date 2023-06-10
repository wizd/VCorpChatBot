@echo off
chcp 65001

rem 获取命令行参数，如果不存在则使用默认值
if "%1" == "" (set MODE=pubbot) else (set MODE=%1)
if "%2" == "" (set NAME="Some great name") else (set NAME=%2)
if "%3" == "" (set VCORP_AI_KEY=bk_......) else (set VCORP_AI_KEY=%3)
if "%4" == "" (set PAD_LOCAL_KEY=puppet_padlocal_...) else (set PAD_LOCAL_KEY=%4)
if "%5" == "" (set VCORP_AI_URL=https://mars.vcorp.ai/vc/v1) else (set VCORP_AI_URL=%5)

:loop
del chaty-wechat-bot.memory-card.json
ts-node --esm index.ts --MODE %MODE% --VCORP_AI_URL %VCORP_AI_URL% --NAME %NAME% --VCORP_AI_KEY %VCORP_AI_KEY% --PAD_LOCAL_KEY %PAD_LOCAL_KEY%
if %errorlevel% neq 0 (
    echo Process exited with code %errorlevel%. Waiting for 30 seconds before restarting...
    timeout /t 30 /nobreak
    goto loop
)