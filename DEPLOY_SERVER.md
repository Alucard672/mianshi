# 服务器合并部署（前后端一个服务）

本项目支持把 `web` 构建产物与 `server` 合并部署到同一台服务器上。

## 0) 推荐：使用发布脚本（适合服务器无法访问 GitHub）

如果你的服务器无法直接 `git clone` GitHub，可以在本地打包上传到服务器，然后在服务器执行发布脚本：

本地（Mac/Windows WSL）：

```bash
cd /path/to
tar -czf mianshi.tgz mianshi
scp mianshi.tgz root@<server-ip>:/opt/
```

服务器：

```bash
cd /opt/mianshi/current   # 初次可先解压一份到 /opt/mianshi
sudo bash ops/deploy.sh /opt/mianshi.tgz
```

脚本会：
- 解压成 timestamp release
- 清理 `._*` 文件（避免构建失败）
- `web` 安装依赖并构建到 `web/dist`
- `server` 安装依赖
- 运行 `init-db` + `migrate-db`
- 重启 `pm2`（进程名默认 `mianshi`）
- reload `nginx`

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
