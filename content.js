// GitLab MR Chain Visualizer
// Main content script that runs on GitLab merge request pages

// Configuration
const config = {
  apiRequestDelay: 200, // ms between API requests to avoid rate limiting
  animationDuration: 300, // ms for animations
  maxChainDepth: 10, // Maximum depth to prevent infinite loops
};

// State
let mrChainData = {
  current: null,
  parents: [],
  children: []
};

// Main initialization function
function init() {
  // Only run on merge request pages
  if (!window.location.pathname.includes('/merge_requests/')) {
    return;
  }

  console.log('GitLab MR Chain Visualizer initializing...');
  
  // Add our UI container to the page
  createUI();
  
  // Get the current project and MR information
  const projectInfo = extractProjectInfo();
  if (!projectInfo) {
    console.error('Could not extract project information');
    return;
  }
  
  // Get chain data and build visualization
  fetchMRChainData(projectInfo)
    .then(chainData => {
      mrChainData = chainData;
      renderChainVisualization(chainData);
    })
    .catch(err => {
      console.error('Error fetching MR chain data:', err);
      showError('Failed to load merge request chain data');
    });
}

// Extract project information from the current page URL
function extractProjectInfo() {
  try {
    const pathParts = window.location.pathname.split('/');
    const mrIndex = pathParts.indexOf('merge_requests');
    
    if (mrIndex === -1 || mrIndex + 1 >= pathParts.length) {
      return null;
    }
    
    const mrId = pathParts[mrIndex + 1];
    const projectPath = pathParts.slice(1, mrIndex).join('/');
    
    return {
      projectPath,
      mrId,
      gitlabUrl: window.location.origin
    };
  } catch (error) {
    console.error('Error extracting project info:', error);
    return null;
  }
}

// Create UI elements
function createUI() {
  const sidebarContainer = document.querySelector('.js-right-sidebar');
  if (!sidebarContainer) {
    // Try alternative container if the sidebar doesn't exist
    const alternativeContainer = document.querySelector('.detail-page-header');
    if (alternativeContainer) {
      injectVisualizerContainer(alternativeContainer, 'after');
    }
    return;
  }
  
  injectVisualizerContainer(sidebarContainer, 'before');
}

// Create and inject the container for our visualizer
function injectVisualizerContainer(targetElement, position) {
  const container = document.createElement('div');
  container.id = 'mr-chain-visualizer';
  container.className = 'mr-chain-visualizer';
  
  const header = document.createElement('div');
  header.className = 'mr-chain-header';
  header.innerHTML = `
    <h3>Merge Request Chain</h3>
    <button id="mr-chain-toggle" class="mr-chain-toggle">
      <span class="mr-chain-icon">▼</span>
    </button>
  `;
  
  const content = document.createElement('div');
  content.id = 'mr-chain-content';
  content.className = 'mr-chain-content';
  content.innerHTML = '<div class="mr-chain-loading">Loading chain data...</div>';
  
  container.appendChild(header);
  container.appendChild(content);
  
  if (position === 'before') {
    targetElement.parentNode.insertBefore(container, targetElement);
  } else if (position === 'after') {
    targetElement.parentNode.insertBefore(container, targetElement.nextSibling);
  }
  
  // Add event listener for toggle button
  document.getElementById('mr-chain-toggle').addEventListener('click', toggleChainVisibility);
}

// Toggle the visibility of the chain visualization
function toggleChainVisibility() {
  const content = document.getElementById('mr-chain-content');
  const icon = document.querySelector('.mr-chain-icon');
  
  if (content.classList.contains('collapsed')) {
    content.classList.remove('collapsed');
    icon.textContent = '▼';
  } else {
    content.classList.add('collapsed');
    icon.textContent = '▶';
  }
}

// Fetch all data needed to build the MR chain
async function fetchMRChainData(projectInfo) {
  // Start with the current MR
  const currentMR = await fetchMergeRequestData(
    projectInfo.gitlabUrl,
    projectInfo.projectPath,
    projectInfo.mrId
  );
  
  if (!currentMR) {
    throw new Error('Could not fetch current merge request data');
  }
  
  const chainData = {
    current: currentMR,
    parents: [],
    children: []
  };
  
  // Find parent MRs (what the current MR is based on)
  await findParentMRs(projectInfo, currentMR, chainData, 0);
  
  // Find child MRs (MRs based on the current MR)
  await findChildMRs(projectInfo, currentMR, chainData, 0);
  
  return chainData;
}

// Find MRs that the current MR is based on
async function findParentMRs(projectInfo, mr, chainData, depth) {
  if (depth >= config.maxChainDepth) {
    return; // Prevent infinite recursion
  }
  
  // Extract the target branch from the current MR
  const sourceBranch = mr.source_branch;
  
  try {
    // Look for MRs where the target branch matches this MR's source branch
    const parentMRs = await fetchMergeRequestsByTargetBranch(
      projectInfo.gitlabUrl,
      projectInfo.projectPath,
      sourceBranch
    );
    
    for (const parentMR of parentMRs) {
      // Add to the chain data
      chainData.parents.push(parentMR);
      
      // Recursively find parents of this parent
      await new Promise(resolve => setTimeout(resolve, config.apiRequestDelay));
      await findParentMRs(projectInfo, parentMR, chainData, depth + 1);
    }
  } catch (error) {
    console.error('Error finding parent MRs:', error);
  }
}

// Find MRs that are based on the current MR
async function findChildMRs(projectInfo, mr, chainData, depth) {
  if (depth >= config.maxChainDepth) {
    return; // Prevent infinite recursion
  }
  
  // Extract the target branch from the current MR
  const targetBranch = mr.target_branch;
  
  try {
    // Look for MRs where the source branch is based on this MR's target branch
    const childMRs = await fetchMergeRequestsBySourceBranch(
      projectInfo.gitlabUrl, 
      projectInfo.projectPath,
      targetBranch
    );
    
    for (const childMR of childMRs) {
      // Add to the chain data
      chainData.children.push(childMR);
      
      // Recursively find children of this child
      await new Promise(resolve => setTimeout(resolve, config.apiRequestDelay));
      await findChildMRs(projectInfo, childMR, chainData, depth + 1);
    }
  } catch (error) {
    console.error('Error finding child MRs:', error);
  }
}

// Fetch data for a specific merge request
async function fetchMergeRequestData(gitlabUrl, projectPath, mrId) {
  try {
    // Use GitLab's API to get MR data
    const apiUrl = `${gitlabUrl}/api/v4/projects/${encodeURIComponent(projectPath)}/merge_requests/${mrId}`;
    
    // For this prototype, we'll use the fetch API directly
    // In a real extension, you might need to handle authentication
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching MR data:', error);
    return null;
  }
}

// Fetch merge requests by target branch
async function fetchMergeRequestsByTargetBranch(gitlabUrl, projectPath, targetBranch) {
  try {
    const apiUrl = `${gitlabUrl}/api/v4/projects/${encodeURIComponent(projectPath)}/merge_requests?target_branch=${encodeURIComponent(targetBranch)}&state=opened`;
    
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching MRs by target branch:', error);
    return [];
  }
}

// Fetch merge requests by source branch
async function fetchMergeRequestsBySourceBranch(gitlabUrl, projectPath, sourceBranch) {
  try {
    const apiUrl = `${gitlabUrl}/api/v4/projects/${encodeURIComponent(projectPath)}/merge_requests?source_branch=${encodeURIComponent(sourceBranch)}&state=opened`;
    
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching MRs by source branch:', error);
    return [];
  }
}

// Render the chain visualization
function renderChainVisualization(chainData) {
  const contentElement = document.getElementById('mr-chain-content');
  if (!contentElement) return;
  
  // Clear loading message
  contentElement.innerHTML = '';
  
  // Create chain container
  const chainContainer = document.createElement('div');
  chainContainer.className = 'mr-chain-container';
  
  // Render parents (in reverse order to show the oldest first)
  const parentsContainer = document.createElement('div');
  parentsContainer.className = 'mr-chain-parents';
  
  if (chainData.parents.length > 0) {
    const parentsList = document.createElement('ul');
    parentsList.className = 'mr-chain-list';
    
    chainData.parents.slice().reverse().forEach(parent => {
      parentsList.appendChild(createMRListItem(parent, 'parent'));
    });
    
    parentsContainer.appendChild(parentsList);
  } else {
    parentsContainer.innerHTML = '<p class="mr-chain-empty">No parent merge requests found</p>';
  }
  
  // Render current MR
  const currentContainer = document.createElement('div');
  currentContainer.className = 'mr-chain-current';
  
  if (chainData.current) {
    const currentMRElement = createMRListItem(chainData.current, 'current');
    currentMRElement.classList.add('current');
    
    const currentList = document.createElement('ul');
    currentList.className = 'mr-chain-list';
    currentList.appendChild(currentMRElement);
    
    currentContainer.appendChild(currentList);
  }
  
  // Render children
  const childrenContainer = document.createElement('div');
  childrenContainer.className = 'mr-chain-children';
  
  if (chainData.children.length > 0) {
    const childrenList = document.createElement('ul');
    childrenList.className = 'mr-chain-list';
    
    chainData.children.forEach(child => {
      childrenList.appendChild(createMRListItem(child, 'child'));
    });
    
    childrenContainer.appendChild(childrenList);
  } else {
    childrenContainer.innerHTML = '<p class="mr-chain-empty">No child merge requests found</p>';
  }
  
  // Add all sections to the container
  chainContainer.appendChild(parentsContainer);
  chainContainer.appendChild(currentContainer);
  chainContainer.appendChild(childrenContainer);
  
  // Add the chain visualization to the page
  contentElement.appendChild(chainContainer);
}

// Create a list item for a merge request
function createMRListItem(mr, type) {
  const li = document.createElement('li');
  li.className = `mr-chain-item mr-${type}`;
  li.dataset.mrId = mr.id;
  li.dataset.mrIid = mr.iid;
  
  // Status class for coloring
  const status = mr.state || 'opened';
  li.classList.add(`mr-status-${status}`);
  
  // Create content
  li.innerHTML = `
    <div class="mr-chain-item-content">
      <div class="mr-chain-connector"></div>
      <div class="mr-chain-info">
        <div class="mr-chain-title">
          <a href="${mr.web_url}" target="_blank" title="${mr.title}">
            !${mr.iid} - ${mr.title}
          </a>
        </div>
        <div class="mr-chain-details">
          <span class="mr-chain-branch" title="Branch: ${mr.source_branch}">
            ${mr.source_branch}
          </span>
          <span class="mr-chain-arrow">→</span>
          <span class="mr-chain-branch" title="Target: ${mr.target_branch}">
            ${mr.target_branch}
          </span>
        </div>
      </div>
    </div>
  `;
  
  // Add click handler to navigate to the MR
  li.addEventListener('click', (e) => {
    if (!e.target.closest('a')) {
      window.location.href = mr.web_url;
    }
  });
  
  return li;
}

// Show error message
function showError(message) {
  const contentElement = document.getElementById('mr-chain-content');
  if (contentElement) {
    contentElement.innerHTML = `<div class="mr-chain-error">${message}</div>`;
  }
}

// Wait for the page to be fully loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Listen for page navigation events (for single page applications)
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    init();
  }
}).observe(document, { subtree: true, childList: true });