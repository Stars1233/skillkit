import {
  RelevanceRanker,
  findAllSkills,
  findSkill,
  readSkillContent,
  isPathInside,
  SKILL_DISCOVERY_PATHS,
} from '@skillkit/core';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import {
  SearchSkillsInputSchema,
  GetSkillInputSchema,
  RecommendSkillsInputSchema,
  SkillkitCatalogInputSchema,
  SkillkitLoadInputSchema,
  SkillkitResourceInputSchema,
} from './types.js';

export interface SkillEntry {
  name: string;
  description?: string;
  source: string;
  repo?: string;
  tags?: string[];
  category?: string;
  content?: string;
}

const ranker = new RelevanceRanker();

export function handleSearchSkills(skills: SkillEntry[], args: unknown) {
  const input = SearchSkillsInputSchema.parse(args);
  let filtered = skills;

  if (input.filters) {
    if (input.filters.tags?.length) {
      filtered = filtered.filter((s) =>
        input.filters!.tags!.some((t) => s.tags?.includes(t)),
      );
    }
    if (input.filters.category) {
      filtered = filtered.filter((s) => s.category === input.filters!.category);
    }
    if (input.filters.source) {
      filtered = filtered.filter((s) => s.source.includes(input.filters!.source!));
    }
  }

  const skillMap = new Map(filtered.map((s) => [`${s.source}:${s.name}`, s]));

  const ranked = ranker.rank(
    filtered.map((s) => ({
      name: s.name,
      description: s.description,
      content: s.content,
      source: s.source,
    })),
    input.query,
  );

  const results = ranked.slice(0, input.limit).map((r) => {
    const key = `${(r.skill as Record<string, unknown>).source}:${r.skill.name}`;
    const original = skillMap.get(key) ?? filtered.find((s) => s.name === r.skill.name)!;
    const result: Record<string, unknown> = {
      name: original.name,
      description: original.description,
      source: original.source,
      tags: original.tags,
      score: r.score,
    };
    if (input.include_content) result.content = original.content;
    return result;
  });

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify({ skills: results, total: ranked.length, query: input.query }, null, 2),
      },
    ],
  };
}

export function handleGetSkill(skills: SkillEntry[], args: unknown) {
  const input = GetSkillInputSchema.parse(args);

  const skill = skills.find(
    (s) => s.source === input.source && s.name === input.skill_id,
  );

  if (!skill) {
    return {
      content: [{ type: 'text' as const, text: `Skill not found: ${input.source}/${input.skill_id}` }],
      isError: true,
    };
  }

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(skill, null, 2),
      },
    ],
  };
}

export function handleRecommendSkills(skills: SkillEntry[], args: unknown) {
  const input = RecommendSkillsInputSchema.parse(args);
  const queryParts: string[] = [];

  if (input.languages?.length) queryParts.push(...input.languages);
  if (input.frameworks?.length) queryParts.push(...input.frameworks);
  if (input.libraries?.length) queryParts.push(...input.libraries);
  if (input.task) queryParts.push(input.task);

  const query = queryParts.join(' ');
  if (!query) {
    return {
      content: [{ type: 'text' as const, text: 'Provide at least one of: languages, frameworks, libraries, or task' }],
      isError: true,
    };
  }

  const ranked = ranker.rank(
    skills.map((s) => ({
      name: s.name,
      description: s.description,
      content: s.content,
    })),
    query,
  );

  const recommendMap = new Map(skills.map((s) => [s.name, s]));
  const results = ranked.slice(0, input.limit).map((r) => {
    const original = recommendMap.get(r.skill.name)!;
    return {
      name: original.name,
      description: original.description,
      source: original.source,
      tags: original.tags,
      score: r.score,
    };
  });

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify({ recommendations: results, query }, null, 2),
      },
    ],
  };
}

export function handleListCategories(skills: SkillEntry[]) {
  const tagCounts = new Map<string, number>();

  for (const skill of skills) {
    if (skill.tags) {
      for (const tag of skill.tags) {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      }
    }
  }

  const categories = Array.from(tagCounts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify({ categories, total: categories.length }, null, 2),
      },
    ],
  };
}

export function getLocalSkillDirs(agentFilter?: string): string[] {
  const dirs: string[] = [];
  const home = homedir();
  const roots = [home, process.cwd()];

  for (const root of roots) {
    for (const rel of SKILL_DISCOVERY_PATHS) {
      if (agentFilter) {
        const dirAgent = rel.replace(/^\./, '').split('/')[0];
        if (dirAgent !== agentFilter && dirAgent !== 'agents' && dirAgent !== 'skills') continue;
      }
      const full = join(root, rel);
      if (existsSync(full) && !dirs.includes(full)) {
        dirs.push(full);
      }
    }
  }

  return dirs;
}

export function handleSkillkitCatalog(args: unknown) {
  const input = SkillkitCatalogInputSchema.parse(args);
  const dirs = getLocalSkillDirs(input.agent);
  const skills = findAllSkills(dirs);

  const catalog = skills.map((s) => ({
    name: s.name,
    description: s.description,
    source: s.location,
  }));

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify({ skills: catalog, total: catalog.length }, null, 2),
      },
    ],
  };
}

export function handleSkillkitLoad(args: unknown) {
  const input = SkillkitLoadInputSchema.parse(args);
  const dirs = getLocalSkillDirs();
  const skill = findSkill(input.name, dirs);

  if (!skill) {
    return {
      content: [{ type: 'text' as const, text: `Skill not found: ${input.name}` }],
      isError: true,
    };
  }

  const content = readSkillContent(skill.path);
  if (!content) {
    return {
      content: [{ type: 'text' as const, text: `Could not read skill content: ${input.name}` }],
      isError: true,
    };
  }

  return {
    content: [
      {
        type: 'text' as const,
        text: content,
      },
    ],
  };
}

export function handleSkillkitResource(args: unknown) {
  const input = SkillkitResourceInputSchema.parse(args);
  const dirs = getLocalSkillDirs();
  const skill = findSkill(input.name, dirs);

  if (!skill) {
    return {
      content: [{ type: 'text' as const, text: `Skill not found: ${input.name}` }],
      isError: true,
    };
  }

  const filePath = resolve(join(skill.path, input.file));
  if (!isPathInside(filePath, skill.path)) {
    return {
      content: [{ type: 'text' as const, text: `Path traversal denied: ${input.file}` }],
      isError: true,
    };
  }

  if (!existsSync(filePath)) {
    return {
      content: [{ type: 'text' as const, text: `File not found: ${input.file}` }],
      isError: true,
    };
  }

  try {
    const content = readFileSync(filePath, 'utf-8');
    return {
      content: [
        {
          type: 'text' as const,
          text: content,
        },
      ],
    };
  } catch {
    return {
      content: [{ type: 'text' as const, text: `Could not read file: ${input.file}` }],
      isError: true,
    };
  }
}
