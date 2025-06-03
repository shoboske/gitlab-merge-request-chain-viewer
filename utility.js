// GitLab MR Chain Visualizer - Utility Functions

// Format date for display
function formatDate(dateString) {
  if (!dateString) return 'Unknown';
  
  const date = new Date(dateString);
  
  // Check if the date is valid
  if (isNaN(date.getTime())) return 'Invalid date';
  
  // Format: "Jan 1, 2023"
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

// Truncate long strings with ellipsis
function truncate(str, maxLength) {
  if (!str) return '';
  return str.length > maxLength ? str.substring(0, maxLength) + '...' : str;
}

// Get human-readable time ago string
function timeAgo(dateString) {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);
  
  // Check if the date is valid
  if (isNaN(date.getTime())) return '';
  
  // Less than a minute
  if (seconds < 60) {
    return 'just now';
  }
  
  // Less than an hour
  if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  }
  
  // Less than a day
  if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  }
  
  // Less than a week
  if (seconds < 604800) {
    const days = Math.floor(seconds / 86400);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }
  
  // Less than a month
  if (seconds < 2592000) {
    const weeks = Math.floor(seconds / 604800);
    return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
  }
  
  // Less than a year
  if (seconds < 31536000) {
    const months = Math.floor(seconds / 2592000);
    return `${months} month${months > 1 ? 's' : ''} ago`;
  }
  
  // More than a year
  const years = Math.floor(seconds / 31536000);
  return `${years} year${years > 1 ? 's' : ''} ago`;
}

// Extract GitLab URL parts
function parseGitLabUrl(url) {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname.startsWith('/') ? urlObj.pathname.substring(1) : urlObj.pathname;
    const pathParts = pathname.split('/');
    
    // Find the merge_requests part
    const mrIndex = pathParts.indexOf('merge_requests');
    
    if (mrIndex === -1) {
      return null;
    }
    
    return {
      protocol: urlObj.protocol,
      host: urlObj.host,
      project: pathParts.slice(0, mrIndex).join('/'),
      mrId: mrIndex + 1 < pathParts.length ? pathParts[mrIndex + 1] : null,
      fullUrl: url
    };
  } catch (e) {
    console.error('Error parsing GitLab URL:', e);
    return null;
  }
}

// Escape HTML to prevent XSS
function escapeHtml(html) {
  const div = document.createElement('div');
  div.textContent = html;
  return div.innerHTML;
}

// Calculate merge request status CSS class
function getMrStatusClass(mr) {
  if (!mr || !mr.state) {
    return 'mr-status-unknown';
  }
  
  switch (mr.state.toLowerCase()) {
    case 'opened':
      return 'mr-status-opened';
    case 'merged':
      return 'mr-status-merged';
    case 'closed':
      return 'mr-status-closed';
    default:
      return 'mr-status-unknown';
  }
}

// Get appropriate status icon
function getStatusIcon(status) {
  switch (status.toLowerCase()) {
    case 'opened':
      return '●';  // Full circle
    case 'merged':
      return '✓';  // Checkmark
    case 'closed':
      return '×';  // Cross
    default:
      return '○';  // Empty circle
  }
}

// Export utilities
window.mrChainUtils = {
  formatDate,
  truncate,
  timeAgo,
  parseGitLabUrl,
  escapeHtml,
  getMrStatusClass,
  getStatusIcon
};