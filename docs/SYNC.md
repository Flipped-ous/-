# 手机与电脑：同步接入说明

更新：2026-10-18。状态：本地接口与契约验证；没有连接真实电脑。本机桌面 1.3.0 不代表办公室最新版，本轮未修改桌面源码。

## 旧 APK 中确认的行为

参考用户提供的 `cn.orderlife.mobile` 2.3.0。依据 APK 的 `assets/app/mobile.js` 和 `lan-model.js`：

- 电脑设置 → 手机与电脑 → 添加手机；手机扫码或粘贴一次性配对码。原生配对鉴权本轮没有实现。
- 两端保留本地数据；手机前台、互传开启且已有设备时每 15 秒同步，本地修改后约 800ms 尝试交换，后台暂停，回前台恢复。
- `/v1/sync` 两轮交换：先发送本地 revisions 和空 delta 接收电脑变化，再根据电脑 revisions 导出本地变化并交换。
- 先落盘缺失附件，再应用引用它的记录。附件按 SHA-256 编号；主题、提醒分别保留。
- 旧实体为 projects/tasks/resources/reviews，业务 JSON v2，局域网元数据 `lanSync.protocol=1`。

旧报文示例：

```json
{"revisions":{},"delta":{"protocol":1,"records":{"tasks:task_1":{"birth":[1,"phone_device"],"dead":null,"fields":{"[\"title\"]":{"s":[2,"phone_device"],"ctx":{"phone_device":1},"present":true,"value":"复习聊天总结"}}}}}}
```

`birth/dead` 和字段 `s` 是逻辑计数器＋设备 ID，ctx 为因果上下文。不能换成墙上时间做简单最后写入覆盖。旧版保留最近 30 条同字段冲突，重复任务 doneInstances 按日期拆分字段路径。旧 resources 图片不同于新版笔记图片节点。

## 本次接口

- `src/services/sync.ts`：SyncRepository 提供实体读取、按修订导出、附件读取和外部数据校验；SyncTransport 声明连接、交换、附件和断开，没有网络实现和远端写入。
- `src/services/legacyLanContract.ts`：旧字段时钟报文类型、参考常量和结构校验；LegacyLanAdapter 只声明后续适配边界。
- `notesRepository.ts` 保存笔记及内容编号图片；storage.ts 将任务／项目变化和删除标记记入 syncMeta。撤销删除产生新修订；恢复备份要求重建完整基线。

内部接口是 protocolVersion:1、记录数组、实体修订，能力包括任务／项目／笔记／图片／删除标记／扩展字段。**此版本不是旧版 protocol:1 线协议，两者不能直接互传。** requiresFullExchange 表示导入后需要完整基线，基线确认由后续适配器完成。

```ts
const entities = await syncRepository.readEntities();
const changes = await syncRepository.exportChanges(knownRevisions);
const check = syncRepository.validateIncoming(remoteCandidate);
const image = await syncRepository.readAttachment(sha256);
// 校验成功不等于可写入，没有 applyRemote 实现。
```

extensions 用于保留桌面未知字段。主题、通知授权、提醒偏好、磁盘路径、配对凭证不混入业务交换。附件仅用内容编号，禁止接受远端任意磁盘路径。

## 办公室接入前

1. 确认最新仓库与版本、配对码、端点鉴权、二维码和附件路由。仅连接明确授权的局域网端点，凭证保存在受保护的本机存储，不写日志。
2. 确认桌面的 title/done/plannedDate/dueDate/dueTime/important/urgency/repeat/doneInstances 与手机 title/status/dueAt/dueTime/priority 映射。手机不支持的重复规则、计划日期、手动进度保留并限制编辑，不能用缺省值清空。
3. 确认 notes 新实体或旧 resources/reviews 兼容封装。保留正文、复盘元信息、项目关联、来源、复习状态和图片；没有能力协商不发送未知 notes。
4. 确认稳定设备身份、因果版本、删除／恢复、重试和冲突规则。并发正文编辑保留可恢复副本，不能无提示覆盖。
5. 接收前备份原数据与附件，完整校验后原子应用。初次配对合并，不覆盖；断线仍可编辑，移除配对保留数据。

## 待双端验收

同 Wi-Fi／热点、地址变化、重启、初次合并、双方离线编辑、同字段冲突、删除及撤销不复活、附件校验与去重、中断重试、桌面特殊字段往返、暂停与后台停止连接、移除配对、备份恢复后的基线、错误凭证及协议不兼容。

本轮只有本地契约与旧报文结构检查，未验证真实传输。

## 1.2.0 收工整理接入边界

批量改期、暂不安排和撤销沿用普通 tasks 修订；没有增加绕过仓储的传输。收工提醒开关、HH:mm、原生镜像和提醒去重记录为本机偏好，不加入业务交换。旧桌面重复规则及计划日期仍需按前述字段映射验证。

## 1.2.1 项目删除

删除项目在同一事务中写入 projects 墓碑、关联 tasks/notes 的解绑与各自修订，正文和附件不变。撤销生成新修订，不回退全局修订号；已被后来编辑或删除的实体跳过关联恢复。本地短时撤销凭据不参与同步。当前仅验证仓储契约，真实双端删除传播仍待办公室接入验收。
