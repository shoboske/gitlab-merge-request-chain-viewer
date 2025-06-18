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

// Add the chain button to navigation
function addChainButton() {
  const navControls = document.querySelector('.nav-controls');
  if (!navControls) return;

  const buttonContainer = document.createElement('div');
  buttonContainer.className = 'gl-display-flex gl-align-items-center gl-gap-3 gl-mr-3';

  const button = document.createElement('button');
  button.className = 'gl-button btn btn-md btn-default gl-display-flex';
  button.innerHTML = `
    <span class="gl-button-text">
      View chain
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
  
  // Insert at the beginning of nav-controls
  navControls.insertBefore(buttonContainer, navControls.firstChild);
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
            <input type="checkbox" class="custom-control-input" id="include-main-branch">
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
  
  // Load saved preference for include-main-branch
  chrome.storage.sync.get(['includeMainBranch'], (result) => {
    const checkbox = modal.querySelector('#include-main-branch');
    if (checkbox) {
      checkbox.checked = result.includeMainBranch !== false; // Default to true if not set
    }
  });
  
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
    z-index: var(--z-index-modal, 1000);
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    background-color: var(--modal-backdrop-color, rgba(31, 31, 31, 0.5));
  }

  .mr-chain-modal-content {
    background-color: var(--modal-body-bg, var(--white));
    color: var(--gl-text-color, var(--gray-900));
    margin: var(--gl-spacing-7, 20px) auto;
    padding: var(--gl-spacing-6, 16px);
    border: 1px solid var(--gl-border-color-default, #dbdbdb);
    width: 80%;
    max-width: 1200px;
    border-radius: var(--gl-border-radius-large, 8px);
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: var(--gl-shadow-modal, 0 4px 16px rgba(31, 31, 31, 0.25));
  }

  .mr-chain-modal-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: var(--gl-spacing-6, 16px);
    padding-bottom: var(--gl-spacing-6, 16px);
    border-bottom: 1px solid var(--gl-border-color-default, #dbdbdb);
  }

  .mr-chain-header-left {
    display: flex;
    flex-direction: column;
    gap: var(--gl-spacing-3, 8px);
  }

  .mr-chain-header-left h3 {
    margin: 0;
    font-size: var(--gl-font-size-lg, 16px);
    font-weight: var(--gl-font-weight-bold, 600);
    color: var(--gl-text-color, var(--gray-900));
  }

  .mr-chain-actions {
    display: flex;
    gap: var(--gl-spacing-3, 8px);
    align-items: center;
  }

  .gl-form-checkbox {
    display: flex;
    align-items: center;
    gap: var(--gl-spacing-3, 8px);
    font-size: var(--gl-font-size-sm, 12px);
    color: var(--gl-text-color, var(--gray-900));
    margin: 0;
  }

  .gl-form-checkbox input {
    margin: 0;
  }

  .mr-chain-export-svg,
  .mr-chain-copy-png {
    padding: var(--gl-spacing-2, 4px) var(--gl-spacing-3, 8px);
    font-size: var(--gl-font-size-sm, 12px);
    background-color: var(--gl-button-default-background, var(--white));
    border: 1px solid var(--gl-button-default-border, var(--gray-200));
    color: var(--gl-button-default-color, var(--gray-900));
    border-radius: var(--gl-border-radius-small, 4px);
    transition: all var(--gl-transition-duration-fast, 0.1s) ease;
  }

  .mr-chain-export-svg:hover,
  .mr-chain-copy-png:hover {
    background-color: var(--gl-button-default-hover-background, var(--gray-50));
    border-color: var(--gl-button-default-hover-border, var(--gray-300));
  }

  .mr-chain-modal-close {
    color: var(--gl-text-color-tertiary, var(--gray-400));
    font-size: var(--gl-font-size-lg, 16px);
    font-weight: var(--gl-font-weight-normal, 400);
    cursor: pointer;
    border: none;
    background: none;
    padding: var(--gl-spacing-2, 4px);
    transition: color var(--gl-transition-duration-fast, 0.1s) ease;
  }

  .mr-chain-modal-close:hover {
    color: var(--gl-text-color, var(--gray-900));
  }

  .mr-chain-loading {
    text-align: center;
    padding: var(--gl-spacing-6, 16px);
    font-size: var(--gl-font-size-sm, 12px);
    color: var(--gl-text-color-secondary, var(--gray-500));
  }

  .mr-chain-error {
    text-align: center;
    padding: var(--gl-spacing-6, 16px);
    color: var(--gl-text-red, var(--red-500));
    font-size: var(--gl-font-size-sm, 12px);
  }

  .mr-chain-message {
    position: fixed;
    bottom: var(--gl-spacing-6, 16px);
    left: 50%;
    transform: translateX(-50%);
    background: var(--gl-status-success, var(--green-500));
    color: var(--white);
    padding: var(--gl-spacing-3, 8px) var(--gl-spacing-6, 16px);
    border-radius: var(--gl-border-radius-small, 4px);
    box-shadow: var(--gl-shadow-small, 0 2px 4px rgba(31, 31, 31, 0.15));
    z-index: var(--z-index-modal-plus-one, 1001);
    animation: fadeInOut var(--gl-transition-duration-slow, 2s) ease;
  }

  @keyframes fadeInOut {
    0% { opacity: 0; transform: translate(-50%, 20px); }
    15% { opacity: 1; transform: translate(-50%, 0); }
    85% { opacity: 1; transform: translate(-50%, 0); }
    100% { opacity: 0; transform: translate(-50%, -20px); }
  }

  .mr-chain-container {
    padding: var(--gl-spacing-6, 16px);
    font-family: var(--gl-font-family-base);
    color: var(--gl-text-color, var(--gray-900));
  }

  .mermaid {
    text-align: center;
    background-color: var(--gl-bg-white, var(--white));
    padding: var(--gl-spacing-6, 16px);
    border-radius: var(--gl-border-radius-default, 4px);
    border: 1px solid var(--gl-border-color-default, #dbdbdb);
    box-shadow: var(--gl-shadow-small, 0 2px 4px rgba(31, 31, 31, 0.15));
  }
  
  .mr-item {
    background-color: var(--gl-bg-white, var(--white));
    border: 1px solid var(--gl-border-color-default, #dbdbdb);
    border-radius: var(--gl-border-radius-default, 4px);
    padding: var(--gl-spacing-4, 10px) var(--gl-spacing-5, 15px);
    margin: var(--gl-spacing-2, 5px);
    box-shadow: var(--gl-shadow-small, 0 1px 3px rgba(31, 31, 31, 0.1));
    transition: background-color var(--gl-transition-duration-fast, 0.1s) ease;
  }
  
  .mr-item a {
    color: var(--gl-link-color, #1f75cb);
    text-decoration: none;
    transition: color var(--gl-transition-duration-fast, 0.1s) ease;
  }
  
  .mr-item a:hover {
    color: var(--gl-link-hover-color, #1068bf);
    text-decoration: underline;
  }
  
  .mr-arrow {
    margin: 0 var(--gl-spacing-4, 10px);
    color: var(--gl-text-color-tertiary, var(--gray-400));
    font-size: var(--gl-font-size-base, 14px);
  }
  
  .chain-separator {
    border-top: 1px solid var(--gl-border-color-default, #dbdbdb);
    margin: var(--gl-spacing-5, 15px) 0;
  }

  .mermaid .node {
    cursor: context-menu;
    transition: all var(--gl-transition-duration-fast, 0.1s) ease;
    fill: var(--gl-bg-white, var(--white));
    stroke: var(--gl-border-color-default, #dbdbdb);
  }

  .mermaid .edge {
    transition: all var(--gl-transition-duration-fast, 0.1s) ease;
    stroke: var(--gl-border-color-default, #dbdbdb);
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