# pnpm 多包管理与发布流程

本项目使用 **pnpm workspace** 管理多个 npm 包。本文档说明日常开发、版本管理和发布的完整流程。

## 仓库结构

```text
virt-list/
├── packages/               # 可发布的 npm 包
│   ├── core/               # @virt-list/core          — 零依赖算法内核
│   ├── vanilla/            # @virt-list/vanilla       — DOM 层实现
│   ├── vue/                # @virt-list/vue           — Vue 3 组件
│   ├── vue2/               # @virt-list/vue2          — Vue 2 组件
│   ├── react/              # @virt-list/react         — React 18+ 组件
│   └── react-legacy/       # @virt-list/react-legacy  — React 16-17 组件
├── docs/                   # VitePress 文档站 + demo 微应用（不发布）
├── scripts/release.mjs     # 一键发布脚本
├── package.json            # 根 package.json（private: true）
├── pnpm-workspace.yaml     # workspace 配置
└── vitest.config.ts        # 测试配置
```

## 包依赖关系

```text
@virt-list/core              ← 零依赖
    ↑
@virt-list/vanilla           ← dependencies: core
    ↑
@virt-list/vue               ← dependencies: core + vanilla, peerDep: vue ≥3
@virt-list/vue2              ← dependencies: core + vanilla, peerDep: vue ^2.6/^2.7
@virt-list/react             ← dependencies: core + vanilla, peerDep: react ≥18
@virt-list/react-legacy      ← dependencies: core + vanilla, peerDep: react ≥16 <18
```

构建顺序：**core → vanilla → vue + vue2 + react + react-legacy（并行）**

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
pnpm dev:docs          # VitePress 文档站
pnpm dev:vanilla       # 原生 JS demo
pnpm dev:vue           # Vue 3 demo
pnpm dev:vue2          # Vue 2 demo
pnpm dev:react         # React 18+ demo
pnpm dev:react-legacy  # React 16-17 demo
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

按依赖顺序执行：core → vanilla → vue + vue2 + react + react-legacy（并行）。

每个包的 build 除了 `tsc`，还会跑一次 `scripts/build-styles.mjs`，把 vanilla 层的样式
汇总成自己的 `dist/style.css`（经 exports 的 `./style.css` 子路径对外）。样式的唯一副本
始终在 `packages/vanilla/src/`，改样式只改那里。

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

### 一键发布（推荐）

```bash
pnpm release            # patch：0.0.4 → 0.0.5
pnpm release minor      # 0.0.4 → 0.1.0
pnpm release major      # 0.0.4 → 1.0.0
pnpm release 1.2.3      # 显式指定版本号
```

`scripts/release.mjs` 会按顺序自动完成：

1. 检查 git 工作区是否干净（非 master 分支只告警）
2. 校验 6 个包版本号一致，计算目标版本
3. **向 registry 确认目标版本尚未发布**——npm 不允许覆盖已有版本，而这一步若留到第 8 步
   才发现，前面的测试与构建就全白跑了。本地版本号落后于线上时（例如本地 0.0.4 而线上
   已有 0.0.5，patch 算出来正好撞上）会在这里直接拦下并告诉你该对齐到哪个版本
4. 检查 npm 登录状态
5. 把新版本号写入全部 `packages/*/package.json`
6. `pnpm test`
7. `pnpm build:packages`
8. `pnpm publish -r --filter './packages/*'`（依赖拓扑序由 pnpm 决定，`workspace:*` 自动替换为真实版本号）
9. `git commit -m "chore: release vX.Y.Z"` + `git tag vX.Y.Z`
10. `git push --follow-tags`

> **必须用 `pnpm publish`，不能用 `npm publish`。** 只有 pnpm 会把 `workspace:*` 替换成
> 真实版本号；`npm pack` / `npm publish` 会把它原样写进 tarball，装的时候直接
> `EUNSUPPORTEDPROTOCOL: Unsupported URL Type "workspace:"`。

**先演练再发布**：

```bash
pnpm release:dry        # 走完整流程但不发布、不打 tag，结束时回滚版本号改动
```

任一步失败（测试不过、构建报错、未登录）都会自动回滚 `package.json` 的版本号改动，不留下半截状态。只有"发布已部分成功"这一种情况会保留版本号，此时按提示重跑 `pnpm publish` 即可 —— pnpm 会自动跳过已发布的版本。

可选参数：

| 参数 | 作用 |
| --- | --- |
| `--dry-run` | 演练模式，等价于 `pnpm release:dry` |
| `--tag <t>` | 指定 npm dist-tag，默认 `latest` |
| `--skip-tests` | 跳过 `pnpm test` |
| `--allow-dirty` | 允许工作区有未提交改动 |
| `--no-push` | 发布并打 tag，但不 `git push` |

环境变量 `RELEASE_REGISTRY` 可覆盖发布目标 registry，默认 `https://registry.npmjs.org/`。

> **注意 registry**：如果本机 `npm config get registry` 指向内网镜像（如公司私服），脚本仍会显式发往公共 npm；但 `npm login` 需要针对公共 registry 执行：
>
> ```bash
> npm login --registry https://registry.npmjs.org/ --scope=@virt-list
> ```

**约定**：6 个包始终共用同一个版本号。脚本会在版本号不一致时直接报错退出，要求先手动对齐。

### 前置条件

1. 确保 npm 已登录：`npm login --registry https://registry.npmjs.org/ --scope=@virt-list`
2. 确保工作区干净：`git status` 无未提交更改
3. 确保所有测试通过：`pnpm test`
4. 确保构建成功：`pnpm build:packages`

以上 2-4 项 `pnpm release` 会自动检查，手动发布时才需要自己确认。

### 方式一：使用 changeset（当前未启用）

> 本仓库目前采用上面的 `pnpm release` 脚本，未安装 changesets。以下内容供将来需要独立版本号 / 自动 CHANGELOG 时参考。

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
# 1. 手动把 6 个包的 version 改成同一个值
# packages/{core,vanilla,vue,vue2,react,react-legacy}/package.json

# 2. 构建
pnpm build:packages

# 3. 发布（-r 会自动按依赖拓扑序发布，无需手工排序）
pnpm publish -r --filter './packages/*' --access public \
  --registry https://registry.npmjs.org/ --no-git-checks

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
# 发布 beta 版：显式版本号 + beta dist-tag
pnpm release 0.1.0-beta.0 --tag beta
```

用户需显式安装才会拿到：`npm install @virt-list/vue@beta`。
beta 验证通过后回到正式版：`pnpm release 0.1.0`。

### 发布前检查清单

用 `pnpm release` 时，前 5 项由脚本自动保证，只需人工确认后 4 项；先跑一次 `pnpm release:dry` 可以一次性验证到"发布前"的所有环节。

- [x] `pnpm test` 全部通过 —— 脚本自动执行
- [x] `pnpm build:packages` 构建成功 —— 脚本自动执行
- [x] `package.json` 中 `version` 已更新 —— 脚本自动写入
- [x] `workspace:*` 会被自动替换为实际版本号 —— pnpm publish 自动处理
- [x] 工作区无未提交更改 —— 脚本自动检查
- [x] 构建产物能被 Node 直接 import —— `pnpm check:esm`，CI 里也有这一步
- [ ] 各包 `dist/` 目录包含 `.js`、`.d.ts`、`.js.map`，以及 `style.css`（core 除外）
- [ ] `files` 字段正确（`dist` + `src` 用于 CSS 和源码映射；`LICENSE` 与 `README` 由 npm 自动带上）
- [ ] `exports` 字段正确配置（含 `./style.css`）
- [ ] `peerDependencies` 版本范围合理

## 发布后验证

```bash
# 验证包内容（列出将被打进 tarball 的文件）
pnpm --filter @virt-list/core pack --dry-run
pnpm --filter @virt-list/vanilla pack --dry-run

# 确认 registry 上的版本
npm view @virt-list/vue version --registry https://registry.npmjs.org/

# 在新项目中测试安装
mkdir /tmp/test-virt-list && cd /tmp/test-virt-list
npm init -y
npm install @virt-list/vue
```

## CI/CD 集成

当前 `.github/workflows/ci.yml` 只跑测试与构建，发布是本地手动触发的（`pnpm release`）。

如果将来想改成推送 tag 即自动发布，可以加下面这个 workflow，并在仓库 Settings → Secrets 里配置 `NPM_TOKEN`。注意此时本地应改用 `pnpm release --no-push` 之外的方式：让 CI 负责发布，本地只负责改版本号和推 tag。

```yaml
name: Release
on:
  push:
    tags: ['v*']

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
        run: pnpm publish -r --filter './packages/*' --access public --no-git-checks
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## 常见问题

### Q: `workspace:*` 发布后会变成什么？

pnpm publish 会自动将 `workspace:*` 替换为当前 workspace 中对应包的实际版本号。例如 `"@virt-list/core": "workspace:*"` 会变成 `"@virt-list/core": "1.0.0"`。

### Q: 如何只发布其中一个包？

`pnpm release` 不支持只发一个包（6 包版本号是绑定的）。确有需要时手动发：

```bash
pnpm --filter @virt-list/core publish --access public \
  --registry https://registry.npmjs.org/
```

但要注意：如果该包的依赖包也有版本变化，需要先发布依赖包。

### Q: 发布中途失败了怎么办？

版本号改动会保留在工作区（不会自动回滚，否则和已发出去的包对不上）。直接重跑发布命令即可，pnpm 会跳过 registry 上已存在的版本：

```bash
pnpm publish -r --filter './packages/*' --access public \
  --registry https://registry.npmjs.org/ --no-git-checks
```

补发完成后再手动 `git commit` + `git tag`。

### Q: 构建报错 "not under rootDir"？

各包的 `tsconfig.build.json` 不应继承含有 `paths` 的根 tsconfig。当前已配置为独立的 tsconfig，不使用 `paths`。

### Q: 新增一个包的步骤？

1. 在 `packages/` 下创建目录和 `package.json`
2. `pnpm-workspace.yaml` 已通过 `packages/*` 通配符覆盖
3. 添加 `tsconfig.build.json`
4. 在根 `package.json` 的 `build:packages` 中添加构建顺序
5. 运行 `pnpm install` 让 pnpm 识别新包
