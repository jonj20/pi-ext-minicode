# pi-local-llm

为 [pi](https://github.com/earendil-works/pi) 和 minicode 添加本地 LLM 模型自动发现的扩展插件。

## 功能
- 自动探测本地 llama.cpp / Ollama / LMStudio / vLLM / LocalAI
- 默认端口：8080、18080（llama.cpp）、11434（ollama）、1234（lmstudio）、8000（vllm）
- 支持自定义端点配置（项目/全局均可）
- 提供 /local-models 命令：重新探测并用 UI 选择切换本地模型
- 兼容 models.json 的 localModels 配置
- 与标准 pi 的内置 llama.cpp 尽量避免冲突（仅在无内置时注册默认 llama.cpp）

## 安装方式
将本目录放到你的扩展路径，或使用 pi -e ./pi-local-llm 加载。

对于标准 pi 包形式，也可按 pi 包规范使用 pi install（本目录已按 pi-package 整理）。

## 配置

### 1) 独立配置文件 local-models.json（推荐）
优先级最高，支持两种格式：直接写配置，或放在 localModels 字段下。

项目配置（标准 pi 用 .pi/，minicode 用 .minicode/）：
- <cwd>/.pi/local-models.json
- <cwd>/.minicode/local-models.json

全局配置：
- ~/.pi/local-models.json
- ~/.minicode/local-models.json

示例：

``json
{
  "enabled": true,
  "probeOnStartup": true,
  "startupTimeoutMs": 1000,
  "timeoutMs": 2000,
  "endpoints": [
    { "name": "my-llama", "baseUrl": "http://localhost:8080" },
    { "name": "my-llama-18080", "baseUrl": "http://localhost:18080" },
    { "name": "ollama-custom", "baseUrl": "http://localhost:11434", "modelsPath": "/api/tags", "format": "ollama" }
  ]
}
``

也可以嵌套在 localModels：

``json
{
  "localModels": {
    "endpoints": [
      { "name": "llamacpp", "baseUrl": "http://127.0.0.1:8080" }
    ]
  }
}
``

### 2) models.json 兼容
在 <cwd>/.pi/models.json 或 ~/.pi/models.json（minicode 对应 .minicode/）中加入：

``json
{
  "localModels": {
    "probeOnStartup": true,
    "endpoints": [
      { "name": "llamacpp", "baseUrl": "http://localhost:8080" }
    ]
  },
  "providers": {
    "my-local": {
      "baseUrl": "http://localhost:19000/v1"
    }
  }
}
``

说明：
- providers.*.baseUrl 如果是 localhost/127.0.0.1/0.0.0.0 且没有 models 字段（或为空），且不是内置 provider，会被自动探测并注册
- providers.*.models 如果已显式配置模型列表，则不会被自动探测（避免覆盖显式配置）

### 3) 配置项说明
| 字段 | 类型 | 默认 | 说明 |
|---|---|---|---|
| enabled | boolean | 	rue | 是否启用插件 |
| probeOnStartup | boolean | 	rue | 启动时是否自动探测 |
| startupTimeoutMs | number | 1000 | 启动探测超时（毫秒） |
| 	imeoutMs | number | 2000 | /local-models 命令探测超时（毫秒） |
| endpoints | array | 默认端点列表 | 自定义端点列表，会叠加到默认端点上（按 aseUrl 去重） |

endpoints 项字段：
| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| 
ame | string | 是 | 注册到模型列表的 provider 名称（会显示为 
ame/model-id） |
| aseUrl | string | 是 | 服务根地址（http/https） |
| modelsPath | string | 否 | 模型列表路径，OpenAI 格式默认 /v1/models，Ollama 格式用 /api/tags |
| ormat | "openai" \| "ollama" | 否 | 响应格式，默认 openai |

## 使用
1. 启动本地服务（llama.cpp 8080/18080、ollama 11434 等）
2. 用 pi -e ./pi-local-llm 或 minicode 加载插件
3. 启动后会自动探测并注册本地模型
4. 在交互界面用 /model 或 /local-models 切换；也可用 /local-models 重新探测

## 注意事项
- 如果标准 pi 已有内置的 llama.cpp provider，插件会尽量不重复注册默认 llamacpp，避免冲突
- 不同 aseUrl 必须使用不同的 
ame，否则会归到同一个 provider 且只会用第一个 aseUrl
- 插件注册时会用 piKey: "unused" 并设置 pi: "openai-completions"
- Ollama 会额外调用 /api/show 获取上下文长度（超时受 	imeoutMs 控制）
- 8080 同时也被 localai 的默认端点使用，实际会按 aseUrl 去重（llamacpp 会优先保留）

## 文件结构
`
pi-local-llm/
├── package.json
├── tsconfig.json
├── README.md
└── src/
    ├── index.ts
    ├── config.ts
    ├── probe.ts
    └── json.ts
`
