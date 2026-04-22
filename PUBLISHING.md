# pnpm 多包管理与发布流程

本项目使用 **pnpm workspace** 管理多个 npm 包。本文档说明日常开发、版本管理和发布的完整流程。

## 仓库结构

```text
virt-list/
├── packages/           # 可发布的 npm 包
│   ├── core/           # @virt-list/core   — 零依赖算法内核
│   ├── vanilla/            # @virt-list/vanilla    — DOM 层实现
│   ├── vue/            # @virt-list/vue    — Vue 组件
│   └── react/          # @virt-list/react  — React 组件
├── docs/               # VitePress 文档站 + demo 微应用（不发布）
├── package.json        # 根 package.json（private: true）
├── pnpm-workspace.yaml # workspace 配置
└── vitest.config.ts    # 测试配置
```

## 包依赖关系

```text
@virt-list/core        ← 零依赖
    ↑
@virt-list/vanilla         ← dependencies: core
    ↑
@virt-list/vue         ← dependencies: core + dom, peerDep: vue ≥3.2
@virt-list/react       ← dependencies: core + dom, peerDep: react ≥18
```

构建顺序：**core → dom → vue + react（并行）**

## 日常开发

### 安装依赖

```bash
pnpm install
```

### 启动开发环境

```bash
# 同时启动文档站 + 所有 demo 微应用
pnpm dev

# 单独启动
pnpm dev:docs      # VitePress 文档站 (port 5173)
pnpm dev:vanilla        # JS demo (port 7101)
pnpm dev:vue       # Vue demo (port 7102)
pnpm dev:react     # React demo (port 7103)
```

### 运行测试

```bash
pnpm test          # 运行所有测试（一次性）
pnpm test:watch    # 监听模式
```

### 类型检查

```bash
pnpm typecheck     # 检查文档站 + demo 应用
```

## 添加依赖

### 给某个包添加依赖

```bash
# 给 @virt-list/vanilla 添加运行时依赖
pnpm --filter @virt-list/vanilla add <package-name>

# 给 @virt-list/react 添加开发依赖
pnpm --filter @virt-list/react add -D <package-name>
```

### 给根目录添加开发依赖

```bash
pnpm add -Dw <package-name>
```

### 包间依赖（workspace 内部引用）

在 `package.json` 中使用 `workspace:*`：

```json
{
  "dependencies": {
    "@virt-list/core": "workspace:*"
  }
}
```

发布时 pnpm 会自动将 `workspace:*` 替换为实际版本号。

## 构建

### 构建所有包

```bash
pnpm build:packages
```

按依赖顺序执行：core → dom → vue + react（并行）。

### 构建单个包

```bash
pnpm --filter @virt-list/core run build
```

### 清理构建产物

```bash
pnpm clean:packages
```

### 构建文档站

```bash
pnpm build
```

## 版本管理与发布

### 前置条件

1. 确保 npm 已登录：`npm login`（或 `npm login --scope=@virt-list`）
2. 确保工作区干净：`git status` 无未提交更改
3. 确保所有测试通过：`pnpm test`
4. 确保构建成功：`pnpm build:packages`

### 方式一：使用 changeset（推荐）

[Changesets](https://github.com/changesets/changesets) 是管理多包版本和 changelog 的标准工具。

#### 初始化（首次使用）

```bash
pnpm add -Dw @changesets/cli
pnpm changeset init
```

#### 日常使用流程

```bash
# 1. 创建 changeset（在功能开发完成后）
pnpm changeset
# 交互式选择变更的包和版本升级类型（patch/minor/major）

# 2. 提交 changeset 文件
git add .changeset/
git commit -m "chore: add changeset"

# 3. 发布前：消费 changeset，更新版本号和 CHANGELOG
pnpm changeset version
# 检查生成的版本变更是否正确
git add .
git commit -m "chore: release packages"

# 4. 构建 + 发布
pnpm build:packages
pnpm changeset publish
# 或手动指定：pnpm -r publish --access public

# 5. 推送 tag
git push --follow-tags
```

### 方式二：手动发布

```bash
# 1. 手动修改各包的 version
# packages/core/package.json  → "version": "1.1.0"
# packages/vanilla/package.json   → "version": "1.1.0"
# ...

# 2. 构建
pnpm build:packages

# 3. 发布（按依赖顺序）
pnpm --filter @virt-list/core publish --access public
pnpm --filter @virt-list/vanilla publish --access public
pnpm --filter @virt-list/vue publish --access public
pnpm --filter @virt-list/react publish --access public

# 4. 创建 git tag
git tag v1.1.0
git push --tags
```

### 版本号约定

遵循 [Semantic Versioning](https://semver.org/)：

- **patch** (1.0.x)：bug 修复，不影响 API
- **minor** (1.x.0)：新增功能，向后兼容
- **major** (x.0.0)：破坏性变更

建议所有包保持统一版本号，便于用户理解兼容性。

### 预发布（Pre-release）

```bash
# 发布 beta 版
pnpm --filter @virt-list/core publish --tag beta --access public
pnpm --filter @virt-list/vanilla publish --tag beta --access public
pnpm --filter @virt-list/vue publish --tag beta --access public
pnpm --filter @virt-list/react publish --tag beta --access public
```

### 发布前检查清单

- [ ] `pnpm test` 全部通过
- [ ] `pnpm build:packages` 构建成功
- [ ] 各包 `dist/` 目录包含 `.js`、`.d.ts`、`.js.map` 文件
- [ ] `package.json` 中 `version` 已更新
- [ ] `workspace:*` 会被自动替换为实际版本号
- [ ] `files` 字段正确（`dist` + `src` 用于 CSS 和源码映射）
- [ ] `exports` 字段正确配置
- [ ] `peerDependencies` 版本范围合理
- [ ] 工作区无未提交更改
- [ ] CHANGELOG 已更新（如使用 changeset 则自动生成）

## 发布后验证

```bash
# 验证包内容
npm pack --dry-run --workspace=packages/core
npm pack --dry-run --workspace=packages/vanilla

# 在新项目中测试安装
mkdir /tmp/test-virt-list && cd /tmp/test-virt-list
npm init -y
npm install @virt-list/vue
```

## CI/CD 集成

### GitHub Actions 示例

```yaml
name: Release
on:
  push:
    branches: [main]

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
          registry-url: https://registry.npmjs.org/

      - run: pnpm install --frozen-lockfile
      - run: pnpm test
      - run: pnpm build:packages

      - name: Publish
        run: pnpm changeset publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## 常见问题

### Q: `workspace:*` 发布后会变成什么？

pnpm publish 会自动将 `workspace:*` 替换为当前 workspace 中对应包的实际版本号。例如 `"@virt-list/core": "workspace:*"` 会变成 `"@virt-list/core": "1.0.0"`。

### Q: 如何只发布其中一个包？

```bash
pnpm --filter @virt-list/core publish --access public
```

但要注意：如果该包的依赖包也有版本变化，需要先发布依赖包。

### Q: 构建报错 "not under rootDir"？

各包的 `tsconfig.build.json` 不应继承含有 `paths` 的根 tsconfig。当前已配置为独立的 tsconfig，不使用 `paths`。

### Q: 新增一个包的步骤？

1. 在 `packages/` 下创建目录和 `package.json`
2. `pnpm-workspace.yaml` 已通过 `packages/*` 通配符覆盖
3. 添加 `tsconfig.build.json`
4. 在根 `package.json` 的 `build:packages` 中添加构建顺序
5. 运行 `pnpm install` 让 pnpm 识别新包
