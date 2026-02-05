# Roy X to Notion

从 X (Twitter) 下载文章到本地 Markdown，并上传到 Notion。保留完整的段落结构和图片位置。

## ✅ 功能特点

✅ **完整的本地下载** - 内容提取 + 图片下载 + Markdown生成
✅ **高质量的图片** - 自动下载原始质量图片（90%+成功率）
✅ **段落结构完整** - 保持文章的原始段落组织
✅ **Notion集成** - 创建页面，上传内容，图片自动插入正确位置
✅ **模块化架构** - 阶段1-3和4-6完全隔离，不影响本地文件
✅ **跨平台兼容** - macOS/Linux/Windows 通用

---

## 🎯 功能概览

| 阶段 | 功能 | 状态 |
|------|------|------|
| 阶段 1 | X内容提取 | ✅ 完成 |
| 阶段 2 | 图片下载 | ✅ 90%+成功率 |
| 阶段 3 | Markdown生成 | ✅ 完成 |
| 阶段 4 | Notion页面创建 | ✅ 完成 |
| 阶段 5 | 图片上传到Notion | ✅ 完成（预上传+自动插入） |
| 阶段 6 | 完整流程测试 | ✅ 完成 |

---

## 🚀 快速开始

### 1. 仅下载到本地

```bash
node scripts/main-final.js https://x.com/username/status/1234567890
```

### 2. 下载并上传到Notion

```bash
# 配置Notion认证
export NOTION_TOKEN="your_notion_token"
export NOTION_DATABASE_ID="your_database_id"

# 执行上传（会自动上传图片并插入到正确位置）
node scripts/main-final.js https://x.com/username/status/1234567890 --notion --upload-images
```

### 3. 命令行选项

| 选项 | 说明 |
|------|------|
| `<url>` | X文章链接（必需） |
| `-o <path>` | 自定义输出目录 |
| `--notion` | 上传到Notion（需要配置认证） |
| `--upload-images` | 上传图片到COS并自动插入到Notion |
| `--local-only` | 仅本地下载（默认） |
| `--dry-run` | 模拟运行，不实际下载 |
| `--help` | 显示帮助信息 |

### 4. 从任意目录运行

```bash
# 方法 1：从 scripts 目录运行
cd scripts
node main-final.js https://x.com/username/status/1234567890 --notion --upload-images

# 方法 2：从项目根目录运行（使用 npm scripts）
npm start -- https://x.com/username/status/1234567890 --notion --upload-images
```

**注意：** 环境变量会自动从项目根目录的 `.env` 文件加载，无论从哪个目录运行脚本。

---

## 📋 工作原理

### 本地下载（阶段1-3）

本技能使用 `baoyu-danger-x-to-markdown` 来提取 X 文章内容，然后：

1. **提取阶段**：从 X URL 获取文章正文和图片URL
2. **下载阶段**：使用 X cookies 下载高质量图片
3. **生成阶段**：生成 Markdown 文件，保持段落和图片位置

### Notion集成（阶段4-5）

**核心方案：图片预上传 + 一次性创建**

**问题**：如何让图片在 Notion 中出现在正确的位置？

**解决方案**（v1.3.0+）：
- **Step 1（图片预上传）**：上传所有图片到 COS，构建 `imageUrlMap: {"01.jpg": "https://...", ...}`
- **Step 2（转换 Markdown）**：遇到 `![]()` 时，直接通过 `imageUrlMap` 创建 Notion image block
- **Step 3（创建页面）**：一次性插入完整内容（文本 + 图片在正确位置）

**优势**：
- ✅ 图片位置100%准确（一次创建，无后续修改）
- ✅ 无 403 权限错误（不更新现有 blocks）
- ✅ 更快（单次创建 API 调用 vs 创建+多次更新）
- ✅ 更干净（无任何占位符）

---

## 📁 输出结构

```
x-download/{article-title}/
├── article.md          # 完整的 Markdown 文件
└── images/             # 下载的图片（原始质量）
    ├── 01.jpg
    ├── 02.jpg
    └── ...
```

---

## 🖼️ 图片上传流程

### 为什么需要预上传？

Notion 不支持本地图片路径（如 `images/01.jpg`），需要公共URL（https://...）。

### 工作流程（v1.3.0+）

```
图片预上传（Step 1）
  ├── 1. 下载所有图片到本地
  ├── 2. 上传到腾讯云 COS
  └── 3. 构建 imageUrlMap

转换 Markdown 并创建页面（Step 2-3）
  ├── 1. 解析 Markdown，遇到 ![]()
  ├── 2. 从 imageUrlMap 查找 URL
  ├── 3. 创建 image block（使用外部 URL）
  └── 4. 一次性创建完整 Notion 页面
```

### Notion中的最终效果

```
Discord 里一个由主题 + Thread 组成的 Channel

[🖼️ Image 1 - 真实图片显示]

我的「末日小屋」升级版——入住了 Owlia！
```

**注意：**
- 如果某张图片上传失败，该图片会在 Notion 中被自动跳过，不影响其他内容
- 无任何占位符，只显示成功上传的图片

---

## 🔧 认证配置

### X (Twitter) 认证

**自动认证**（推荐）：
- 脚本会自动加载 X cookies：`~/Library/Application Support/baoyu-skills/x-to-markdown/cookies.json`
- 这些 cookies 由 `baoyu-danger-x-to-markdown` 依赖自动缓存
- 首次使用时，会自动打开 Chrome 让你登录一次
- 后续使用无需再次登录

### Notion 认证

**必需环境变量**：
```bash
export NOTION_TOKEN="your_notion_integration_token"
export NOTION_DATABASE_ID="your_database_id"
```

**获取步骤**：
1. 访问 https://www.notion.so/my-integrations
2. 创建新 Integration
3. 复制 "Internal Integration Token"
4. 打开目标数据库，添加 Integration 连接
5. 从 URL 中获取数据库 ID（32位字符串）

详细配置请查看 `NOTION_SETUP.md`

### 腾讯云 COS 认证

**必需环境变量**：
```bash
export TENCENT_COS_SECRET_ID="your_secret_id"
export TENCENT_COS_SECRET_KEY="your_secret_key"
export TENCENT_COS_BUCKET="your-bucket-name-appid"
export TENCENT_COS_REGION="ap-guangzhou"
```

详细配置请查看 `ENV_SETUP.md`

---

## 🔧 环境变量配置

### 配置文件：`.env`

本技能使用 `.env` 文件存储所有敏感配置（密钥、API tokens 等）。`.env` 文件已添加到 `.gitignore`，不会被提交到 Git。

### 创建 `.env` 文件

在项目根目录创建 `.env` 文件：

```bash
cp .env.example .env
```

### 编辑 `.env` 文件

```bash
# Tencent Cloud COS Configuration
TENCENT_COS_SECRET_ID=your_secret_id_here
TENCENT_COS_SECRET_KEY=your_secret_key_here
TENCENT_COS_BUCKET=your-bucket-name-appid
TENCENT_COS_REGION=ap-guangzhou
TENCENT_COS_BASE_FOLDER=p/notion

# Notion Configuration (可选，也可以通过环境变量设置)
NOTION_TOKEN=your_notion_token_here
NOTION_DATABASE_ID=your_notion_database_id_here
```

### 验证配置

运行以下命令验证环境变量是否正确配置：

```bash
# 切换到项目目录
cd /Users/roy/clawd/skills/roy-x-to-notion

# 使用 --dry-run 验证配置
node scripts/main-final.js https://x.com/username/status/1234567890 --dry-run
```

如果看到 "DRY RUN" 输出，说明配置正常。

### 环境变量优先级

脚本会按以下优先级加载环境变量：
1. 系统环境变量（`export` 设置的）
2. `.env` 文件中的配置
3. 代码中的默认值（无敏感信息）

### 常见问题

**Q: 为什么图片上传失败？**
A: 检查 `.env` 文件中的 `TENCENT_COS_*` 配置是否正确，特别是 Bucket 名称格式应为 `name-appid`（如 `dengta-1256683598`）。

**Q: `.env` 文件在哪里？**
A: 在项目根目录（与 `scripts/` 同级），不是在 `scripts/` 目录内。

**Q: 可以不用 `.env` 文件吗？**
A: 可以，直接导出环境变量或使用 shell 脚本。但推荐使用 `.env` 文件管理配置。

---

## 📊 技术细节

### 图片处理流程
1. **提取**：从 Markdown 中提取图片URL
2. **质量优化**：转换为原始质量（format=jpg&name=orig）
3. **认证下载**：使用 X cookies 认证
4. **顺序下载**：按文章中出现的顺序下载
5. **本地化**：保存到 images/ 文件夹，按 01.jpg, 02.jpg 编号
6. **上传到 COS**：使用腾讯云 COS 获取公共 URL
7. **插入 Notion**：通过 imageUrlMap 创建 image blocks

### 段落识别机制
- 使用 `baoyu-danger-x-to-markdown` 的原生段落识别
- 保持文章的自然段落结构
- 图片根据 DOM 位置自动插入

### 错误处理
- **网络问题**：跳过失败的图片，继续下载其他
- **Notion失败**：不影响本地文件，只显示警告
- **隔离机制**：阶段4-6失败完全不影响阶段1-3

---

## 🛠️ 环境要求

- Node.js 16+
- Chrome 浏览器（用于首次 X 登录）
- 写入权限（在当前目录创建 x-download 文件夹）
- 腾讯云 COS 账号（可选，用于图片上传）

### Bun 运行时（必需）

本技能使用 `bun` 运行时来执行 `baoyu-danger-x-to-markdown` TypeScript 脚本。

```bash
# 检查/bun 是否已安装
bun --version

# 如果未安装
npm install -g bun
```

---

## 📦 依赖

### NPM 包依赖

本技能使用以下 NPM 包：

```bash
# 安装依赖
npm install
```

**核心依赖：**
- `cos-nodejs-sdk-v5@^2.15.4` - 腾讯云 COS SDK
- `dotenv@^16.4.1` - 环境变量加载

### Clawdbot 技能依赖

本技能依赖以下 Clawdbot 技能：

**baoyu-danger-x-to-markdown**
- **用途**：提取 X（Twitter）文章内容，生成 Markdown
- **位置**：`/Users/roy/.agents/skills/baoyu-danger-x-to-markdown/`
- **安装**：此技能应在 Clawdbot 技能目录中，通常通过 Clawdbot 管理
- **Cookies 位置**：`~/Library/Application Support/baoyu-skills/x-to-markdown/cookies.json`

**如何在非 Clawdbot 环境中使用？**

如果你不是在 Clawdbot 环境中运行本技能，需要：

1. **手动安装 baoyu-danger-x-to-markdown**：
   ```bash
   mkdir -p ~/.agents/skills/baoyu-danger-x-to-markdown
   cd ~/.agents/skills/baoyu-danger-x-to-markdown
   git clone https://github.com/[repo-url] .
   npm install
   ```

2. **修改脚本路径**：
   编辑 `scripts/core-downloader.js`，找到这一行：
   ```javascript
   const scriptPath = '/Users/roy/.agents/skills/baoyu-danger-x-to-markdown/scripts/main.ts';
   ```
   
   修改为你的实际路径。

**Clawdbot 用户：**
- 无需额外操作，技能已内置
- 首次使用时会自动打开 Chrome 登录 X
- Cookies 会自动缓存，后续无需登录

---

## 📊 测试验证

### 已成功测试的X文章

1. https://x.com/Khazix0918/status/2018892087744397692
   - ✅ 22/25 图片成功
   - ✅ 198 blocks 上传到 Notion
   - ✅ 图片位置100%准确
   - ✅ Notion: https://www.notion.so/OpenClaw-6-2fd46ebccb358172992fefb89dfbe0ec

2. https://x.com/zhixianio/status/2018595121084994002
   - ✅ 5/5 图片成功
   - ✅ 54 blocks 上传到 Notion
   - ✅ 图片位置100%准确
   - ✅ Notion: https://www.notion.so/Agent-Discord-OpenClaw-2fd46ebccb35817bb092d69a13501850

---

## 🔄 版本历史

### v1.3.0 (2026-02-05)
- ✅ **图片位置修复**：改为预上传方案，解决 403 权限问题
- ✅ **无占位符**：直接创建 image blocks，无中间状态
- ✅ **密钥安全**：所有密钥通过环境变量配置
- ✅ **完整文档**：更新 README 和配置指南

### v1.2.0 (2026-02-05)
- ✅ **完整功能实现**：阶段1-6全部完成
- ✅ **模块化架构**：3个核心模块完全独立
- ✅ **Notion分块上传**：自动处理100 blocks限制

### v1.1.0 (2026-02-04)
- ✅ 自动 X 认证支持
- ✅ 图片下载修复（90%+成功率）
- ✅ 文档完善

### v1.0.0 (2026-02-04)
- ✅ 初始版本实现

---

## 🐛 常见问题

**Q: 为什么有些图片下载失败？**
A: 可能是网络问题、图片URL已过期（404），或需要重新登录X。当前成功率90%+。

**Q: 段落结构不正确怎么办？**
A: 确保 X 页面内容完整加载，或使用Chrome登录后重试。

**Q: Notion上传失败会影响本地文件吗？**
A: 不会！模块完全隔离，Notion失败不影响本地下载。

**Q: 图片会显示占位符吗？**
A: 不会。新版本（v1.3.0+）直接在创建页面时插入真实的图片，无占位符。

**Q: 需要配置云存储吗？**
A: 是的。图片上传到 Notion 需要配置腾讯云 COS（或其他云存储）。详见 `ENV_SETUP.md`。

**Q: 可以批量下载吗？**
A: 当前支持单个链接。可以写脚本循环调用。

**Q: Notion支持哪些数据库属性？**
A: 最小配置：Title + Author（Rich text）+ Source URL（URL）。

**Q: 为什么不使用占位符机制了？**
A: v1.3.0 发现占位符替换会触发 Notion API 403 错误（权限限制）。新方案改为预上传图片，直接创建完整页面。

**Q: 如何配置环境变量？**
A: 在项目根目录创建 `.env` 文件（从 `.env.example` 复制），填入你的密钥和配置。脚本会自动加载此文件，无论从哪个目录运行。

**Q: 环境变量加载失败怎么办？**
A: 检查以下几点：1) `.env` 文件是否在项目根目录（不是 `scripts/` 中）；2) 文件格式是否正确（无多余空格或引号）；3) 使用 `--dry-run` 测试配置是否正确。

**Q: 图片上传失败，提示 "Bucket should format as xxx"？**
A: 检查 `TENCENT_COS_BUCKET` 配置格式应为 `bucketname-appid`（如 `dengta-1256683598`），不是单纯的 bucket 名称。

**Q: 可以在 scripts 目录外运行吗？**
A: 可以！脚本会自动从项目根目录加载 `.env` 文件。建议在项目根目录运行，或使用 `npm start` 命令。

---

## 🔗 相关文档

- `SKILL.md` - 技能技术文档
- `NOTION_SETUP.md` - Notion配置指南
- `ENV_SETUP.md` - 环境变量配置指南
- `CHANGELOG.md` - 版本变更日志

---

**开发状态**：✅ 阶段1-5完成 | 🎯 生产环境可用
**最后更新**：2026-02-05 03:30
**维护者**：Roy + Pi (派)
**版本**：v1.3.0
**仓库**：https://github.com/royrenwb/roy-x-to-notion
