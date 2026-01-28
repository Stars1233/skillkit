import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';

export interface SkillEntry {
  source: string;
  skills?: string[];
  agents?: string[];
  enabled?: boolean;
}

export interface SkillsManifest {
  version: number;
  skills: SkillEntry[];
  agents?: string[];
  installMethod?: 'symlink' | 'copy';
  updatedAt?: string;
}

const MANIFEST_FILENAMES = ['.skills', '.skills.yaml', '.skills.yml', 'skills.yaml'];

export function findManifestPath(startDir: string = process.cwd()): string | null {
  let dir = startDir;

  while (dir !== dirname(dir)) {
    for (const filename of MANIFEST_FILENAMES) {
      const manifestPath = join(dir, filename);
      if (existsSync(manifestPath)) {
        return manifestPath;
      }
    }
    dir = dirname(dir);
  }

  return null;
}

export function loadManifest(manifestPath?: string): SkillsManifest | null {
  const path = manifestPath || findManifestPath();

  if (!path || !existsSync(path)) {
    return null;
  }

  try {
    const content = readFileSync(path, 'utf-8');
    const parsed = parseYaml(content) as SkillsManifest;

    if (!parsed || typeof parsed !== 'object') {
      return null;
    }

    return {
      version: parsed.version || 1,
      skills: normalizeSkills(parsed.skills || []),
      agents: parsed.agents,
      installMethod: parsed.installMethod,
      updatedAt: parsed.updatedAt,
    };
  } catch {
    return null;
  }
}

function normalizeSkills(skills: unknown[]): SkillEntry[] {
  return skills.map(skill => {
    if (typeof skill === 'string') {
      const parts = skill.split('/');
      if (parts.length >= 3) {
        return {
          source: `${parts[0]}/${parts[1]}`,
          skills: [parts.slice(2).join('/')],
          enabled: true,
        };
      }
      return { source: skill, enabled: true };
    }

    if (typeof skill === 'object' && skill !== null) {
      const entry = skill as Record<string, unknown>;
      return {
        source: String(entry.source || ''),
        skills: entry.skills as string[] | undefined,
        agents: entry.agents as string[] | undefined,
        enabled: entry.enabled !== false,
      };
    }

    return { source: '', enabled: false };
  }).filter(s => s.source);
}

export function saveManifest(manifest: SkillsManifest, manifestPath?: string): void {
  const path = manifestPath || join(process.cwd(), '.skills');

  const content = stringifyYaml({
    version: manifest.version || 1,
    skills: manifest.skills.map(s => {
      if (!s.skills && !s.agents && s.enabled !== false) {
        return s.source;
      }
      return s;
    }),
    ...(manifest.agents && { agents: manifest.agents }),
    ...(manifest.installMethod && { installMethod: manifest.installMethod }),
    updatedAt: new Date().toISOString(),
  });

  writeFileSync(path, content, 'utf-8');
}

export function addToManifest(
  source: string,
  options?: { skills?: string[]; agents?: string[] },
  manifestPath?: string
): SkillsManifest {
  const existing = loadManifest(manifestPath) || {
    version: 1,
    skills: [],
  };

  const existingIndex = existing.skills.findIndex(s => s.source === source);

  if (existingIndex >= 0) {
    existing.skills[existingIndex] = {
      ...existing.skills[existingIndex],
      ...options,
      enabled: true,
    };
  } else {
    existing.skills.push({
      source,
      ...options,
      enabled: true,
    });
  }

  saveManifest(existing, manifestPath);
  return existing;
}

export function removeFromManifest(source: string, manifestPath?: string): SkillsManifest | null {
  const existing = loadManifest(manifestPath);

  if (!existing) {
    return null;
  }

  existing.skills = existing.skills.filter(s => s.source !== source);
  saveManifest(existing, manifestPath);
  return existing;
}

export function initManifest(options?: {
  agents?: string[];
  installMethod?: 'symlink' | 'copy';
}, manifestPath?: string): SkillsManifest {
  const manifest: SkillsManifest = {
    version: 1,
    skills: [],
    ...options,
    updatedAt: new Date().toISOString(),
  };

  saveManifest(manifest, manifestPath);
  return manifest;
}

export function generateManifestFromInstalled(
  installedSkills: Array<{ name: string; source: string; agents?: string[] }>
): SkillsManifest {
  const skillsBySource = new Map<string, { skills: string[]; agents: Set<string> }>();

  for (const skill of installedSkills) {
    if (!skill.source) continue;

    const existing = skillsBySource.get(skill.source);
    if (existing) {
      existing.skills.push(skill.name);
      if (skill.agents) {
        skill.agents.forEach(a => existing.agents.add(a));
      }
    } else {
      skillsBySource.set(skill.source, {
        skills: [skill.name],
        agents: new Set(skill.agents || []),
      });
    }
  }

  const skills: SkillEntry[] = [];
  for (const [source, data] of skillsBySource) {
    skills.push({
      source,
      skills: data.skills.length > 0 ? data.skills : undefined,
      agents: data.agents.size > 0 ? Array.from(data.agents) : undefined,
      enabled: true,
    });
  }

  return {
    version: 1,
    skills,
    updatedAt: new Date().toISOString(),
  };
}
