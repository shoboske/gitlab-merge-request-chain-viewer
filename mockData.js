// Mock data for development testing
export const mockProjectInfo = {
  id: 123,
  name: 'Test Project',
  default_branch: 'main'
};

export const mockMergeRequests = [
  {
    id: 1,
    iid: 101,
    title: 'Feature A: Initial implementation',
    source_branch: 'feature-a',
    target_branch: 'main',
    web_url: '#mr-101',
    state: 'opened'
  },
  {
    id: 2,
    iid: 102,
    title: 'Feature A: Add tests',
    source_branch: 'feature-a-tests',
    target_branch: 'feature-a',
    web_url: '#mr-102',
    state: 'opened'
  },
  {
    id: 3,
    iid: 103,
    title: 'Feature B: New component',
    source_branch: 'feature-b',
    target_branch: 'feature-a',
    web_url: '#mr-103',
    state: 'opened'
  },
  {
    id: 4,
    iid: 104,
    title: 'Feature B: Styling updates',
    source_branch: 'feature-b-style',
    target_branch: 'feature-b',
    web_url: '#mr-104',
    state: 'opened'
  }
];
