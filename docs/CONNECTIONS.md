# 账号接入进度

GitHub 已验证连接账号 SunJiayu-L，网站仓库为 https://github.com/SunJiayu-L/personal-site 。个人主页及中英文姓名“孙嘉渝 / Jiayu Sun”已填入网站。

Notion 已创建独立私有后台：[个人网站 · 内容管理](https://app.notion.com/p/3e4238b26d3181b58d82f903fea6325d)。七个数据库及 Notes → Courses 关联均已建立，当前为空，不会自动发布已有私人笔记。

数据源 ID 已保存于本机 `.sync/notion-sources.env`，该文件不会提交 Git。不要重复运行初始化脚本，否则会创建另一套数据库。

定时同步仍需单独的 Notion 只读集成令牌，并授权访问上述后台；插件连接不能代替 GitHub Actions 的 NOTION_TOKEN。请将令牌保存为仓库的 Actions Secret，不要发送到聊天中。数据源 ID 应保存为同名 Actions Variables。

网站尚未公开部署。个人简介、真实论文及首批文章仍待提供。完成配置后设置仓库变量 `SITE_READY=true` 才会启用部署；默认仅运行源码检查。
