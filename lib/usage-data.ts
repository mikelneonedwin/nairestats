import "server-only";
import { modelDisplayName, modelLab, normalizeModelId } from "./model-identity";

const API_BASE_URL = "https://tokenaires.cc/api/v1";
const PAGE_LIMIT = 1000;
const REQUEST_CONCURRENCY = 8;
const CACHE_SECONDS = 600;

const SOURCES = [
  ["claude-code", "Claude Code"],
  ["codex", "Codex"],
  ["gemini-cli", "Gemini CLI"],
  ["antigravity", "Antigravity"],
  ["opencode", "OpenCode"],
  ["kimi-code", "Kimi Code"],
  ["qwen-code", "Qwen Code"],
  ["copilot-cli", "Copilot CLI"],
  ["cline", "Cline"],
  ["roo-code", "Roo Code"],
  ["kilo-code", "Kilo Code"],
  ["zcode", "ZCode"],
  ["zed", "Zed"],
  ["devin", "Devin"],
  ["deepseek-harness", "DeepSeek Harness"],
] as const;

type Source = (typeof SOURCES)[number][0];
type BoardEntry = {
  tokens: number;
  user: { handle: string };
};
type BoardPage = {
  entries: BoardEntry[];
  page: number;
  pageSize: number;
  totalEntries: number;
};
type Profile = {
  byModel: { model: string; tokens: number }[];
  totals: { total: number };
};
type ModelStats = {
  lab: string;
  name: string;
  tokens: number;
  users: Set<string>;
};
type UsageRow = {
  name: string;
  tokens: number;
  share: number;
  users: number;
};

export type UsageData = {
  harnesses: UsageRow[];
  models: UsageRow[];
  labs: UsageRow[];
  totalTokens: number;
  activeUsers: number;
  observedTokens: number;
  profileTokens: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isBoardPage(value: unknown): value is BoardPage {
  if (
    !isRecord(value) ||
    !Array.isArray(value.entries) ||
    !Number.isInteger(value.page) ||
    !Number.isInteger(value.pageSize) ||
    !Number.isInteger(value.totalEntries) ||
    typeof value.page !== "number" ||
    typeof value.pageSize !== "number" ||
    typeof value.totalEntries !== "number" ||
    value.pageSize < 1 ||
    value.totalEntries < 0
  ) {
    return false;
  }

  return value.entries.every(
    (entry: unknown) =>
      isRecord(entry) &&
      isNonNegativeNumber(entry.tokens) &&
      isRecord(entry.user) &&
      typeof entry.user.handle === "string",
  );
}

function isProfile(value: unknown): value is Profile {
  if (
    !isRecord(value) ||
    !isRecord(value.totals) ||
    !isNonNegativeNumber(value.totals.total) ||
    !Array.isArray(value.byModel)
  ) {
    return false;
  }

  return value.byModel.every(
    (item: unknown) =>
      isRecord(item) &&
      typeof item.model === "string" &&
      item.model.length > 0 &&
      isNonNegativeNumber(item.tokens),
  );
}

async function getJson<T>(
  path: string,
  params: Record<string, string | number>,
  isPayload: (value: unknown) => value is T,
): Promise<T> {
  const url = new URL(`${API_BASE_URL}${path}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value));
  }

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(url, {
      cache: "force-cache",
      next: { revalidate: CACHE_SECONDS },
      signal: AbortSignal.timeout(20_000),
    });

    if (response.ok) {
      const payload: unknown = await response.json();
      if (!isPayload(payload)) {
        throw new Error(`The server returned an invalid response for ${url.pathname}.`);
      }
      return payload;
    }

    if (response.status === 429 && attempt < 3) {
      const retryAfter = Number(response.headers.get("retry-after"));
      const delayMs =
        Number.isFinite(retryAfter) && retryAfter > 0
          ? retryAfter * 1000
          : 1000 * 2 ** attempt;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      continue;
    }

    const details = await response.text();
    throw new Error(
      `Request failed (${response.status}) for ${url.pathname}${url.search}: ${details}`,
    );
  }

  throw new Error(`Request kept getting rate limited: ${url.pathname}${url.search}`);
}

async function fetchBoardPage(
  source: Source | "all",
  page: number,
): Promise<BoardPage> {
  const board = await getJson(
    "/boards",
    { period: "all", source, page },
    isBoardPage,
  );
  if (board.page !== page) {
    throw new Error(`The server returned the wrong board page for page ${page}.`);
  }
  return board;
}

async function fetchAllBoard(
  source: Source | "all" = "all",
): Promise<BoardEntry[]> {
  const firstPage = await fetchBoardPage(source, 1);
  const pageCount = Math.ceil(firstPage.totalEntries / firstPage.pageSize);
  if (pageCount > PAGE_LIMIT) {
    throw new Error(`The ${source} board exceeds the server's ${PAGE_LIMIT}-page limit.`);
  }

  const remaining: BoardPage[] = [];
  for (let page = 2; page <= pageCount; page += 1) {
    remaining.push(await fetchBoardPage(source, page));
  }
  return [firstPage, ...remaining].flatMap((page) => page.entries);
}

async function fetchProfile(handle: string): Promise<Profile> {
  return getJson(`/users/${encodeURIComponent(handle)}`, {}, isProfile);
}

async function mapWithConcurrency<Input, Output>(
  items: readonly Input[],
  limit: number,
  callback: (item: Input) => Promise<Output>,
): Promise<Output[]> {
  const results = new Array<Output>(items.length);
  let nextIndex = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (nextIndex < items.length) {
        const index = nextIndex++;
        results[index] = await callback(items[index]!);
      }
    }),
  );
  return results;
}

export async function getUsageData(): Promise<UsageData> {
  const harnesses = await mapWithConcurrency(
    SOURCES,
    REQUEST_CONCURRENCY,
    async ([source, name]) => {
      const entries = await fetchAllBoard(source);
      return {
        handles: entries.map((entry) => entry.user.handle),
        name,
        tokens: entries.reduce((sum, entry) => sum + entry.tokens, 0),
        users: entries.length,
      };
    },
  );
  const activeUsers = new Set(harnesses.flatMap((harness) => harness.handles)).size;

  const allTimeEntries = await fetchAllBoard();
  const handles = [...new Set(allTimeEntries.map((entry) => entry.user.handle))];
  const profiles = await mapWithConcurrency(handles, REQUEST_CONCURRENCY, async (handle) => ({
    handle,
    profile: await fetchProfile(handle),
  }));

  const models = new Map<string, ModelStats>();
  let observedTokens = 0;
  let profileTokens = 0;

  for (const { handle, profile } of profiles) {
    profileTokens += profile.totals.total;
    const userModels = new Map<
      string,
      { lab: string; name: string; tokens: number }
    >();

    for (const item of profile.byModel) {
      const id = normalizeModelId(item.model);
      const existing = userModels.get(id);
      const lab = modelLab(id, item.model);
      userModels.set(id, {
        lab: existing?.lab === "Unattributed" ? lab : existing?.lab ?? lab,
        name: modelDisplayName(id),
        tokens: (existing?.tokens ?? 0) + item.tokens,
      });
      observedTokens += item.tokens;
    }

    for (const [id, userModel] of userModels) {
      const existing = models.get(id);
      const users = new Set(existing ? existing.users : []);
      users.add(handle);
      models.set(id, {
        lab:
          existing?.lab === "Unattributed"
            ? userModel.lab
            : existing?.lab ?? userModel.lab,
        name: userModel.name,
        tokens: (existing?.tokens ?? 0) + userModel.tokens,
        users,
      });
    }
  }

  const totalTokens = harnesses.reduce((sum, harness) => sum + harness.tokens, 0);
  const toRow = (
    name: string,
    tokens: number,
    users: number,
    total: number,
  ): UsageRow => ({
    name,
    tokens,
    share: total ? (tokens / total) * 100 : 0,
    users,
  });

  const harnessRows = harnesses
    .filter(({ tokens }) => tokens > 0)
    .sort((a, b) => b.tokens - a.tokens)
    .map((harness) => toRow(harness.name, harness.tokens, harness.users, totalTokens));

  const modelRows = [...models.values()]
    .sort((a, b) => b.tokens - a.tokens)
    .map((model) =>
      toRow(model.name, model.tokens, model.users.size, observedTokens),
    );

  const labs = new Map<string, { tokens: number; users: Set<string> }>();
  for (const model of models.values()) {
    const lab = labs.get(model.lab) ?? { tokens: 0, users: new Set<string>() };
    lab.tokens += model.tokens;
    for (const user of model.users) lab.users.add(user);
    labs.set(model.lab, lab);
  }

  const labRows = [...labs]
    .sort(([, a], [, b]) => b.tokens - a.tokens)
    .map(([name, lab]) => toRow(name, lab.tokens, lab.users.size, observedTokens));

  return {
    harnesses: harnessRows,
    models: modelRows,
    labs: labRows,
    totalTokens,
    activeUsers,
    observedTokens,
    profileTokens,
  };
}
