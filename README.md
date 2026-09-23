# Fieldnotes · 个人网站

基于 [Axi-Theme](https://github.com/Axi404/Axi-Theme) 二次开发，包含 **Blog / Academic / Course / Links / Friends** 五个栏目。保留 Apache-2.0 许可证与上游署名；使用了上游论文组件、图标、Tailwind 配置和 Shiki 转换器。

## 当前状态

本地设计预览已实现。展示名、个人介绍、博客、课程和论文条目中的示例均明确标注；这些内容不代表你的真实经历。**Notion / GitHub 插件账号已连接，Notion 七个数据库已建立；源码已上传至 SunJiayu-L/personal-site；尚未配置定时同步令牌，也未公开部署。** 见 [接入进度](docs/CONNECTIONS.md)。

当前品牌暂用 **Fieldnotes**。确认站名后，可修改 `src/site/Layout.astro` 中的导航与页脚名称及首页元信息。

## 本地运行

需要 Node.js 22 与 pnpm 11.19.0。进入本目录后运行：

```sh
pnpm install --frozen-lockfile
pnpm dev
```

打开 http://127.0.0.1:4321/zh/。英文首页为 /en/。

```sh
pnpm test
pnpm build
pnpm preview
```

构建会执行内容验证、Astro 类型检查、静态页面生成与 Pagefind 索引。开发预览使用本地全文搜索；构建后使用 Pagefind，并保留本地搜索后备。

## 页面与内容

- Blog：Research、Technical、Daily Life；标签、系列、归档、阅读时间、正文目录、代码复制。
- Academic：About Me、按年份排列的 Publications、Open-source Projects。
- Course：课程列表、课程目录、章节正文；支持公式、代码、表格、前后章节跳转。
- Links：按类别整理资源网站。
- Friends：友链、RSS 动态、本站信息复制；未填写朋友名单时显示真实空状态。
- 全站：中英切换、深浅色主题、响应式导航、站点地图、RSS、404 页面。

个人资料维护在 `src/site/catalog.json` 的 `profile` 中。主页暂用示例介绍，替换 name、title、bio、about 的 zh/en 内容，并填写 GitHub URL；邮箱、Scholar、CV 可选。不要虚构未提供的论文或成果。

示例文章位于 `src/content/entries/`，为 Markdown 正文与 JSON 值格式的 frontmatter。启用 Notion 同步后，此目录完全由 Notion 生成，请在 Notion 维护内容。同步前的本地版本保存在被 Git 忽略的 `.sync/` 目录。

## 连接 Notion

完整字段说明见 [Notion 使用说明](docs/NOTION.md)，机器可读模板位于 `config/notion-schema.json`。

1. 当前账号已建立专用后台，见接入进度；不要重复初始化。以下初始化步骤仅供另建一套后台时使用。
2. 初始化脚本默认只预览；在本地 `.env` 配置 `NOTION_SETUP_TOKEN` 与 `NOTION_PARENT_PAGE` 后执行：
   `node --env-file=.env scripts/setup-notion.mjs --apply`。
   该操作在指定父页面下创建七个数据库，逐步保存创建进度以便重试。
3. 网站日常同步使用单独的只读集成 `NOTION_TOKEN`，并将网站数据库授权给它。初始化用的写入凭证不要配置到 GitHub Actions。
4. 把 `.env.example` 复制为 `.env`，填写令牌与 data source IDs。数据库 ID 与 data source ID 不同；脚本输出位于 `.sync/notion-sources.env`。
5. 执行 `pnpm sync:notion`，然后 `pnpm sync:friends`、`node scripts/sync-github.mjs` 和 `pnpm build`。

Blog、Courses、Notes 三个数据源必须配置；其他数据源可选，未配置时保留 catalog 中对应列表。任何列表的示例条目必须在上线前替换或删除。

插件连接用于协助操作账号；定时同步使用 Notion API 凭证，不能仅靠插件登录。

## GitHub Pages 上线

1. 在你的账号创建 `personal-site` 仓库，将本项目代码上传到 main 分支，**不上传 node_modules、dist、.env、.sync**。
2. 仓库 Settings → Pages → Source 选择 GitHub Actions。
3. 在 Actions Secrets 中设置 `NOTION_TOKEN`；在 Actions Variables 中设置七项 `NOTION_*_SOURCE`。
4. 默认自动识别项目仓库路径：`https://用户名.github.io/personal-site/`。用户主页仓库 `用户名.github.io` 自动使用根路径。自定义域名时设置 `SITE_URL` 为 HTTPS origin（不带路径），`BASE_PATH` 可留空。
5. 填写真实个人资料，清除示例条目，最后把 catalog 中 `demo` 改成 false。首次上线建议发布一篇真实 Blog 文章。之后撤回最后一篇文章时，网站允许生成空列表，避免旧文章继续公开。
6. 配置完凭证并清除示例后，设置 Actions Variable `SITE_READY=true`，再手动运行 **Sync Notion and deploy Pages**。默认保持关闭；每次提交仍会运行 **Check website** 验证预览构建。

含有示例内容、无真实个人资料、或仍使用 example.com 时，正式构建会失败，以免误公开占位信息。预览构建 `pnpm build` 不受此限制。

工作流在 main 更新、手动触发和每小时第 17 分钟运行。GitHub 调度可能延迟；公开仓库长时间无活动（60 天）可能停用定时任务，可在 Actions 中重新启用。失败时在 Actions 查看日志，上一版网站继续提供服务。Notion 中撤回文章要等下一次成功部署才会从网站移除。

## 已知边界

- 尚未在你的真实 Notion 工作区和 GitHub 仓库端到端验证，账号连接后需要完成一次真实同步与部署。
- 不自动翻译文章。相同 TranslationKey 关联两种语言，没有译文时保留原文入口。
- 不支持的 Notion 块会报告 block ID 并阻止发布；不会静默删掉正文。支持清单见 Notion 使用说明。
- Notion 图片会复制为静态资源；暂不复制 Notion 托管的视频、PDF 等附件，请用稳定的外链。
- 朋友 RSS 源失败时不影响其他友链；本地有旧数据时保留旧数据。全新 CI 构建只有仓库中的已有动态可作为后备。
- 评论、访问统计与自定义域名未启用。

## 维护文件

- `src/site/catalog.json`：个人资料与结构化内容
- `src/site/`：网站布局、样式、栏目与正文
- `scripts/`：Notion / GitHub / RSS 同步、内容校验、构建
- `.github/workflows/pages.yml`：自动同步与部署
- `LICENSE`、`NOTICE`：上游许可证与改动说明
