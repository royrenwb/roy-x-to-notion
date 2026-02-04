#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Download the images from the original content.md
async function downloadImages() {
  const contentPath = '/Users/roy/clawd/skills/roy-x-to-notion/test-correct/content.md';
  const imagesDir = '/Users/roy/clawd/skills/roy-x-to-notion/test-correct/images';
  const outputDir = '/Users/roy/clawd/skills/roy-x-to-notion/test-correct/x-download/zhixianio-Agent-Discord-OpenClaw-X';
  
  const content = fs.readFileSync(contentPath, 'utf-8');
  
  // Extract image URLs
  const imageUrls = [];
  const imagePattern = /!\[Image \d+\]\((https:\/\/pbs\.twimg\.com\/media\/[^)]+)\)/g;
  let match;
  
  while ((match = imagePattern.exec(content)) !== null) {
    const url = match[1];
    const filename = url.split('/').pop().split('?')[0];
    imageUrls.push({ url, filename });
  }
  
  console.log(`Found ${imageUrls.length} images to download`);
  
  // Create directories
  fs.mkdirSync(outputDir, { recursive: true });
  fs.mkdirSync(imagesDir, { recursive: true });
  
  // Download images
  for (let i = 0; i < imageUrls.length; i++) {
    const { url, filename } = imageUrls[i];
    const paddedIndex = String(i + 1).padStart(2, '0');
    const newFilename = `${paddedIndex}.jpg`;
    const outputPath = path.join(imagesDir, newFilename);
    
    try {
      const response = await fetch(url);
      if (response.ok) {
        const buffer = await response.arrayBuffer();
        fs.writeFileSync(outputPath, buffer);
        console.log(`✓ Downloaded ${newFilename}`);
      } else {
        console.log(`✗ Failed to download ${url}`);
      }
    } catch (error) {
      console.log(`✗ Error downloading ${url}: ${error.message}`);
    }
  }
  
  console.log('Download complete!');
}

downloadImages().catch(console.error);
