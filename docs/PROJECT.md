# 今日有序项目文档

## 当前状态

版本 **1.2.8 / versionCode 15**，Android 包名 `com.jinriyouxu.app`。React + TypeScript + Vite + Capacitor，五个入口：今天、待办、项目、笔记、更多。保持暖米白、砖红和鼠尾草绿，默认轻动效并尊重系统减少动态效果。

## 模块与维护入口

| 模块 | 入口与职责 |
| --- | --- |
| 应用与持久化 | `src/App.tsx` 加载本地数据、保存后镜像、处理原生入口，等待数据加载再打开目标 |
| 今天与日历 | `src/views/TodayView.tsx`、`TasksView.tsx`，状态／重要程度组合、周月历、全局搜索与会话视图恢复 |
| 项目 | `src/views/ProjectsView.tsx` 与项目组件，列表展开、任务／笔记详情、左滑删除和安全解绑 |
| 笔记 | `src/components/NoteWorkspace.tsx` 与服务，知识／复盘、Tiptap 编辑、附件、复习和项目关联 |
| 提醒与整理 | `src/services/reminders.ts`、原生 WrapReminder 与策略类，单项通知及每日检查；详见 WRAP_UP |
| 桌面小组件 | `src/services/todayWidget.ts`、原生 TodayWidgetPlugin／Provider／Policy、`res/layout/today_widget.xml` |
| 设置与连接 | `src/views/MoreView.tsx`、`SyncConnectionControl.tsx`；顶部展开连接卡片，真实传输尚未接入 |
| 存储与备份 | `src/services/`，IndexedDB v3、独立附件、完整 ZIP 和旧 JSON 导入 |

原生类位于 `android/app/src/main/java/com/jinriyouxu/app/`。测试放在前端 `*.test.ts` 和 `android/app/src/test/`；生产初始化为空，遗留清理辅助未接入启动流程。

## 关键约束

- 先成功持久化再显示保存成功、更新原生提醒与组件镜像；失败保留输入并允许重试。
- 覆盖升级保留已有数据，不自动删除旧示例；项目删除保留任务和笔记并解除关联。
- 同步仓储与传输接口分离，稳定 ID、修订与删除标记保留；当前扫码和配对按钮不启用，不承诺已接入电脑同步。
- 小组件仅展示今日未完成任务与添加入口；点击行进入 App 编辑，不在原生镜像中直接完成任务。
- 每日收工为原生后台检查，不依赖 WebView 常驻；系统权限和厂商策略可能影响投递。
- 主题、提醒和动画偏好属于设备设置；签名密钥与本机配置不能进入仓库。

## 开发与验收

Node.js 24、pnpm 11.25.0：`pnpm install --frozen-lockfile`，`pnpm dev` 启动预览，`pnpm check` 执行类型检查、测试和构建。Android 使用 JDK 21、SDK 36、Build Tools 35.0.0、Gradle 8.14.3；运行 `pnpm android:sync` 后，在 Android 工程执行 `assembleRelease testReleaseUnitTest lintVitalRelease`。签名配置见 ANDROID。

CI 检查 Windows／Ubuntu 与 UTC／Asia/Shanghai 组合的前端检查。Android Release 与签名验证目前在本地执行；仓库不上传签名秘密。

## 文档索引

- [开发与安装](../README.md)、[Android 构建与签名](../ANDROID.md)
- [版本日志](../CHANGELOG.md)、[2026-10-20 日志](DAILY_LOG_2026-10-20.md)、[1.2.6 说明](RELEASE_1.2.6.md)
- [验证记录与真机待办](VALIDATION.md)、[桌面小组件](WIDGET.md)、[收工整理](WRAP_UP.md)
- [电脑同步接入边界](SYNC.md)、[仅供讨论的精简建议](SIMPLIFICATION.md)

1.2.7补充：Project.order及projectRepository.reorderProject负责事务排序；backupReceipt是本机导出记录，BackupExportPlugin负责系统文件写入回执；HelpDialog提供操作指南。笔记首页改为共享紧凑标题和图标搜索。见[本轮日志](DAILY_LOG_2026-10-23.md)。

1.2.8补充：projectDrag计算拖动预览槽位，ProjectsView冻结显示列表配合SwipeableProject松手保存；useSearchDismissal订阅独立键盘事件；CompactEntry统一日历工具行。详见[本轮补充日志](DAILY_LOG_2026-10-23_1.2.8.md)。
