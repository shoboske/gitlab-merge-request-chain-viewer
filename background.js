// GitLab MR Chain Visualizer - Background Script

// This background script handles extension initialization
chrome.runtime.onInstalled.addListener(() => {
  console.log('GitLab MR Chain Visualizer installed');
});

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if (request.action === "getAccessToken") {
      // In a production extension, you might store and retrieve GitLab API tokens here
      // For this prototype, we're not implementing authentication
      sendResponse({success: true, message: "No authentication implemented in prototype"});
    }
    return true; // Required to use sendResponse asynchronously
  }
);