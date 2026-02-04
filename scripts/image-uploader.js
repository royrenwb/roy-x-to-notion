/**
 * Image Uploader - Upload images to Tencent Cloud COS
 */

const fs = require('fs');
const path = require('path');
const { uploadToCOS, uploadImagesToCOS } = require('./tencent-cos-uploader.js');

function log(message) {
  console.error(`[image-uploader] ${message}`);
}

/**
 * Upload a single image to COS
 */
async function uploadImage(imagePath, filename, taskId = null) {
  try {
    log(`  Uploading: ${filename}${taskId ? ` (Task: ${taskId})` : ''}`);
    const result = await uploadToCOS(imagePath, filename, taskId);
    log(`  ✓ Uploaded to COS: ${result.url}`);
    return {
      success: true,
      url: result.url,
      key: result.key,
      filename,
      taskId: result.taskId
    };
  } catch (error) {
    log(`  ✗ Failed: ${error.message}`);
    return {
      success: false,
      error: error.message,
      filename,
      taskId
    };
  }
}

/**
 * Upload multiple images to COS with task isolation
 */
async function uploadImages(imagePaths, taskId, onProgress) {
  log(`Uploading ${imagePaths.length} images to Tencent Cloud COS (Task: ${taskId})...`);

  const startTime = Date.now();

  const results = await uploadImagesToCOS(imagePaths, taskId, (current, total, filename, success = true) => {
    const status = success ? '✓' : '✗';
    console.log(`[${status}] ${current}/${total}: ${filename}`);
  });

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  const successCount = results.filter(r => r.success).length;

  log(`✓ Upload complete: ${successCount}/${imagePaths.length} images`);
  log(`  Duration: ${duration}s`);

  return results;
}

/**
 * Generate unique folder name for task
 * Options: timestamp, tweetId
 */
function generateTaskId(metadata) {
  // Priority: tweet_id > timestamp > random
  if (metadata.tweet_id) {
    return metadata.tweet_id;
  } else if (metadata.date) {
    const date = new Date(metadata.date);
    return date.toISOString().replace(/[:.]/g, '').slice(0, 14);
  } else {
    const date = new Date().toISOString().replace(/[:.]/g, '').slice(0, 14);
    return `${date}-${Math.random().toString(36).substring(2, 10)}`;
  }
}

/**
 * Upload images with progress callback (internal)
 */
async function uploadImagesWithProgress(imagePaths, onProgress) {
  const results = [];

  for (let i = 0; i < imagePaths.length; i++) {
    const imagePath = imagePaths[i];
    const filename = path.basename(imagePath);

    const result = await uploadImage(imagePath, filename, null);
    results.push(result);

    if (onProgress) {
      onProgress({
        current: i + 1,
        total: imagePaths.length,
        filename,
        success: result.success,
        url: result.url
      });
    }
  }

  return results;
}

module.exports = {
  uploadImage,
  uploadImages,
  uploadImagesWithProgress,
  uploadToCOS,
  uploadImagesToCOS,
  generateTaskId
};
