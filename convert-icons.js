const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = [16, 48, 128];
const inputFile = path.join(__dirname, 'assets', 'logo.svg');
const outputDir = path.join(__dirname, 'assets');

async function convertIcons() {
  try {
    // Read the SVG file
    const svgBuffer = fs.readFileSync(inputFile);
    
    // Convert to each size
    for (const size of sizes) {
      const outputFile = path.join(outputDir, `icon${size}.png`);
      
      await sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toFile(outputFile);
      
      console.log(`Created ${outputFile}`);
    }
    
    console.log('All icons generated successfully!');
  } catch (error) {
    console.error('Error generating icons:', error);
  }
}

convertIcons(); 