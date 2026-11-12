function LoadingTable({ title }: { title: string }) {
  return (
    <section className="usage-section" aria-hidden="true">
      <h2>{title}</h2>
      <div className="section-tools">
        <div className="skeleton skeleton-line" />
      </div>
      <div className="wrap">
        <table>
          <thead>
            <tr>
              {["#", title, "Tokens", "Share", "Users"].map((heading) => (
                <th key={heading}>{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }, (_, index) => (
              <tr key={index}>
                {Array.from({ length: 5 }, (_, cell) => (
                  <td key={cell}>
                    <div className="skeleton skeleton-row" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function Loading() {
  return (
    <main className="report-main" aria-busy="true" aria-label="Loading usage data">
      <h1>Harness, model and lab usage</h1>
      <p className="sub">Fetching the latest all-time usage totals.</p>
      <LoadingTable title="Harness" />
      <LoadingTable title="Model" />
      <LoadingTable title="Lab" />
    </main>
  );
}
