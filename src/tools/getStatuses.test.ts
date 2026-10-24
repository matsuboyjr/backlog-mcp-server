import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { getProjectStatuses } from 'backlog-js';
import type { Client, Entity } from 'backlog-js';
import { createDescriptionHelper } from '../createDescriptionHelper.js';
import { getStatusesTool } from './getStatuses.js';
import { allTools } from './tools.js';

vi.mock('backlog-js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('backlog-js')>()),
  getProjectStatuses: vi.fn(),
}));

describe('getStatusesTool', () => {
  const statuses: Entity.Project.ProjectStatus[] = [
    {
      id: 1,
      projectId: 100,
      name: 'Open',
      color: '#ea2c00',
      displayOrder: 1000,
    },
    {
      id: 2,
      projectId: 100,
      name: 'In Progress',
      color: '#3b9dbd',
      displayOrder: 2000,
    },
  ];
  const backlog = {} as Client;
  const helper = createDescriptionHelper();
  const tool = getStatusesTool(backlog, helper);

  beforeEach(() => {
    vi.mocked(getProjectStatuses).mockReset().mockResolvedValue(statuses);
  });

  it('returns all status fields for a project ID', async () => {
    expect(await tool.handler({ projectId: 100 })).toEqual(statuses);
    expect(getProjectStatuses).toHaveBeenCalledExactlyOnceWith(backlog, 100);
  });

  it('accepts a project key', async () => {
    await tool.handler({ projectKey: 'TEST' });
    expect(getProjectStatuses).toHaveBeenCalledExactlyOnceWith(backlog, 'TEST');
  });

  it('prefers the project ID when both identifiers are provided', async () => {
    await tool.handler({ projectId: 100, projectKey: 'TEST' });
    expect(getProjectStatuses).toHaveBeenCalledExactlyOnceWith(backlog, 100);
  });

  it('rejects missing identifiers without calling the API', async () => {
    await expect(tool.handler({})).rejects.toThrow('Project ID or key is required');
    expect(getProjectStatuses).not.toHaveBeenCalled();
  });

  it('returns an empty list unchanged', async () => {
    vi.mocked(getProjectStatuses).mockResolvedValue([]);
    expect(await tool.handler({ projectId: 100 })).toEqual([]);
  });

  it('propagates API errors to the shared error handler', async () => {
    const error = new Error('API error');
    vi.mocked(getProjectStatuses).mockRejectedValue(error);
    await expect(tool.handler({ projectId: 100 })).rejects.toBe(error);
  });

  it('registers the list tool in the issue toolset with selectable fields', () => {
    const issue = allTools(backlog, helper).toolsets.find(
      (toolset) => toolset.name === 'issue'
    );
    const registered = issue?.tools.find((entry) => entry.name === 'get_statuses');
    expect(registered?.returnsList).toBe(true);
    expect(registered?.outputFields).toEqual([
      'id',
      'projectId',
      'name',
      'color',
      'displayOrder',
    ]);
  });
});
