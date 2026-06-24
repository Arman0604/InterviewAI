export default function Loading() {
  return (
    <main className="app-loading-screen" aria-label="Loading">
      <div className="app-loading-card">
        <span className="app-loading-spinner" aria-hidden="true" />
        <p>Loading InterviewAI...</p>
      </div>
    </main>
  );
}
