import { colors, warn, success, error, spinner } from '../onboarding/index.js';
import { Command, Option } from 'clipanion';
import { setSkillEnabled, findSkill } from '@skillkit/core';
import { getSearchDirs } from '../helpers.js';

export class EnableCommand extends Command {
  static override paths = [['enable']];

  static override usage = Command.Usage({
    description: 'Enable one or more skills',
    examples: [
      ['Enable a skill', '$0 enable pdf'],
      ['Enable multiple skills', '$0 enable pdf xlsx docx'],
    ],
  });

  skills = Option.Rest({ required: 1 });

  json = Option.Boolean('--json', false, {
    description: 'Output as JSON',
  });

  async execute(): Promise<number> {
    const searchDirs = getSearchDirs();
    const s = this.json ? { start: () => {}, stop: () => {}, message: () => {} } : spinner();
    let successCount = 0;
    let failed = 0;
    const results: Array<{ name: string; enabled: boolean; success: boolean }> = [];

    s.start('Enabling skills');

    for (const skillName of this.skills) {
      const skill = findSkill(skillName, searchDirs);

      if (!skill) {
        if (!this.json) error(`Skill not found: ${skillName}`);
        results.push({ name: skillName, enabled: false, success: false });
        failed++;
        continue;
      }

      if (skill.enabled) {
        if (!this.json) console.log(colors.muted(`Already enabled: ${skillName}`));
        results.push({ name: skillName, enabled: true, success: true });
        continue;
      }

      const result = setSkillEnabled(skill.path, true);

      if (result) {
        if (!this.json) success(`Enabled: ${skillName}`);
        results.push({ name: skillName, enabled: true, success: true });
        successCount++;
      } else {
        if (!this.json) error(`Failed to enable: ${skillName}`);
        results.push({ name: skillName, enabled: false, success: false });
        failed++;
      }
    }

    s.stop(successCount > 0 ? `Enabled ${successCount} skill(s)` : 'Done');

    if (this.json) {
      console.log(JSON.stringify({ success: failed === 0, results }));
    } else if (successCount > 0) {
      console.log(colors.muted('\nRun `skillkit sync` to update your agent config'));
    }

    return failed > 0 ? 1 : 0;
  }
}

export class DisableCommand extends Command {
  static override paths = [['disable']];

  static override usage = Command.Usage({
    description: 'Disable one or more skills',
    examples: [
      ['Disable a skill', '$0 disable pdf'],
      ['Disable multiple skills', '$0 disable pdf xlsx docx'],
    ],
  });

  skills = Option.Rest({ required: 1 });

  json = Option.Boolean('--json', false, {
    description: 'Output as JSON',
  });

  async execute(): Promise<number> {
    const searchDirs = getSearchDirs();
    const s = this.json ? { start: () => {}, stop: () => {}, message: () => {} } : spinner();
    let successCount = 0;
    let failed = 0;
    const results: Array<{ name: string; enabled: boolean; success: boolean }> = [];

    s.start('Disabling skills');

    for (const skillName of this.skills) {
      const skill = findSkill(skillName, searchDirs);

      if (!skill) {
        if (!this.json) error(`Skill not found: ${skillName}`);
        results.push({ name: skillName, enabled: false, success: false });
        failed++;
        continue;
      }

      if (!skill.enabled) {
        if (!this.json) console.log(colors.muted(`Already disabled: ${skillName}`));
        results.push({ name: skillName, enabled: false, success: true });
        continue;
      }

      const result = setSkillEnabled(skill.path, false);

      if (result) {
        if (!this.json) warn(`Disabled: ${skillName}`);
        results.push({ name: skillName, enabled: false, success: true });
        successCount++;
      } else {
        if (!this.json) error(`Failed to disable: ${skillName}`);
        results.push({ name: skillName, enabled: true, success: false });
        failed++;
      }
    }

    s.stop(successCount > 0 ? `Disabled ${successCount} skill(s)` : 'Done');

    if (this.json) {
      console.log(JSON.stringify({ success: failed === 0, results }));
    } else if (successCount > 0) {
      console.log(colors.muted('\nRun `skillkit sync` to update your agent config'));
    }

    return failed > 0 ? 1 : 0;
  }
}
