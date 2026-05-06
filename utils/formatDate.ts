export function formatDate(timestamp: number | undefined): string {
  if (timestamp === undefined) return 'undefined';
  const date = new Date(timestamp * 1000); // Convert seconds to milliseconds
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

