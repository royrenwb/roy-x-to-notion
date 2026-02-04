/**
 * Notion Uploader - Handles Stage 4-5: Upload content and images to Notion
 * This module is independent and does NOT modify local files.
 */

const fs = require('fs');
const path = require('path');
const { uploadImages } = require('./image-uploader.js');

function log(message) {
  console.error(`[notion-uploader] ${message}`);
}

// Load Notion authentication
function loadNotionAuth() {
  const token = process.env.NOTION_TOKEN;
  const databaseId = process.env.NOTION_DATABASE_ID;

  if (!token) {
    log('Warning: NOTION_TOKEN not set in environment variables');
    return null;
  }

  return {
    token,
    databaseId
  };
}

/**
 * Parse YAML front-matter from markdown
 */
function parseYamlFrontMatter(markdown) {
  const lines = markdown.split('\n');
  const yamlLines = [];
  let inYaml = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line === '---') {
      if (!inYaml) {
        inYaml = true;
        continue;
      } else {
        inYaml = false;
        break;
      }
    }
    if (inYaml) {
      yamlLines.push(line);
    }
  }

  const metadata = {};
  for (const line of yamlLines) {
    const match = line.match(/^(\w+):\s*(.*)$/);
    if (match) {
      const [, key, value] = match;
      metadata[key] = value.replace(/^"|"$/g, '');
    }
  }

  return metadata;
}

/**
 * Convert Markdown to Notion blocks
 * @param {string} markdown - Markdown content
 * @param {Object} imageUrlMap - Optional map of {filename: url} for uploaded images
 */
function markdownToBlocks(markdown, imageUrlMap = {}) {
  const blocks = [];
  const lines = markdown.split('\n');
  const metadata = parseYamlFrontMatter(markdown);

  let skipUntil = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i] === '---') {
      if (skipUntil === 0) {
        skipUntil = 1;
      } else {
        skipUntil = i + 1;
        break;
      }
    }
  }

  for (let i = skipUntil; i < lines.length; i++) {
    const line = lines[i];

    if (!line.trim()) {
      continue;
    }

    if (line.startsWith('### ')) {
      blocks.push({
        object: 'block',
        type: 'heading_3',
        heading_3: {
          rich_text: [{ type: 'text', text: { content: line.substring(4) } }]
        }
      });
    } else if (line.startsWith('## ')) {
      blocks.push({
        object: 'block',
        type: 'heading_2',
        heading_2: {
          rich_text: [{ type: 'text', text: { content: line.substring(3) } }]
        }
      });
    } else if (line.startsWith('# ')) {
      blocks.push({
        object: 'block',
        type: 'heading_1',
        heading_1: {
          rich_text: [{ type: 'text', text: { content: line.substring(2) } }]
        }
      });
    }

    else if (line.startsWith('![')) {
      const match = line.match(/!\[([^\]]*)\]\(([^)]+)\)/);
      if (match) {
        const caption = match[1];
        const imagePath = match[2];
        const imageName = imagePath.split('/').pop();

        // Check if we have uploaded image URL
        if (imageUrlMap[imageName]) {
          // Use the uploaded image URL directly
          blocks.push({
            object: 'block',
            type: 'image',
            image: {
              type: 'external',
              external: {
                url: imageUrlMap[imageName]
              }
            }
          });
        } else if (Object.keys(imageUrlMap).length > 0) {
          // imageUrlMap exists but image not found -> upload failed, skip this image
          log(`  ⚠ Skipping ${imageName} (upload failed or not in image map)`);
        } else {
          // No imageUrlMap provided -> fallback to placeholder (backward compatibility)
          blocks.push({
            object: 'block',
            type: 'callout',
            callout: {
              rich_text: [
                { type: 'text', text: { content: '⏳ Image placeholder: ' } },
                { type: 'text', text: { content: imageName } },
                { type: 'text', text: { content: ' (Stage 5: will replace with uploaded image)' } }
              ],
              icon: { emoji: '🖼️' }
            }
          });
        }
      }
    }

    else if (line.match(/^\s*-\s/)) {
      blocks.push({
        object: 'block',
        type: 'bulleted_list_item',
        bulleted_list_item: {
          rich_text: [{ type: 'text', text: { content: line.replace(/^\s*-\s*/, '') } }]
        }
      });
    }

    else if (line.match(/^\s*\d+\.\s/)) {
      blocks.push({
        object: 'block',
        type: 'numbered_list_item',
        numbered_list_item: {
          rich_text: [{ type: 'text', text: { content: line.replace(/^\s*\d+\.\s*/, '') } }]
        }
      });
    }

    else if (line.startsWith('```')) {
      let codeContent = '';
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeContent += lines[i] + '\n';
        i++;
      }
      blocks.push({
        object: 'block',
        type: 'code',
        code: {
          rich_text: [{ type: 'text', text: { content: codeContent.trim() } }],
          language: 'javascript'
        }
      });
    }

    else {
      blocks.push({
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [{ type: 'text', text: { content: line } }]
        }
      });
    }
  }

  if (metadata.url) {
    blocks.push({
      object: 'block',
      type: 'divider',
      divider: {}
    });
    blocks.push({
      object: 'block',
      type: 'callout',
      callout: {
        rich_text: [
          { type: 'text', text: { content: '📎 原文链接: ' } },
          { type: 'text', text: { content: metadata.url, link: { url: metadata.url } } }
        ],
        icon: { emoji: '🔗' }
      }
    });
  }

  if (metadata.author_name) {
    blocks.push({
      object: 'block',
      type: 'callout',
      callout: {
        rich_text: [
          { type: 'text', text: { content: '作者: ' } },
          { type: 'text', text: { content: metadata.author_name } }
        ],
        icon: { emoji: '👤' }
      }
    });
  }

  return blocks;
}

async function createNotionPage(auth, title, contentBlocks, metadata) {
  if (!auth) {
    throw new Error('Notion authentication not configured');
  }

  if (!auth.databaseId) {
    throw new Error('Notion database ID not configured');
  }

  log('Creating Notion page...');

  const MAX_BLOCKS_PER_REQUEST = 100;

  const properties = {
    title: {
      title: [
        {
          text: {
            content: title
          }
        }
      ]
    }
  };

  if (metadata.author_name) {
    properties['Author'] = {
      type: 'rich_text',
      rich_text: [
        { type: 'text', text: { content: metadata.author_name } }
      ]
    };
  }

  if (metadata.url) {
    properties['Source URL'] = {
      type: 'url',
      url: metadata.url
    };
  }

  const chunks = [];
  for (let i = 0; i < contentBlocks.length; i += MAX_BLOCKS_PER_REQUEST) {
    chunks.push(contentBlocks.slice(i, i + MAX_BLOCKS_PER_REQUEST));
  }

  log(`  Total blocks: ${contentBlocks.length}`);
  log(`  Chunking into ${chunks.length} requests...`);

  const firstChunk = chunks[0];
  if (firstChunk.length > MAX_BLOCKS_PER_REQUEST) {
    throw new Error(`First chunk too large: ${firstChunk.length} blocks (max: ${MAX_BLOCKS_PER_REQUEST})`);
  }

  const response = await fetch('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${auth.token}`,
      'Content-Type': 'application/json',
      'Notion-Version': '2022-06-28'
    },
    body: JSON.stringify({
      parent: {
        type: 'database_id',
        database_id: auth.databaseId
      },
      properties,
      children: firstChunk
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create page: ${response.status} - ${error}`);
  }

  const page = await response.json();
  log(`  ✓ Created page: ${page.url}`);
  log(`  ✓ Added ${firstChunk.length} blocks (part 1/${chunks.length})`);

  for (let i = 1; i < chunks.length; i++) {
    const chunk = chunks[i];
    const chunkNumber = i + 1;

    await appendBlockChildren(auth, page.id, chunk);
    log(`  ✓ Added ${chunk.length} blocks (part ${chunkNumber}/${chunks.length})`);
  }

  log(`✓ Total: ${contentBlocks.length} blocks uploaded`);

  return page;
}

async function appendBlockChildren(auth, pageId, blocks) {
  const MAX_BLOCKS_PER_REQUEST = 100;

  for (let i = 0; i < blocks.length; i += MAX_BLOCKS_PER_REQUEST) {
    const chunk = blocks.slice(i, i + MAX_BLOCKS_PER_REQUEST);

    const response = await fetch(`https://api.notion.com/v1/blocks/${pageId}/children`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${auth.token}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28'
      },
      body: JSON.stringify({
        children: chunk
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to append blocks: ${response.status} - ${error}`);
    }
  }
}

async function replaceImagePlaceholders(auth, pageId, uploadResults) {
  log('Replacing image placeholders...');

  const response = await fetch(`https://api.notion.com/v1/blocks/${pageId}/children`, {
    headers: {
      'Authorization': `Bearer ${auth.token}`,
      'Notion-Version': '2022-06-28'
    }
  });

  if (!response.ok) {
    throw new Error('Failed to fetch page blocks');
  }

  const data = await response.json();
  const blocks = data.results || [];

  let replacedCount = 0;

  for (const block of blocks) {
    if (block.type === 'callout' && block.callout) {
      const text = block.callout.rich_text;
      const textContent = text.map(t => t.text?.content).join('');

      if (textContent.includes('Image placeholder:')) {
        const match = textContent.match(/Image placeholder: ([^ ]+)/);
        if (match) {
          const filename = match[1];

          const uploadedImage = uploadResults.find(r => r.filename === filename);

          if (uploadedImage && uploadedImage.success) {
            await fetch(`https://api.notion.com/v1/blocks/${block.id}`, {
              method: 'PATCH',
              headers: {
                'Authorization': `Bearer ${auth.token}`,
                'Content-Type': 'application/json',
                'Notion-Version': '2022-06-28'
              },
              body: JSON.stringify({
                image: {
                  type: 'external',
                  external: {
                    url: uploadedImage.url
                  }
                }
              })
            });

            replacedCount++;
            log(`  ✓ Replaced: ${filename} → ${uploadedImage.url}`);
          }
        }
      }
    }
  }

  log(`✓ Replaced ${replacedCount}/${uploadResults.length} placeholders`);
}

async function uploadToNotion(localResult, options = {}) {
  const auth = loadNotionAuth();

  if (!auth) {
    throw new Error('Notion authentication not configured');
    log('To fix this, set environment variables:');
    log('  export NOTION_TOKEN="your_token"');
    log('  export NOTION_DATABASE_ID="your_database_id"');
  }

  if (!auth.databaseId) {
    throw new Error('Notion database ID not configured');
    log('To get your database ID:');
    log('  1. Open your Notion database');
    log('  2. Copy the URL');
    log('   3. Extract the 32-character ID from the URL');
  }

  log('Starting Notion upload...');
  log(`  Local path: ${localResult.markdownPath}`);

  // Step 1: Upload images first (if enabled)
  let imageUrlMap = {};

  if (options.uploadImages && localResult.images.length > 0) {
    log('');
    log('=== Stage 5 (Pre-upload): Image Upload ===');

    try {
      // Extract tweet_id for task folder
      const tweetId = localResult.metadata.tweet_id
        || localResult.metadata.tweet_count
        || localResult.metadata.requested_url?.split('/').pop();

      // Generate task ID from metadata (tweet_id is best option)
      const taskId = tweetId
        || new Date().toISOString().replace(/[:.]/g, '').slice(0, 14);

      log(`  Using Task ID: ${taskId}`);

      // Upload images with task isolation
      const uploadResults = await uploadImages(
        localResult.images.map(img => path.join(localResult.imagesDir, img.filename)),
        taskId
      );

      const successUploads = uploadResults.filter(r => r.success);
      const failedUploads = uploadResults.filter(r => !r.success);

      log(`  ✓ Uploaded: ${successUploads.length}/${uploadResults.length} images to COS`);

      if (failedUploads.length > 0) {
        log(`  ⚠ Failed uploads: ${failedUploads.length}`);
        failedUploads.forEach(f => {
          log(`    - ${f.filename}: ${f.error}`);
        });
      }

      // Build imageUrlMap: { "01.jpg": "https://cos...", ... }
      successUploads.forEach(result => {
        imageUrlMap[result.filename] = result.url;
      });

      log(`  ✓ Image URL map created: ${Object.keys(imageUrlMap).length} URLs`);
    } catch (error) {
      log(`  ❌ Image upload failed: ${error.message}`);
      log('  Continuing with text upload only...');
    }

    log('');
  }

  // Step 2: Convert markdown with imageUrlMap
  log('Converting markdown to Notion blocks...');

  const markdown = fs.readFileSync(localResult.markdownPath, 'utf-8');
  const blocks = markdownToBlocks(markdown, imageUrlMap);

  log(`  Generated ${blocks.length} blocks`);

  // Step 3: Create Notion page with complete content (including images)
  const page = await createNotionPage(auth, localResult.metadata.title, blocks, localResult.metadata);

  if (!options.uploadImages && localResult.images.length > 0) {
    log('');
    log('=== Stage 4: Notion Upload (Text Only) ===');
    log(`  Images: ${localResult.images.length} found`);
    log('  ⚠ Image upload not enabled (--upload-images flag required)');
    log('  💡 Image placeholders remain in page');
  }

  log('');
  log('=== Notion Upload Complete ===');

  return {
    success: true,
    pageId: page.id,
    url: page.url
  };
}

module.exports = { uploadToNotion, markdownToBlocks, parseYamlFrontMatter };
