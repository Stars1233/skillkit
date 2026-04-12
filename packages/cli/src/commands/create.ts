import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { colors, success, error, step, spinner } from '../onboarding/index.js';
import { Command, Option } from 'clipanion';

export class CreateCommand extends Command {
  static override paths = [['create'], ['new']];

  static override usage = Command.Usage({
    description: 'Create a new skill with proper structure',
    examples: [
      ['Create a new skill', '$0 create my-skill'],
      ['Create with all optional directories', '$0 create my-skill --full'],
      ['Create with scripts directory', '$0 create my-skill --scripts'],
    ],
  });

  name = Option.String({ required: true, name: 'skill-name' });

  full = Option.Boolean('--full,-f', false, {
    description: 'Include all optional directories (references, scripts, assets)',
  });

  scripts = Option.Boolean('--scripts', false, {
    description: 'Include scripts directory',
  });

  references = Option.Boolean('--references', false, {
    description: 'Include references directory',
  });

  assets = Option.Boolean('--assets', false, {
    description: 'Include assets directory',
  });

  directory = Option.String('--dir,-d', {
    description: 'Parent directory to create skill in (default: current directory)',
  });

  json = Option.Boolean('--json', false, {
    description: 'Output as JSON',
  });

  async execute(): Promise<number> {
    const skillName = this.name.toLowerCase();
    const s = this.json ? { start: () => {}, stop: () => {}, message: () => {} } : spinner();

    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(skillName)) {
      if (this.json) {
        console.log(JSON.stringify({ success: false, error: 'Invalid skill name' }));
      } else {
        error('Invalid skill name');
        console.log(colors.muted('Must be lowercase alphanumeric with hyphens (e.g., my-skill)'));
      }
      return 1;
    }

    const parentDir = this.directory || process.cwd();
    const skillDir = join(parentDir, skillName);

    if (existsSync(skillDir)) {
      if (this.json) {
        console.log(JSON.stringify({ success: false, error: `Directory already exists: ${skillDir}` }));
      } else {
        error(`Directory already exists: ${skillDir}`);
      }
      return 1;
    }

    try {
      s.start('Creating skill');

      mkdirSync(skillDir, { recursive: true });

      const skillMd = generateSkillMd(skillName);
      writeFileSync(join(skillDir, 'SKILL.md'), skillMd);

      if (this.full || this.references) {
        const refsDir = join(skillDir, 'references');
        mkdirSync(refsDir);
        writeFileSync(join(refsDir, '.gitkeep'), '');
      }

      if (this.full || this.scripts) {
        const scriptsDir = join(skillDir, 'scripts');
        mkdirSync(scriptsDir);
        writeFileSync(join(scriptsDir, '.gitkeep'), '');
      }

      if (this.full || this.assets) {
        const assetsDir = join(skillDir, 'assets');
        mkdirSync(assetsDir);
        writeFileSync(join(assetsDir, '.gitkeep'), '');
      }

      s.stop('Skill created');

      if (this.json) {
        console.log(JSON.stringify({ success: true, name: skillName, path: skillDir }));
      } else {
        success(`Created skill: ${skillName}`);
        console.log();
        console.log(colors.muted('Structure:'));
        console.log(colors.muted(`  ${skillDir}/`));
        console.log(colors.muted('  ├── SKILL.md'));
        if (this.full || this.references) console.log(colors.muted('  ├── references/'));
        if (this.full || this.scripts) console.log(colors.muted('  ├── scripts/'));
        if (this.full || this.assets) console.log(colors.muted('  └── assets/'));
        console.log();
        step('Next steps:');
        console.log(colors.muted('  1. Edit SKILL.md with your instructions'));
        console.log(colors.muted('  2. Validate: skillkit validate ' + skillDir));
        console.log(colors.muted('  3. Test: skillkit read ' + skillName));
      }

      return 0;
    } catch (err) {
      s.stop('Failed');
      if (this.json) {
        console.log(JSON.stringify({ success: false, error: err instanceof Error ? err.message : String(err) }));
      } else {
        error('Failed to create skill');
        console.log(colors.muted(err instanceof Error ? err.message : String(err)));
      }
      return 1;
    }
  }
}

function generateSkillMd(name: string): string {
  const title = name
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return `---
name: ${name}
description: Describe what this skill does and when to use it. Include trigger keywords.
---

# ${title}

Instructions for the AI agent on how to use this skill.

## When to Use

- Scenario 1
- Scenario 2

## Steps

1. First step
2. Second step
3. Third step
`;
}
