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

// Generate and render a Mermaid diagram for merge requests
async function renderMRChain(container, mergeRequests) {
  const mermaidDefinition = generateMermaidDefinition(mergeRequests);
  try {
    const { svg } = await window.mermaid.render('mrChainGraph', mermaidDefinition);
    container.innerHTML = svg;

    // Add click handlers to the generated SVG
    const svgElement = container.querySelector('svg');
    svgElement.querySelectorAll('a').forEach(link => {
      const href = link.getAttributeNS('http://www.w3.org/1999/xlink', 'href');
      if (href) {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          window.open(href, '_blank');
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
