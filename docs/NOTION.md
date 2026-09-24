# Notion 内容管理

API 版本固定为 2026-03-11，使用 data source 查询接口。只有 **Published 复选框勾选** 的行会进入网站。数据库无需公开到互联网，只需授权给只读集成。

## 数据库字段

字段名区分大小写。config/notion-schema.json 和初始化脚本提供精确字段定义。所有数据库的 Title 为标题字段，Published 为复选框，默认不勾选。

### Blog

- Title：文章标题。
- Slug：唯一的英文网址标识，例如 reading-a-paper；仅小写字母、数字和连字符。research、technical、daily-life 为保留值。
- Language：单选 zh / en。
- Description：摘要。
- Date：发布日期。
- Category：单选 research / technical / daily-life。
- Tags：多选标签。
- TranslationKey：可选，两种语言的同一篇文章填相同值；每种语言内不可重复。
- Series：可选系列名称，建议短名称，不使用斜杠。
- 正文直接写在文章页面内。

### Courses

- Title / Title EN：中英文课程名称。
- Slug：唯一英文课程标识。
- Description / Description EN：中英文课程介绍。
- Code：简短课程编号，例如 ML / 01。
- Status：单选 learning / reviewing / completed。
- Source：原课程 URL，可选。
- Published：课程是否公开。课程与其笔记均需勾选才可发布。

### Course Notes

与 Blog 共用 Title、Slug、Language、Description、Date、Tags、TranslationKey、Published；另有：

- Course：关联到 Courses 中唯一一门已发布课程。
- Order：章节排序数字，同一课程同一语言不可重复。
- 不使用 Category 和 Series，正文写在页面内。

### Publications

- Title：论文原文标题。
- Authors：JSON 数组，例如 [{"name":"你的姓名","isMe":true,"isEqual":true},{"name":"合作者"}]。
- Venue：会议或期刊名称。
- Year：数字年份。
- Type：conference / journal / workshop / preprint。
- Status：published / accepted / under-review / preprint。
- Abstract：摘要。
- Links：JSON 数组，例如 [{"type":"arxiv","href":"https://arxiv.org/abs/真实编号"},{"type":"code","href":"https://github.com/owner/repo"}]。
- 作者可选 isEqual（共同一作）、isCoreContributor、role（corresponding 或 project-leader）、homepage。

### Projects

Title / Title EN、Description / Description EN、Slug、Role / Role EN、URL、Published。

URL 为 GitHub 公开仓库时，构建会读取 Star 数、主要语言和仓库描述；项目介绍仍以你填写的文字为准。请求失败保留原有资料。

### Friends

Title、Description / Description EN、URL、Avatar（稳定图片地址）、RSS（RSS 或 Atom 地址）、Published。

不会从你的社交账号自动推断朋友关系；只展示你明确加入并勾选发布的条目。

## 支持的正文格式

支持段落、三级标题、加粗／斜体／删除线、行内代码、链接、有序与无序列表、待办项、引用、Callout、代码块、行内及块级公式、分隔线、图片、简单表格。Toggle 内容展开展示，分栏按正文顺序展开。

网页嵌入和公开视频转换为外链。Notion 目录块由网站目录替代。子页面、子数据库、同步块和未知块会报错并中止同步，需要改为支持的正文或普通链接。

图片支持 PNG、JPEG、WebP、GIF、AVIF，单张最多 20 MB。复制图片时不会向图片服务器发送 Notion 令牌。外部图床如果需要跳转或登录，需改为可直接下载的图片地址。

## 发布和撤回

1. 完成文章标题、摘要、Slug、语言和发布日期。
2. 课程笔记再设置 Course 和 Order；博客选择 Category。
3. 勾选 Published。
4. 等待下一次同步，或手动运行 GitHub Actions。
5. 取消 Published 后，下次成功部署移除对应页面、搜索条目及 RSS 项目。

同步先在暂存目录生成完整内容，通过结构校验后替换旧文件。API 错误、权限错误、缺失关联或不支持的块均不会替换现有内容；构建失败也不会部署。

## 凭证

NOTION_SETUP_TOKEN 仅用于初始化，需能在指定父页面创建数据库。
NOTION_TOKEN 用于日常只读同步，仅授权网站所需数据库。
令牌放在本地 .env 或 GitHub Actions Secrets，不要填写到文章正文、仓库代码或聊天消息中。
