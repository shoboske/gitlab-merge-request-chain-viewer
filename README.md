# GitLab MR Chain Visualizer

A Chrome extension that visualizes merge request chains on GitLab. This extension helps you understand the relationships between merge requests by showing which branches are pointing to each other.

## Features

- Displays a visual representation of merge request chains directly on GitLab MR pages
- Shows parent MRs (what the current MR is based on)
- Shows child MRs (MRs that are based on the current MR)
- Provides quick navigation between related merge requests
- Color-coded nodes to indicate MR status (open, merged, closed)

## Installation

### From Chrome Web Store

*Coming soon*

### Manual Installation

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top-right corner
4. Click "Load unpacked" and select the directory containing this extension
5. The extension should now be installed and active

## Usage

1. Navigate to any GitLab merge request page
2. The extension will automatically detect and display the merge request chain
3. The chain visualization will appear in the sidebar
4. Click on any MR in the chain to navigate to that merge request

## Development

### Project Structure

- `manifest.json`: Extension configuration
- `content.js`: Main script that runs on GitLab pages
- `styles.css`: Styling for the visualization
- `assets/`: Directory containing icons

### Building from Source

1. Make sure you have Node.js installed
2. Clone this repository
3. Install dependencies: `npm install`
4. Build the extension: `npm run build`
5. Load the `dist/` directory as an unpacked extension in Chrome

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.