const MODEL_LABS: readonly [RegExp, string][] = [
  [/^claude-/, "Anthropic"],
  [/^(?:gpt-|codex-)/, "OpenAI"],
  [/^(?:gemini-|gemma-?)/, "Google"],
  [/^deepseek-/, "DeepSeek"],
  [/^glm-/, "Z.ai"],
  [/^qwen/, "Alibaba"],
  [/^minimax-/, "MiniMax"],
  [/^kimi-/, "Moonshot AI"],
  [/^nemotron-/, "NVIDIA"],
  [/^mimo-/, "Xiaomi"],
  [/^(?:muse-|llama-)/, "Meta"],
  [/^ling-/, "Inclusion AI"],
  [/^(?:mistral|codestral|devstral|ministral|pixtral)-/, "Mistral AI"],
  [/^(?:command|aya)-/, "Cohere"],
  [/^phi-/, "Microsoft"],
  [/^grok-/, "xAI"],
  [/^sonar-/, "Perplexity"],
  [/^nova-/, "Amazon"],
  [/^jamba-/, "AI21 Labs"],
  [/^ernie-/, "Baidu"],
  [/^step-/, "StepFun"],
  [/^internlm-/, "Shanghai AI Lab"],
];

const PROVIDER_PREFIX_LABS: readonly [RegExp, string][] = [
  [/^reflection\//, "Reflection AI"],
  [/^(?:global|us)\.moonshotai\./, "Moonshot AI"],
  [/^z-ai\//, "Z.ai"],
  [/^(?:alibaba|qwen)\//, "Alibaba"],
  [/^nvidia\//, "NVIDIA"],
];

const MODEL_ALIASES = new Map([
  ["gemini-3-flash-a", "gemini-3-flash-preview"],
  ["gemini-4-argon-s", "gemini-4-argon"],
  ["gemini-pro-default", "gemini-4-argon"],
]);

const ACRONYMS = new Map([
  ["api", "API"],
  ["b", "B"],
  ["codex", "Codex"],
  ["deepseek", "DeepSeek"],
  ["flash", "Flash"],
  ["glm", "GLM"],
  ["gpt", "GPT"],
  ["it", "IT"],
  ["kimi", "Kimi"],
  ["llama", "Llama"],
  ["mini", "Mini"],
  ["minimax", "MiniMax"],
  ["nemotron", "Nemotron"],
  ["opus", "Opus"],
  ["oss", "OSS"],
  ["pro", "Pro"],
  ["qwen", "Qwen"],
  ["sonnet", "Sonnet"],
  ["super", "Super"],
  ["vl", "VL"],
]);

export function normalizeModelId(model: string): string {
  let id = model
    .trim()
    .toLowerCase()
    .replace(/\s*\((?:high|medium|low|thinking)\)\s*$/, "")
    .replace(/\s+/g, "-")
    .replace(/^~/, "")
    .replace(/^(?:global|us)\./, "")
    .replace(
      /^(?:antigravity-|deepseek\/|nvidia\/|alibaba\/|minimax\/|qwen\/|z-ai\/|cline-free\/|reflection\/|moonshotai\.)/,
      "",
    )
    .replace(/^gemini-(\d+)p(\d+)-/, "gemini-$1.$2-")
    .replace(/:free$/, "")
    .replace(/-free$/, "");

  if (id.startsWith("claude-")) {
    id = id.replace(/-20\d{6}$/, "").replace(/-(?:thinking|medium|high|low)$/, "");
  }

  if (id.startsWith("gemini-")) {
    id = id.replace(/-(?:control|tiered|trial|exp-[a-z]|n|low|medium|high)$/, "");
  }

  id = id.replace(/(\d)-(\d)(?=-|$)/g, "$1.$2");
  return MODEL_ALIASES.get(id) ?? id;
}

function titleWords(value: string): string {
  return value
    .split(/[-_]+/)
    .filter(Boolean)
    .map((word) => {
      const acronym = ACRONYMS.get(word);
      if (acronym) return acronym;
      if (/^\d+[a-z]+$/i.test(word)) {
        return word.replace(/[a-z]+$/i, (suffix) => suffix.toUpperCase());
      }
      if (/^[a-z]\d+(?:\.\d+)?[a-z]*$/i.test(word)) return word.toUpperCase();
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

export function modelDisplayName(id: string): string {
  let match = id.match(/^claude-(opus|sonnet|haiku)-(\d+(?:\.\d+)?)$/);
  if (match) return `Claude ${titleWords(match[1]!)} ${match[2]}`;

  match = id.match(/^claude-(\d+\.\d+)-(.+)$/);
  if (match) return `Claude ${match[1]} ${titleWords(match[2]!)}`;

  match = id.match(/^gemini-(\d+(?:\.\d+)?)-(.+)$/);
  if (match) return `Gemini ${match[1]} ${titleWords(match[2]!)}`;

  match = id.match(/^gpt-oss-(.+)$/);
  if (match) return `GPT-OSS ${titleWords(match[1]!)}`;

  match = id.match(/^gpt-(\d+(?:\.\d+)?)$/);
  if (match) return `GPT-${match[1]}`;

  match = id.match(/^gpt-(\d+(?:\.\d+)?)-(.+)$/);
  if (match) return `GPT-${match[1]} ${titleWords(match[2]!)}`;

  match = id.match(/^deepseek-v?(\d+(?:\.\d+)?)-(.+)$/);
  if (match) return `DeepSeek V${match[1]} ${titleWords(match[2]!)}`;

  match = id.match(/^deepseek-(.+)$/);
  if (match) return `DeepSeek ${titleWords(match[1]!)}`;

  match = id.match(/^glm-(\d+(?:\.\d+)?)$/);
  if (match) return `GLM-${match[1]}`;

  match = id.match(/^glm-(\d+(?:\.\d+)?)-(.+)$/);
  if (match) return `GLM-${match[1]} ${titleWords(match[2]!)}`;

  match = id.match(/^qwen(\d+(?:\.\d+)?)-(.+)$/);
  if (match) return `Qwen ${match[1]} ${titleWords(match[2]!)}`;

  match = id.match(/^minimax-m(\d+(?:\.\d+)?)(?:-(.*))?$/);
  if (match) {
    const suffix = match[2] ? ` ${titleWords(match[2])}` : "";
    return `MiniMax M${match[1]}${suffix}`;
  }

  match = id.match(/^gemma-?(\d+)(?:-(.*))?$/);
  if (match) {
    const suffix = match[2] ? ` ${titleWords(match[2])}` : "";
    return `Gemma ${match[1]}${suffix}`;
  }

  match = id.match(/^nemotron-(\d+(?:\.\d+)?)-(.+)$/);
  if (match) return `Nemotron ${match[1]} ${titleWords(match[2]!)}`;

  return titleWords(id.replace(/[/:]+/g, "-"));
}

export function modelLab(id: string, rawModel: string): string {
  const raw = rawModel.trim().toLowerCase();
  return (
    MODEL_LABS.find(([pattern]) => pattern.test(id))?.[1] ??
    PROVIDER_PREFIX_LABS.find(([pattern]) => pattern.test(raw))?.[1] ??
    "Unattributed"
  );
}
