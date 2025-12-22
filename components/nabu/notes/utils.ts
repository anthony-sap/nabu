/**
 * Utility functions for the notes activity system
 */

/**
 * Converts an ISO timestamp to a human-readable relative time string
 * Examples: "just now", "5m ago", "3h ago", "2d ago", "1w ago", "3mo ago"
 */
export function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  // Less than 1 minute
  if (seconds < 60) return 'just now';
  
  // Minutes
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  
  // Hours
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  
  // Days
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  
  // Weeks
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w ago`;
  
  // Months
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

