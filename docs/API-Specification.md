# API Specification

Base URL：`http://localhost:3000/api`

统一响应：

```json
{ "code": 0, "data": {}, "message": "ok" }
```

错误响应同样使用统一结构，`code` 为 HTTP 状态码，`data` 为 `null`：

```json
{ "code": 503, "data": null, "message": "数据库连接失败，请确认 PostgreSQL 已启动且 DATABASE_URL 正确" }
```

## GET /api/health

健康检查，不依赖数据库。

```bash
curl http://localhost:3000/api/health
```

## GET /api/words

获取单词列表。

```bash
curl http://localhost:3000/api/words
```

## POST /api/words

新增单词。

```bash
curl -X POST http://localhost:3000/api/words \
  -H 'Content-Type: application/json' \
  -d '{"word":"persist","meaning":"坚持；持续","phonetic":"/pərˈsɪst/","example":"Keep practicing and persist."}'
```

## Postman

可直接复制上面的 cURL 到 Postman：File → Import → Paste Raw Text。
建议建立两个请求：`Health Check`、`List Words`，一个环境变量 `baseUrl = http://localhost:3000/api`。
