import {
  classifyWithAI,
  extractTitleWithAI,
  suggestFolderWithAI,
  suggestTagsWithAI,
  type FolderInfo,
} from "../webhook-ai-processor";

// Mock fetch globally
global.fetch = jest.fn();

describe("Webhook AI Processor", () => {
  const mockApiKey = "sk-test-key";
  const mockModel = "gpt-4o-mini";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("classifyWithAI", () => {
    it("should classify webhook payload successfully", async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: '{"type": "meeting_transcript", "confidence": 85, "reason": "Contains meeting notes"}',
            },
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await classifyWithAI(
        { "content-type": "application/json" },
        { content: "Meeting notes from team standup" },
        mockApiKey,
        mockModel,
        "Test Webhook",
        "Test description"
      );

      expect(result).not.toBeNull();
      expect(result?.type).toBe("meeting_transcript");
      expect(result?.confidence).toBe(85);
      expect(result?.reason).toBe("Contains meeting notes");
      expect(result?.extractedContent).toBeTruthy();
    });

    it("should handle JSON wrapped in code blocks", async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: '```json\n{"type": "crm_note", "confidence": 90, "reason": "CRM update"}\n```',
            },
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await classifyWithAI(
        {},
        { content: "Customer update" },
        mockApiKey,
        mockModel
      );

      expect(result?.type).toBe("crm_note");
      expect(result?.confidence).toBe(90);
    });

    it("should return null when API key is missing", async () => {
      const result = await classifyWithAI({}, {}, "", mockModel);
      expect(result).toBeNull();
    });

    it("should return null when API call fails", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => "Unauthorized",
      });

      const result = await classifyWithAI({}, {}, mockApiKey, mockModel);
      expect(result).toBeNull();
    });

    it("should clamp confidence to 0-100 range", async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: '{"type": "test", "confidence": 150, "reason": "test"}',
            },
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await classifyWithAI({}, {}, mockApiKey, mockModel);
      expect(result?.confidence).toBe(100);
    });
  });

  describe("extractTitleWithAI", () => {
    it("should extract title successfully", async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: "Team Standup Meeting Notes",
            },
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await extractTitleWithAI(
        "Meeting notes from team standup discussing sprint progress",
        "meeting_transcript",
        mockApiKey,
        mockModel,
        "Test Webhook",
        "Test description"
      );

      expect(result).toBe("Team Standup Meeting Notes");
    });

    it("should remove quotes from title", async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: '"Customer Support Ticket #123"',
            },
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await extractTitleWithAI(
        "Support ticket content",
        "ticket_update",
        mockApiKey,
        mockModel
      );

      expect(result).toBe("Customer Support Ticket #123");
    });

    it("should truncate titles longer than 100 characters", async () => {
      const longTitle = "A".repeat(150);
      const mockResponse = {
        choices: [
          {
            message: {
              content: longTitle,
            },
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await extractTitleWithAI(
        "Content",
        "generic_doc",
        mockApiKey,
        mockModel
      );

      expect(result).toBe("A".repeat(100) + "...");
    });

    it("should return null when API key is missing", async () => {
      const result = await extractTitleWithAI("content", "type", "", mockModel);
      expect(result).toBeNull();
    });

    it("should return null when API call fails", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => "Internal Server Error",
      });

      const result = await extractTitleWithAI(
        "content",
        "type",
        mockApiKey,
        mockModel
      );
      expect(result).toBeNull();
    });
  });

  describe("suggestFolderWithAI", () => {
    const mockFolders: FolderInfo[] = [
      { id: "folder-1", name: "Meetings", noteCount: 5 },
      { id: "folder-2", name: "Projects", noteCount: 10 },
    ];

    it("should suggest existing folder when match found", async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: '{"type": "existing", "folderId": "folder-1", "folderName": "Meetings", "confidence": 85}',
            },
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await suggestFolderWithAI(
        "Team Standup",
        "Meeting notes content",
        "meeting_transcript",
        mockFolders,
        mockApiKey,
        mockModel
      );

      expect(result).not.toBeNull();
      expect(result?.type).toBe("existing");
      expect(result?.folderId).toBe("folder-1");
      expect(result?.folderName).toBe("Meetings");
      expect(result?.confidence).toBe(85);
    });

    it("should suggest new folder when no match found", async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: '{"type": "new", "folderName": "Support Tickets", "confidence": 80, "reason": "Support-related content"}',
            },
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await suggestFolderWithAI(
        "Support Ticket",
        "Ticket content",
        "ticket_update",
        mockFolders,
        mockApiKey,
        mockModel
      );

      expect(result).not.toBeNull();
      expect(result?.type).toBe("new");
      expect(result?.folderName).toBe("Support Tickets");
      expect(result?.confidence).toBe(80);
      expect(result?.reason).toBe("Support-related content");
    });

    it("should use existing folder if AI suggests duplicate name", async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: '{"type": "new", "folderName": "Meetings", "confidence": 75}',
            },
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await suggestFolderWithAI(
        "Title",
        "Content",
        "type",
        mockFolders,
        mockApiKey,
        mockModel
      );

      expect(result).not.toBeNull();
      expect(result?.type).toBe("existing");
      expect(result?.folderId).toBe("folder-1");
      expect(result?.folderName).toBe("Meetings");
    });

    it("should return null when confidence is too low for existing folder", async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: '{"type": "existing", "folderId": "folder-1", "folderName": "Meetings", "confidence": 50}',
            },
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await suggestFolderWithAI(
        "Title",
        "Content",
        "type",
        mockFolders,
        mockApiKey,
        mockModel
      );

      expect(result).toBeNull();
    });

    it("should return null when API key is missing", async () => {
      const result = await suggestFolderWithAI(
        "Title",
        "Content",
        "type",
        mockFolders,
        "",
        mockModel
      );
      expect(result).toBeNull();
    });

    it("should handle empty folders list", async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: '{"type": "new", "folderName": "New Folder", "confidence": 70}',
            },
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await suggestFolderWithAI(
        "Title",
        "Content",
        "type",
        [],
        mockApiKey,
        mockModel
      );

      expect(result?.type).toBe("new");
      expect(result?.folderName).toBe("New Folder");
    });
  });

  describe("suggestTagsWithAI", () => {
    it("should suggest tags successfully", async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: "meeting, team, sprint, progress",
            },
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await suggestTagsWithAI(
        "Meeting notes about team sprint progress",
        ["project", "work"],
        mockApiKey,
        mockModel
      );

      expect(result).toEqual(["meeting", "team", "sprint", "progress"]);
    });

    it("should prioritize existing tags when appropriate", async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: "project, meeting, work",
            },
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await suggestTagsWithAI(
        "Project meeting notes",
        ["project", "meeting", "work"],
        mockApiKey,
        mockModel
      );

      expect(result).toContain("project");
      expect(result).toContain("meeting");
    });

    it("should filter out tags longer than 50 characters", async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: "short-tag, " + "a".repeat(60) + ", another-tag",
            },
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await suggestTagsWithAI(
        "Content",
        [],
        mockApiKey,
        mockModel
      );

      expect(result).not.toContain("a".repeat(60));
      expect(result.length).toBeLessThanOrEqual(5);
    });

    it("should limit to 5 tags maximum", async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: "tag1, tag2, tag3, tag4, tag5, tag6, tag7",
            },
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await suggestTagsWithAI(
        "Content",
        [],
        mockApiKey,
        mockModel
      );

      expect(result.length).toBe(5);
    });

    it("should return empty array when API key is missing", async () => {
      const result = await suggestTagsWithAI("content", [], "", mockModel);
      expect(result).toEqual([]);
    });

    it("should return empty array when API call fails", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 429,
        text: async () => "Rate limit exceeded",
      });

      const result = await suggestTagsWithAI(
        "content",
        [],
        mockApiKey,
        mockModel
      );
      expect(result).toEqual([]);
    });

    it("should handle empty content", async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: "general, note",
            },
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await suggestTagsWithAI("", [], mockApiKey, mockModel);
      expect(result.length).toBeGreaterThan(0);
    });

    it("should trim whitespace from tags", async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: "  tag1  ,  tag2  , tag3 ",
            },
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await suggestTagsWithAI(
        "Content",
        [],
        mockApiKey,
        mockModel
      );

      expect(result).toEqual(["tag1", "tag2", "tag3"]);
    });
  });
});

