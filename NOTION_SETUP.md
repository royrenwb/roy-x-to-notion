# Notion 配置指南

## 📋 配置步骤

### 1. 创建 Notion Integration

1. 访问：https://www.notion.so/my-integrations
2. 点击 "+ New integration"
3. 填写信息：
   - Name: `Roy X to Notion`
   - Associated workspace: 选择你的工作区
   - Type: Internal
4. 点击 "Submit"
5. 复制 "Internal Integration Token"（以 `secret_` 开头）
6. 保存到环境变量：
   ```bash
   export NOTION_TOKEN="secret_xxxx...xxxx"
   ```

### 2. 获取数据库 ID

1. 打开你想要存储文章的 Notion 数据库
2. 复制页面 URL
3. 从 URL 中提取数据库 ID（32位字符串）

   URL 格式：`https://www.notion.so/abc123/[DATABASE_ID]?v=...`
   或：`https://www.notion.so/[DATABASE_ID]?v=...`

4. 保存到环境变量：
   ```bash
   export NOTION_DATABASE_ID="xxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
   ```

### 3. 添加 Integration 到数据库

1. 打开目标数据库
2. 点击右上角 "..." → "Add connections"
3. 搜索并选择你创建的 Integration
4. 授予访问权限

## 🔍 验证配置

```bash
# 检查环境变量
echo $NOTION_TOKEN
echo $NOTION_DATABASE_ID

# 运行测试
node /Users/roy/clawd/skills/roy-x-to-notion/scripts/main-final.js https://x.com/Khazix0918/status/2018892087744397692 --notion
```

## 📊 数据库属性建议

创建数据库时，建议添加以下属性：

| 属性名 | 类型 | 说明 |
|--------|------|------|
| Title | Title | 文章标题 |
| Author | Rich text | 作者名称 |
| Source URL | URL | 原始 X 链接 |
| Downloaded At | Date | 下载时间 |

## ⚠️ 注意事项

1. Token 非常重要，不要泄露
2. 永久保存到 shell 配置文件（如 `~/.zshrc`）
3. Integration 必须添加到数据库才能写入数据
4. 数据库 ID 是32位，格式如：`abc123ef456789....`
