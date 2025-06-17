# GitLab MR Chain Visualizer

A Chrome extension that visualizes merge request chains on GitLab. This extension helps you understand the relationships between merge requests by showing which branches are pointing to each other.

## Features

- Displays a visual representation of merge request chains directly on GitLab MR pages
- Shows parent MRs (what the current MR is based on)
- Shows child MRs (MRs that are based on the current MR)
- Provides quick navigation between related merge requests
- Color-coded nodes to indicate MR status (open, merged, closed)
- Saves user preferences for including/excluding main branch
- Export chain visualization as SVG or PNG

## Installation

### Manual Installation

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top-right corner
4. Click "Load unpacked" and select the directory containing this extension
5. The extension should now be installed and active

## Usage

1. Navigate to any GitLab merge request page
2. Look for the "View Chain" button in the top navigation bar
3. Click the button to open the MR chain visualization modal
4. The visualization will show:
   - Parent MRs (what your current MR is based on)
   - The current MR
   - Child MRs (MRs that are based on your current MR)
5. Use the "Include main branch" checkbox to toggle visibility of main branch nodes
6. Click on any MR in the chain to navigate to that merge request
7. Use the "Export SVG" or "Copy PNG" buttons to save the visualization

### Features in Detail

#### Chain Visualization
- Each merge request is represented as a node in the chain
- Arrows show the direction of dependencies
- Color coding indicates MR status:
  - Blue: Open MRs
  - Green: Merged MRs
  - Red: Closed MRs

#### Navigation
- Click any MR node to navigate to that merge request
- The current MR is highlighted in the visualization

#### Export Options
- Export SVG: Downloads the chain visualization as an SVG file
- Copy PNG: Copies the visualization to clipboard as a PNG image

#### Preferences
- The "Include main branch" preference is saved and persists across sessions
- Your preference will sync across devices if you're signed into Chrome

## Development

### Project Structure

- `manifest.json`: Extension configuration
- `content.js`: Main script that runs on GitLab pages
- `mermaid-utils.js`: Utilities for generating and rendering the chain visualization
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