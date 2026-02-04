# Environment Variables Setup

This skill uses environment variables for sensitive configuration. Never commit your actual secrets to Git!

## Setup Steps

### 1. Copy the example template

```bash
cp .env.example .env
```

### 2. Edit the .env file

Fill in your actual values:

```bash
# Tencent Cloud COS Configuration
TENCENT_COS_SECRET_ID=your_secret_id_here
TENCENT_COS_SECRET_KEY=your_secret_key_here
TENCENT_COS_BUCKET=your-bucket-name-appid
TENCENT_COS_REGION=ap-guangzhou
TENCENT_COS_BASE_FOLDER=p/notion
```

### 3. Load environment variables

The skill automatically loads variables from `.env` file using `dotenv` package. No extra steps needed!

### 4. Notion Configuration (Notion upload only)

If you want to upload to Notion, also set these environment variables:

```bash
export NOTION_TOKEN="your_notion_integration_token"
export NOTION_DATABASE_ID="your_notion_database_id"
```

Or add to your `.env` file:

```
NOTION_TOKEN=your_notion_integration_token
NOTION_DATABASE_ID=your_notion_database_id
```

## Security Notes

⚠️ **IMPORTANT:**
- `.env` file is listed in `.gitignore`
- Never commit `.env` to Git
- Only commit `.env.example` (with placeholder values)
- Rotate your keys if accidentally committed

## Get Your Keys

### Tencent Cloud COS

1. Go to [Tencent Cloud Console](https://console.cloud.tencent.com/cam/capi)
2. Create or find your API key
3. Copy `SecretId` and `SecretKey`

### Notion Integration

1. Go to [Notion My Integrations](https://www.notion.so/my-integrations)
2. Create a new integration
3. Copy the "Internal Integration Token" (NOTION_TOKEN)
4. Share your database with the integration (click "..." → "Connect to")
5. Copy the database ID from the URL (NOTION_DATABASE_ID)

## File Structure

```
roy-x-to-notion/
├── .env                # ⚠️ Local secrets (NOT in Git)
├── .env.example        # ✅ Template (in Git)
├── .gitignore          # ✅ Excludes .env from Git
├── package.json        # ✅ Dependencies
└── scripts/
    ├── main-final.js   # Main entry point
    └── ...
```
