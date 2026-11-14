#!/usr/bin/env node
import { modelDisplayName, modelLab, normalizeModelId } from "./lib/model-identity";

const API_BASE_URL = 'https://tokenaires.cc/api/v1';

const SOURCES = [
  ['claude-code', 'Claude Code'],
  ['codex', 'Codex'],
  ['gemini-cli', 'Gemini CLI'],
  ['antigravity', 'Antigravity'],
  ['opencode', 'OpenCode'],
  ['kimi-code', 'Kimi Code'],
  ['qwen-code', 'Qwen Code'],
  ['copilot-cli', 'Copilot CLI'],
  ['cline', 'Cline'],
  ['roo-code', 'Roo Code'],
  ['kilo-code', 'Kilo Code'],
  ['zcode', 'ZCode'],
  ['zed', 'Zed'],
  ['devin', 'Devin'],
  ['deepseek-harness', 'DeepSeek Harness'],
] as const;

const PAGE_LIMIT = 1000;
const NUMBER_FORMAT = new Intl.NumberFormat('en-US');
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
type HarnessStats = {
  handles: string[];
  name: string;
  tokens: number;
  users: number;
  entries: BoardEntry[];
};
type ModelStats = {
  lab: string;
  name: string;
  tokens: number;
  users: Set<string>;
  userTokens: Map<string, number>;
};
type LabStats = {
  name: string;
  tokens: number;
  users: Set<string>;
};

function help(): void {
  console.log(`Usage: bun usage-stats.ts [--help]

Options:
  --help                   Show this help

Harness, model, and lab usage are all-time. The public profile API has no period breakdown
and returns only each account's top 8 models.
Labs are inferred from model families; unknown models are grouped as Unattributed.`);
}

function parseArgs(args: string[]): { showHelp: boolean } {
  let showHelp = false;

  for (const arg of args) {
    if (arg === '--help' || arg === '-h') {
      showHelp = true;
      continue;
    }
    throw new Error(`Unknown option: ${arg}`);
  }

  return { showHelp };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function isBoardPage(value: unknown): value is BoardPage {
  if (
    !isRecord(value) ||
    !Array.isArray(value.entries) ||
    !Number.isInteger(value.page) ||
    !Number.isInteger(value.pageSize) ||
    !Number.isInteger(value.totalEntries) ||
    typeof value.page !== 'number' ||
    typeof value.pageSize !== 'number' ||
    typeof value.totalEntries !== 'number' ||
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
      typeof entry.user.handle === 'string',
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
      typeof item.model === 'string' &&
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
    const response = await fetch(url, { signal: AbortSignal.timeout(20_000) });
    if (response.ok) {
      const payload: unknown = await response.json();
      if (!isPayload(payload)) {
        throw new Error(`The server returned an invalid response for ${url.pathname}.`);
      }
      return payload;
    }

    if (response.status === 429 && attempt < 3) {
      const retryAfter = Number(response.headers.get('retry-after'));
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
  source: Source | 'all',
  page: number,
): Promise<BoardPage> {
  const board = await getJson('/boards', { period: 'all', source, page }, isBoardPage);
  if (board.page !== page) {
    throw new Error(`The server returned the wrong board page for page ${page}.`);
  }
  return board;
}

async function fetchAllBoard(
  source: Source | 'all' = 'all',
): Promise<BoardEntry[]> {
  const firstPage = await fetchBoardPage(source, 1);
  const pageCount = Math.ceil(firstPage.totalEntries / firstPage.pageSize);
  if (pageCount > PAGE_LIMIT) {
    throw new Error(`The ${source} board exceeds the server's ${PAGE_LIMIT}-page limit.`);
  }

  const remaining = await Promise.all(
    Array.from({ length: Math.max(0, pageCount - 1) }, (_, index) =>
      fetchBoardPage(source, index + 2),
    ),
  );
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
        const index = nextIndex;
        nextIndex += 1;
        const item = items[index];
        if (item === undefined) throw new Error('Missing item while reading profiles.');
        results[index] = await callback(item);
      }
    }),
  );
  return results;
}

function labStatsFor(models: Map<string, ModelStats>): Map<string, LabStats> {
  const labs = new Map<string, LabStats>();
  for (const model of models.values()) {
    const current = labs.get(model.lab) ?? {
      name: model.lab,
      tokens: 0,
      users: new Set<string>(),
    };
    current.tokens += model.tokens;
    for (const user of model.users) current.users.add(user);
    labs.set(model.lab, current);
  }
  return labs;
}

function oneBasedRows<Row>(rows: Row[]) {
  return Object.fromEntries(rows.map((row, index) => [index + 1, row] as const));
}

function printHarnessTable(
  harnesses: HarnessStats[],
  activeUsers: number,
): void {
  const total = harnesses.reduce((sum, harness) => sum + harness.tokens, 0);
  console.log('\nHarness usage, all-time');
  console.table(
    oneBasedRows(
      [...harnesses]
        .filter(({ tokens }) => tokens > 0)
        .sort((a, b) => b.tokens - a.tokens)
        .map(({ name, tokens, users }) => ({
          Harness: name,
          Tokens: NUMBER_FORMAT.format(tokens),
          Share: `${total ? ((tokens / total) * 100).toFixed(2) : '0.00'}%`,
          Users: NUMBER_FORMAT.format(users),
        })),
    ),
  );
  console.log(`Total harness usage: ${NUMBER_FORMAT.format(total)} tokens.`);
  console.log(
    `Distinct users across harnesses: ${NUMBER_FORMAT.format(activeUsers)}.`,
  );
}

function printModelTable(
  models: Map<string, ModelStats>,
  observedTokens: number,
  profileTokens: number,
): void {
  console.log('\nModel usage, all-time (observed profiles only)');
  console.table(
    oneBasedRows(
      [...models.values()]
        .sort((a, b) => b.tokens - a.tokens)
        .map(({ name, tokens, users }) => ({
          Model: name,
          Tokens: NUMBER_FORMAT.format(tokens),
          'Share of observed': `${observedTokens ? ((tokens / observedTokens) * 100).toFixed(2) : '0.00'}%`,
          Users: NUMBER_FORMAT.format(users.size),
        })),
    ),
  );

  const coverage = profileTokens
    ? ((observedTokens / profileTokens) * 100).toFixed(2)
    : '0.00';
  console.log(
    `Observed model tokens: ${NUMBER_FORMAT.format(observedTokens)} of ${NUMBER_FORMAT.format(profileTokens)} profile tokens (${coverage}% coverage).`,
  );
  console.log(
    'Model usage and user counts are all-time. The API has no period-specific model data, and each profile includes at most 8 models, so some models and users are omitted.',
  );
}

function printLabTable(
  labs: Map<string, LabStats>,
  observedTokens: number,
): void {
  console.log('\nLab usage, all-time (observed profiles only)');
  console.table(
    oneBasedRows(
      [...labs.values()]
        .sort((a, b) => b.tokens - a.tokens)
        .map(({ name, tokens, users }) => ({
          Lab: name,
          Tokens: NUMBER_FORMAT.format(tokens),
          'Share of observed': `${observedTokens ? ((tokens / observedTokens) * 100).toFixed(2) : '0.00'}%`,
          Users: NUMBER_FORMAT.format(users.size),
        })),
    ),
  );
  console.log(
    'Lab usage and user counts are all-time. Shares use observed model tokens; unknown model families are included as Unattributed.',
  );
}


function printModelTopUsersTable(models: Map<string, ModelStats>): void {
  console.log('\nWho uses what model most (observed profiles only)');
  const rows = [...models.values()]
    .filter((m) => m.tokens > 0)
    .map((m) => {
      let topUser = '';
      let topTokens = 0;
      for (const [u, t] of m.userTokens) {
        if (t > topTokens) {
          topTokens = t;
          topUser = u;
        }
      }
      return {
        Model: m.name,
        'Top User': `@${topUser}`,
        Tokens: NUMBER_FORMAT.format(topTokens),
        'Share of model': `${m.tokens ? ((topTokens / m.tokens) * 100).toFixed(2) : '0.00'}%`,
        'Total model tokens': NUMBER_FORMAT.format(m.tokens),
      };
    })
    .sort(
      (a, b) =>
        Number(b.Tokens.replace(/,/g, '')) - Number(a.Tokens.replace(/,/g, '')),
    );
  console.table(oneBasedRows(rows));
}

function printProviderTopUsersTable(
  models: Map<string, ModelStats>,
  labs: Map<string, LabStats>,
): void {
  console.log('\nWho uses what provider most (observed profiles only)');
  const labUserTokens = new Map<string, Map<string, number>>();
  for (const model of models.values()) {
    const labUsers = labUserTokens.get(model.lab) ?? new Map<string, number>();
    for (const [user, tokens] of model.userTokens) {
      labUsers.set(user, (labUsers.get(user) ?? 0) + tokens);
    }
    labUserTokens.set(model.lab, labUsers);
  }

  const rows = [...labs.values()]
    .filter((lab) => lab.tokens > 0)
    .map((lab) => {
      const userTokens = labUserTokens.get(lab.name) ?? new Map<string, number>();
      let topUser = '';
      let topTokens = 0;
      for (const [u, t] of userTokens) {
        if (t > topTokens) {
          topTokens = t;
          topUser = u;
        }
      }
      return {
        Provider: lab.name,
        'Top User': `@${topUser}`,
        Tokens: NUMBER_FORMAT.format(topTokens),
        'Share of provider': `${lab.tokens ? ((topTokens / lab.tokens) * 100).toFixed(2) : '0.00'}%`,
        'Total provider tokens': NUMBER_FORMAT.format(lab.tokens),
      };
    })
    .sort(
      (a, b) =>
        Number(b.Tokens.replace(/,/g, '')) - Number(a.Tokens.replace(/,/g, '')),
    );
  console.table(oneBasedRows(rows));
}

function printHarnessTopUsersTable(harnesses: HarnessStats[]): void {
  console.log('\nWho uses what harness most (all-time)');
  const rows = harnesses
    .filter((h) => h.tokens > 0 && h.entries.length > 0)
    .map((h) => {
      const top = [...h.entries].sort((a, b) => b.tokens - a.tokens)[0]!;
      return {
        Harness: h.name,
        'Top User': `@${top.user.handle}`,
        Tokens: NUMBER_FORMAT.format(top.tokens),
        'Share of harness': `${h.tokens ? ((top.tokens / h.tokens) * 100).toFixed(2) : '0.00'}%`,
        'Total harness tokens': NUMBER_FORMAT.format(h.tokens),
      };
    })
    .sort(
      (a, b) =>
        Number(b.Tokens.replace(/,/g, '')) - Number(a.Tokens.replace(/,/g, '')),
    );
  console.table(oneBasedRows(rows));
}

async function main(): Promise<void> {
  const harnesses = await Promise.all(
    SOURCES.map(async ([source, name]) => {
      const entries = await fetchAllBoard(source);
      return {
        handles: entries.map((entry) => entry.user.handle),
        name,
        tokens: entries.reduce((sum, entry) => sum + entry.tokens, 0),
        users: entries.length,
        entries,
      };
    }),
  );
  const activeUsers = new Set(harnesses.flatMap((harness) => harness.handles)).size;

  const allTimeEntries = await fetchAllBoard();

  const profiles = await mapWithConcurrency(allTimeEntries, 8, async (entry) => ({
    handle: entry.user.handle,
    profile: await fetchProfile(entry.user.handle),
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
        lab: existing?.lab === 'Unattributed' ? lab : existing?.lab ?? lab,
        name: modelDisplayName(id),
        tokens: (existing?.tokens ?? 0) + item.tokens,
      });
      observedTokens += item.tokens;
    }

    for (const [id, userModel] of userModels) {
      const existing = models.get(id);
      const users = new Set(existing ? existing.users : []);
      users.add(handle);
      const userTokens = new Map(existing ? existing.userTokens : []);
      userTokens.set(handle, (userTokens.get(handle) ?? 0) + userModel.tokens);
      models.set(id, {
        lab:
          existing?.lab === 'Unattributed'
            ? userModel.lab
            : existing?.lab ?? userModel.lab,
        name: userModel.name,
        tokens: (existing?.tokens ?? 0) + userModel.tokens,
        users,
        userTokens,
      });
    }
  }

  const labs = labStatsFor(models);

  printHarnessTable(harnesses, activeUsers);
  printModelTable(models, observedTokens, profileTokens);
  printLabTable(labs, observedTokens);
  printModelTopUsersTable(models);
  printProviderTopUsersTable(models, labs);
  printHarnessTopUsersTable(harnesses);
}

async function run(): Promise<void> {
  try {
    const options = parseArgs(process.argv.slice(2));
    if (options.showHelp) help();
    else await main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

void run();
