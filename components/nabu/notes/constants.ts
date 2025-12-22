import { SavedThought, FolderItem } from "./types";

/**
 * Example thoughts to display when no saved thoughts exist
 * Provides users with context about what the activity feed looks like
 */
export const exampleThoughts: SavedThought[] = [
  {
    id: "example-1",
    title: "Product Strategy Session Notes",
    content: "Discussed Q1 roadmap priorities with the team. Key focus areas: improving AI summarization features, expanding integrations, and enhancing mobile experience. Need to schedule follow-up with engineering team next week.",
    tags: ["strategy", "planning", "meetings"],
    folder: "Product Strategy",
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    pinned: false,
  },
  {
    id: "example-2",
    title: "Research Insights",
    content: "Users are requesting better search functionality and the ability to link related notes. Average session time increased by 30% after implementing quick capture feature. This validates our hypothesis about reducing friction in note-taking.",
    tags: ["research", "analytics", "ux"],
    folder: "Team Meetings",
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    pinned: true,
  },
  {
    id: "example-3",
    title: "Weekend Reading",
    content: "Interesting article on knowledge management systems and how they're evolving with AI. The concept of 'knowledge graphs' could be valuable for our hierarchical folder system. Should explore integration possibilities.",
    tags: ["inspiration", "ai", "reading"],
    folder: "Personal",
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
    pinned: false,
  },
];

/**
 * Static folder structure - NO LONGER USED
 * Folders are now loaded from the API
 * Kept for reference only
 */
// export const folderStructure: FolderItem[] = [];

/**
 * LocalStorage key for persisting saved thoughts
 */
export const STORAGE_KEY = "nabu-saved-thoughts";

