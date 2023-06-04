# 使用官方 Node.js 镜像作为基础镜像
FROM node:14

# 设置工作目录，所有接下来的命令都将在此目录中执行
WORKDIR /usr/src/app

# 将 package.json 和 package-lock.json 文件复制到工作目录
COPY package*.json ./

# 安装项目依赖
RUN npm install

# 将项目源代码复制到工作目录
COPY . .

# 定义运行时的启动命令
CMD ["node", "index.js"]