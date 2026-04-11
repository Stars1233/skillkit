import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  handleSearchSkills,
  handleGetSkill,
  handleRecommendSkills,
  handleListCategories,
  handleSkillkitCatalog,
  handleSkillkitLoad,
  handleSkillkitResource,
  getLocalSkillDirs,
} from '../tools.js';
import type { SkillEntry } from '../tools.js';

const testSkills: SkillEntry[] = [
  { name: 'react-perf', description: 'React performance tips', source: 'owner/repo', tags: ['react', 'performance'] },
  { name: 'testing-guide', description: 'Unit testing guide', source: 'owner/repo2', tags: ['testing'] },
  { name: 'nextjs-auth', description: 'Next.js authentication', source: 'other/repo', tags: ['nextjs', 'auth'], category: 'framework' },
];

describe('handleSearchSkills', () => {
  it('returns ranked results for query', () => {
    const result = handleSearchSkills(testSkills, { query: 'react', limit: 10 });
    const data = JSON.parse(result.content[0].text);
    expect(data.skills.length).toBeGreaterThan(0);
    expect(data.query).toBe('react');
    expect(data.total).toBeGreaterThan(0);
  });

  it('applies tag filters', () => {
    const result = handleSearchSkills(testSkills, {
      query: 'guide',
      limit: 10,
      filters: { tags: ['testing'] },
    });
    const data = JSON.parse(result.content[0].text);
    expect(data.skills.length).toBeGreaterThanOrEqual(1);
  });

  it('respects limit', () => {
    const result = handleSearchSkills(testSkills, { query: 'test', limit: 1 });
    const data = JSON.parse(result.content[0].text);
    expect(data.skills.length).toBeLessThanOrEqual(1);
  });
});

describe('handleGetSkill', () => {
  it('returns a specific skill', () => {
    const result = handleGetSkill(testSkills, { source: 'owner/repo', skill_id: 'react-perf' });
    expect(result.isError).toBeUndefined();
    const data = JSON.parse(result.content[0].text);
    expect(data.name).toBe('react-perf');
  });

  it('returns error for missing skill', () => {
    const result = handleGetSkill(testSkills, { source: 'owner/repo', skill_id: 'nonexistent' });
    expect(result.isError).toBe(true);
  });
});

describe('handleRecommendSkills', () => {
  it('recommends based on languages', () => {
    const result = handleRecommendSkills(testSkills, { languages: ['react'], limit: 5 });
    const data = JSON.parse(result.content[0].text);
    expect(data.recommendations.length).toBeGreaterThan(0);
  });

  it('recommends based on task description', () => {
    const result = handleRecommendSkills(testSkills, { task: 'testing react components', limit: 5 });
    const data = JSON.parse(result.content[0].text);
    expect(data.recommendations.length).toBeGreaterThan(0);
  });

  it('errors with no input', () => {
    const result = handleRecommendSkills(testSkills, { limit: 5 });
    expect(result.isError).toBe(true);
  });
});

describe('handleListCategories', () => {
  it('returns tag counts', () => {
    const result = handleListCategories(testSkills);
    const data = JSON.parse(result.content[0].text);
    expect(data.categories.length).toBeGreaterThan(0);
    expect(data.total).toBeGreaterThan(0);
    const react = data.categories.find((c: { name: string }) => c.name === 'react');
    expect(react?.count).toBe(1);
  });
});

vi.mock('@skillkit/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@skillkit/core')>();
  return {
    ...actual,
    findAllSkills: vi.fn(),
    findSkill: vi.fn(),
    readSkillContent: vi.fn(),
  };
});

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return {
    ...actual,
    existsSync: vi.fn(actual.existsSync),
    readFileSync: vi.fn(actual.readFileSync),
  };
});

import { findAllSkills, findSkill, readSkillContent } from '@skillkit/core';
import { existsSync, readFileSync } from 'node:fs';

const mockFindAllSkills = vi.mocked(findAllSkills);
const mockFindSkill = vi.mocked(findSkill);
const mockReadSkillContent = vi.mocked(readSkillContent);
const mockExistsSync = vi.mocked(existsSync);
const mockReadFileSync = vi.mocked(readFileSync);

describe('handleSkillkitCatalog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns minimal catalog entries', () => {
    mockFindAllSkills.mockReturnValue([
      { name: 'my-skill', description: 'A test skill', path: '/home/user/.claude/skills/my-skill', location: 'global', enabled: true },
      { name: 'other-skill', description: 'Another skill', path: '/project/skills/other-skill', location: 'project', enabled: true },
    ]);
    const result = handleSkillkitCatalog({});
    const data = JSON.parse(result.content[0].text);
    expect(data.total).toBe(2);
    expect(data.skills[0]).toEqual({ name: 'my-skill', description: 'A test skill', source: 'global' });
    expect(data.skills[1]).toEqual({ name: 'other-skill', description: 'Another skill', source: 'project' });
  });

  it('returns empty array when no skills found', () => {
    mockFindAllSkills.mockReturnValue([]);
    const result = handleSkillkitCatalog({});
    const data = JSON.parse(result.content[0].text);
    expect(data.total).toBe(0);
    expect(data.skills).toEqual([]);
  });
});

describe('handleSkillkitLoad', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns full skill content', () => {
    mockFindSkill.mockReturnValue({
      name: 'my-skill',
      description: 'A test skill',
      path: '/home/user/.claude/skills/my-skill',
      location: 'global',
      enabled: true,
    });
    mockReadSkillContent.mockReturnValue('# My Skill\n\nFull content here');
    const result = handleSkillkitLoad({ name: 'my-skill' });
    expect(result.content[0].text).toBe('# My Skill\n\nFull content here');
    expect((result as Record<string, unknown>).isError).toBeUndefined();
  });

  it('returns error for missing skill', () => {
    mockFindSkill.mockReturnValue(null);
    const result = handleSkillkitLoad({ name: 'nonexistent' });
    expect((result as Record<string, unknown>).isError).toBe(true);
    expect(result.content[0].text).toContain('Skill not found');
  });

  it('returns error when content unreadable', () => {
    mockFindSkill.mockReturnValue({
      name: 'broken-skill',
      description: 'Broken',
      path: '/home/user/.claude/skills/broken-skill',
      location: 'global',
      enabled: true,
    });
    mockReadSkillContent.mockReturnValue(null);
    const result = handleSkillkitLoad({ name: 'broken-skill' });
    expect((result as Record<string, unknown>).isError).toBe(true);
    expect(result.content[0].text).toContain('Could not read');
  });
});

describe('handleSkillkitResource', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns file content', () => {
    mockFindSkill.mockReturnValue({
      name: 'my-skill',
      description: 'A test skill',
      path: '/home/user/.claude/skills/my-skill',
      location: 'global',
      enabled: true,
    });
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue('reference content' as never);
    const result = handleSkillkitResource({ name: 'my-skill', file: 'references/api.md' });
    expect(result.content[0].text).toBe('reference content');
    expect((result as Record<string, unknown>).isError).toBeUndefined();
  });

  it('returns error for missing skill', () => {
    mockFindSkill.mockReturnValue(null);
    const result = handleSkillkitResource({ name: 'nonexistent', file: 'references/api.md' });
    expect((result as Record<string, unknown>).isError).toBe(true);
    expect(result.content[0].text).toContain('Skill not found');
  });

  it('blocks path traversal', () => {
    mockFindSkill.mockReturnValue({
      name: 'my-skill',
      description: 'A test skill',
      path: '/home/user/.claude/skills/my-skill',
      location: 'global',
      enabled: true,
    });
    const result = handleSkillkitResource({ name: 'my-skill', file: '../../etc/passwd' });
    expect((result as Record<string, unknown>).isError).toBe(true);
    expect(result.content[0].text).toContain('Path traversal denied');
  });

  it('returns error for missing file', () => {
    mockFindSkill.mockReturnValue({
      name: 'my-skill',
      description: 'A test skill',
      path: '/home/user/.claude/skills/my-skill',
      location: 'global',
      enabled: true,
    });
    mockExistsSync.mockReturnValue(false);
    const result = handleSkillkitResource({ name: 'my-skill', file: 'references/missing.md' });
    expect((result as Record<string, unknown>).isError).toBe(true);
    expect(result.content[0].text).toContain('File not found');
  });
});
