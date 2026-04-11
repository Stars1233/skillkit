import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { fileURLToPath } from 'node:url';
import { realpathSync } from 'node:fs';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import {
  handleSearchSkills,
  handleGetSkill,
  handleRecommendSkills,
  handleListCategories,
  handleSkillkitCatalog,
  handleSkillkitLoad,
  handleSkillkitResource,
} from './tools.js';
import type { SkillEntry } from './tools.js';
import { getTrendingResource, getCategoriesResource } from './resources.js';

let skills: SkillEntry[] = [];

async function loadSkills(): Promise<SkillEntry[]> {
  const { readFileSync } = await import('node:fs');
  const { join, dirname } = await import('node:path');

  const pkgDir = dirname(fileURLToPath(import.meta.url));
  const possiblePaths = [
    join(pkgDir, '..', 'data', 'skills.json'),
    join(pkgDir, '..', '..', '..', 'marketplace', 'skills.json'),
    join(pkgDir, '..', '..', 'marketplace', 'skills.json'),
    join(process.cwd(), 'marketplace', 'skills.json'),
  ];

  for (const path of possiblePaths) {
    try {
      const data = JSON.parse(readFileSync(path, 'utf-8'));
      if (data.skills && Array.isArray(data.skills)) {
        return data.skills.map((s: Record<string, unknown>) => ({
          name: s.name as string,
          description: s.description as string | undefined,
          source: (s.source as string) || '',
          repo: s.repo as string | undefined,
          tags: s.tags as string[] | undefined,
          category: s.category as string | undefined,
        }));
      }
    } catch {
      continue;
    }
  }

  return [];
}

const server = new Server(
  {
    name: 'skillkit-discovery',
    version: '1.21.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  },
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'search_skills',
        description: 'Search for AI agent skills by keyword, tag, or description. Returns ranked results from the SkillKit marketplace.',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query' },
            limit: { type: 'number', minimum: 1, maximum: 50, default: 10, description: 'Max results' },
            include_content: { type: 'boolean', default: false, description: 'Include full content' },
            include_references: { type: 'boolean', default: false, description: 'Include references' },
            filters: {
              type: 'object',
              properties: {
                tags: { type: 'array', items: { type: 'string' }, description: 'Filter by tags' },
                category: { type: 'string', description: 'Filter by category' },
                source: { type: 'string', description: 'Filter by source repo' },
              },
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_skill',
        description: 'Get details of a specific skill by source and ID.',
        inputSchema: {
          type: 'object',
          properties: {
            source: { type: 'string', description: 'Skill source (e.g. owner/repo)' },
            skill_id: { type: 'string', description: 'Skill name' },
            include_references: { type: 'boolean', default: false, description: 'Include references' },
          },
          required: ['source', 'skill_id'],
        },
      },
      {
        name: 'recommend_skills',
        description: 'Get skill recommendations based on your tech stack and current task.',
        inputSchema: {
          type: 'object',
          properties: {
            languages: { type: 'array', items: { type: 'string' }, description: 'Programming languages' },
            frameworks: { type: 'array', items: { type: 'string' }, description: 'Frameworks' },
            libraries: { type: 'array', items: { type: 'string' }, description: 'Libraries' },
            task: { type: 'string', description: 'Current task description' },
            limit: { type: 'number', minimum: 1, maximum: 20, default: 5, description: 'Max results' },
          },
        },
      },
      {
        name: 'list_categories',
        description: 'List all skill categories with their counts.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'skillkit_catalog',
        description: 'List all installed skills with name and description. Use this first to see what skills are available. Each entry costs ~50 tokens.',
        inputSchema: {
          type: 'object',
          properties: {
            agent: { type: 'string', description: 'Filter by agent type (e.g. claude-code, cursor)' },
          },
        },
      },
      {
        name: 'skillkit_load',
        description: 'Load the full content of a specific installed skill. Call this only when you need the detailed instructions for a skill found via skillkit_catalog.',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Skill name from the catalog' },
          },
          required: ['name'],
        },
      },
      {
        name: 'skillkit_resource',
        description: 'Load a specific reference file from within a skill directory. Use when a skill references external files.',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Skill name' },
            file: { type: 'string', description: 'Relative file path within the skill (e.g. references/api.md)' },
          },
          required: ['name', 'file'],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'search_skills':
        return handleSearchSkills(skills, args);
      case 'get_skill':
        return handleGetSkill(skills, args);
      case 'recommend_skills':
        return handleRecommendSkills(skills, args);
      case 'list_categories':
        return handleListCategories(skills);
      case 'skillkit_catalog':
        return handleSkillkitCatalog(args);
      case 'skillkit_load':
        return handleSkillkitLoad(args);
      case 'skillkit_resource':
        return handleSkillkitResource(args);
      default:
        return {
          content: [{ type: 'text', text: `Unknown tool: ${name}` }],
          isError: true,
        };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      content: [{ type: 'text', text: `Error: ${message}` }],
      isError: true,
    };
  }
});

server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: 'skills://trending',
        name: 'Trending Skills',
        description: 'Top trending skills by relevance score',
        mimeType: 'application/json',
      },
      {
        uri: 'skills://categories',
        name: 'Skill Categories',
        description: 'All skill categories with counts',
        mimeType: 'application/json',
      },
    ],
  };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  if (uri === 'skills://trending') {
    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: getTrendingResource(skills),
        },
      ],
    };
  }

  if (uri === 'skills://categories') {
    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: getCategoriesResource(skills),
        },
      ],
    };
  }

  throw new Error(`Unknown resource: ${uri}`);
});

async function main() {
  skills = await loadSkills();
  console.error(`SkillKit Discovery MCP Server starting (${skills.length} skills loaded)`);

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('SkillKit Discovery MCP Server running on stdio');
}

let isMain = false;
try {
  const resolvedArgv = process.argv[1] ? realpathSync(process.argv[1]) : '';
  const resolvedModule = realpathSync(fileURLToPath(import.meta.url));
  isMain = resolvedArgv === resolvedModule;
} catch {}
if (isMain) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { server };
