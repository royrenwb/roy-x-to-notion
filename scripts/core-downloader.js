/**
 * Core Downloader - Handles Stage 1-3: Content extraction, image download, markdown generation
 * This module is independent and does NOT depend on Notion integration.
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

function log(message) {
  console.error(`[core-downloader] ${message}`);
}

// Load X authentication cookies
function loadXCookies() {
  const cookiePath = path.join(require('os').homedir(), 'Library/Application Support/baoyu-skills/x-to-markdown/cookies.json');

  try {
    const cookieData = JSON.parse(fs.readFileSync(cookiePath, 'utf-8'));
    const cookies = cookieData.cookieMap || {};

    return {
      auth_token: cookies.auth_token,
      ct0: cookies.ct0
    };
  } catch (error) {
    log('Warning: Could not load X cookies. Image download may fail.');
    return {};
  }
}

async function downloadImage(url, filePath, auth) {
  try {
    log(`  Downloading: ${url.split('?')[0]}`);

    // Build headers with authentication
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    };

    if (auth.auth_token) {
      headers['Authorization'] = `Bearer ${auth.auth_token}`;
    }
    if (auth.ct0) {
      headers['Cookie'] = `ct0=${auth.ct0}`;
    }

    const response = await fetch(url, { headers });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(filePath, buffer);
    return true;
  } catch (error) {
    log(`  ✗ Failed: ${error.message}`);
    return false;
  }
}

async function downloadXUrl(url, outputDir) {
  log('Starting download...');
  log(`URL: ${url}`);

  // Load X authentication cookies
  const auth = loadXCookies();
  if (Object.keys(auth).length > 0) {
    log('  ✓ Loaded X authentication cookies');
  } else {
    log('  ⚠ No X cookies found, image download may fail');
  }

  // Use baoyu-danger-x-to-markdown to extract content
  log('Extracting content using baoyu-danger-x-to-markdown...');

  return new Promise((resolve, reject) => {
    const scriptPath = '/Users/roy/clawd/.agents/skills/baoyu-danger-x-to-markdown/scripts/main.ts';
    const child = spawn('npx', ['-y', 'bun', scriptPath, url], {
      stdio: ['inherit', 'pipe', 'inherit'],
      encoding: 'utf-8'
    });

    let output = '';
    child.stdout.on('data', (data) => {
      output += data;
    });

    child.on('close', async (code) => {
      if (code !== 0) {
        reject(new Error(`Extraction failed with code ${code}`));
        return;
      }

      const markdownPath = output.trim();
      if (!markdownPath) {
        reject(new Error('No output received from extraction'));
        return;
      }

      log(`  ✓ Extracted: ${markdownPath}`);

      try {
        const articleMd = fs.readFileSync(markdownPath, 'utf-8');
        const lines = articleMd.split('\n');

        // Extract title
        let title = 'X Article';
        for (const line of lines) {
          if (line.startsWith('# ')) {
            title = line.substring(2).trim();
            break;
          }
        }

        // Extract metadata
        const metadata = {
          url,
          author: '',
          author_name: 'Unknown',
          author_username: 'unknown',
          title,
          date: new Date().toISOString()
        };

        // Extract metadata from YAML front-matter
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
            const match = line.match(/^(\w+):\s*(.*)$/);
            if (match) {
              const [, key, value] = match;
              if (key === 'author') metadata.author = value;
              if (key === 'author_name') metadata.author_name = value;
              if (key === 'author_username') metadata.author_username = value;
            }
          }
        }

        // Extract image URLs and captions
        const imageData = [];
        const imagePattern = /!\[([^\]]*)\]\((https:\/\/pbs\.twimg\.com\/media\/[^)]+)\)/g;
        let match;

        while ((match = imagePattern.exec(articleMd)) !== null) {
          const caption = match[1];
          const originalUrl = match[2];

          // Get original quality URL
          let downloadUrl = originalUrl;
          if (originalUrl.includes('name=large')) {
            downloadUrl = originalUrl.replace('name=large', 'format=jpg&name=orig');
          } else if (originalUrl.includes('?')) {
            try {
              const urlObj = new URL(originalUrl);
              urlObj.searchParams.set('format', 'jpg');
              urlObj.searchParams.set('name', 'orig');
              downloadUrl = urlObj.toString();
            } catch {}
          } else {
            downloadUrl = `${originalUrl}?format=jpg&name=orig`;
          }

          imageData.push({ caption, originalUrl, downloadUrl });
        }

        log(`  Found ${imageData.length} images`);

        // Setup output directory
        const slug = title.toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .slice(0, 50);

        const finalOutputDir = outputDir || path.join(process.cwd(), 'x-download', slug);
        const imagesDir = path.join(finalOutputDir, 'images');

        fs.mkdirSync(finalOutputDir, { recursive: true });
        fs.mkdirSync(imagesDir, { recursive: true });

        // Download images with sequential numbering
        let successCount = 0;
        const downloadedImages = [];
        const imageReplacements = {};

        for (let i = 0; i < imageData.length; i++) {
          const { caption, originalUrl, downloadUrl } = imageData[i];
          const filename = `${String(i + 1).padStart(2, '0')}.jpg`;
          const localPath = `images/${filename}`;
          const fullPath = path.join(finalOutputDir, localPath);

          const success = await downloadImage(downloadUrl, fullPath, auth);
          if (success) {
            log(`  ✓ ${filename}`);
            imageReplacements[originalUrl] = { localPath, caption };
            downloadedImages.push({ filename, localPath, caption });
            successCount++;
          }
        }

        log(`  Successfully downloaded: ${successCount}/${imageData.length} images`);

        // Replace image URLs in markdown
        let updatedMd = articleMd;
        for (const [originalUrl, { localPath, caption }] of Object.entries(imageReplacements)) {
          const escapedUrl = originalUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const pattern = new RegExp(`!\\[[^\\]]*\\]\\(${escapedUrl}\\)`, 'g');
          const replacement = caption ? `![Image 1](${localPath})\n\n*${caption}*` : `![Image 1](${localPath})`;
          updatedMd = updatedMd.replace(pattern, replacement);
        }

        // Save final markdown
        const markdownPathFinal = path.join(finalOutputDir, 'article.md');
        fs.writeFileSync(markdownPathFinal, updatedMd);

        log(`✓ Saved: ${markdownPathFinal}`);
        log(`Final output: ${finalOutputDir}`);

        resolve({
          success: true,
          metadata,
          outputDir: finalOutputDir,
          markdownPath: markdownPathFinal,
          images: downloadedImages,
          imagesDir
        });

      } catch (error) {
        reject(error);
      }
    });

    child.on('error', reject);
  });
}

module.exports = { downloadXUrl };
