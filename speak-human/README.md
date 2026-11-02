# Speak Human · 说人话

一个持续维护的中文语言风格 Skill，针对“看上去像人话，但读起来很 AI”的表达，以及 PPT、网页和文档中多余的说明性小字。

这不是 AI 作者鉴定器，也不是禁词表。重点是识别：为什么某句虽然语法正常，却在具体场景里显得被设计过头。

## 文件

- [SKILL.md](SKILL.md)：触发条件、语言规则、审校方式。
- [references/examples.md](references/examples.md)：中文表达反例与正常用法的边界。
- [references/artifact-copy.md](references/artifact-copy.md)：PPT、网页、仪表盘等可见成品的冗余文字审校。

## 用法

把 `speak-human` 文件夹放到支持 Agent Skills 的工具所使用的 skills 目录。也可以直接将 `SKILL.md` 和参考文件作为模型的风格指导文本使用，效果取决于平台调用方式。

## 继续更新

增加新案例优先修改 `references/examples.md`；如果发现新的跨场景写作习惯，再修改 `SKILL.md`。保持原句、上下文、违和机制和正常例外，不做绝对化词汇封禁。
