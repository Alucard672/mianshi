# 腾讯云开发（CloudBase）托管调整与部署指南

## 目标架构

- `web/`：静态站点托管（Vite 产物 `web/dist`）
- `server/`：云托管（CloudRun / 云托管容器）运行 Express
- MySQL：腾讯云 MySQL（或你自己的 MySQL）
- 文件：CloudBase 云存储（不依赖容器本地磁盘）

## 一、后端（云托管）

### 1) Docker

后端已补齐：
- `server/Dockerfile`
- `server/.dockerignore`

如果你在云托管选择的是 “Node 项目” 而不是 “Dockerfile 构建”，需要保证仓库根目录存在 `package.json`。
本仓库已补齐根 `package.json`，默认会在安装阶段自动安装 `server/` 依赖，并用 `npm start` 启动后端。

### 2) 环境变量（云上必配）

在 CloudRun 服务环境变量里配置（同 `server/.env.example`）：

- `PORT=3001`
- `DB_HOST`
- `DB_PORT`
- `DB_USER`
- `DB_PASS`
- `DB_NAME`
- `CORS_ORIGINS`（填你的静态站域名）

CloudBase 存储（启用后会把简历/视频上传到云存储，并把临时 URL 回传给前端预览）：
- `CLOUDBASE_ENV_ID`
- `TENCENTCLOUD_SECRETID`
- `TENCENTCLOUD_SECRETKEY`

可选：
- `APP_BASE_URL`（用于生成分享链接，例如你的静态站域名）
- `GLM_OCR_URL` / `GLM_OCR_KEY`

### 3) 数据库迁移

云上/本地都可以执行（建议在能访问 DB 的环境执行）：

```bash
cd server
npm run db:migrate
```

## 二、前端（静态托管）

### 1) 环境变量

在静态托管构建环境中设置：
- `VITE_API_BASE=https://你的云托管后端域名`

### 2) 构建配置

```bash
cd web
npm ci
npm run build
```

产物目录：`web/dist`

## 三、注意事项（必须）

1. 不要把 `.env` 上传到仓库或暴露给前端。
2. 生产环境务必修改默认管理员密码（当前默认 `admin/111111` 仅适合本地/演示）。
3. 云托管环境不要依赖本地 `uploads/` 目录做持久化；已改为 CloudBase 存储。
