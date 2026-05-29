阿里云 Linux 服务器部署小程序项目 — 完整方案
====================================================

项目架构
--------
微信小程序 ──► 微信平台托管（无需服务器）
     │
     └──► HTTPS API 请求 ──► 阿里云服务器
                                   │
管理后台 ───────────────────────┘（Nginx 静态文件 + API）

Express API（Node.js :3456，Nginx 反向代理到 HTTPS）


分工总览
--------
步骤 1：购买服务器                    你需要
步骤 2：域名 DNS + SSL 证书           你需要
步骤 3：准备代码和配置文件            我可以
步骤 4：服务器环境安装                我可以提供命令，你执行
步骤 5：上传项目代码并部署            我可以提供命令，你执行
步骤 6：微信平台域名白名单            你需要
步骤 7：验证                         一起


第 1 步：购买服务器（你需要）
-----------------------------
1. 登录 https://swas.console.aliyun.com/ （轻量应用服务器）
2. 选择：
   - 地域：香港（免备案，即开即用）或 中国大陆（需 ICP 备案 15-20 天）
   - 镜像：系统镜像 → Ubuntu 22.04 或 CentOS 7.9
   - 规格：2核 2GB（约 ¥54/月）
3. 购买后记录公网 IP（如 47.xx.xx.xx）
4. 在控制台设置 root 密码


第 2 步：域名解析 + SSL 证书（你需要）
--------------------------------------
DNS 解析：
  1. 登录阿里云 DNS 控制台
  2. 添加 A 记录：你的域名 → 服务器公网 IP
  3. 等待 DNS 生效（约 10 分钟）

SSL 证书：
  1. 阿里云控制台 → SSL 证书 → 免费证书 → 购买 → 创建证书
  2. 填写域名，选择 DNS 验证，等待签发（几分钟）
  3. 下载 Nginx 格式证书（.pem 和 .key 两个文件）

完成后告诉我：域名、服务器公网 IP


第 3 步：我会准备好的代码和配置
-------------------------------
3a. 修改小程序 API 地址（miniprogram/utils/api.js）：
    将 BASE_URL 从 http://172.20.1.80:3456/api 改为 https://你的域名/api
    将 STATIC_BASE 也同步修改

3b. Nginx 配置文件（/etc/nginx/conf.d/wxcompany.conf）：
    - HTTP 80 端口自动重定向到 HTTPS 443
    - 管理后台静态文件由 Nginx 直接服务
    - /api/ 和 /uploads/ 反向代理到本地 Node.js :3456
    - 上传文件大小限制 55MB

3c. PM2 进程守护配置（ecosystem.config.js）：
    - 进程名：wxcompany
    - 工作目录：/opt/wxcompany/server
    - 内存限制 300MB 自动重启


第 4 步：服务器环境安装（SSH 登录服务器后执行）
------------------------------------------------

# 1. 更新系统
apt update && apt upgrade -y          # Ubuntu
# yum update -y                        # CentOS

# 2. 安装 Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# 3. 安装 Nginx
apt install -y nginx

# 4. 安装 PM2（进程守护工具）
npm install -g pm2

# 5. 创建工作目录
mkdir -p /opt/wxcompany
mkdir -p /etc/nginx/ssl

# 6. 上传 SSL 证书到 /etc/nginx/ssl/
#    把 fullchain.pem 和 privkey.pem 传到这个目录


第 5 步：部署项目文件
---------------------
从你的 Windows 电脑上传代码到服务器：
  scp -r D:/wxcompany/server root@你的公网IP:/opt/wxcompany/
  scp -r D:/wxcompany/admin   root@你的公网IP:/opt/wxcompany/

SSH 登录服务器后执行：
  cd /opt/wxcompany/server
  npm install

  # 部署 Nginx 配置
  cp /opt/wxcompany/nginx/wxcompany.conf /etc/nginx/nginx.conf.d/
  nginx -t
  systemctl reload nginx

  # 启动 Node 服务
  pm2 start /opt/wxcompany/ecosystem.config.js
  pm2 save
  pm2 startup            # 设置开机自启


第 6 步：微信小程序平台配置（你需要）
--------------------------------------
1. 登录微信公众平台 → 开发 → 开发管理 → 服务器域名
2. request 合法域名 添加：https://你的域名
3. uploadFile 合法域名 添加：https://你的域名
4. 注意：域名需备案（若服务器在大陆），一个月只能修改 5 次


第 7 步：验证
-------------
全部完成后测试：

  # API 健康检查
  curl https://你的域名/api

  # 启动页接口
  curl https://你的域名/api/splash

  # 浏览器访问管理后台
  https://你的域名/index.html

  # 微信开发者工具中使用新域名测试小程序


需要你提供的信息
----------------
开始前请告诉我：
  1. 域名是什么？
  2. 选择香港（免备案）还是大陆（需备案 15-20 天）？
  3. 服务器公网 IP（购买后提供）？

有了这些信息，我可以直接修改好代码里的域名，生成配置文件。
