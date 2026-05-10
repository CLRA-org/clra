# Manifest 缓存说明

本目录包含通过GitHub Actions自动同步的所有工具manifest文件缓存。

## 目录结构

```
manifest-cache/
├── domains/           # 各个域名的manifest文件
│   ├── clib.cc.cd.json
│   ├── maxlhy0424.is-a.dev.json
│   └── ...
├── logs/              # 同步日志
│   └── sync-YYYY-MM-DD.log
├── metadata.json      # 缓存元数据
└── README.md          # 本文件
```

## 缓存文件格式

每个manifest文件包含原始数据和缓存元数据：

```json
{
  "name": "工具名称",
  "developer": "开发者",
  "version": "版本号",
  "description": "描述",
  "url": "项目主页",
  "download_url": [...],
  "icon_url": "图标地址",
  "_cache_meta": {
    "original_domain": "原始域名",
    "processed_domain": "处理后的域名",
    "sync_time": "同步时间",
    "sync_version": "同步版本"
  }
}
```

## 同步机制

- **频率**: BJT时间6-16点每小时同步一次
- **触发**: GitHub Actions定时任务
- **协议**: 优先HTTPS，失败时自动降级到HTTP
- **文件**: 支持clra_manifest.json和jfkl_manifest.json

## 元数据说明

### metadata.json
包含所有缓存工具的摘要信息：

```json
{
  "last_sync": "最后同步时间",
  "total_tools": "工具总数",
  "domains": [
    {
      "domain": "原始域名",
      "processed_domain": "处理后的域名",
      "name": "工具名称",
      "developer": "开发者",
      "version": "版本号",
      "sync_time": "同步时间"
    }
  ],
  "wildcard_mappings": {
    "*.example.com": "random123.example.com"
  }
}
```

## 错误处理

- 单个域名失败不影响整体同步
- 详细错误日志记录在logs目录
- 自动重试机制
- 降级策略保证可用性

## 使用方式

前端应用可以直接请求缓存文件：
```javascript
const response = await fetch('/manifest-cache/domains/clib.cc.cd.json');
const manifest = await response.json();
```

## 缓存更新

- 自动更新：GitHub Actions定时同步
- 手动更新：点击仓库的"Actions" → "Sync Manifests Cache" → "Run workflow"

## 注意事项

1. 缓存数据可能有1小时左右的延迟
2. 泛域名每次同步会生成新的随机字符串
3. 失败的域名会在下次同步时重试
4. 缓存文件包含完整的工具信息和元数据