@echo off
chcp 65001

rem 下面是运行模式：配合padlocal时请用powerbot，完全为自己服务请用personal，作为bot提供公共服务请用pubbot
set MODE=pubbot

rem 下面是运行窗口标题名字：自己觉得清晰可记就行。
set NAME="Some great name"

rem 下面是你从微可AI引擎得到的API密钥，通常以bk_打头：
set VCORP_AI_KEY=bk_......

rem 如果是powerbot模式，必须有padlocal的key
set PAD_LOCAL_KEY=puppet_padlocal_...

rem 下面服务器地址默认不用改
set VCORP_AI_URL=https://mars.vcorp.ai/vc/v1

:loop
ts-node --esm index.ts --MODE %MODE% --VCORP_AI_URL %VCORP_AI_URL% --NAME %NAME% --VCORP_AI_KEY %VCORP_AI_KEY% --PAD_LOCAL_KEY %PAD_LOCAL_KEY%
if %errorlevel% neq 0 (
    echo Process exited with code %errorlevel%. Waiting for 30 seconds before restarting...
    timeout /t 30 /nobreak
    goto loop
)