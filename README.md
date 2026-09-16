# Yao 的博客

基于 [Fuwari](https://github.com/saicaca/fuwari)（Astro + Tailwind）的个人博客，托管在 GitHub Pages。

## 常用命令

```bash
pnpm dev          # 本地开发预览（http://localhost:4321/blog/）
pnpm build        # 构建 + Pagefind 搜索索引
pnpm preview      # 预览构建产物
pnpm sync         # 从 Obsidian 库同步白名单文章（见下）
pnpm new-post     # 手动新建文章
```

## 内容发布流程（与 Obsidian 个人管理系统对接）

1. 在 Obsidian 库（`E:\个人管理系统2.0`）里完成文章的**脱敏与改写**
2. 把文件加入白名单 `scripts/publish-whitelist.json`（src 路径 + slug + 分类/标签/描述）
3. 运行 `pnpm sync`，脚本会自动：
   - 剥离库内的元信息块（用途/更新频率/存放位置）
   - 去掉正文首行 H1（页面已渲染标题）
   - 把 `[[双链]]` 转为站内链接（目标已发布）或纯文本（目标未发布）
   - 注入 Astro frontmatter，输出到 `src/content/posts/<slug>.md`
4. `pnpm build` 本地验证后 push，GitHub Actions 自动部署

**安全约定**：白名单制——只有显式列入 `publish-whitelist.json` 的文件才会被发布，密码、日记、财务、健康、关系等目录永远不会进入管道。

## 新增一个项目

1. 复制 `src/content/projects/_template.md` 为 `英文-slug.md`
2. 填写 frontmatter（name / description / tags / status / url / repo / order）
3. 把 `published` 改为 `true`（`false` 或缺省视为草稿，生产构建不收录）
4. push 即上线

`status` 拼错（未命中 进行中 / 规划中 / 已完成 分组）不会导致构建失败，但构建日志会出现 `[projects] status 未命中分组` 警告，且该项目不会显示。

## 站点结构

| 路由 | 页面 | 内容来源 |
|---|---|---|
| `/` | 首页文章流 | `src/content/posts/` |
| `/archive/` | 归档 + 分类/标签筛选 | 自动 |
| `/posts/<slug>/` | 文章详情 | 同步产物 |
| `/projects/` | 项目展示 | `src/content/projects/` |
| `/now/` | 近况（每月更新） | `src/content/spec/now.md` |
| `/about/` | 关于 | `src/content/spec/about.md` |

## 站点配置

核心配置集中在 `src/config.ts`：站点标题、主题色（hue）、导航栏、个人资料。
`astro.config.mjs` 里的 `site`/`base` 决定部署 URL——**仓库改名时只需改这一处**。

## 部署（GitHub Pages）

1. 在 GitHub 创建**公开**仓库 `blog`
2. `git remote add origin https://github.com/Yao-MY06/blog.git && git push -u origin main`
3. 仓库 Settings → Pages → Source 选 **GitHub Actions**
4. 之后每次 push 到 main 自动构建部署：`https://Yao-MY06.github.io/blog/`

历史已压缩为单提交。上游模版地址：https://github.com/saicaca/fuwari ，如需吸收上游更新，参考上游仓库手动对比合并。

## 已做的定制（相对上游 Fuwari）

- 中文站点（zh_CN）+ 中文系统字体栈
- 主题色固定 hue 210，隐藏访客调色板；无横幅；TOC 深度 3
- 修复上游快照样式入口缺失（GlobalStyles 引入全部样式文件）
- CJK 阅读时长统计（中文 400 字/分钟，修正原版按英文分词严重偏小的问题）
- 新增 /projects /now 两页 + 404 页 + 首页统计条 + 导航五项
- Footer / 搜索框中文化
- Obsidian 同步脚本 + 白名单 + 部署流水线（见上）
