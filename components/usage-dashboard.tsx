"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { UsageData } from "@/lib/usage-data";

const INTEGER_FORMAT = new Intl.NumberFormat("en-US");
const SHORT_FORMAT = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
  notation: "compact",
});

type UsageRow = UsageData["harnesses"][number];
type SortKey = "rank" | "name" | "tokens" | "share" | "users";
type ViewMode = "table" | "pie" | "bar";

type TableProps = {
  id: string;
  title: ReactNode;
  columnTitle: string;
  note: ReactNode;
  rows: UsageRow[];
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode, originElement?: HTMLElement | null) => void;
  hideUsersCount?: boolean;
  shareLabel?: string;
  isUserTable?: boolean;
};

const CHART_PALETTE = [
  "#8ea2ff",
  "#a3e635",
  "#38bdf8",
  "#f472b6",
  "#fb923c",
  "#c084fc",
  "#4ade80",
  "#facc15",
  "#2dd4bf",
  "#fb7185",
  "#818cf8",
  "#34d399",
];

function TokenValue({ value }: { value: number }) {
  return (
    <span>
      <span className="raw-token-number">{INTEGER_FORMAT.format(value)}</span>
      <span className="short-token-number">{SHORT_FORMAT.format(value)}</span>
    </span>
  );
}

function BoardSearchInput({
  value,
  onChange,
  placeholder,
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  ariaLabel: string;
}) {
  return (
    <div className="search-box">
      <svg
        className="search-icon"
        viewBox="0 0 24 24"
        width="16"
        height="16"
        aria-hidden="true"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <input
        type="search"
        role="searchbox"
        className="search-input"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={ariaLabel}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="search-clear"
          aria-label="Clear search"
        >
          <svg
            viewBox="0 0 16 16"
            width="14"
            height="14"
            aria-hidden="true"
            fill="currentColor"
          >
            <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0-1A6 6 0 1 0 8 2a6 6 0 0 0 0 12zM5.354 5.354a.5.5 0 0 1 .708 0L8 7.293l1.938-1.939a.5.5 0 1 1 .708.708L8.707 8l1.939 1.938a.5.5 0 0 1-.708.708L8 8.707l-1.938 1.939a.5.5 0 0 1-.708-.708L7.293 8 5.354 6.062a.5.5 0 0 1 0-.708z" />
          </svg>
        </button>
      )}
    </div>
  );
}

function PieChart({
  items,
  totalTokens,
}: {
  items: UsageRow[];
  totalTokens: number;
}) {
  const chartItems = useMemo(() => {
    if (items.length === 0 || totalTokens <= 0) return [];
    const main: UsageRow[] = [];
    let otherTokens = 0;
    let otherUsers = 0;

    for (const item of items) {
      const share = (item.tokens / totalTokens) * 100;
      if (share < 2.0) {
        otherTokens += item.tokens;
        if (item.users > otherUsers) otherUsers = item.users;
      } else {
        main.push(item);
      }
    }

    if (otherTokens > 0) {
      main.push({
        name: "Others",
        tokens: otherTokens,
        share: (otherTokens / totalTokens) * 100,
        users: otherUsers,
      });
    }

    return main;
  }, [items, totalTokens]);

  const slices = useMemo(() => {
    let currentAngle = 0;
    return chartItems.map((item, index) => {
      const sliceAngle = totalTokens ? (item.tokens / totalTokens) * 360 : 0;
      const start = currentAngle;
      currentAngle += sliceAngle;
      const mid = start + sliceAngle / 2;
      const color = CHART_PALETTE[index % CHART_PALETTE.length];
      return {
        ...item,
        start,
        end: currentAngle,
        mid,
        angle: sliceAngle,
        color,
      };
    });
  }, [chartItems, totalTokens]);

  if (items.length === 0 || totalTokens <= 0) {
    return <div className="empty-search">No data to display in chart.</div>;
  }

  const cx = 300;
  const cy = 300;
  const outerRadius = 170;
  const innerRadius = 88;
  const labelRadius = 190;
  const leaderLineRadius = 210;

  return (
    <div className="chart-panel chart-panel-stacked">
      <div className="pie-wrap">
        <svg
          viewBox="0 0 600 600"
          className="pie-svg animate-chart"
          role="img"
          aria-label="Donut chart distribution"
        >
          {slices.map((slice) => {
            if (slice.angle <= 0) return null;

            if (slice.angle >= 359.99) {
              return (
                <g key={slice.name}>
                  <path
                    d={`M ${cx} ${cy - outerRadius} A ${outerRadius} ${outerRadius} 0 1 0 ${cx} ${cy + outerRadius} A ${outerRadius} ${outerRadius} 0 1 0 ${cx} ${cy - outerRadius} M ${cx} ${cy - innerRadius} A ${innerRadius} ${innerRadius} 0 1 1 ${cx} ${cy + innerRadius} A ${innerRadius} ${innerRadius} 0 1 1 ${cx} ${cy - innerRadius} Z`}
                    fill={slice.color}
                    className="pie-slice"
                  />
                  <text
                    x={cx}
                    y={cy - 10}
                    textAnchor="middle"
                    fill="#e4e7ef"
                    fontSize="22"
                    fontWeight="600"
                  >
                    {slice.name}
                  </text>
                  <text
                    x={cx}
                    y={cy + 18}
                    textAnchor="middle"
                    fill="#8b93a7"
                    fontSize="16"
                  >
                    {SHORT_FORMAT.format(slice.tokens)} ({slice.share.toFixed(1)}%)
                  </text>
                </g>
              );
            }

            const startRad = ((slice.start - 90) * Math.PI) / 180;
            const endRad = ((slice.end - 90) * Math.PI) / 180;
            const midRad = ((slice.mid - 90) * Math.PI) / 180;

            const x1Outer = cx + outerRadius * Math.cos(startRad);
            const y1Outer = cy + outerRadius * Math.sin(startRad);
            const x2Outer = cx + outerRadius * Math.cos(endRad);
            const y2Outer = cy + outerRadius * Math.sin(endRad);

            const x1Inner = cx + innerRadius * Math.cos(endRad);
            const y1Inner = cy + innerRadius * Math.sin(endRad);
            const x2Inner = cx + innerRadius * Math.cos(startRad);
            const y2Inner = cy + innerRadius * Math.sin(startRad);

            const largeArc = slice.angle > 180 ? 1 : 0;
            const pathData = `M ${x1Outer} ${y1Outer} A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${x2Outer} ${y2Outer} L ${x1Inner} ${y1Inner} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x2Inner} ${y2Inner} Z`;

            // Leader label for slices >= 3.5%
            const showLeader = slice.share >= 3.5;
            const leaderX1 = cx + labelRadius * Math.cos(midRad);
            const leaderY1 = cy + labelRadius * Math.sin(midRad);
            const isRightSide = Math.cos(midRad) >= 0;
            const leaderX2 = cx + leaderLineRadius * Math.cos(midRad);
            const leaderY2 = cy + leaderLineRadius * Math.sin(midRad);
            const leaderX3 = leaderX2 + (isRightSide ? 24 : -24);

            return (
              <g key={slice.name} className="pie-slice-group">
                <path
                  d={pathData}
                  fill={slice.color}
                  className="pie-slice"
                >
                  <title>{`${slice.name}: ${slice.share.toFixed(2)}% (${SHORT_FORMAT.format(slice.tokens)} tokens)`}</title>
                </path>
                {showLeader && (
                  <g className="pie-leader-label" pointerEvents="none">
                    <polyline
                      points={`${leaderX1},${leaderY1} ${leaderX2},${leaderY2} ${leaderX3},${leaderY2}`}
                      fill="none"
                      stroke={slice.color}
                      strokeWidth="1.8"
                      strokeOpacity="0.85"
                    />
                    <text
                      x={leaderX3 + (isRightSide ? 7 : -7)}
                      y={leaderY2 + 5}
                      textAnchor={isRightSide ? "start" : "end"}
                      fill="#e4e7ef"
                      fontSize="14"
                      fontWeight="600"
                    >
                      {slice.name}
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* Center total summary label */}
          <circle cx={cx} cy={cy} r={innerRadius - 6} fill="var(--panel)" />
          <text
            x={cx}
            y={cy - 10}
            textAnchor="middle"
            fill="#8b93a7"
            fontSize="14"
            fontWeight="600"
            letterSpacing="0.08em"
          >
            TOTAL
          </text>
          <text
            x={cx}
            y={cy + 18}
            textAnchor="middle"
            fill="#e4e7ef"
            fontSize="22"
            fontWeight="700"
            fontFamily="var(--font-plex-mono), monospace"
          >
            {SHORT_FORMAT.format(totalTokens)}
          </text>
        </svg>
      </div>
      <div className="chart-legend chart-legend-bottom">
        {slices.map((slice) => (
          <div key={slice.name} className="legend-card">
            <div className="legend-head">
              <span
                className="legend-color"
                style={{ backgroundColor: slice.color }}
                aria-hidden="true"
              />
              <span className="legend-name" title={slice.name}>
                {slice.name}
              </span>
            </div>
            <div className="legend-stats">
              <span className="legend-share">{slice.share.toFixed(1)}%</span>
              <span className="legend-tokens">
                {SHORT_FORMAT.format(slice.tokens)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BarChart({
  items,
  maxTokens,
}: {
  items: UsageRow[];
  maxTokens: number;
}) {
  const displayItems = items;

  if (items.length === 0) {
    return <div className="empty-search">No data to display in chart.</div>;
  }

  return (
    <div className="bar-chart-container animate-chart">
      {displayItems.map((item, index) => {
        const pct = maxTokens ? (item.tokens / maxTokens) * 100 : 0;
        const color = CHART_PALETTE[index % CHART_PALETTE.length];
        return (
          <div key={`${item.name}-${index}`} className="bar-chart-row">
            <span className="bar-chart-rank">#{index + 1}</span>
            <div className="bar-chart-label" title={item.name}>
              {item.avatarUrl !== undefined ? (
                <a
                  href={`https://github.com/${encodeURIComponent(item.handle || item.name)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bar-chart-user-link"
                >
                  <span className="bar-chart-avatar-wrap">
                    {item.avatarUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={item.avatarUrl}
                        alt={item.name}
                        className="bar-chart-avatar"
                        width={22}
                        height={22}
                        loading="lazy"
                      />
                    ) : (
                      <span className="bar-chart-avatar-fallback">
                        {(item.handle || item.name).slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </span>
                  <span className="bar-chart-label-text">{item.name}</span>
                </a>
              ) : (
                <span className="bar-chart-label-text">{item.name}</span>
              )}
            </div>
            <div className="bar-chart-track">
              <div
                className="bar-chart-fill"
                style={{
                  width: `${pct}%`,
                  backgroundColor: color,
                }}
              />
            </div>
            <div className="bar-chart-values">
              <span className="bar-chart-tokens">
                {SHORT_FORMAT.format(item.tokens)}
              </span>
              <span className="bar-chart-share">{item.share.toFixed(1)}%</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SectionViewToggle({
  mode,
  onChange,
  id,
}: {
  mode: ViewMode;
  onChange: (mode: ViewMode, originElement?: HTMLElement | null) => void;
  id: string;
}) {
  return (
    <div
      className="view-toggle"
      role="group"
      aria-label={`${id} view mode toggle`}
    >
      <button
        type="button"
        className={`view-toggle-btn ${mode === "table" ? "active" : ""}`}
        onClick={(e) => onChange("table", e.currentTarget)}
        aria-pressed={mode === "table"}
        title="Table view"
      >
        <svg
          viewBox="0 0 16 16"
          width="13"
          height="13"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M0 2a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2zm15 2h-4v3h4V4zm0 4h-4v3h4V8zm0 4h-4v3h3a1 1 0 0 0 1-1v-2zm-5 3v-3H6v3h4zm-5 0v-3H1v2a1 1 0 0 0 1 1h3zm-4-4h4V8H1v3zm0-4h4V4H1v3zm5-3v3h4V4H6zm4 4H6v3h4V8z" />
        </svg>
        <span>Table</span>
      </button>
      <button
        type="button"
        className={`view-toggle-btn ${mode === "pie" ? "active" : ""}`}
        onClick={(e) => onChange("pie", e.currentTarget)}
        aria-pressed={mode === "pie"}
        title="Pie chart view"
      >
        <svg
          viewBox="0 0 16 16"
          width="13"
          height="13"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M7.5 1.018a7 7 0 0 0-4.95 11.932l5-5V1.018zm1 0v6.07l5 5A7 7 0 0 0 8.5 1.018zm.5 7.482 4.95 4.95A7 7 0 0 1 1.55 8.5H9z" />
        </svg>
        <span>Pie</span>
      </button>
      <button
        type="button"
        className={`view-toggle-btn ${mode === "bar" ? "active" : ""}`}
        onClick={(e) => onChange("bar", e.currentTarget)}
        aria-pressed={mode === "bar"}
        title="Bar chart view"
      >
        <svg
          viewBox="0 0 16 16"
          width="13"
          height="13"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M1 11a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1v-4zm5-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V7zm5-5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1V2z" />
        </svg>
        <span>Bar</span>
      </button>
    </div>
  );
}

function TableSection({
  id,
  title,
  columnTitle,
  note,
  rows,
  viewMode,
  onViewModeChange,
  hideUsersCount = false,
  shareLabel,
  isUserTable = false,
}: TableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("rank");
  const [sortDirection, setSortDirection] = useState<1 | -1>(1);
  const [query, setQuery] = useState("");

  const numberedRows = useMemo(
    () => rows.map((row, index) => ({ ...row, rank: index + 1 })),
    [rows],
  );

  const filteredRows = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return numberedRows;
    return numberedRows.filter(
      (row) =>
        row.name.toLowerCase().includes(trimmed) ||
        (row.handle && row.handle.toLowerCase().includes(trimmed)),
    );
  }, [numberedRows, query]);

  const chartItems = useMemo(() => {
    if (!isUserTable) return filteredRows;
    return filteredRows.map((row) => ({
      ...row,
      name:
        row.handle && row.handle !== row.name
          ? `${row.name} (@${row.handle})`
          : row.handle
            ? `@${row.handle}`
            : row.name,
    }));
  }, [filteredRows, isUserTable]);

  const sortedRows = useMemo(
    () =>
      [...filteredRows].sort((a, b) => {
        let comparison = 0;
        if (sortKey === "name") comparison = a.name.localeCompare(b.name);
        else comparison = a[sortKey] - b[sortKey];
        return comparison * sortDirection || a.rank - b.rank;
      }),
    [filteredRows, sortDirection, sortKey],
  );

  const maxShare = Math.max(...rows.map((row) => row.share), 0);
  const totalTokens = useMemo(
    () => rows.reduce((sum, r) => sum + r.tokens, 0),
    [rows],
  );
  const maxTokens = useMemo(
    () => Math.max(...rows.map((r) => r.tokens), 0),
    [rows],
  );

  const columns: { key: SortKey; label: string; className: string }[] = useMemo(() => {
    const list: { key: SortKey; label: string; className: string }[] = [
      { key: "rank", label: "#", className: "rk" },
      { key: "name", label: columnTitle, className: "" },
      { key: "tokens", label: "Tokens", className: "n" },
      {
        key: "share",
        label: shareLabel ?? (id === "harness" ? "Share" : "Share of observed"),
        className: "n",
      },
    ];
    if (!hideUsersCount) {
      list.push({ key: "users", label: "Users", className: "n" });
    }
    return list;
  }, [columnTitle, hideUsersCount, id, shareLabel]);

  return (
    <section className="usage-section" aria-labelledby={`${id}-heading`}>
      <div className="section-head">
        <h2 id={`${id}-heading`}>{title}</h2>
        <SectionViewToggle
          mode={viewMode}
          onChange={onViewModeChange}
          id={id}
        />
      </div>
      <p className="note">{note}</p>
      <div className="section-search-row">
        <BoardSearchInput
          value={query}
          onChange={setQuery}
          placeholder={`Search ${columnTitle.toLowerCase()}s...`}
          ariaLabel={`Search ${title}`}
        />
      </div>

      {viewMode === "table" ? (
        <div className="wrap" tabIndex={0}>
          <table aria-label={`${title} table`}>
            <thead>
              <tr>
                {columns.map((column) => {
                  const key = column.key;
                  const active = sortKey === key;
                  return (
                    <th
                      key={key}
                      className={column.className}
                      scope="col"
                      aria-sort={
                        active
                          ? sortDirection === 1
                            ? "ascending"
                            : "descending"
                          : undefined
                      }
                    >
                      <button
                        className="table-sort"
                        type="button"
                        onClick={() => {
                          if (sortKey === key) {
                            setSortDirection(sortDirection === 1 ? -1 : 1);
                            return;
                          }
                          setSortKey(key);
                          setSortDirection(key === "name" || key === "rank" ? 1 : -1);
                        }}
                      >
                        {column.label}
                        <span className="sort-arrow" aria-hidden="true">
                          {active ? (sortDirection === 1 ? "▲" : "▼") : ""}
                        </span>
                      </button>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {sortedRows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="empty-search">
                    No matching {columnTitle.toLowerCase()}s found.
                  </td>
                </tr>
              ) : (
                sortedRows.map((row) => (
                  <tr key={row.rank}>
                    <td className="rk">{row.rank}</td>
                    <td>
                      {isUserTable ? (
                        <div className="user-cell">
                          <a
                            href={`https://github.com/${encodeURIComponent(row.handle || row.name)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="user-avatar-wrap"
                            aria-label={`View ${row.name}'s GitHub profile`}
                          >
                            {row.avatarUrl ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img
                                src={row.avatarUrl}
                                alt={row.name}
                                className="user-avatar"
                                width={32}
                                height={32}
                                loading="lazy"
                              />
                            ) : (
                              <span className="user-avatar-fallback">
                                {(row.handle || row.name).slice(0, 2).toUpperCase()}
                              </span>
                            )}
                          </a>
                          <span className="user-info">
                            <a
                              href={`https://github.com/${encodeURIComponent(row.handle || row.name)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="user-display-name"
                            >
                              {row.name}
                            </a>
                            <a
                              href={`https://github.com/${encodeURIComponent(row.handle || row.name)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="user-handle"
                            >
                              @{row.handle || row.name}
                            </a>
                          </span>
                        </div>
                      ) : (
                        row.name
                      )}
                    </td>
                    <td className="n"><TokenValue value={row.tokens} /></td>
                    <td className="n">
                      <div className="sh">
                        <div className="bar" aria-hidden="true">
                          <i
                            style={{
                              width: `${maxShare ? (row.share / maxShare) * 100 : 0}%`,
                            }}
                          />
                        </div>
                        <span>{row.share.toFixed(2)}%</span>
                      </div>
                    </td>
                    {!hideUsersCount && (
                      <td className="n">{INTEGER_FORMAT.format(row.users)}</td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : viewMode === "pie" ? (
        <PieChart items={chartItems} totalTokens={totalTokens} />
      ) : (
        <BarChart items={chartItems} maxTokens={maxTokens} />
      )}
    </section>
  );
}

function getInitialViewMode(): ViewMode {
  if (typeof window !== "undefined") {
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get("view");
    if (viewParam === "table" || viewParam === "pie" || viewParam === "bar") {
      return viewParam;
    }
  }
  return "bar";
}

export function UsageDashboard({ data }: { data: UsageData }) {
  const [viewMode, setViewMode] = useState<ViewMode>(getInitialViewMode);

  const handleViewModeChange = (newMode: ViewMode, originElement?: HTMLElement | null) => {
    // Capture the button's viewport position before re-rendering
    const rectBefore = originElement?.getBoundingClientRect();

    setViewMode(newMode);

    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("view", newMode);
      window.history.replaceState(null, "", url.toString());

      if (rectBefore && originElement) {
        requestAnimationFrame(() => {
          const rectAfter = originElement.getBoundingClientRect();
          const deltaY = rectAfter.top - rectBefore.top;
          if (Math.abs(deltaY) > 1) {
            window.scrollBy({ top: deltaY, behavior: "instant" as ScrollBehavior });
          }
        });
      }
    }
  };

  const modelCoverage = data.profileTokens
    ? ((data.observedTokens / data.profileTokens) * 100).toFixed(2)
    : "0.00";

  const availableProviders = useMemo(
    () => Object.keys(data.providerModels).sort(),
    [data.providerModels],
  );

  const [selectedProvider, setSelectedProvider] = useState<string>(
    availableProviders[0] ?? "",
  );

  const selectedProviderRows = useMemo(
    () => (selectedProvider ? data.providerModels[selectedProvider] ?? [] : []),
    [data.providerModels, selectedProvider],
  );

  const selectedProviderTokens = useMemo(
    () => selectedProviderRows.reduce((sum, r) => sum + r.tokens, 0),
    [selectedProviderRows],
  );

  // Model users
  const availableModels = useMemo(
    () => Object.keys(data.modelUsers).sort((a, b) => a.localeCompare(b)),
    [data.modelUsers],
  );
  const [selectedModel, setSelectedModel] = useState<string>(
    availableModels[0] ?? "",
  );
  const activeSelectedModel =
    selectedModel && availableModels.includes(selectedModel)
      ? selectedModel
      : (availableModels[0] ?? "");
  const selectedModelRows = useMemo(
    () => (activeSelectedModel ? data.modelUsers[activeSelectedModel] ?? [] : []),
    [data.modelUsers, activeSelectedModel],
  );
  const selectedModelTokens = useMemo(
    () => selectedModelRows.reduce((sum, r) => sum + r.tokens, 0),
    [selectedModelRows],
  );

  // Provider users
  const availableProviderUsers = useMemo(
    () => Object.keys(data.providerUsers).sort((a, b) => a.localeCompare(b)),
    [data.providerUsers],
  );
  const [selectedProviderUser, setSelectedProviderUser] = useState<string>(
    availableProviderUsers[0] ?? "",
  );
  const activeSelectedProviderUser =
    selectedProviderUser && availableProviderUsers.includes(selectedProviderUser)
      ? selectedProviderUser
      : (availableProviderUsers[0] ?? "");
  const selectedProviderUserRows = useMemo(
    () => (activeSelectedProviderUser ? data.providerUsers[activeSelectedProviderUser] ?? [] : []),
    [data.providerUsers, activeSelectedProviderUser],
  );
  const selectedProviderUserTokens = useMemo(
    () => selectedProviderUserRows.reduce((sum, r) => sum + r.tokens, 0),
    [selectedProviderUserRows],
  );

  return (
    <main className="report-main">
      <div className="header-bar">
        <div>
          <h1>Harness, model and lab usage</h1>
          <p className="sub">
            All-time totals based on public data from{" "}
            <a
              href="https://tokenaires.cc"
              target="_blank"
              rel="noopener noreferrer"
              className="tokenaires-link"
            >
              tokenaires.cc
            </a>
            . {SHORT_FORMAT.format(data.totalTokens)} tokens across{" "}
            {INTEGER_FORMAT.format(data.activeUsers)} distinct users. Click any column
            header to sort.
          </p>
        </div>
        <a
          href="https://github.com/mikelneonedwin/nairestats"
          target="_blank"
          rel="noopener noreferrer"
          className="github-button"
          aria-label="View source repository on GitHub"
        >
          <svg
            viewBox="0 0 16 16"
            width="16"
            height="16"
            aria-hidden="true"
            fill="currentColor"
          >
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
          </svg>
        </a>
      </div>

      <TableSection
        id="harness"
        title="Harness usage"
        columnTitle="Harness"
        rows={data.harnesses}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        note={
          <>
            Total harness usage: <TokenValue value={data.totalTokens} /> tokens.
            {" "}Distinct users across harnesses:{" "}
            {INTEGER_FORMAT.format(data.activeUsers)}.
          </>
        }
      />

      <TableSection
        id="model"
        title="Model usage"
        columnTitle="Model"
        rows={data.models}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        note={
          <>
            Observed profiles only. <TokenValue value={data.observedTokens} /> of{" "}
            <TokenValue value={data.profileTokens} /> profile tokens observed (
            {modelCoverage}% coverage). Each profile includes at most 8 models,
            so some models and users are omitted.
          </>
        }
      />

      <TableSection
        id="lab"
        title="Lab usage"
        columnTitle="Lab"
        rows={data.labs}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        note="Observed profiles only. Shares use observed model tokens; unknown model families are included as Unattributed."
      />

      {activeSelectedModel && (
        <TableSection
          key={activeSelectedModel}
          id="model-users"
          title={
            <div className="select-heading-wrap">
              <span className="select-heading-label">Who uses model</span>
              <Select
                value={activeSelectedModel}
                onValueChange={(v) => v && setSelectedModel(v)}
              >
                <SelectTrigger className="provider-select-trigger" aria-label="Select model">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="start" sideOffset={6}>
                  {availableModels.map((model) => (
                    <SelectItem key={model} value={model}>
                      {model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          }
          columnTitle="User"
          rows={selectedModelRows}
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
          hideUsersCount
          isUserTable
          shareLabel={`Share of ${activeSelectedModel}`}
          note={
            <>
              Observed profiles only. {INTEGER_FORMAT.format(selectedModelRows.length)} users recorded for {activeSelectedModel} totaling{" "}
              <TokenValue value={selectedModelTokens} /> tokens.
            </>
          }
        />
      )}

      {activeSelectedProviderUser && (
        <TableSection
          key={activeSelectedProviderUser}
          id="provider-users"
          title={
            <div className="select-heading-wrap">
              <span className="select-heading-label">Who uses provider</span>
              <Select
                value={activeSelectedProviderUser}
                onValueChange={(v) => v && setSelectedProviderUser(v)}
              >
                <SelectTrigger className="provider-select-trigger" aria-label="Select provider">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="start" sideOffset={6}>
                  {availableProviderUsers.map((prov) => (
                    <SelectItem key={prov} value={prov}>
                      {prov}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          }
          columnTitle="User"
          rows={selectedProviderUserRows}
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
          hideUsersCount
          isUserTable
          shareLabel={`Share of ${activeSelectedProviderUser}`}
          note={
            <>
              Observed profiles only. {INTEGER_FORMAT.format(selectedProviderUserRows.length)} users recorded for {activeSelectedProviderUser} totaling{" "}
              <TokenValue value={selectedProviderUserTokens} /> tokens.
            </>
          }
        />
      )}

      <TableSection
        id="regions"
        title="American vs Chinese vs Other models"
        columnTitle="Region"
        rows={data.regions}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        note="Model token consumption categorized by originating region of the lab or provider."
      />

      <TableSection
        id="weights"
        title="Open Weight vs Closed Weight models"
        columnTitle="Architecture"
        rows={data.weights}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        note="Comparison between publicly released model weights (e.g. Llama, Gemma, DeepSeek, Qwen) and proprietary closed API models."
      />

      <section className="usage-section provider-section">
        {selectedProvider && (
          <TableSection
            id={`provider-${selectedProvider.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
            title={
              <Select
                value={selectedProvider}
                onValueChange={(v) => v && setSelectedProvider(v)}
              >
                <SelectTrigger className="provider-select-trigger" aria-label="Select provider">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="start" sideOffset={6}>
                  {availableProviders.map((prov) => (
                    <SelectItem key={prov} value={prov}>
                      {prov}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            }
            columnTitle="Model"
            rows={selectedProviderRows}
            viewMode={viewMode}
            onViewModeChange={handleViewModeChange}
            note={
              <>
                All models recorded for {selectedProvider} totaling{" "}
                <TokenValue value={selectedProviderTokens} /> tokens.
              </>
            }
          />
        )}
      </section>
    </main>
  );
}
