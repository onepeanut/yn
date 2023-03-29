# Yarn Note 编译手册

[源码](https://github.com/purocean/yn)

## 编译环境（Windows）

1. Node 16.0.0
2. Python 3
3. Visual Studio

## 下载依赖

1. `npm i -g yarn`
2. `yarn install`
3. `npm install electron@16.0.0`（按需执行）
4. `npm install --save-dev electron-rebuild`（按需执行）

## 编译打包

1. `npm run rebuild-pty`
2. `npm run build`
3. 启动：`npm run start`
4. 打包：`npm run dist-win64`

### 打包命令

```json
    "dist-win64": "electron-builder --win --x64",
    "dist-mac": "electron-builder --mac --dir=outMac",
    "dist-linux": "electron-builder --linux --x64"
```

## 程序配置

1. 图片路径：`./.{docBasename}`;

## 其它

1. 破解文件：`src\renderer\others\premium.ts`

## 常见问题

1. 网络问题导致无法下载依赖，修改仓库；以 `.npmrc`为例：

```ini
registry=https://mirrors.huaweicloud.com/repository/npm/
chromedriver_cdnurl=https://mirrors.huaweicloud.com/chromedriver
electron_mirror=https://mirrors.huaweicloud.com/electron/
electron_builder_binaries_mirror=https://mirrors.huaweicloud.com/electron-builder-binaries/
```

3. 修改仓库还是无法下载依赖：删除 `yarn.lock`文件后重试
4. 依赖可以正常下载，但是执行命令失败: `npm i -g npm@latest` 或者 `npm i node-gyp@latest`
5. 安装设置 msvs 版本

```shell
# 管理员运行
npm install --global --production windows-build-tools
# 普通用户执行
npm config set msvs_version 2019

```
