# AI-Interviewer Pro (Server)

## Setup

1. Create DB + tables

推荐方式（自动创建库并导入 schema）：

```bash
cp .env.example .env
# 修改 .env 里的 DB_HOST/DB_USER/DB_PASS/DB_NAME
npm run db:init
```

或手动方式（MySQL 客户端执行）：

```sql
CREATE DATABASE ai_interviewer DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE ai_interviewer;
SOURCE db/schema.sql;
```

2. Env

```bash
cp .env.example .env
```

3. Install + run

```bash
npm install
npm run dev
```

Server: `http://localhost:3001`

Uploads are served from: `http://localhost:3001/uploads/...`

## API (MVP, 邀请制流程)

### 候选人侧

1. `GET /api/invite/:token`
   - 用于前端校验邀请链接和获取岗位信息

2. `POST /api/candidate/submit-resume` (multipart)
   - fields: `invite_token` (required), `user_id`(optional), `username/email`(optional), `user_keywords`(optional)
   - files: `resume` (pdf/doc/docx, <= 5MB)
   - returns: `{ interviewId, match: { matchRate, passed }, questions(1-3)? }`

3. `POST /api/candidate/:interviewId/answer-video` (multipart)
   - fields: `question_id` (required), `answer_text` (optional)
   - files: `video` (mp4, <= 50MB)
   - returns progress and (if done) final result + second-round notice

4. `GET /api/candidate/:interviewId/result`
   - returns interview summary + assigned questions + uploaded video paths

### 管理侧（无鉴权，MVP）

- `GET/POST/PUT/DELETE /api/admin/jobs`
- `GET/POST/PUT/DELETE /api/admin/questions`
- `POST /api/admin/invitations` -> returns invite URL (for QR)
