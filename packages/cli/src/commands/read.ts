import { colors, warn, error } from '../onboarding/index.js';
import { Command, Option } from 'clipanion';
import { findSkill, readSkillContent } from '@skillkit/core';
import { getSearchDirs } from '../helpers.js';

export class ReadCommand extends Command {
  static override paths = [['read'], ['r']];

  static override usage = Command.Usage({
    description: 'Read skill content for AI agent consumption',
    examples: [
      ['Read a single skill', '$0 read pdf'],
      ['Read multiple skills', '$0 read pdf,xlsx,docx'],
      ['Read with verbose output', '$0 read pdf --verbose'],
    ],
  });

  skills = Option.String({ required: true });

  verbose = Option.Boolean('--verbose,-v', false, {
    description: 'Show additional information',
  });

  json = Option.Boolean('--json', false, {
    description: 'Output as JSON',
  });

  async execute(): Promise<number> {
    const searchDirs = getSearchDirs();

    const skillNames = this.skills
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    if (skillNames.length === 0) {
      if (this.json) {
        console.log(JSON.stringify({ error: 'No skill names provided' }));
      } else {
        error('No skill names provided');
      }
      return 1;
    }

    let exitCode = 0;
    const jsonResults: Array<{ name: string; content: string; path: string }> = [];

    for (const skillName of skillNames) {
      const skill = findSkill(skillName, searchDirs);

      if (!skill) {
        if (!this.json) {
          error(`Skill not found: ${skillName}`);
          console.log(colors.muted('Available directories:'));
          searchDirs.forEach(d => console.log(colors.muted(`  - ${d}`)));
        }
        exitCode = 1;
        continue;
      }

      if (!skill.enabled) {
        if (!this.json) {
          warn(`Skill disabled: ${skillName}`);
          console.log(colors.muted('Enable with: skillkit enable ' + skillName));
        }
        exitCode = 1;
        continue;
      }

      const content = readSkillContent(skill.path);

      if (!content) {
        if (!this.json) error(`Could not read SKILL.md for: ${skillName}`);
        exitCode = 1;
        continue;
      }

      if (this.json) {
        jsonResults.push({ name: skillName, content, path: skill.path });
      } else {
        console.log(`Reading: ${skillName}`);
        console.log(`Base directory: ${skill.path}`);
        console.log();
        console.log(content);
        console.log();
        console.log(`Skill read: ${skillName}`);

        if (skillNames.length > 1 && skillName !== skillNames[skillNames.length - 1]) {
          console.log('\n---\n');
        }
      }
    }

    if (this.json) {
      if (jsonResults.length === 1) {
        console.log(JSON.stringify(jsonResults[0]));
      } else {
        console.log(JSON.stringify(jsonResults));
      }
    }

    return exitCode;
  }
}
