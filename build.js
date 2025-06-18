const fs = require('fs');
const path = require('path');

const { cp, rm, mkdir } = fs.promises;

async function build() {
    const distDir = path.join(__dirname, 'dist');
    const sourceDir = __dirname; // All source files are at the root

    const filesToCopy = [
        'manifest.json',
        'background.js',
        'content.js',
        'mermaid-utils.js',
        'mermaid.min.js',
        'mockData.js',
        'styles.css'
    ];

    try {
        console.log('Cleaning dist directory...');
        await rm(distDir, { recursive: true, force: true });

        console.log('Creating dist directory...');
        await mkdir(distDir, { recursive: true });

        console.log('Copying root files...');
        for (const file of filesToCopy) {
            const sourcePath = path.join(sourceDir, file);
            const destPath = path.join(distDir, file);
            // Check if source file exists before copying
            if (fs.existsSync(sourcePath)) {
                await cp(sourcePath, destPath);
            } else {
                console.warn(`Warning: Source file not found, skipping: ${sourcePath}`);
            }
        }

        console.log('Copying assets directory...');
        const assetsSource = path.join(sourceDir, 'assets');
        const assetsDest = path.join(distDir, 'assets');
        if (fs.existsSync(assetsSource)) {
            await cp(assetsSource, assetsDest, { recursive: true });
        } else {
            console.warn(`Warning: Assets directory not found, skipping.`);
        }

        console.log('Build completed successfully!');

    } catch (err) {
        console.error('Build failed:', err);
        process.exit(1);
    }
}

build(); 