npm install -g typescript ts-node
npm install
if exist .env (
    echo .env 文件已经存在，不需要拷贝
) else (
    copy .env.example .env
    notepad .env
)


