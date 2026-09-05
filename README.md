# luci-app-autosign

超轻量级 OpenWrt 定时自动签到插件（支持 OpenWrt 21.02 / 23.05 / 24.10 / 25.12+ 及 iStore 应用商店）。

## ✨ 核心特性

- **现代 LuCI JS 架构**：采用 OpenWrt 官方现代客户端渲染 API，界面清爽现代、响应迅速。
- **灵活定时调度**：可视化设置每天运行时间（时、分），支持随机防风控延迟（0~3600秒）与自动失败重试。
- **多任务混合配置**：
  - **HTTP(S) 请求模式**：支持配置 URL、GET/POST/PUT、自定义 Headers、Cookie、Body 以及成功匹配关键词。
  - **自定义脚本模式**：支持执行本地 Shell 脚本或命令，灵活扩展复杂打卡与自动化流程。
- **极速测试与实时日志**：页面内置「⚡ 立即执行签到测试」按钮，终端视窗实时回显状态码与响应摘要。
- **多渠道消息推送**：支持 PushPlus (微信)、Server酱·Turbo、Telegram Bot、Bark (iOS)、自定义 Webhook。
- **极致小巧**：纯 POSIX Shell + UCI + LuCI JS，零重型运行环境依赖，包体积仅约 20 KB。

---

## 📦 安装说明

### 1. iStore 网页端一键安装（推荐）
1. 登录路由器管理后台，进入 **iStore** -> **「手动安装」**。
2. 上传安装包 **`luci-app-autosign-1.0.0.run`**（自解压格式，100% 免疫任何包管理器差异）。
3. 安装完成后，刷新网页，在左侧导航栏 **「服务」** 中即可看到 **「定时签到」**。

### 2. OpenWrt 25.x (APK) 安装
对于使用 apk-tools 的 OpenWrt 25+ 系统：
```bash
apk add --allow-untrusted luci-app-autosign-1.0.0-r1.apk
```

### 3. OpenWrt 21/23/24 (OPKG) 安装
```bash
opkg install luci-app-autosign_1.0.0-1_all.ipk
```

---

## 🛠️ 文件结构

```text
luci-app-autosign/
├── Makefile                                # OpenWrt 源码编译规则
├── root/
│   ├── etc/
│   │   ├── config/autosign                 # UCI 配置文件模板
│   │   └── init.d/autosign                 # Procd 系统服务与 Crontab 调度守护
│   ├── usr/share/
│   │   ├── autosign/autosign.sh            # 核心签到与推送 Shell 引擎
│   │   ├── luci/menu.d/...                 # LuCI 现代导航菜单注册
│   │   └── rpcd/acl.d/...                  # LuCI RPCD 权限控制
│   └── www/luci-static/resources/view/
│       └── autosign/index.js               # 现代 LuCI JS 响应式前端视图
└── control/                                # IPK/APK 元数据与钩子脚本
```

---

## 📄 开源协议

本项目采用 [Apache-2.0](LICENSE) 协议开源。
