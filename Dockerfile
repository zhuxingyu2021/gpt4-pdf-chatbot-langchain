# 阶段1: 基于Node.js的构建环境
FROM node:18-alpine AS builder

# 设置工作目录
WORKDIR /app

# 复制 package.json 和 package-lock.json
COPY package*.json ./

# 安装依赖
RUN npm install

# 复制项目文件到工作目录
COPY . .
RUN cp scripts/azure.js node_modules/langchain/dist/util/azure.js

# 构建应用
RUN npm run build

# 阶段2: 运行环境
FROM node:18-alpine

# 设置工作目录
WORKDIR /app

# 复制构建输出的.next目录
COPY --from=builder /app/.next ./.next

# 复制public目录
COPY --from=builder /app/public ./public

# 复制 package.json 和 package-lock.json
COPY --from=builder /app/package*.json ./

# 安装生产依赖
RUN npm install --only=production

# 你的应用在容器中监听的端口
EXPOSE 3000

# 定义环境变量
ENV NODE_ENV=production

# 启动Next.js应用
CMD ["npm", "start"]