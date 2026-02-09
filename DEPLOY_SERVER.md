# 服务器合并部署（前后端一个服务）

本项目支持把 `web` 构建产物与 `server` 合并部署到同一台服务器上。

## 1) 构建前端

```bash
cd /path/to/mianshi
npm --prefix web install
npm --prefix web run build
```

产物：`web/dist`

## 2) 启动后端（会自动托管 web/dist）

```bash
cd /path/to/mianshi
npm --prefix server install
cp server/.env.example server/.env
# 修改 server/.env 的 DB_* 配置
npm --prefix server run db:migrate
npm --prefix server start
```

启动后：
- 前端页面：`http://<host>:3001/`
- API：`http://<host>:3001/api/...`

## 3) Nginx（可选）

生产建议 Nginx 反代到 Node：

- 反代 `/` 到 `http://127.0.0.1:3001`
- `client_max_body_size 100M;`

