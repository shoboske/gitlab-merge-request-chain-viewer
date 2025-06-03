# Installation Guide for GitLab MR Chain Visualizer

This document provides detailed instructions for installing and setting up the GitLab MR Chain Visualizer Chrome extension.

## Prerequisites

- Google Chrome browser (version 88 or higher recommended)
- Access to GitLab repositories with merge requests

## Installation Steps

### Method 1: Manual Installation (Developer Mode)

1. **Download the extension**
   - Download this repository or clone it to your local machine
   - Unzip the file if you downloaded a ZIP archive

2. **Open Chrome Extensions page**
   - Open Chrome and navigate to `chrome://extensions/`
   - Or click the three-dot menu in the top right → More tools → Extensions

3. **Enable Developer Mode**
   - Toggle on "Developer mode" in the top-right corner of the Extensions page

4. **Load the extension**
   - Click the "Load unpacked" button that appears after enabling Developer mode
   - Navigate to the folder containing the extension files and select it
   - The extension should now appear in your list of installed extensions

5. **Verify installation**
   - You should see the GitLab MR Chain Visualizer extension in your extensions list
   - The extension icon should appear in your browser toolbar

### Method 2: Chrome Web Store (Coming Soon)

Once published to the Chrome Web Store, installation will be simpler:

1. Navigate to the Chrome Web Store page for GitLab MR Chain Visualizer
2. Click "Add to Chrome"
3. Confirm by clicking "Add extension" in the dialog

## Usage Instructions

1. **Navigate to GitLab**
   - Go to any GitLab instance where you have access to repositories

2. **Open a Merge Request**
   - Navigate to any merge request page (URL pattern: `*/merge_requests/*`)

3. **View the Chain**
   - The extension will automatically detect the page and display the MR chain visualization
   - Look for the "Merge Request Chain" section in the sidebar or near the top of the page

4. **Interact with the Chain**
   - Click on any merge request in the chain to navigate to it
   - Use the collapse/expand button to hide or show the visualization as needed

## Troubleshooting

If the extension doesn't appear to be working:

1. **Refresh the page**
   - Sometimes a simple page refresh can resolve issues

2. **Check permissions**
   - Make sure the extension has permission to access GitLab sites

3. **Verify GitLab version**
   - This extension is designed for recent GitLab versions

4. **Extension conflicts**
   - Temporarily disable other GitLab-related extensions to check for conflicts

5. **Clear cache**
   - Try clearing your browser cache and cookies for GitLab sites

## Privacy Notice

This extension:
- Only accesses data on GitLab sites
- Makes API calls to GitLab using the site's own authentication
- Does not collect or transmit any personal data
- Does not modify any GitLab data