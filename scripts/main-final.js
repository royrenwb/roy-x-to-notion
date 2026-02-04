#!/usr/bin/env node

/**
 * Roy X to Notion - Main Entry Point
 * Orchestrates core downloader and optional Notion uploader
 */

const { downloadXUrl } = require('./core-downloader');
const { uploadToNotion } = require('./notion-uploader');

function printUsage() {
  console.log(`
Roy X to Notion - Download X articles and optionally upload to Notion

Usage:
  node main-final.js <url> [options]

Options:
  <url>              Article URL (required)
  -o, --output <dir> Custom output directory
  --notion           Upload to Notion after local download
  --upload-images    Upload images to Tencent COS and insert into Notion
  --local-only       Download locally only (skip Notion, even if configured)
  --dry-run          Simulate without downloading
  -h, --help         Show this help

Examples:
  # Download to local only
  node main-final.js https://x.com/username/status/1234567890

  # Download and upload text to Notion
  node main-final.js https://x.com/username/status/1234567890 --notion

  # Download and upload text + images to Notion
  node main-final.js https://x.com/username/status/1234567890 --notion --upload-images

  # Custom output directory
  node main-final.js https://x.com/username/status/1234567890 -o ./my-articles

Environment Variables (for Notion/Tencent COS):
  NOTION_TOKEN         Your Notion integration token
  NOTION_DATABASE_ID   Target Notion database ID

Output Structure:
  x-download/{article-title}/
    ├── article.md
    └── images/
        ├── 01.jpg
        ├── 02.jpg
        └── ...
`);
}

async function main() {
  const args = process.argv.slice(2);

  // Parse arguments
  let url = null;
  let outputDir = null;
  let uploadToNotionFlag = false;
  let localOnlyFlag = false;
  let dryRun = false;
  let uploadImagesFlag = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '-h' || arg === '--help') {
      printUsage();
      process.exit(0);
    } else if (arg === '-o' || arg === '--output') {
      outputDir = args[++i];
    } else if (arg === '--notion') {
      uploadToNotionFlag = true;
    } else if (arg === '--local-only') {
      localOnlyFlag = true;
    } else if (arg === '--upload-images') {
      uploadImagesFlag = true;
    } else if (arg === '--dry-run') {
      dryRun = true;
    } else if (!arg.startsWith('-')) {
      url = arg;
    } else {
      console.error(`Unknown option: ${arg}`);
      printUsage();
      process.exit(1);
    }
  }

  // Validate URL
  if (!url) {
    console.error('Error: URL is required');
    printUsage();
    process.exit(1);
  }

  // Dry run mode
  if (dryRun) {
    console.log('[DRY RUN] Would download:', url);
    console.log('[DRY RUN] Output directory:', outputDir || 'x-download/{article-title}');
    console.log('[DRY RUN] Notion upload:', uploadToNotionFlag ? 'YES' : 'NO');
    console.log('[DRY RUN] Image upload:', uploadImagesFlag ? 'YES' : 'NO');
    console.log('[DRY RUN] Exiting without downloading...');
    process.exit(0);
  }

  try {
    console.log('=== Roy X to Notion ===\n');

    // Stage 1-3: Local download (always runs)
    console.log('Stage 1-3: Local download...');
    const localResult = await downloadXUrl(url, outputDir);

    console.log('\n=== Local Download Complete ===');
    console.log(`📁 Output directory: ${localResult.outputDir}`);
    console.log(`📄 Markdown file: ${localResult.markdownPath}`);
    console.log(`🖼️  Images: ${localResult.images.length}`);

    if (localResult.images.length > 0) {
      console.log('\nImages:');
      localResult.images.forEach((img, idx) => {
        console.log(`  ${idx + 1}. ${img.filename}`);
      });
    }

    // Stage 4-5: Notion upload (optional)
    if (!localOnlyFlag && uploadToNotionFlag) {
      console.log('\n=== Stage 4-5: Notion Upload ===');
      try {
        const notionResult = await uploadToNotion(localResult, { uploadImages: uploadImagesFlag });
        console.log('\n=== Notion Upload Complete ===');
        console.log(`🔗 Notion page: ${notionResult.url}`);
      } catch (error) {
        console.error(`\n❌ Notion upload failed: ${error.message}`);
        console.error('Note: Local files were saved successfully.');
        console.log('To retry Notion upload, you can manually use Notion API or re-run with --notion');
      }
    } else {
      console.log('\nℹ️  Notion upload skipped (use --notion to enable)');
    }

    console.log('\n✅ All done!');

  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };
