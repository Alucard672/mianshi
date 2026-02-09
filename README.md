# AI-Interviewer Pro (Monorepo)

This repo contains:
- `server/`: Node.js + Express backend (邀请链接、简历上传、关键词筛选、视频回答上传、MySQL 持久化)
- `web/`: Vue3 + Tailwind frontend（邀请制候选人流程 UI）

## CloudBase 托管

部署与云上改造说明见：`cloudbase/DEPLOY.md`

如果你用 CloudBase 云托管的 “Node 项目构建” 模式：根目录需要 `package.json`，本仓库已补齐，直接执行 `npm install` + `npm start` 即可启动后端（内部会安装 `server/` 依赖）。

## 1) Database

Create DB + tables:

```sql
CREATE DATABASE ai_interviewer DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE ai_interviewer;
SOURCE server/db/schema.sql;
```

## 2) Backend

```bash
cd server
cp .env.example .env
npm install
npm run dev
```

Backend on `http://localhost:3001`.

Uploads are stored in `server/uploads/` and served at `http://localhost:3001/uploads/...`.

## 3) Frontend

```bash
cd web
npm install
npm run dev
```

Frontend on `http://localhost:5173`.

If needed, set `web/.env`:

```bash
VITE_API_BASE=http://localhost:3001
```

## Notes

- 邀请制：候选人必须通过 `/?invite=TOKEN` 进入提交简历。
- 默认首页为独立登录页：`/login`（显示系统名与 Logo）。
- 管理后台：登录成功进入 `/admin`，可维护岗位、题库、员工、审计日志，并生成邀请链接二维码。
- 管理后台左侧菜单：`首页 / 用户管理 / 题库管理 / 岗位管理 / 邀请管理 / 操作记录`。
- 候选人投递页：`/share/TOKEN`（分享链接打开即进入上传简历，不提供手动填写 token 的输入框）。
- 简历筛选：`MatchRate >= 60%` 才会下发随机 1-3 题。
- 视频回答：每题上传 1 个 MP4（<= 50MB），完成后生成初面结果与复面通知（MVP 规则：匹配度与文本要点评分混合）。
- 简历 AI 解析：后端预留 GLM-OCR 接口（未配置时降级，不阻塞流程）。
