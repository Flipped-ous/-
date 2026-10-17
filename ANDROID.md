# 今日有序 Android

在现有 React 项目上增加 Capacitor Android 容器，页面资源和图标字体都随 APK 携带，不依赖电脑预览服务器。今天与待办的普通内容保持无动画；今天的筛选切换增加约 200ms 的整体列表过渡，筛选胶囊保留滑动。任务、项目和笔记使用手机应用自己的本地存储。

## 已接入

- Android 返回：先关闭弹层，再返回今天，首页再次返回将应用放到后台。
- 系统栏和显示缺口安全区、键盘缩放。
- 含图片的 ZIP 备份通过系统分享导出，兼容旧 JSON 导入；文件与图片使用系统选择器。
- 暖米白背景与砖红叶片原图标、离线图标字体。

1.1.0 接入官方 Local Notifications 8.3.1：真实权限、通知渠道、准确时间设置、任务截止／提前提醒、更新取消、重启恢复接收器及通知点击。浏览器不会发送系统通知，通知真实投递仍需真机确认。局域网仅预留接口，旧 APK 参考与办公室接入清单见 docs/SYNC.md。

当前包名 com.jinriyouxu.app、versionCode 6。旧 2.3.0 图标来源 APK 的包名为 cn.orderlife.mobile，两个应用不同，不能覆盖安装或自动迁移数据。请勿为换图标修改当前包名或签名。

## 环境与构建

- Node.js 24、pnpm 11.25.0。
- JDK 21、Android SDK platform 36、Build Tools 35.0.0。
- Gradle Wrapper 8.14.3（校验值已写入 wrapper 配置）。

```sh
pnpm install --frozen-lockfile
pnpm android:sync
```

在 `android/local.properties` 中填写当前电脑的 `sdk.dir`，并设置 `JAVA_HOME` 后，可在 Android Studio 打开 `android/`。

仅检查工程或生成调试包时，进入 `android/` 执行：

```powershell
# Windows
.\gradlew.bat assembleDebug
```

```sh
# macOS / Linux
./gradlew assembleDebug
```

Release 构建使用 `assembleRelease`。`pnpm android:apk` 是 Windows 的便捷构建命令，会先同步前端资源。

## 签名

将 `android/keystore.properties.example` 复制为 `android/keystore.properties`，填写原有签名配置。属性包含 `storeFile`、`storePassword`、`keyAlias`、`keyPassword`。真实配置与密钥仅保存在本地，被 gitignore 排除，仓库和工程 ZIP 不包含它们。

未配置签名时，Release 构建会生成未签名 APK；调试包使用调试签名。它们不能替代使用原密钥签名的覆盖安装包。

后续覆盖安装必须沿用同一签名密钥，并递增 android/app/build.gradle 的 versionCode。密钥备份单独交付，请与代码分开保存，不要放入公开仓库。

## 安装与数据

最低 Android 7（API 24），需要支持当前界面的 Android System WebView（111 或更新）。APK 与浏览器预览的数据互相独立，可通过完整 ZIP 备份迁移，兼容旧 JSON 导入。卸载或清除应用数据前，应先导出需要保留的数据。

构建检查和签名检查无法替代真机验收；当前没有连接 Android 设备，安装后的触屏、软键盘和文件分享仍需要在实际手机上确认。
