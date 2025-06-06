// GitLab MR Chain Visualizer
// Main content script that runs on GitLab merge request pages

// Configuration
const config = {
  apiRequestDelay: 200, // ms between API requests to avoid rate limiting
  animationDuration: 300, // ms for animations 
  maxChainDepth: 10, // Maximum depth to prevent infinite loops
};

// Extract project path from current URL
function getProjectInfo() {
  const url = window.location.href;
  const domain = window.location.origin;
  
  // Remove the domain from the URL
  const path = url.replace(domain, '');
  
  // Split the path and remove empty strings
  const parts = path.split('/').filter(Boolean);
  
  // Find the index of '-' or 'merge_requests'
  const separatorIndex = parts.findIndex(part => part === '-' || part === 'merge_requests');
  
  // Take all parts before the separator to get the project path
  const projectPath = parts.slice(0, separatorIndex).join('/');
  
  return {
    gitlabUrl: domain,
    projectPath: encodeURIComponent(projectPath)
  };
}

// State
let mrChainData = {
  current: null,
  parents: [],
  children: []
};

// Development mode check
const isDevelopment = window.location.hostname === 'expert-funicular-pw9475xq9g4c999r-5173.app.github.dev' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// Get project ID from storage based on project path
async function getProjectIdFromStorage(projectPath) {
  try {
    const mapping = JSON.parse(localStorage.getItem(config.storageKey) || '{}');
    return mapping[projectPath];
  } catch (error) {
    console.error('Error reading from storage:', error);
    return null;
  }
}

// Save project ID mapping to storage
async function saveProjectIdToStorage(projectPath, projectId) {
  try {
    const mapping = JSON.parse(localStorage.getItem(config.storageKey) || '{}');
    mapping[projectPath] = projectId;
    localStorage.setItem(config.storageKey, JSON.stringify(mapping));
  } catch (error) {
    console.error('Error saving to storage:', error);
  }
}

// Main initialization function
function init() {
  // In development mode, always initialize
  if (isDevelopment || window.location.pathname.includes('merge_requests')) {
    console.log('GitLab MR Chain Visualizer initializing...');
  
    // Add button to the tab filters
    addChainButton();
    
    // Add modal to the page
    createModal();
  }
}

// Add the chain button next to tab filters
function addChainButton() {
  const tabList = document.querySelector('.issues-state-filters');
  if (!tabList) return;

  const buttonContainer = document.createElement('li');
  buttonContainer.className = 'nav-item';
  buttonContainer.style.marginLeft = '8px';
  buttonContainer.style.display = 'flex';
  buttonContainer.style.alignItems = 'center';
  buttonContainer.style.gap = '8px';

  // Add project ID input
  const projectIdInput = document.createElement('input');
  projectIdInput.type = 'number';
  projectIdInput.className = 'form-control gl-form-input';
  projectIdInput.placeholder = 'Project ID';
  projectIdInput.style.width = '100px';
  projectIdInput.title = 'Enter your GitLab project ID';

  // Try to load saved project ID
  const pathParts = window.location.pathname.split('/');
  const mrIndex = pathParts.indexOf('merge_requests');
  if (mrIndex !== -1) {
    const projectPath = pathParts.slice(1, mrIndex).join('/');
    getProjectIdFromStorage(projectPath).then(savedId => {
      if (savedId) {
        projectIdInput.value = savedId;
      }
    });
  }

  const button = document.createElement('button');
  button.className = 'gl-button btn btn-default btn-md';
  button.innerHTML = `
    <span class="gl-button-text">
      View Chain
    </span>
  `;
  
  button.addEventListener('click', async () => {
    const modal = document.getElementById('mr-chain-modal');
    if (!modal) return;

    modal.style.display = 'block';
    
    const projectInfo = isDevelopment 
      ? { gitlabUrl: 'http://localhost:5173', projectPath: 'test-project' }
      : getProjectInfo();
    
    // Show loading state
    const modalContent = document.querySelector('.mr-chain-modal-content');
    if (modalContent) {
      modalContent.innerHTML = '<div class="mr-chain-loading">Loading chain data...</div>';
    }
    
    // Get chain data and build visualization
    try {
      const mergeRequests = await fetchMRChainData(projectInfo.gitlabUrl, projectInfo.projectPath);
      mrChainData = mergeRequests;
      displayMRChain(mergeRequests);
    } catch (err) {
      console.error('Error fetching MR chain data:', err);
      showError('Failed to load merge request chain data');
    }
  });

  buttonContainer.appendChild(button);
  tabList.appendChild(buttonContainer);
}

// Create the modal
function createModal() {
  // Initialize mermaid when creating the modal
  initializeMermaid();

  const modal = document.createElement('div');
  modal.id = 'mr-chain-modal';
  modal.className = 'mr-chain-modal';
  
  modal.innerHTML = `
    <div class="mr-chain-modal-content">
      <div class="mr-chain-modal-header">
        <div class="mr-chain-header-left">
          <h3>Merge Request Chain</h3>
          <label class="gl-form-checkbox custom-control custom-checkbox">
            <input type="checkbox" class="custom-control-input" id="include-main-branch" checked>
            <span class="custom-control-label">Include main branch</span>
          </label>
        </div>
        <div class="mr-chain-actions">
          <button class="gl-button btn btn-default btn-md mr-chain-export-svg">
            <span class="gl-button-text">Export SVG</span>
          </button>
          <button class="gl-button btn btn-default btn-md mr-chain-copy-png">
            <span class="gl-button-text">Copy PNG</span>
          </button>
          <button class="mr-chain-modal-close">&times;</button>
        </div>
      </div>
      <div id="mr-chain-content" class="mr-chain-modal-body">
        <div class="mr-chain-loading">Click "View Chain" to load data</div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Close button handler
  const closeBtn = modal.querySelector('.mr-chain-modal-close');
  closeBtn.addEventListener('click', () => {
    modal.style.display = 'none';
  });
  
  // Click outside to close
  window.addEventListener('click', (event) => {
    if (event.target === modal) {
      modal.style.display = 'none';
    }
  });
}

// Fetch project info to get default branch
async function fetchProjectInfo(gitlabUrl, projectId) {
  if (isDevelopment) {
    try {
      const { mockProjectInfo } = await import('./mockData.js');
      return mockProjectInfo;
    } catch (error) {
      console.warn('Failed to load mock data:', error);
    }
  }

  try {
    const apiUrl = `${gitlabUrl}/api/v4/projects/${projectId}`;
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching project info:', error);
    throw error;
  }
}

// Modified fetchMRChainData to use project path instead of ID
async function fetchMRChainData(gitlabUrl, projectPath) {
  try {
    let mergeRequests;
    if (isDevelopment) {
      const { mockMergeRequests } = await import('./mockData.js');
      mergeRequests = mockMergeRequests;
    } else {
      // Use project path in API URL
      const apiUrl = `${gitlabUrl}/api/v4/projects/${projectPath}/merge_requests?state=opened`;
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }
      
      mergeRequests = await response.json();
    }

    return mergeRequests;
  } catch (error) {
    console.error('Error fetching MR chain data:', error);
    throw error;
  }
}

// Display MR chain in modal
function displayMRChain(mergeRequests) {
  const modal = document.getElementById('mr-chain-modal');
  if (!modal) {
    console.error('Modal element not found');
    return;
  }
  
  const container = modal.querySelector('.mr-chain-modal-content');
  if (!container) {
    console.error('Modal content container not found');
    return;
  }
  
  // Clear previous content
  container.innerHTML = '';
  
  // Add header back
  container.innerHTML = `
    <div class="mr-chain-modal-header">
      <div class="mr-chain-header-left">
        <h3>Merge Request Chain</h3>
        <label class="gl-form-checkbox custom-control custom-checkbox">
          <input type="checkbox" class="custom-control-input" id="include-main-branch" checked>
          <span class="custom-control-label">Include main branch</span>
        </label>
      </div>
      <div class="mr-chain-actions">
        <button class="gl-button btn btn-default btn-md mr-chain-export-svg">
          <span class="gl-button-text">Export SVG</span>
        </button>
        <button class="gl-button btn btn-default btn-md mr-chain-copy-png">
          <span class="gl-button-text">Copy PNG</span>
        </button>
        <button class="mr-chain-modal-close">&times;</button>
      </div>
    </div>
    <div id="mr-chain-content" class="mr-chain-modal-body"></div>
  `;

  // Reattach the close button handler
  const closeBtn = container.querySelector('.mr-chain-modal-close');
  closeBtn.addEventListener('click', () => {
    modal.style.display = 'none';
  });

  // Re-attach the checkbox change handler
  const checkbox = container.querySelector('#include-main-branch');
  if (checkbox) {
    checkbox.addEventListener('change', () => {
      const containerEl = document.getElementById('mr-chain-content');
      if (containerEl && containerEl.querySelector('#mrChainDiagram')) {
        renderMRChain(containerEl.querySelector('#mrChainDiagram'), mergeRequests);
      }
    });
  }

  const contentContainer = container.querySelector('#mr-chain-content');
  
  if (!mergeRequests || mergeRequests.length === 0) {
    contentContainer.innerHTML = '<p>No merge requests found in the chain.</p>';
    return;
  }

  // Create a container for the Mermaid diagram
  const diagramContainer = document.createElement('div');
  diagramContainer.id = 'mrChainDiagram';
  contentContainer.appendChild(diagramContainer);

  // Render the chain diagram
  renderMRChain(diagramContainer, mergeRequests);
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

// Build MR chain using default branch as base
function buildMergeRequestChain(mergeRequests, defaultBranch) {
  const mrsByTargetBranch = {};
  const mrsBySrcBranch = {};
  const chain = [];

  // Index MRs by target and source branches
  mergeRequests.forEach(mr => {
    if (!mrsByTargetBranch[mr.target_branch]) {
      mrsByTargetBranch[mr.target_branch] = [];
    }
    mrsByTargetBranch[mr.target_branch].push(mr);

    mrsBySrcBranch[mr.source_branch] = mr;
  });

  // Start with MRs targeting default branch
  const rootMRs = mrsByTargetBranch[defaultBranch] || [];
  
  // Process each root MR
  rootMRs.forEach(rootMR => {
    const subChain = [rootMR];
    let currentMR = rootMR;

    // Find MRs that target the source branch of current MR
    while (mrsByTargetBranch[currentMR.source_branch]?.length > 0) {
      const nextMRs = mrsByTargetBranch[currentMR.source_branch];
      // Add the first MR in the chain
      currentMR = nextMRs[0];
      subChain.push(currentMR);
    }
    
    chain.push(subChain);
  });

  return chain;
}

// Add styles to the page
const styles = `
  .mr-chain-modal {
    display: none;
    position: fixed;
    z-index: 1000;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0,0,0,0.4);
  }

  .mr-chain-modal-content {
    background-color: #fefefe;
    margin: 5% auto;
    padding: 20px;
    border: 1px solid #888;
    width: 80%;
    max-width: 1200px;
    border-radius: 8px;
    max-height: 90vh;
    overflow-y: auto;
  }

  .mr-chain-modal-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 20px;
  }

  .mr-chain-header-left {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .mr-chain-header-left h3 {
    margin: 0;
  }

  .mr-chain-actions {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .gl-form-checkbox {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    color: var(--gray-700);
    margin: 0;
  }

  .gl-form-checkbox input {
    margin: 0;
  }

  .mr-chain-export-svg,
  .mr-chain-copy-png {
    padding: 4px 8px;
    font-size: 14px;
  }

  .mr-chain-modal-close {
    color: #aaa;
    font-size: 28px;
    font-weight: bold;
    cursor: pointer;
    border: none;
    background: none;
  }

  .mr-chain-modal-close:hover {
    color: #000;
  }

  .mr-chain-loading {
    text-align: center;
    padding: 20px;
    font-size: 16px;
    color: #666;
  }

  .mr-chain-error {
    text-align: center;
    padding: 20px;
    color: #cc0000;
    font-size: 16px;
  }

  .mr-chain-message {
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: #2da44e;
    color: white;
    padding: 8px 16px;
    border-radius: 4px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    z-index: 1001;
    animation: fadeInOut 2s ease;
  }

  @keyframes fadeInOut {
    0% { opacity: 0; transform: translate(-50%, 20px); }
    15% { opacity: 1; transform: translate(-50%, 0); }
    85% { opacity: 1; transform: translate(-50%, 0); }
    100% { opacity: 0; transform: translate(-50%, -20px); }
  }

  .mr-chain-container {
    padding: 20px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif;
  }

  .mermaid {
    text-align: center;
    background: white;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }
  
  .mr-item {
    background: #fff;
    border: 1px solid #e1e4e8;
    border-radius: 6px;
    padding: 10px 15px;
    margin: 5px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  }
  
  .mr-item a {
    color: #0366d6;
    text-decoration: none;
  }
  
  .mr-item a:hover {
    text-decoration: underline;
  }
  
  .mr-arrow {
    margin: 0 10px;
    color: #586069;
    font-size: 20px;
  }
  
  .chain-separator {
    border-top: 1px solid #e1e4e8;
    margin: 15px 0;
  }

  .mermaid .node {
    cursor: context-menu;
    transition: opacity 0.3s ease;
  }

  .mermaid .edge {
    transition: opacity 0.3s ease;
  }
`;

const styleSheet = document.createElement('style');
styleSheet.textContent = styles;
document.head.appendChild(styleSheet);

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