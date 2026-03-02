# 构建阶段
FROM node:20-alpine AS builder

WORKDIR /app

# 安装依赖
COPY package*.json ./
RUN npm ci

# 复制源码并构建
COPY . .
RUN npm run build

# 生产阶段
FROM node:20-alpine

WORKDIR /app

# 安装生产依赖
COPY package*.json ./
RUN npm ci --omit=dev

# 复制构建产物和服务器代码
COPY --from=builder /app/dist ./dist
COPY server/prod.js ./
COPY server/config.json ./server/ 2>/dev/null || true

# 暴露端口
EXPOSE 3000

# 启动服务
CMD ["node", "prod.js"]
