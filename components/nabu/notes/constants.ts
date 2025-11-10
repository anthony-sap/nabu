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
 * Static folder structure for organizing notes
 * TODO: Make this dynamic and user-editable in future versions
 */
export const folderStructure: FolderItem[] = [
  {
    id: "1",
    name: "Product Strategy",
    type: "folder",
    expanded: true,
    children: [
      {
        id: "1-1",
        name: "Roadmap 2024",
        type: "folder",
        expanded: false,
        children: [
          { id: "1-1-1", name: "Q1 Planning.md", type: "note", tags: ["planning", "strategy"] },
          { id: "1-1-2", name: "Feature Prioritization.md", type: "note", tags: ["roadmap"] },
        ],
      },
      { id: "1-2", name: "Market Research.md", type: "note", tags: ["research", "competitive"] },
      { id: "1-3", name: "User Personas.md", type: "note", tags: ["ux", "research"] },
    ],
  },
  {
    id: "2",
    name: "Engineering",
    type: "folder",
    expanded: false,
    children: [
      { id: "2-1", name: "Architecture Decisions.md", type: "note", tags: ["technical", "architecture"] },
      { id: "2-2", name: "API Documentation.md", type: "note", tags: ["api", "docs"] },
      {
        id: "2-3",
        name: "Sprint Notes",
        type: "folder",
        children: [
          { id: "2-3-1", name: "Sprint 23.md", type: "note", tags: ["sprint"] },
          { id: "2-3-2", name: "Sprint 24.md", type: "note", tags: ["sprint"] },
        ],
      },
    ],
  },
  {
    id: "3",
    name: "Team Meetings",
    type: "folder",
    expanded: false,
    children: [
      { id: "3-1", name: "Weekly Standups.md", type: "note", tags: ["meetings"] },
      { id: "3-2", name: "All-Hands May 2024.md", type: "note", tags: ["meetings", "company"] },
    ],
  },
];

/**
 * LocalStorage key for persisting saved thoughts
 */
export const STORAGE_KEY = "nabu-saved-thoughts";

