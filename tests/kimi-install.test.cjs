/**
 * GSD Tools Tests - Kimi Install Plumbing
 *
 * Tests for Kimi runtime directory resolution, config paths,
 * skill/agent conversion, and installer source integration.
 */

process.env.GSD_TEST_MODE = '1';

const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const { createTempProject, createTempDir, cleanup } = require('./helpers.cjs');
const {
  getDirName,
  getGlobalDir,
  getConfigDirFromHome,
  convertClaudeToKimiSkill,
  convertClaudeToKimiAgent,
  install,
  uninstall,
} = require('../bin/install.js');

describe('getDirName (Kimi)', () => {
  test('returns .kimi for kimi', () => {
    assert.strictEqual(getDirName('kimi'), '.kimi');
  });
});

describe('getConfigDirFromHome (Kimi)', () => {
  test('returns .kimi for local installs', () => {
    assert.strictEqual(getConfigDirFromHome('kimi', false), "'.kimi'");
  });

  test('returns .kimi for global installs', () => {
    assert.strictEqual(getConfigDirFromHome('kimi', true), "'.kimi'");
  });
});

describe('getGlobalDir (Kimi)', () => {
  let savedEnv;

  beforeEach(() => {
    savedEnv = {
      KIMI_CONFIG_DIR: process.env.KIMI_CONFIG_DIR,
    };
    delete process.env.KIMI_CONFIG_DIR;
  });

  afterEach(() => {
    if (savedEnv.KIMI_CONFIG_DIR === undefined) {
      delete process.env.KIMI_CONFIG_DIR;
    } else {
      process.env.KIMI_CONFIG_DIR = savedEnv.KIMI_CONFIG_DIR;
    }
  });

  test('returns ~/.kimi by default', () => {
    assert.strictEqual(getGlobalDir('kimi'), path.join(os.homedir(), '.kimi'));
  });

  test('respects KIMI_CONFIG_DIR env var', () => {
    process.env.KIMI_CONFIG_DIR = '~/custom-kimi';
    assert.strictEqual(getGlobalDir('kimi'), path.join(os.homedir(), 'custom-kimi'));
  });

  test('--config-dir overrides env vars', () => {
    process.env.KIMI_CONFIG_DIR = '~/env-kimi';
    assert.strictEqual(getGlobalDir('kimi', '~/flag-kimi'), path.join(os.homedir(), 'flag-kimi'));
  });
});

describe('convertClaudeToKimiSkill', () => {
  test('produces valid skill frontmatter', () => {
    const content = `---
name: gsd-test-skill
description: A test skill
allowed-tools:
  - Read
  - Bash
---

Do something useful.`;
    const result = convertClaudeToKimiSkill(content, 'gsd-test-skill');
    assert.ok(result.startsWith('---'));
    const frontmatter = result.split('---')[1] || '';
    assert.ok(frontmatter.includes('name: gsd-test-skill'));
    assert.ok(frontmatter.includes('description:'));
    assert.ok(frontmatter.includes('A test skill'));
    assert.ok(frontmatter.includes('type: standard'));
    assert.ok(!frontmatter.includes('allowed-tools:'));
    assert.ok(result.includes('Do something useful.'));
  });

  test('maps tool names in body', () => {
    const content = `---
name: gsd-test
description: Test
---

Use Bash(), Read(), Edit(), Write(), Task(), WebSearch(), WebFetch()`;
    const result = convertClaudeToKimiSkill(content, 'gsd-test');
    assert.ok(result.includes('Shell()'));
    assert.ok(result.includes('ReadFile()'));
    assert.ok(result.includes('StrReplaceFile()'));
    assert.ok(result.includes('WriteFile()'));
    assert.ok(result.includes('Agent()'));
    assert.ok(result.includes('SearchWeb()'));
    assert.ok(result.includes('FetchURL()'));
  });
});

describe('convertClaudeToKimiAgent', () => {
  test('splits into three files', () => {
    const content = `---
name: gsd-test-agent
description: A test agent
tools: Read, Bash
---

You are a test agent.`;
    const { agentYaml, systemMd, subYaml } = convertClaudeToKimiAgent(content);

    assert.ok(agentYaml.includes('name: gsd-test-agent'));
    assert.ok(agentYaml.includes('system_prompt_path: ./system.md'));
    assert.ok(agentYaml.includes('kimi_cli.tools.file:ReadFile'));
    assert.ok(agentYaml.includes('kimi_cli.tools.shell:Shell'));

    assert.ok(systemMd.includes('You are a test agent.'));

    assert.ok(subYaml.includes('extend: ./agent.yaml'));
    assert.ok(subYaml.includes('kimi_cli.tools.multiagent:Task'));
    assert.ok(subYaml.includes('kimi_cli.tools.multiagent:CreateSubagent'));
    assert.ok(subYaml.includes('subagents: {}'));
  });
});

describe('Kimi local install', () => {
  let tmpDir;
  let previousCwd;

  beforeEach(() => {
    tmpDir = createTempDir('gsd-kimi-install-');
    previousCwd = process.cwd();
    process.chdir(tmpDir);
  });

  afterEach(() => {
    process.chdir(previousCwd);
    cleanup(tmpDir);
  });

  test('installs skills to skills/gsd-*/SKILL.md', () => {
    install(false, 'kimi');

    const skillsDir = path.join(tmpDir, '.kimi', 'skills');
    assert.ok(fs.existsSync(skillsDir), 'skills directory should exist');

    const skillDirs = fs.readdirSync(skillsDir, { withFileTypes: true })
      .filter(e => e.isDirectory() && e.name.startsWith('gsd-'));
    assert.ok(skillDirs.length > 0, 'should have at least one skill directory');

    for (const dir of skillDirs) {
      const skillMd = path.join(skillsDir, dir.name, 'SKILL.md');
      assert.ok(fs.existsSync(skillMd), `SKILL.md should exist for ${dir.name}`);
      const content = fs.readFileSync(skillMd, 'utf8');
      assert.ok(content.includes('type: standard'), `${dir.name} SKILL.md should have type: standard`);
    }
  });

  test('installs agents to agents/gsd-*/agent.yaml + system.md + sub.yaml', () => {
    install(false, 'kimi');

    const agentsDir = path.join(tmpDir, '.kimi', 'agents');
    assert.ok(fs.existsSync(agentsDir), 'agents directory should exist');

    const agentDirs = fs.readdirSync(agentsDir, { withFileTypes: true })
      .filter(e => e.isDirectory() && e.name.startsWith('gsd-'));
    assert.ok(agentDirs.length > 0, 'should have at least one agent directory');

    for (const dir of agentDirs) {
      const agentYaml = path.join(agentsDir, dir.name, 'agent.yaml');
      const systemMd = path.join(agentsDir, dir.name, 'system.md');
      const subYaml = path.join(agentsDir, dir.name, 'sub.yaml');
      assert.ok(fs.existsSync(agentYaml), `agent.yaml should exist for ${dir.name}`);
      assert.ok(fs.existsSync(systemMd), `system.md should exist for ${dir.name}`);
      assert.ok(fs.existsSync(subYaml), `sub.yaml should exist for ${dir.name}`);
    }
  });

  test('uninstall removes skills and agent directories', () => {
    install(false, 'kimi');
    uninstall(false, 'kimi');

    const skillsDir = path.join(tmpDir, '.kimi', 'skills');
    const agentsDir = path.join(tmpDir, '.kimi', 'agents');

    if (fs.existsSync(skillsDir)) {
      const remainingSkills = fs.readdirSync(skillsDir, { withFileTypes: true })
        .filter(e => e.isDirectory() && e.name.startsWith('gsd-'));
      assert.strictEqual(remainingSkills.length, 0, 'all GSD skills should be removed');
    }

    if (fs.existsSync(agentsDir)) {
      const remainingAgents = fs.readdirSync(agentsDir)
        .filter(f => f.startsWith('gsd-'));
      assert.strictEqual(remainingAgents.length, 0, 'all GSD agents should be removed');
    }
  });
});
