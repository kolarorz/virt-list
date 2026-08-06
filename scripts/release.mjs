#!/usr/bin/env node
/**
 * 一键发布 packages/* 下的所有包。
 *
 * 用法：
 *   pnpm release                 # 默认 patch：0.0.4 → 0.0.5
 *   pnpm release minor           # 0.0.4 → 0.1.0
 *   pnpm release major           # 0.0.4 → 1.0.0
 *   pnpm release 1.2.3           # 显式指定版本号
 *   pnpm release 1.2.3-beta.0 --tag beta
 *   pnpm release --dry-run       # 全流程演练，不写文件、不发布、不打 tag
 *
 * 可选参数：
 *   --dry-run       演练模式
 *   --tag <t>       npm dist-tag，默认 latest
 *   --skip-tests    跳过 pnpm test
 *   --allow-dirty   允许工作区有未提交改动
 *   --no-push       发布并打 tag，但不 git push
 *
 * 环境变量：
 *   RELEASE_REGISTRY  发布目标 registry，默认 https://registry.npmjs.org/
 *
 * 所有包共用同一个版本号；发布顺序由 pnpm 按依赖拓扑序自动决定，
 * `workspace:*` 会在发布时被替换为真实版本号。
 */

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = path.resolve(import.meta.dirname, '..');
const PACKAGES_DIR = path.join(ROOT, 'packages');
const REGISTRY = process.env.RELEASE_REGISTRY || 'https://registry.npmjs.org/';

const c = {
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
};

const step = (msg) => console.log(`\n${c.cyan('▶')} ${c.bold(msg)}`);
const ok = (msg) => console.log(`${c.green('✓')} ${msg}`);
const warn = (msg) => console.log(`${c.yellow('!')} ${msg}`);

/** 版本号写入后置为待回滚的包列表；发布成功后清空，避免误回滚已发布的版本。 */
let rollbackOnFail = null;

function fail(msg, hint) {
  if (rollbackOnFail) {
    restoreVersions(rollbackOnFail);
    rollbackOnFail = null;
  }
  console.error(`\n${c.red('✗')} ${msg}`);
  if (hint) console.error(c.dim(`  ${hint}`));
  process.exit(1);
}

function run(cmd, args, { capture = false, allowFail = false } = {}) {
  const res = spawnSync(cmd, args, {
    cwd: ROOT,
    stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });
  if (res.status !== 0 && !allowFail) {
    fail(`命令执行失败：${cmd} ${args.join(' ')}`);
  }
  return { status: res.status, stdout: (res.stdout || '').trim(), stderr: (res.stderr || '').trim() };
}

// ---------- 参数解析 ----------

const argv = process.argv.slice(2);
const flags = {
  dryRun: argv.includes('--dry-run'),
  skipTests: argv.includes('--skip-tests'),
  allowDirty: argv.includes('--allow-dirty'),
  push: !argv.includes('--no-push'),
};
const tagIdx = argv.indexOf('--tag');
const distTag = tagIdx !== -1 ? argv[tagIdx + 1] : 'latest';
if (tagIdx !== -1 && !distTag) fail('--tag 后面缺少值');

const tagValueIdx = tagIdx === -1 ? -1 : tagIdx + 1;
const positional = argv.filter((a, i) => !a.startsWith('--') && i !== tagValueIdx);
const bumpArg = positional[0] || 'patch';

const SEMVER_RE = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-.]+))?$/;

function nextVersion(current, arg) {
  if (SEMVER_RE.test(arg)) return arg;
  const m = SEMVER_RE.exec(current);
  if (!m) fail(`当前版本号 ${current} 不是合法 semver，无法自动 bump`, '请显式传入目标版本，例如 pnpm release 0.1.0');
  const [major, minor, patch] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const pre = m[4];
  switch (arg) {
    // 预发布版本执行 patch 时，先落地为正式版（0.1.0-beta.0 → 0.1.0）
    case 'patch':
      return pre ? `${major}.${minor}.${patch}` : `${major}.${minor}.${patch + 1}`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'major':
      return `${major + 1}.0.0`;
    default:
      fail(`无法识别的版本参数：${arg}`, '可用值：patch | minor | major | 具体版本号（如 1.2.3）');
  }
}

// ---------- 读取待发布的包 ----------

function readPackages() {
  if (!fs.existsSync(PACKAGES_DIR)) fail(`找不到目录 ${PACKAGES_DIR}`);
  const pkgs = [];
  for (const dir of fs.readdirSync(PACKAGES_DIR).sort()) {
    const file = path.join(PACKAGES_DIR, dir, 'package.json');
    if (!fs.existsSync(file)) continue;
    const raw = fs.readFileSync(file, 'utf8');
    const json = JSON.parse(raw);
    if (json.private) {
      warn(`跳过私有包 ${json.name}`);
      continue;
    }
    pkgs.push({ dir, file, raw, name: json.name, version: json.version });
  }
  if (pkgs.length === 0) fail('packages/ 下没有可发布的包');
  return pkgs;
}

function writeVersions(pkgs, version) {
  for (const pkg of pkgs) {
    const next = pkg.raw.replace(/("version"\s*:\s*")[^"]+(")/, `$1${version}$2`);
    if (next === pkg.raw) fail(`无法在 ${pkg.file} 中定位 version 字段`);
    fs.writeFileSync(pkg.file, next);
  }
}

function restoreVersions(pkgs) {
  for (const pkg of pkgs) fs.writeFileSync(pkg.file, pkg.raw);
  warn('已回滚 package.json 中的版本号改动');
}

// ---------- 主流程 ----------

step('检查 git 状态');
const branch = run('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { capture: true }).stdout;
const dirty = run('git', ['status', '--porcelain'], { capture: true }).stdout;
if (dirty && !flags.allowDirty && !flags.dryRun) {
  fail('工作区有未提交的改动', '先提交或 stash，或加 --allow-dirty 跳过此检查');
}
if (branch !== 'master') warn(`当前分支是 ${branch}，不是 master`);
ok(`分支 ${branch}${dirty ? c.dim('（工作区有改动）') : '，工作区干净'}`);

step('确定版本号');
const pkgs = readPackages();
const versions = [...new Set(pkgs.map((p) => p.version))];
if (versions.length > 1) {
  fail(
    `各包版本号不一致：${pkgs.map((p) => `${p.name}@${p.version}`).join(', ')}`,
    '本脚本要求所有包共用同一版本号，请先手动对齐',
  );
}
const current = versions[0];
const version = nextVersion(current, bumpArg);
if (version === current) fail(`目标版本与当前版本相同（${version}）`);
ok(`${current} → ${c.bold(version)}（${pkgs.length} 个包，dist-tag: ${distTag}）`);
for (const p of pkgs) console.log(c.dim(`    ${p.name}`));

step('检查 npm 登录状态');
console.log(c.dim(`  registry: ${REGISTRY}`));
const who = run('npm', ['whoami', '--registry', REGISTRY], { capture: true, allowFail: true });
if (who.status !== 0) {
  if (flags.dryRun) warn('未登录 npm（dry-run 模式继续）');
  else fail(`未登录 ${REGISTRY}`, `执行 npm login --registry ${REGISTRY} --scope=@virt-list`);
} else {
  ok(`已登录：${who.stdout}`);
}

step(`写入版本号 ${version}`);
writeVersions(pkgs, version);
// 此后任何失败都要把版本号改回去（发布成功后会解除）
rollbackOnFail = pkgs;
ok(`已更新 ${pkgs.length} 个 package.json${flags.dryRun ? c.dim('（dry-run 结束时回滚）') : ''}`);

step('运行测试');
if (flags.skipTests) {
  warn('已通过 --skip-tests 跳过');
} else {
  run('pnpm', ['test']);
  ok('测试通过');
}

step('构建所有包');
run('pnpm', ['build:packages']);
ok('构建完成');

step('发布到 npm');
const publishArgs = [
  'publish',
  '-r',
  '--filter',
  './packages/*',
  '--access',
  'public',
  '--tag',
  distTag,
  '--registry',
  REGISTRY,
  // 版本号此刻尚未提交，需跳过 pnpm 自带的 git 干净度检查
  '--no-git-checks',
];
if (flags.dryRun) publishArgs.push('--dry-run');

const published = run('pnpm', publishArgs, { allowFail: true });
if (published.status !== 0) {
  if (flags.dryRun) fail('dry-run 发布校验失败');
  // 可能已有部分包发布成功，此时回滚版本号会造成更大的不一致
  rollbackOnFail = null;
  fail(
    '发布失败',
    '部分包可能已发布成功，版本号改动保留在工作区。修复后重跑：\n' +
      `  pnpm publish -r --filter './packages/*' --access public --tag ${distTag} --registry ${REGISTRY} --no-git-checks\n` +
      '  （pnpm 会自动跳过已发布的版本）',
  );
}

if (flags.dryRun) {
  ok('dry-run 发布校验通过');
  step('清理');
  restoreVersions(pkgs);
  rollbackOnFail = null;
  ok('dry-run 结束，未产生任何实际变更');
  process.exit(0);
}

rollbackOnFail = null;
ok(`已发布 ${pkgs.length} 个包 @ ${version}`);

step('提交并打 tag');
run('git', ['add', 'packages/*/package.json']);
run('git', ['commit', '-m', `chore: release v${version}`]);
run('git', ['tag', `v${version}`]);
ok(`已创建 commit 与 tag v${version}`);

if (flags.push) {
  step('推送到远端');
  const pushed = run('git', ['push', '--follow-tags'], { allowFail: true });
  if (pushed.status !== 0) {
    warn('git push 失败，请手动执行：git push --follow-tags');
  } else {
    ok('已推送');
  }
} else {
  warn('已跳过 push，请手动执行：git push --follow-tags');
}

console.log(`\n${c.green('✓')} ${c.bold(`v${version} 发布完成`)}\n`);
