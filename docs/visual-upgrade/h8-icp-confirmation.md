# CarbonAI H8 ICP 备案信息确认记录

> 日期：2026-10-13

## 确认信息

站点主体确认 CarbonAI 网站唯一备案信息为：

**粤ICP备2026140571号**

网站不展示第二条 ICP 或公安联网备案信息。

## 修改

- 页脚备案组件固定显示已确认的唯一备案号。
- 备案链接继续指向工信部备案系统：<https://beian.miit.gov.cn/>。
- 移除第二条公安备案的渲染分支和环境变量示例。
- 更新审计、验收、发布与进度文档中的“待确认”表述。

## 构建与发布

- `npm run build`：通过，2,981 个模块。
- 上传包 SHA-256：`0294cf5677c8260c546bef97a49acfe6dabb68f0aec01e7e4e1ef84c9f9861cd`。
- 生产 `index.html` SHA-256：`56059b0a1350b3295a7fe34833908d9fd8aba7f1392fb5be09b5a93ac2dc1efc`。
- 回滚目录：`/opt/carbonai/releases/frontend-dist-20261013-h8-icp-02`。
- Nginx 配置检查通过；后端 `carbonai-api` 保持 active。

## 生产验证

浏览器读取生产页 `.icp-record a`：

- 链接数量：1。
- 文字：`粤ICP备2026140571号`。
- 地址：`https://beian.miit.gov.cn/`。
- 页面错误：0。
