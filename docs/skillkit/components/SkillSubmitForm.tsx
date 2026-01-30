import React, { useState } from 'react';

export function SkillSubmitForm(): React.ReactElement {
  const [repoUrl, setRepoUrl] = useState('');
  const [copied, setCopied] = useState(false);

  const repoMatch = repoUrl.match(/github\.com\/([^\/]+)\/([^\/\s]+)/);
  const owner = repoMatch?.[1] || 'owner';
  const repo = repoMatch?.[2]?.replace(/\.git$/, '') || 'repo';
  const skillName = repo.replace(/-skill$/, '').replace(/-/g, '-');

  const command = `npx skillkit@latest publish ${repoUrl || 'https://github.com/owner/repo'}`;

  async function copyCommand(): Promise<void> {
    if (!repoUrl) return;
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  const issueUrl = repoUrl
    ? `https://github.com/rohitg00/skillkit/issues/new?title=${encodeURIComponent(`[Skill] ${owner}/${repo}`)}&body=${encodeURIComponent(`## Skill Submission\n\n**Repository:** ${repoUrl}\n\n**Description:** \n\n**Tags:** `)}&labels=skill-submission`
    : 'https://github.com/rohitg00/skillkit/issues/new?template=skill-submission.md';

  return (
    <div className="max-w-2xl mx-auto">
      <div className="space-y-6">
        <div>
          <label className="block text-xs font-mono text-zinc-500 mb-2">
            Your GitHub repository URL
          </label>
          <input
            type="text"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            placeholder="https://github.com/username/my-skill"
            className="w-full bg-zinc-900 border border-zinc-800 text-white px-4 py-3 font-mono text-sm focus:border-zinc-600 outline-none placeholder-zinc-600"
          />
        </div>

        <div className="bg-black border border-zinc-800 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono text-zinc-500">Run this command</span>
            <button
              onClick={copyCommand}
              disabled={!repoUrl}
              className={`text-xs font-mono transition-colors ${
                repoUrl ? 'text-zinc-500 hover:text-white' : 'text-zinc-700'
              }`}
            >
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <code className="block font-mono text-sm text-zinc-300 break-all">
            <span className="text-zinc-600">$</span> {command}
          </code>
        </div>

        <div className="text-center text-xs font-mono text-zinc-600">
          or{' '}
          <a
            href={issueUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-zinc-400 hover:text-white underline"
          >
            open a GitHub issue
          </a>
        </div>
      </div>
    </div>
  );
}
