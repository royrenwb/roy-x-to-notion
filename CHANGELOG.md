# Changelog

## [1.3.0] - 2026-02-05

### 🎉 Major Improvement: Image Position Fix

**Problem:**
- Previous approach: Insert text → Create placeholder blocks → Upload images → Replace placeholders
- Issue: Notion API returns 403 when trying to update existing blocks on database-created pages
- Result: Placeholders could not be replaced, images appeared at page bottom

**Solution:**
- New approach: Upload images first → Build imageUrlMap → Insert text with real image blocks
- This approach creates complete page content in one creation operation
- Avoids the 403 permission issue by not updating existing blocks

### Changes

#### notion-uploader.js

**Modified `markdownToBlocks` function:**
- Added `imageUrlMap` parameter (optional, backward compatible)
- Image handling: If imageUrlMap has URL → Create `image` block with external URL
- If imageUrlMap exists but image not found → Skip image (upload failed)
- If no imageUrlMap → Fallback to placeholder (backward compatibility)

**Modified `uploadToNotion` function:**
- **Step 1:** Upload all images to COS first (same as before)
- Build `imageUrlMap: { "01.jpg": "https://cos...", ... }`
- **Step 2:** Convert markdown with imageUrlMap (images become real blocks)
- **Step 3:** Create Notion page with complete content (including images)
- Removed `replaceImagePlaceholders` logic (no longer needed)

### Benefits

- ✅ Images appear in correct positions (matching original article)
- ✅ No 403 permission errors
- ✅ Faster (single page creation vs. create + multiple updates)
- ✅ Cleaner (no placeholders anywhere)
- ✅ Backward compatible (still supports `--notion` without `--upload-images`)

### Usage

```bash
# New recommended usage (images in correct position)
node main-final.js <url> --notion --upload-images

# Legacy usage (still works, creates placeholders)
node main-final.js <url> --notion
```

### Testing

Tested with:
- ✅ https://x.com/zhixianio/status/2018595121084994002 (5/5 images, 54 blocks)
- ✅ Images inserted at correct positions
- ✅ No placeholders remaining
- ✅ All external image blocks with COS URLs

### Breaking Changes

None (backward compatible)

---

## [1.2.0] - Previous

**Features:**
- Stage 1-3: Local download with image download
- Stage 4: Notion page creation with Markdown → Blocks conversion
- Stage 5: Image upload framework (placeholder-based)

**Limitation:**
- Placeholder replacement fails on database-created pages (403 error)
