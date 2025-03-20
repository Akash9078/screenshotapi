const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const path = require('path');
const fs = require('fs');
const fsPromises = require('fs').promises;

// Initialize puppeteer with stealth plugin
puppeteer.use(StealthPlugin());

// Function to get Chrome executable path based on platform
function getChromePath() {
  switch (process.platform) {
    case 'win32':
      return 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
    case 'linux':
      return '/usr/bin/google-chrome-stable';
    case 'darwin':
      return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    default:
      throw new Error('Unsupported platform');
  }
}

class ScreenshotTool {
  constructor(options = {}) {
    const chromePath = getChromePath();
    this.defaultOptions = {
      headless: 'new',
      defaultViewport: null,
      executablePath: chromePath,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      ...options
    };
    this.browser = null;
  }

  async initialize() {
    if (!this.browser) {
      this.browser = await puppeteer.launch(this.defaultOptions);
    }
    return this.browser;
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  async takeScreenshot({
    url,
    outputPath = 'screenshot.png',
    fullPage = false,
    format = 'png',
    quality = 80,
    viewportConfig = { width: 1920, height: 1080, deviceScaleFactor: 1 },
    selector = null,
    waitForSelector = null,
    clipArea = null,
    timeout = 30000,
    returnBase64 = false
  }) {
    try {
      await this.initialize();
      const page = await this.browser.newPage();
      await page.setViewport(viewportConfig);
      
      await page.goto(url, { 
        waitUntil: 'networkidle2', 
        timeout: timeout 
      });

      if (waitForSelector) {
        await page.waitForSelector(waitForSelector, { visible: true, timeout });
      }

      const screenshotOptions = {
        path: returnBase64 ? undefined : outputPath,
        fullPage: fullPage,
        type: format,
        encoding: returnBase64 ? 'base64' : undefined
      };

      if (['jpeg', 'webp'].includes(format)) {
        screenshotOptions.quality = quality;
      }

      if (clipArea) {
        screenshotOptions.clip = clipArea;
      }

      let result;
      if (selector) {
        const element = await page.$(selector);
        if (!element) {
          throw new Error(`Element with selector "${selector}" not found`);
        }
        result = await element.screenshot(screenshotOptions);
      } else {
        result = await page.screenshot(screenshotOptions);
      }

      return returnBase64 ? result : { success: true, path: outputPath };
    } catch (error) {
      console.error('Screenshot capture failed:', error);
      return { success: false, error: error.message };
    }
  }
}

// Create Express app and screenshot tool instance
const app = express();
const port = process.env.PORT || 3000;
const screenshotTool = new ScreenshotTool();

// Middleware
app.use(express.json());

// Ensure screenshots directory exists
const screenshotsDir = path.join(__dirname, 'screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

// Initialize screenshot tool
screenshotTool.initialize().catch(console.error);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Screenshot endpoint
app.post('/screenshot', async (req, res) => {
  try {
    const {
      url,
      outputPath,
      fullPage,
      format = 'png',
      quality,
      selector,
      waitForSelector,
      returnBase64 = false,
      viewportConfig,
      clipArea,
      timeout
    } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const filename = outputPath || `screenshot-${Date.now()}.${format}`;
    const outputFilePath = path.join(__dirname, 'screenshots', filename);

    const result = await screenshotTool.takeScreenshot({
      url,
      outputPath: outputFilePath,
      fullPage,
      format,
      quality,
      selector,
      waitForSelector,
      returnBase64,
      viewportConfig,
      clipArea,
      timeout
    });

    if (!result.success && !returnBase64) {
      return res.status(500).json(result);
    }

    if (returnBase64) {
      return res.json({ success: true, base64: result });
    }

    // Check if file exists
    if (!fs.existsSync(outputFilePath)) {
      return res.status(500).json({ error: 'Screenshot file not found' });
    }

    // Send file
    res.sendFile(outputFilePath, async (err) => {
      if (err) {
        console.error('Error sending file:', err);
      }
      // Delete file after sending
      try {
        await fsPromises.unlink(outputFilePath);
        console.log(`Deleted: ${outputFilePath}`);
      } catch (deleteErr) {
        console.error('Error deleting file:', deleteErr);
      }
    });
  } catch (error) {
    console.error('Screenshot error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(port, () => {
  console.log(`Screenshot server running on port ${port}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Closing screenshot tool...');
  await screenshotTool.close();
  process.exit(0);
});
