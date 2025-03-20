# Screenshot API Service

A REST API service that captures screenshots of web pages using Puppeteer.

## Prerequisites
- Node.js
- npm

## Installation

```bash
# Install dependencies
npm install
```

## Configuration

The service runs on port 3000 by default. You can change this by setting the `PORT` environment variable.

## Usage

Start the API server:
```bash
npm start
```

## API Endpoints

### Health Check
- **GET** `/health`
- Returns service health status
- Response: `{ "status": "ok" }`

### Take Screenshot
- **POST** `/screenshot`
- Request body parameters:
  - `url` (required): Website URL to capture
  - `outputPath` (optional): Custom filename for the screenshot
  - `fullPage` (optional): Capture full page length
  - `format` (optional): Image format (png/jpeg/webp), default: png
  - `quality` (optional): Image quality (1-100)
  - `selector` (optional): Capture specific element
  - `waitForSelector` (optional): Wait for element before capture
  - `returnBase64` (optional): Return image as base64 string
  - `viewportConfig` (optional): Custom viewport settings
  - `clipArea` (optional): Capture specific area
  - `timeout` (optional): Custom timeout in milliseconds

### Example Requests

1. Basic Screenshot:
```json
{
  "url": "https://example.com"
}
```

2. Full Page Screenshot with Custom Format:
```json
{
  "url": "https://example.com",
  "format": "jpeg",
  "fullPage": true,
  "quality": 90
}
```

3. Capture Specific Element:
```json
{
  "url": "https://example.com",
  "selector": "#main-content",
  "format": "png"
}
```