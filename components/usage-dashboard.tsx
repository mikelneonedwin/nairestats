"use client";

import { useEffect, useMemo, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import type { UsageData } from "@/lib/usage-data";

const INTEGER_FORMAT = new Intl.NumberFormat("en-US");
const SHORT_FORMAT = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
  notation: "compact",
});

type UsageRow = UsageData["harnesses"][number];
type SortKey = "rank" | "name" | "tokens" | "share" | "users";
type TokenFormat = "raw" | "short";

type TableProps = {
  id: "harness" | "model" | "lab";
  title: string;
  columnTitle: string;
  note: ReactNode;
  rows: UsageRow[];
};

function TokenValue({ value }: { value: number }) {
  return (
    <span>
      <span className="raw-token-number">{INTEGER_FORMAT.format(value)}</span>
      <span className="short-token-number">{SHORT_FORMAT.format(value)}</span>
    </span>
  );
}

function TableSection({ id, title, columnTitle, note, rows }: TableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("rank");
  const [sortDirection, setSortDirection] = useState<1 | -1>(1);
  const [tokenFormat, setTokenFormat] = useState<TokenFormat>("raw");
  useEffect(() => {
    const mobile = window.matchMedia("(max-width: 600px)");
    const applyShortFormat = () => {
      if (mobile.matches) setTokenFormat("short");
    };
    applyShortFormat();
    mobile.addEventListener("change", applyShortFormat);
    return () => mobile.removeEventListener("change", applyShortFormat);
  }, []);
  const numberedRows = useMemo(
    () => rows.map((row, index) => ({ ...row, rank: index + 1 })),
    [rows],
  );
  const sortedRows = useMemo(
    () =>
      [...numberedRows].sort((a, b) => {
        let comparison = 0;
        if (sortKey === "name") comparison = a.name.localeCompare(b.name);
        else comparison = a[sortKey] - b[sortKey];
        return comparison * sortDirection || a.rank - b.rank;
      }),
    [numberedRows, sortDirection, sortKey],
  );
  const maxShare = Math.max(...rows.map((row) => row.share), 0);
  const panelId = `${id}-table-panel`;
  const selectedTabId = `${id}-${tokenFormat}-tab`;
  const columns: { key: SortKey; label: string; className: string }[] = [
    { key: "rank", label: "#", className: "rk" },
    { key: "name", label: columnTitle, className: "" },
    { key: "tokens", label: "Tokens", className: "n" },
    {
      key: "share",
      label: id === "harness" ? "Share" : "Share of observed",
      className: "n",
    },
    { key: "users", label: "Users", className: "n" },
  ];

  function chooseFormat(nextFormat: TokenFormat) {
    setTokenFormat(nextFormat);
  }

  function handleTabKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    current: TokenFormat,
  ) {
    if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)) return;

    let next: TokenFormat | undefined;
    if (window.matchMedia("(max-width: 600px)").matches) {
      next = "short";
    } else if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      next = current === "raw" ? "short" : "raw";
    } else if (event.key === "Home") {
      next = "raw";
    } else if (event.key === "End") {
      next = "short";
    }

    if (!next) return;
    event.preventDefault();
    chooseFormat(next);
    const tabList = event.currentTarget.parentElement;
    requestAnimationFrame(() => {
      tabList
        ?.querySelector<HTMLButtonElement>(`[data-token-format="${next}"]`)
        ?.focus();
    });
  }

  return (
    <section
      className="usage-section"
      data-token-format={tokenFormat}
      aria-labelledby={`${id}-heading`}
    >
      <h2 id={`${id}-heading`}>{title}</h2>
      <div className="section-tools">
        <p className="note">{note}</p>
        <div
          className="number-tabs"
          role="tablist"
          aria-label={`${title} token display`}
        >
          <button
            id={`${id}-raw-tab`}
            type="button"
            role="tab"
            aria-selected={tokenFormat === "raw"}
            aria-controls={panelId}
            tabIndex={tokenFormat === "raw" ? 0 : -1}
            data-token-format="raw"
            onClick={() => chooseFormat("raw")}
            onKeyDown={(event) => handleTabKeyDown(event, "raw")}
          >
            Raw
          </button>
          <button
            id={`${id}-short-tab`}
            type="button"
            role="tab"
            aria-selected={tokenFormat === "short"}
            aria-controls={panelId}
            tabIndex={tokenFormat === "short" ? 0 : -1}
            data-token-format="short"
            onClick={() => chooseFormat("short")}
            onKeyDown={(event) => handleTabKeyDown(event, "short")}
          >
            Short
          </button>
        </div>
      </div>
      <div
        id={panelId}
        className="wrap"
        role="tabpanel"
        aria-labelledby={selectedTabId}
        tabIndex={0}
      >
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
            {sortedRows.map((row) => (
              <tr key={row.rank}>
                <td className="rk">{row.rank}</td>
                <td>{row.name}</td>
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
                <td className="n">{INTEGER_FORMAT.format(row.users)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function UsageDashboard({ data }: { data: UsageData }) {
  const modelCoverage = data.profileTokens
    ? ((data.observedTokens / data.profileTokens) * 100).toFixed(2)
    : "0.00";

  return (
    <main className="report-main">
      <h1>Harness, model and lab usage</h1>
      <p className="sub">
        All-time totals. {SHORT_FORMAT.format(data.totalTokens)} tokens across{" "}
        {INTEGER_FORMAT.format(data.activeUsers)} distinct users. Click any column
        header to sort.
      </p>

      <TableSection
        id="harness"
        title="Harness usage"
        columnTitle="Harness"
        rows={data.harnesses}
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
        note="Observed profiles only. Shares use observed model tokens; unknown model families are included as Unattributed."
      />
    </main>
  );
}
