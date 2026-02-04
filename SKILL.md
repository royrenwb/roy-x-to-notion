---
name: roy-x-to-notion
description: Download X (Twitter) articles to local markdown with images, and upload to Notion. Preserves paragraph structure, downloads all images, and creates Notion pages with image placeholders. When user asks to "download X article", "save X to local", "upload X to Notion", or provide x.com/twitter.com URLs.
---

# Roy X to Notion

Download X (Twitter) articles to local markdown and optionally upload to Notion.

## Features

1. **Stage 1-3: Local Download**
   - Maintains original paragraph structure
   - Downloads all images at original quality
   - Automatic X authentication (via cookies)
   - Preserves image captions

2. **Stage 4-5: Notion Upload with Images**
   - Uploads images to cloud storage first
   - Converts Markdown to Notion blocks with real image URLs
   - Creates complete Notion pages (text + images in correct positions)
   - Automatic chunking (handles 100 blocks limit)

## Script Directory

Scripts located in `scripts/` subdirectory.

**Path Resolution**:
1. `SKILL_DIR` = this SKILL.md's directory
2. Main script: `${SKILL_DIR}/scripts/main-final.js`

## Modules

- `core-downloader.js` - Stage 1-3: Content extraction and local download
- `notion-uploader.js` - Stage 4-5: Notion integration
- `image-uploader.js` - Image upload framework

## Output Structure

```
x-download/{article-title}/
  ├── article.md          # Markdown with content
  └── images/             # Downloaded images
      ├── 01.jpg
      ├── 02.jpg
      └── ...
```

## Usage

### Basic Usage (Local Download Only)
```bash
node ${SKILL_DIR}/scripts/main-final.js <url>
node ${SKILL_DIR}/scripts/main-final.js https://x.com/username/status/1234567890
```

### Upload to Notion
```bash
export NOTION_TOKEN="your_token"
export NOTION_DATABASE_ID="your_database_id"
node ${SKILL_DIR}/scripts/main-final.js <url> --notion
```

### Custom Output Directory
```bash
node ${SKILL_DIR}/scripts/main-final.js <url> -o ./my-articles
```

## Options

| Option | Description |
|--------|-------------|
| `<url>` | Tweet or article URL (required) |
| `-o <path>` | Custom output directory (optional) |
| `--notion` | Upload to Notion after local download (optional) |
| `--local-only` | Download locally only, skip Notion (default) |
| `--dry-run` | Simulate without downloading |
| `--help` | Show help message |

## Image Upload Flow (v1.3.0+)

**Workflow**: Pre-upload images → Insert with real URLs

**Step 1** (image pre-upload):
1. Upload all images to cloud storage (COS)
2. Build imageUrlMap: `{ "01.jpg": "https://cos...", ... }`

**Step 2** (markdown to blocks):
1. Parse markdown, find image references `![alt](01.jpg)`
2. Look up imageUrlMap for real URL
3. Create Notion image block with external URL (if upload succeeded)
4. Skip image if upload failed

**Step 3** (page creation):
1. Create Notion page with complete content (text + images)
2. Images appear in correct positions

**Advantages over placeholder approach:**
- ✅ No 403 permission errors (not updating existing blocks)
- ✅ Images in correct positions
- ✅ Faster (single creation operation)
- ✅ No placeholders anywhere

## Authentication

### X (Twitter)
Automatic via cached cookies:
- Location: `~/Library/Application Support/baoyu-skills/x-to-markdown/cookies.json`
- First use: Chrome window opens for login
- Subsequent uses: Automatic

### Notion
Required for Notion upload:
- `NOTION_TOKEN` environment variable
- `NOTION_DATABASE_ID` environment variable

Setup:
```bash
export NOTION_TOKEN="your_notion_integration_token"
export NOTION_DATABASE_ID="your_database_id"
```

See `NOTION_SETUP.md` for detailed setup instructions.

## Notion Database Configuration

Minimum required properties:
- **Title** (default, always present)
- **Author** (Rich text type)
- **Source URL** (URL type)

## Supported URLs

- `https://x.com/<user>/status/<id>`
- `https://twitter.com/<user>/status/<id>`
- `https://x.com/i/article/<id>`

## Implementation Details

### Stage 1-3: Local Download (core-downloader.js)
- Uses `baoyu-danger-x-to-markdown` for content extraction
- Auto-loads X cookies for image authentication
- Downloads images at original quality
- Generates markdown with local image paths

### Stage 4: Notion Page Creation (notion-uploader.js)
- Converts Markdown to Notion blocks
- Handles 100 blocks limit via chunking
- Inserts image placeholders
- Sets page properties (title, author, source URL)

### Stage 5: Image Upload (image-uploader.js)
- Uploads images to cloud storage (Imgur/Cloudinary/etc.)
- Replaces placeholders with real images
- Maintains correct positions

## Error Handling

- **Isolation**: Notion upload failure doesn't affect local files
- **Retry**: Failed images are skipped, others continue
- **Graceful**: Missing authentication shows helpful error messages

## Architecture

```
User Input: X URL
    ↓
Stage 1-3: Local Download (core-downloader.js)
    ├── Content Extraction
    ├── Image Download (90%+ success rate)
    └── Markdown Generation
    ↓
Local Files: article.md + images/
    ↓
Stage 4-5: Notion Upload (notion-uploader.js) [Optional]
    ├── Step 1: Upload Images → Build imageUrlMap
    ├── Step 2: Markdown → Notion Blocks (with real image URLs)
    └── Step 3: Create Notion Page (complete content)
```

## Examples

### Download Local Only
```bash
node scripts/main-final.js https://x.com/zhixianio/status/2018595121084994002
```

### Download and Upload to Notion
```bash
export NOTION_TOKEN="ntn_..."
export NOTION_DATABASE_ID="b4e17c75cb4c48feade1c68308fedba5"
node scripts/main-final.js https://x.com/Khazix0918/status/2018892087744397692 --notion
```

## Testing

Tested Articles:
1. ✅ https://x.com/Khazix0918/status/2018892087744397692 (22/25 images, 176 blocks)
2. ✅ https://x.com/zhixianio/status/2018595121084994002 (5/5 images, 49 blocks)

## Prerequisites

- Node.js 16+
- X (Twitter) content access
- Notion integration (for Notion upload)
- Chrome browser (for first-time X login)

## Version

Current: v1.3.0
- Stage 1-4: Complete
- Stage 5: Complete (images uploaded first, then inserted with real URLs)
- Fixed: Images now appear in correct positions (no 403 errors)

## See Also

- `NOTION_SETUP.md` - Notion configuration guide
- `CHANGELOG.md` - Version history
- `README.md` - Detailed documentation
