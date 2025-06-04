// Initialize mermaid with our configuration
function initializeMermaid() {
  window.mermaid.initialize({ 
    startOnLoad: false,
    securityLevel: 'loose',
    flowchart: {
      htmlLabels: true,
      curve: 'basis'
    }
  });
}

// Track hidden nodes
const hiddenNodes = new Set();

// Clean SVG for export
function cleanSvgForExport(svgElement) {
  const svgClone = svgElement.cloneNode(true);
  
  // Remove hidden nodes from the clone
  hiddenNodes.forEach(nodeId => {
    const node = svgClone.querySelector(`#${nodeId}`);
    if (node) {
      node.remove();
      // Remove connected edges
      const edgesTo = svgClone.querySelectorAll(`.edge path[id$="-${nodeId}"]`);
      const edgesFrom = svgClone.querySelectorAll(`.edge path[id^="${nodeId}-"]`);
      [...edgesTo, ...edgesFrom].forEach(edge => {
        if (edge.closest('.edge')) {
          edge.closest('.edge').remove();
        }
      });
    }
  });

  // Add solid white background
  const background = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  background.setAttribute('width', '100%');
  background.setAttribute('height', '100%');
  background.setAttribute('fill', 'white');
  svgClone.insertBefore(background, svgClone.firstChild);

  // Inline all styles
  const styles = document.querySelector('style');
  if (styles) {
    const styleElement = document.createElement('style');
    styleElement.textContent = styles.textContent;
    svgClone.insertBefore(styleElement, svgClone.firstChild);
  }

  // Set explicit dimensions using viewBox if available
  let width, height;
  if (svgElement.hasAttribute('viewBox')) {
    const vb = svgElement.getAttribute('viewBox').split(' ');
    width = parseFloat(vb[2]);
    height = parseFloat(vb[3]);
  } else if (svgElement.hasAttribute('width') && svgElement.hasAttribute('height')) {
    width = parseFloat(svgElement.getAttribute('width'));
    height = parseFloat(svgElement.getAttribute('height'));
  } else {
    const bbox = svgElement.getBoundingClientRect();
    width = bbox.width;
    height = bbox.height;
  }
  svgClone.setAttribute('width', width);
  svgClone.setAttribute('height', height);
  svgClone.setAttribute('viewBox', `0 0 ${width} ${height}`);

  return {svgClone, width, height};
}

// Export SVG
function downloadSvg(svgElement) {
  const {svgClone} = cleanSvgForExport(svgElement);
  const serializer = new XMLSerializer();
  const source = serializer.serializeToString(cleanedSvg);
  const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = 'merge-request-chain.svg';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Copy as PNG
async function copyAsPng(svgElement) {
  try {
    const {svgClone, width, height} = cleanSvgForExport(svgElement);
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svgClone);
    const svgBase64 = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(source)));
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    const scale = 2;
    canvas.width = width * scale;
    canvas.height = height * scale;
    await new Promise((resolve, reject) => {
      img.onload = () => {
        ctx.setTransform(scale, 0, 0, scale, 0, 0);
        ctx.drawImage(img, 0, 0, width, height);
        resolve();
      };
      img.onerror = reject;
      img.src = svgBase64;
    });

    // Convert to blob and copy to clipboard
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png', 1.0));
    if (!blob) {
      throw new Error('Failed to create blob');
    }
    
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
      showSuccessMessage('PNG copied to clipboard!');
    } catch (error) {
      showSuccessMessage('Error: Could not copy to clipboard');
      console.error('Clipboard error:', error);
    }
  } catch (error) {
    showSuccessMessage('Error: Could not create PNG');
    console.error('PNG creation error:', error);
  }
}

// Show success/error message
function showSuccessMessage(text) {
  const existingMessage = document.querySelector('.mr-chain-message');
  if (existingMessage) {
    existingMessage.remove();
  }

  const modal = document.querySelector('.mr-chain-modal');
  const message = document.createElement('div');
  message.className = 'mr-chain-message';
  message.textContent = text;
  modal.appendChild(message);
  setTimeout(() => message.remove(), 2000);
}

// Generate and render a Mermaid diagram for merge requests
async function renderMRChain(container, mergeRequests) {
  const mermaidDefinition = generateMermaidDefinition(mergeRequests);
  try {
    const { svg } = await window.mermaid.render('mrChainGraph', mermaidDefinition);
    container.innerHTML = svg;

    const svgElement = container.querySelector('svg');
    
    // Remove existing event listeners by replacing the buttons
    const exportSvgBtn = document.querySelector('.mr-chain-export-svg');
    const copyPngBtn = document.querySelector('.mr-chain-copy-png');
    
    if (exportSvgBtn) {
      const newExportBtn = exportSvgBtn.cloneNode(true);
      exportSvgBtn.parentNode.replaceChild(newExportBtn, exportSvgBtn);
      newExportBtn.addEventListener('click', () => downloadSvg(svgElement));
    }
    
    if (copyPngBtn) {
      const newCopyBtn = copyPngBtn.cloneNode(true);
      copyPngBtn.parentNode.replaceChild(newCopyBtn, copyPngBtn);
      newCopyBtn.addEventListener('click', () => copyAsPng(svgElement));
    }

    // Add right-click handler to nodes
    svgElement.querySelectorAll('.node').forEach(node => {
      node.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        const nodeId = node.id;
        if (hiddenNodes.has(nodeId)) {
          hiddenNodes.delete(nodeId);
        } else {
          hiddenNodes.add(nodeId);
        }
        // Re-render the diagram with updated visibility
        renderMRChain(container, mergeRequests);
      });
    });

    // Add regular click handlers for links
    svgElement.querySelectorAll('a').forEach(link => {
      const href = link.getAttributeNS('http://www.w3.org/1999/xlink', 'href');
      if (href) {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          window.open(href, '_blank');
        });
      }
    });

    // Apply visibility to nodes
    hiddenNodes.forEach(nodeId => {
      const node = svgElement.querySelector(`#${nodeId}`);
      if (node) {
        node.style.opacity = '0.2';
        // Also hide connected edges
        const edgesTo = svgElement.querySelectorAll(`.edge path[id$="-${nodeId}"]`);
        const edgesFrom = svgElement.querySelectorAll(`.edge path[id^="${nodeId}-"]`);
        [...edgesTo, ...edgesFrom].forEach(edge => {
          if (edge.closest('.edge')) {
            edge.closest('.edge').style.opacity = '0.2';
          }
        });
      }
    });

  } catch (error) {
    console.error('Error rendering Mermaid diagram:', error);
    container.innerHTML = '<p>Error rendering merge request chain diagram</p>';
  }
}

// Generate Mermaid diagram definition
function generateMermaidDefinition(mergeRequests) {
  let definition = 'graph LR\n';
  
  // Add nodes with clickable titles
  mergeRequests.forEach(mr => {
    const nodeId = `MR${mr.iid}`;
    // Escape special characters in title
    const title = mr.title.replace(/"/g, '&quot;');
    definition += `  ${nodeId}["#${mr.iid} - ${title}"]\n`;
    definition += `  click ${nodeId} "${mr.web_url}" _blank\n`;
  });
  
  // Add connections
  mergeRequests.forEach(mr => {
    const targetMRs = mergeRequests.filter(tmr => tmr.source_branch === mr.target_branch);
    targetMRs.forEach(targetMR => {
      definition += `  MR${mr.iid} --> MR${targetMR.iid}\n`;
    });
  });

  return definition;
}
