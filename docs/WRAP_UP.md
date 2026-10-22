# 收工整理：数据与后台提醒

## 本地批量操作

`arrangeTasks` 只处理当前仍是待完成且日期不晚于今天的任务，返回完整任务数组、实际处理数、跳过数和最近一批排期快照。`commitTaskBatch` 在存储成功后才返回，调用者随后更新 React 状态；异常保留当前选择与输入，不能显示成功。现有 `saveStorageData` 串行写入完整快照并记录任务 syncMeta 修订。

撤销保存原始排期字段和操作后任务快照；只有当前任务仍与操作后快照一致才还原排期字段，并更新修改时间。后续任何编辑、完成或删除均阻止覆盖。记录只属于当前整理面板，不写进备份或业务同步。标记完成使用相同持久化边界。

## 原生桥接

WrapReminder 插件提供 getStatus、updateSnapshot、consumeLaunch 和 openWrapUp 事件。TS 镜像服务仅在对应业务快照持久化成功后调用 updateSnapshot；调用按顺序执行。首次读取原生持久化 revision，后续分配递增编号；原生拒绝旧编号覆盖，失败允许下一次业务保存或显式重试修复。

镜像内容：revision、enabled、HH:mm 时间和 tasks 数组（dueAt 毫秒、pending 布尔）。只使用应用私有 SharedPreferences，不保存任务标题、笔记正文或图片，不是第二个业务数据库。

WrapAlarmReceiver 通过显式 PendingIntent 接收系统闹钟，不依赖 WebView。每次触发按当前时区计算自然日，统计日期不晚于今天的待完成任务；数量为零或权限关闭时不通知。通知投递前持久化已提醒日期，防止重复广播和时区来回变化导致同日期重复。通知本身不改动任何任务。

下一次检查总是设为未来的本地 HH:mm：有精确闹钟权限时使用 setExactAndAllowWhileIdle，否则 setAndAllowWhileIdle。系统允许延迟；过了自然日的旧广播不补发。启动、应用恢复前台、开关／时间变化、BOOT_COMPLETED、TIME_SET、TIMEZONE_CHANGED、MY_PACKAGE_REPLACED 和精确权限变更重新安排；关闭开关取消闹钟。

点击通知携带专用启动标记。冷启动通过 consumeLaunch 读取并清除；已运行应用通过 openWrapUp 事件通知，业务数据加载后才展示整理。单项任务通知继续走现有 Local Notifications，不与收工通知 ID 混用。

系统实现参考：[Android 闹钟文档](https://developer.android.com/develop/background-work/services/alarms)。任务计划不是后台永久服务，强行停止应用及厂商省电仍可阻止执行。

## 后续电脑接入

本轮保留 tasks/projects/notes 同步接口，不接入网络。批量改期和撤销都是普通任务修订，后续使用同一字段映射、冲突及删除规则。收工开关、时间、已提醒日期、原生镜像、视图筛选与滚动位置不交换到其他设备。桌面日期／重复规则仍须按 SYNC.md 验证，不能用手机默认字段清空。
