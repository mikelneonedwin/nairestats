"use client";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="report-main" role="alert">
      <h1>Harness, model and lab usage</h1>
      <p className="error-message">
        Usage data could not be loaded from Tokenaires. Try again in a moment.
      </p>
      <button className="retry-button" type="button" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
