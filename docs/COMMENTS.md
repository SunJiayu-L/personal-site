# 评论、浏览量与管理后台

网站使用 Waline 提供匿名评论、每篇文章浏览量与评论数。生产端点固定为
`https://sun-waline-comments.vercel.app`；如需迁移或搭建预览环境，可用
`PUBLIC_WALINE_SERVER_URL` 覆盖它。

## 访问规则

- 访客无需登录即可评论。
- 昵称必填，邮箱可选；邮箱不会公开显示。
- 图片上传关闭，避免评论区被当作公共文件存储。
- 登录功能保留为可选项，便于管理员用已验证身份回复，但不是发表评论的前提。
- 不读取 QQ 号，也不请求 QQ 头像接口。

## 后端与管理

按照 Waline 官方 Vercel 部署流程创建服务并连接数据库。完成后：

1. 第一次访问 `https://sun-waline-comments.vercel.app/ui/register` 注册；第一个注册账号是管理员。
2. 此后从 `https://sun-waline-comments.vercel.app/ui` 登录，可审核、编辑、标记或删除评论并管理用户。

GitHub Actions 也支持可选的仓库变量 `PUBLIC_WALINE_SERVER_URL`（不含末尾斜杠），以便将来
对预览环境或迁移端点进行覆盖；它不是日常发布所必需的配置。

文章页会以稳定的站内路径作为 Waline 的统计键，同时显示浏览量和评论数。若将来迁移域名，
保持 `/personal-site/zh/...` 等路径不变即可延续已有数据。

Waline 的浏览量是页面浏览次数，不等同于独立访客，也不提供完整的来源渠道与设备分析。
如果需要 UV、来源、地域和设备趋势，应另行接入隐私友好的 Umami，而不要让两套工具重复计数。
