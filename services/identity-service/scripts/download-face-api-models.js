/**
 * Script to download face-api.js models automatically
 * 
 * Usage:
 *   node scripts/download-face-api-models.js
 * 
 * Or with custom path:
 *   node scripts/download-face-api-models.js --path ./models/face-api
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream/promises');

// Models to download from GitHub
const MODELS = [
  {
    name: 'ssd_mobilenetv1',
    files: [
      'ssd_mobilenetv1_model-weights_manifest.json',
      'ssd_mobilenetv1_model-shard1',
    ],
  },
  {
    name: 'face_landmark_68',
    files: [
      'face_landmark_68_model-weights_manifest.json',
      'face_landmark_68_model-shard1',
    ],
  },
  {
    name: 'face_recognition',
    files: [
      'face_recognition_model-weights_manifest.json',
      'face_recognition_model-shard1',
    ],
  },
];

// GitHub repository info
const GITHUB_OWNER = 'vladmandic';
const GITHUB_REPO = 'face-api';
const GITHUB_BRANCH = 'master';
const GITHUB_PATH = 'model';

/**
 * Download a file from URL
 */
async function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const protocol = url.startsWith('https') ? https : http;

    protocol
      .get(url, (response) => {
        if (response.statusCode === 302 || response.statusCode === 301) {
          // Handle redirect
          return downloadFile(response.headers.location, dest)
            .then(resolve)
            .catch(reject);
        }

        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download: ${response.statusCode} ${response.statusMessage}`));
          return;
        }

        pipeline(response, file)
          .then(() => {
            console.log(`✅ Downloaded: ${path.basename(dest)}`);
            resolve();
          })
          .catch(reject);
      })
      .on('error', reject);
  });
}

/**
 * Get GitHub raw file URL
 * Using jsdelivr CDN for better reliability
 */
function getGitHubRawUrl(filename) {
  // Use jsdelivr CDN for better reliability
  return `https://cdn.jsdelivr.net/gh/${GITHUB_OWNER}/${GITHUB_REPO}@${GITHUB_BRANCH}/${GITHUB_PATH}/${filename}`;
  
  // Alternative: Direct GitHub raw URL
  // return `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}/${GITHUB_PATH}/${filename}`;
}

/**
 * Download all models
 */
async function downloadModels(targetDir) {
  // Create target directory
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
    console.log(`📁 Created directory: ${targetDir}`);
  }

  console.log(`📥 Downloading models to: ${targetDir}\n`);

  let totalFiles = 0;
  let downloadedFiles = 0;

  // Count total files
  for (const model of MODELS) {
    totalFiles += model.files.length;
  }

  // Download each model
  for (const model of MODELS) {
    console.log(`\n📦 Downloading ${model.name} model...`);

    for (const filename of model.files) {
      const url = getGitHubRawUrl(filename);
      const dest = path.join(targetDir, filename);

      try {
        // Check if file already exists
        if (fs.existsSync(dest)) {
          console.log(`⏭️  Skipped (already exists): ${filename}`);
          downloadedFiles++;
          continue;
        }

        await downloadFile(url, dest);
        downloadedFiles++;
      } catch (error) {
        console.error(`❌ Failed to download ${filename}:`, error.message);
        throw error;
      }
    }
  }

  console.log(`\n✅ Successfully downloaded ${downloadedFiles}/${totalFiles} files!`);
  console.log(`\n📂 Models location: ${path.resolve(targetDir)}`);
  console.log(`\n💡 Next steps:`);
  console.log(`   1. Set environment variable: FACE_API_JS_MODEL_PATH=${path.resolve(targetDir)}`);
  console.log(`   2. Set provider: FACE_RECOGNITION_PROVIDER=face-api-js`);
}

/**
 * Main function
 */
async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  let targetDir = './models/face-api';

  // Check for custom path
  const pathIndex = args.indexOf('--path');
  if (pathIndex !== -1 && args[pathIndex + 1]) {
    targetDir = args[pathIndex + 1];
  }

  // Resolve absolute path
  targetDir = path.resolve(targetDir);

  console.log('🚀 face-api.js Models Downloader');
  console.log('================================\n');

  try {
    await downloadModels(targetDir);
    console.log('\n✨ Done!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { downloadModels };

