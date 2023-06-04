#!/bin/bash

# 运行模式：配合padlocal时请用powerbot，完全为自己服务请用personal，作为bot提供公共服务请用pubbot
MODE="${1:-pubbot}"

# 运行窗口标题名字：自己觉得清晰可记就行。
NAME="${2:-Some great name}"

# 下面是你从微可AI引擎得到的API密钥，通常以bk_打头：
VCORP_AI_KEY="${3:-bk_......}"

# 如果是powerbot模式，必须有padlocal的key
PAD_LOCAL_KEY="${4:-puppet_padlocal_...}"

# 服务器地址默认不用改
VCORP_AI_URL="https://mars.vcorp.ai/vc/v1"

while true; do
  rm -f chaty-wechat-bot.memory-card.json
  ts-node --esm index.ts --MODE "$MODE" --VCORP_AI_URL "$VCORP_AI_URL" --NAME "$NAME" --VCORP_AI_KEY "$VCORP_AI_KEY" --PAD_LOCAL_KEY "$PAD_LOCAL_KEY"
  exit_code=$?
  if [ $exit_code -ne 0 ]; then
    echo "Process exited with code $exit_code. Waiting for 30 seconds before restarting..."
    sleep 30
  else
    break
  fi
done