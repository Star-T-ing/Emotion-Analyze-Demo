# 情感大模型Demo

这是一个用于展示多模态情感分析与共情回复能力的前端应用。项目使用 Vite + React + TypeScript 构建，后端能力由调用**通义千问 Qwen-Omni-Flash** API 实现。

## 主要功能

-   **多模态输入**: 支持 `纯文本`、`纯音频` 以及 `文本 + 音频` 的混合输入。
-   **两步式智能响应**:
    1.  **情感分析**: 对用户的当前输入进行独立的情感分析，生成一份包含情绪摘要、量化得分和回复语气的报告。
    2.  **共情回复**: 结合完整的**对话历史**和刚刚生成的**情感分析报告**，生成一段有帮助的、带有共情语气的回复。
-   **上下文对话**: 支持多轮对话，模型能够“记住”之前的对话内容，进行连贯的交流。
-   **前端音频处理**: 在客户端进行录音、静音检测等预处理，提高健壮性并提供即时反馈。

## 技术栈

-   **框架**: React (Vite)
-   **语言**: TypeScript
-   **样式**: Tailwind CSS
-   **核心API**: 阿里云百炼 DashScope (Qwen-Omni-Flash)

## 快速开始

### 1. 前提条件

-   已安装 [Node.js](https://nodejs.org/)
-   拥有一个可用的**阿里云百炼 DashScope API Key**（获取地址: https://bailian.console.aliyun.com/?tab=model#/api-key）

### 2. 安装与配置

1.  **克隆项目**
    ```bash
    git clone https://github.com/Star-T-ing/Emotion-Analyze-Demo.git
    cd Emotion-Analyze-Demo/demo
    ```

2.  **安装依赖**
    ```bash
    npm install
    ```

3.  **配置API Key**
    -   在项目的根目录下，创建一个名为 `.env` 的新文件。
    -   在该文件中，添加以下内容，并将 `your_actual_api_key` 替换为您自己的 DashScope API Key：
        ```
        DASHSCOPE_API_KEY="your_actual_api_key"
        ```

### 3. 运行项目

执行以下命令来启动开发服务器：

```bash
npm run dev
```

启动成功后，应用将在 `http://localhost:3000` (或终端提示的其他端口)上运行。
