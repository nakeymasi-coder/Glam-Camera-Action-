const port = process.env.PORT || '3000';
try {
  const response = await fetch(`http://127.0.0.1:${port}/healthz`, {
    signal: AbortSignal.timeout(4000),
  });
  if (!response.ok || (await response.json()).status !== 'ok') {
    throw new Error(`Health check failed (${response.status})`);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Health check failed');
  process.exitCode = 1;
}
