const COS = require('cos-nodejs-sdk-v5');
const fs = require('fs');
const dotenv = require('dotenv');

// Load environment variables from .env file (if exists)
dotenv.config();

// Tencent Cloud COS Configuration
// Use environment variables or defaults (NEVER commit real secrets to Git!)
const cosConfig = {
  SecretId: process.env.TENCENT_COS_SECRET_ID || '',
  SecretKey: process.env.TENCENT_COS_SECRET_KEY || '',
  Bucket: process.env.TENCENT_COS_BUCKET || 'your-bucket-name',
  Region: process.env.TENCENT_COS_REGION || 'ap-guangzhou',
  BaseFolder: process.env.TENCENT_COS_BASE_FOLDER || 'p/notion',
  UseCDN: false,
  CDNUrl: ''
};

// Initialize COS client
const cos = new COS({
  SecretId: cosConfig.SecretId,
  SecretKey: cosConfig.SecretKey
});

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
 * Upload image to Tencent Cloud COS
 */
async function uploadToCOS(imagePath, filename, taskId = null) {
  return new Promise((resolve, reject) => {
    const key = taskId 
      ? `${cosConfig.BaseFolder}/${taskId}/${filename}`
      : `${cosConfig.BaseFolder}/${filename}`;

    cos.putObject({
      Bucket: cosConfig.Bucket,
      Region: cosConfig.Region,
      Key: key,
      Body: fs.createReadStream(imagePath)
    }, (err, data) => {
      if (err) {
        reject(err);
        return;
      }

      // Generate public URL
      const cosUrl = `https://${cosConfig.Bucket}.cos.${cosConfig.Region}.myqcloud.com/${key}`;

      const publicUrl = cosConfig.UseCDN && cosConfig.CDNUrl
        ? `${cosConfig.CDNUrl}/${key}`
        : cosUrl;

      resolve({
        success: true,
        url: publicUrl,
        cosUrl: cosUrl,
        key: key,
        data: data,
        taskId  // Return task ID for reference
      });
    });
  });
}

/**
 * Upload multiple images to COS with task isolation
 */
async function uploadImagesToCOS(imagePaths, taskId, onProgress) {
  const results = [];

  for (let i = 0; i < imagePaths.length; i++) {
    const imagePath = imagePaths[i];
    const filename = imagePath.split('/').pop();

    try {
      const result = await uploadToCOS(imagePath, filename, taskId);
      results.push({
        success: true,
        imagePath,
        filename,
        ...result
      });

      if (onProgress) {
        onProgress(i + 1, imagePaths.length, filename);
      }
    } catch (error) {
      results.push({
        success: false,
        imagePath,
        filename,
        error: error.message
      });

      if (onProgress) {
        onProgress(i + 1, imagePaths.length, filename, false);
      }
    }
  }

  return results;
}

module.exports = {
  uploadToCOS,
  uploadImagesToCOS,
  cosConfig,
  generateTaskId
};
