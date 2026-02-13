# Sunbunny

Musical creations by A.I. Expert and Indie Jazz Rock musician Phillip Adkins.

This repository contains the source code for the Sunbunny website and documentation for audio plugins.

## VST Download Issue (CRITICAL)

**Status:** The repository is currently **private**, which prevents users from downloading VST plugins.

### Problem

When users click on VST download links on the website, they receive a **404 error** because:

1. The repository `PilCAki/sunbunny` is set to **private**
2. Download links point to GitHub Releases: `https://github.com/PilCAki/sunbunny/releases/download/v0.1.0/...`
3. Private repositories' releases are not publicly accessible
4. Public users (not logged into GitHub or without repository access) cannot download the files

### Solution

To fix this issue, **choose ONE of the following options:**

#### Option 1: Make Repository Public (Recommended)

1. Go to repository **Settings**
2. Scroll to the **Danger Zone** section
3. Click **Change visibility** → **Make public**
4. Confirm the action

This will immediately make all releases and downloads publicly accessible.

#### Option 2: Host Files Elsewhere

If you prefer to keep the repository private:

1. Upload VST files to a public hosting service:
   - GitHub Pages (create a separate public repo)
   - Cloud storage (AWS S3, Google Cloud Storage, Azure Blob Storage)
   - CDN service (Cloudflare R2, etc.)

2. Update download URLs in these files:
   - `/plugins/panoramatone/index.html` (hero download buttons and download cards section)
   - `/plugins/panoramatone/downloads/releases.json`

#### Option 3: Create Public Releases Repository

1. Create a new **public** repository (e.g., `PilCAki/sunbunny-releases`)
2. Upload releases to that repository
3. Update download URLs in the HTML and JSON files to point to the new repository

## Website Structure

- `index.html` - Main landing page
- `music.html` - Music/albums page
- `plugins/panoramatone/` - Panoramatone VST plugin page and documentation
  - `index.html` - Plugin landing page
  - `docs/` - Documentation (install, troubleshooting, license, etc.)
  - `downloads/` - Release metadata files

## Development

To test the website locally:

```bash
# Start a local web server from the plugin directory
cd plugins/panoramatone
python3 -m http.server 8080

# Or from the root directory
python3 -m http.server 8080
```

Then navigate to `http://localhost:8080` in your browser.

## License

See individual plugin license files for details.
