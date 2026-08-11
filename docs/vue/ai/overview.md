# AI 场景

AI 对话是虚拟滚动最难的一类场景：内容持续变化、高度完全不可预知、
用户和程序同时在滚动。先看效果——

<PlaygroundHost framework="vue" example-id="ai-streaming" />

点「提问」开始生成，试着在生成过程中向上滚、再滚回底部。
每个动作的预期行为见 [流式输出与贴底跟随](./streaming)。

这一节不是新的 API，而是把已有能力组合起来解决这类场景的方法。

<!--@include: ../../_shared/ai-overview.md-->
