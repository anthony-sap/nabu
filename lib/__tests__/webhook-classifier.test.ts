import {
  classifyWebhookPayload,
  classifyByHeaders,
  classifyByContent,
  extractTextFromBody,
  extractTitleFromBody,
} from "@/lib/ai/webhook-classifier";

// Mock OpenAI API calls (classifyByContent uses OpenAI)
global.fetch = jest.fn();

describe("Webhook Classifier", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("classifyByHeaders", () => {
    it("identifies meeting transcripts", () => {
      const headers = {
        "user-agent": "Otter.ai/1.0",
        "content-type": "application/json",
      };
      const body = {};

      const result = classifyByHeaders(headers, body);

      expect(result.type).toBe("meeting_transcript");
      expect(result.confidence).toBeGreaterThanOrEqual(85);
    });

    it("identifies call transcripts", () => {
      const headers = {
        "x-type": "call-transcript",
        "content-type": "application/json",
      };
      const body = {};

      const result = classifyByHeaders(headers, body);

      expect(result.type).toBe("call_transcript");
      expect(result.confidence).toBeGreaterThanOrEqual(85);
    });

    it("identifies CRM notes", () => {
      const headers = {
        "x-source": "salesforce-crm",
        "content-type": "application/json",
      };
      const body = {};

      const result = classifyByHeaders(headers, body);

      expect(result.type).toBe("crm_note");
      expect(result.confidence).toBeGreaterThanOrEqual(80);
    });

    it("identifies analytics events", () => {
      const headers = {
        "x-event-type": "page_view",
        "content-type": "application/json",
      };
      const body = {};

      const result = classifyByHeaders(headers, body);

      expect(result.type).toBe("analytics_event");
      expect(result.confidence).toBeGreaterThanOrEqual(75);
    });

    it("identifies calendar events", () => {
      const headers = {
        "x-source": "google-calendar",
        "content-type": "application/json",
      };
      const body = {};

      const result = classifyByHeaders(headers, body);

      expect(result.type).toBe("calendar_event");
      expect(result.confidence).toBeGreaterThanOrEqual(80);
    });

    it("identifies email forwards", () => {
      const headers = {
        "x-source": "email-gateway",
        "content-type": "message/rfc822",
      };
      const body = {};

      const result = classifyByHeaders(headers, body);

      expect(result.type).toBe("email_forward");
      expect(result.confidence).toBeGreaterThanOrEqual(75);
    });

    it("identifies ticket updates", () => {
      const headers = {
        "x-source": "zendesk-support",
        "content-type": "application/json",
      };
      const body = {};

      const result = classifyByHeaders(headers, body);

      expect(result.type).toBe("ticket_update");
      expect(result.confidence).toBeGreaterThanOrEqual(80);
    });

    it("identifies chat exports", () => {
      const headers = {
        "x-source": "slack-export",
        "content-type": "application/json",
      };
      const body = {};

      const result = classifyByHeaders(headers, body);

      expect(result.type).toBe("chat_export");
      expect(result.confidence).toBeGreaterThanOrEqual(75);
    });

    it("identifies system logs", () => {
      const headers = {
        "x-source": "application-logger",
        "content-type": "application/json",
      };
      const body = {};

      const result = classifyByHeaders(headers, body);

      expect(result.type).toBe("system_log");
      expect(result.confidence).toBeGreaterThanOrEqual(70);
    });

    it("defaults to generic_doc when no indicators found", () => {
      const headers = {
        "content-type": "application/json",
      };
      const body = {};

      const result = classifyByHeaders(headers, body);

      expect(result.type).toBe("generic_doc");
      expect(result.confidence).toBeLessThan(50);
    });

    it("uses webhook name to classify meeting transcripts", () => {
      const headers = {
        "content-type": "application/json",
      };
      const body = {};
      const webhookName = "Zoom Meeting Transcripts";
      const webhookDescription = "Receives transcripts from Zoom";

      const result = classifyByHeaders(headers, body, webhookName, webhookDescription);

      expect(result.type).toBe("meeting_transcript");
      expect(result.confidence).toBeGreaterThanOrEqual(90);
    });

    it("uses webhook description to classify call transcripts", () => {
      const headers = {
        "content-type": "application/json",
      };
      const body = {};
      const webhookName = "Phone Calls";
      const webhookDescription = "Call recordings and transcripts";

      const result = classifyByHeaders(headers, body, webhookName, webhookDescription);

      expect(result.type).toBe("call_transcript");
      expect(result.confidence).toBeGreaterThanOrEqual(90);
    });

    it("uses webhook name to classify CRM notes", () => {
      const headers = {
        "content-type": "application/json",
      };
      const body = {};
      const webhookName = "Salesforce CRM Integration";
      const webhookDescription = "";

      const result = classifyByHeaders(headers, body, webhookName, webhookDescription);

      expect(result.type).toBe("crm_note");
      expect(result.confidence).toBeGreaterThanOrEqual(85);
    });

    it("uses webhook description to classify calendar events", () => {
      const headers = {
        "content-type": "application/json",
      };
      const body = {};
      const webhookName = "Calendar Sync";
      const webhookDescription = "Google Calendar events and appointments";

      const result = classifyByHeaders(headers, body, webhookName, webhookDescription);

      expect(result.type).toBe("calendar_event");
      expect(result.confidence).toBeGreaterThanOrEqual(85);
    });

    it("uses webhook name to classify ticket updates", () => {
      const headers = {
        "content-type": "application/json",
      };
      const body = {};
      const webhookName = "Zendesk Support Tickets";

      const result = classifyByHeaders(headers, body, webhookName);

      expect(result.type).toBe("ticket_update");
      expect(result.confidence).toBeGreaterThanOrEqual(85);
    });

    it("uses webhook description to classify chat exports", () => {
      const headers = {
        "content-type": "application/json",
      };
      const body = {};
      const webhookDescription = "Slack channel messages and chat exports";

      const result = classifyByHeaders(headers, body, undefined, webhookDescription);

      expect(result.type).toBe("chat_export");
      expect(result.confidence).toBeGreaterThanOrEqual(85);
    });
  });

  describe("classifyByContent", () => {
    it("identifies meeting transcripts from content", async () => {
      const headers = {};
      const body = {
        content: "Meeting minutes: Discussed project timeline with team members",
      };

      const result = await classifyByContent(headers, body);

      expect(result.type).toBe("meeting_transcript");
      expect(result.confidence).toBeGreaterThanOrEqual(70);
      expect(result.extractedContent).toBeTruthy();
    });

    it("identifies call transcripts from content", async () => {
      const headers = {};
      const body = {
        content: "Phone call recording: Customer called about billing issue",
      };

      const result = await classifyByContent(headers, body);

      expect(result.type).toBe("call_transcript");
      expect(result.confidence).toBeGreaterThanOrEqual(70);
    });

    it("identifies CRM notes from content", async () => {
      const headers = {};
      const body = {
        content: "New customer lead: Interested in enterprise plan",
      };

      const result = await classifyByContent(headers, body);

      expect(result.type).toBe("crm_note");
      expect(result.confidence).toBeGreaterThanOrEqual(65);
    });

    it("identifies ticket updates from content", async () => {
      const headers = {};
      const body = {
        content: "Support ticket #1234: User reported login issue",
      };

      const result = await classifyByContent(headers, body);

      expect(result.type).toBe("ticket_update");
      expect(result.confidence).toBeGreaterThanOrEqual(65);
    });

    it("defaults to generic_doc when content doesn't match", async () => {
      const headers = {};
      const body = {
        content: "Random text that doesn't match any pattern",
      };

      const result = await classifyByContent(headers, body);

      expect(result.type).toBe("generic_doc");
      expect(result.confidence).toBe(50);
    });

    it("uses webhook name context in content classification", async () => {
      const headers = {};
      const body = {
        content: "Some generic content",
      };
      const webhookName = "Meeting Transcripts";

      const result = await classifyByContent(headers, body, webhookName);

      expect(result.type).toBe("meeting_transcript");
      expect(result.confidence).toBeGreaterThanOrEqual(70);
    });

    it("uses webhook description context in content classification", async () => {
      const headers = {};
      const body = {
        content: "Random text",
      };
      const webhookDescription = "Receives CRM customer notes from Salesforce";

      const result = await classifyByContent(headers, body, undefined, webhookDescription);

      expect(result.type).toBe("crm_note");
      expect(result.confidence).toBeGreaterThanOrEqual(65);
    });

    it("combines webhook name and description in content analysis", async () => {
      const headers = {};
      const body = {
        content: "Some content",
      };
      const webhookName = "Support Tickets";
      const webhookDescription = "Zendesk ticket updates";

      const result = await classifyByContent(headers, body, webhookName, webhookDescription);

      expect(result.type).toBe("ticket_update");
      expect(result.confidence).toBeGreaterThanOrEqual(65);
    });
  });

  describe("extractTextFromBody", () => {
    it("extracts text from string body", () => {
      const body = "Plain text content";
      const result = extractTextFromBody(body);
      expect(result).toBe("Plain text content");
    });

    it("extracts content field from object", () => {
      const body = { content: "Extracted content" };
      const result = extractTextFromBody(body);
      expect(result).toBe("Extracted content");
    });

    it("extracts text field from object", () => {
      const body = { text: "Extracted text" };
      const result = extractTextFromBody(body);
      expect(result).toBe("Extracted text");
    });

    it("extracts message field from object", () => {
      const body = { message: "Extracted message" };
      const result = extractTextFromBody(body);
      expect(result).toBe("Extracted message");
    });

    it("extracts transcript field from object", () => {
      const body = { transcript: "Extracted transcript" };
      const result = extractTextFromBody(body);
      expect(result).toBe("Extracted transcript");
    });

    it("stringifies complex objects", () => {
      const body = {
        title: "Test",
        data: { nested: "value" },
      };
      const result = extractTextFromBody(body);
      expect(result).toContain("Test");
      expect(result).toContain("value");
    });

    it("handles arrays", () => {
      const body = [
        { text: "First item" },
        { text: "Second item" },
      ];
      const result = extractTextFromBody(body);
      expect(result).toContain("First item");
      expect(result).toContain("Second item");
    });

    it("handles empty objects", () => {
      const body = {};
      const result = extractTextFromBody(body);
      expect(result).toBe("");
    });

    it("handles null/undefined", () => {
      expect(extractTextFromBody(null)).toBe("");
      expect(extractTextFromBody(undefined)).toBe("");
    });
  });

  describe("classifyWebhookPayload", () => {
    it("prefers header classification when confidence is high", async () => {
      const headers = {
        "x-source": "salesforce-crm",
        "content-type": "application/json",
      };
      const body = { content: "Random text" };

      const result = await classifyWebhookPayload(headers, body);

      expect(result.type).toBe("crm_note");
      expect(result.confidence).toBeGreaterThanOrEqual(80);
    });

    it("falls back to content classification when headers don't match", async () => {
      const headers = {
        "content-type": "application/json",
      };
      const body = {
        content: "Meeting minutes: Discussed project timeline",
      };

      const result = await classifyWebhookPayload(headers, body);

      expect(result.type).toBe("meeting_transcript");
    });

    it("uses webhook name for classification when provided", async () => {
      const headers = {
        "content-type": "application/json",
      };
      const body = {
        content: "Some content",
      };
      const webhookName = "Zoom Meeting Transcripts";

      const result = await classifyWebhookPayload(headers, body, webhookName);

      expect(result.type).toBe("meeting_transcript");
      expect(result.confidence).toBeGreaterThanOrEqual(90);
    });

    it("uses webhook description for classification when provided", async () => {
      const headers = {
        "content-type": "application/json",
      };
      const body = {
        content: "Some content",
      };
      const webhookDescription = "Receives calendar events from Google Calendar";

      const result = await classifyWebhookPayload(headers, body, undefined, webhookDescription);

      expect(result.type).toBe("calendar_event");
      expect(result.confidence).toBeGreaterThanOrEqual(85);
    });

    it("prioritizes webhook context over headers when confidence is higher", async () => {
      const headers = {
        "content-type": "application/json",
      };
      const body = {
        content: "Some content",
      };
      const webhookName = "CRM Notes";
      const webhookDescription = "Salesforce customer interactions";

      const result = await classifyWebhookPayload(headers, body, webhookName, webhookDescription);

      expect(result.type).toBe("crm_note");
      expect(result.confidence).toBeGreaterThanOrEqual(85);
    });
  });

  describe("extractTitleFromBody", () => {
    it("extracts title from body.title", () => {
      const body = { title: "Test Title" };
      const headers = {};
      const result = extractTitleFromBody(body, headers);
      expect(result).toBe("Test Title");
    });

    it("extracts title from body.subject", () => {
      const body = { subject: "Email Subject" };
      const headers = {};
      const result = extractTitleFromBody(body, headers);
      expect(result).toBe("Email Subject");
    });

    it("extracts meeting title for meeting_transcript classification", () => {
      const body = { meetingTitle: "Q4 Planning Meeting" };
      const headers = {};
      const classification = {
        type: "meeting_transcript" as const,
        confidence: 85,
        reason: "Test",
      };
      const result = extractTitleFromBody(body, headers, classification);
      expect(result).toBe("Q4 Planning Meeting");
    });

    it("extracts ticket title for ticket_update classification", () => {
      const body = { ticketId: "12345" };
      const headers = {};
      const classification = {
        type: "ticket_update" as const,
        confidence: 80,
        reason: "Test",
      };
      const result = extractTitleFromBody(body, headers, classification);
      expect(result).toBe("Ticket #12345");
    });

    it("extracts CRM contact name for crm_note classification", () => {
      const body = { contactName: "John Doe" };
      const headers = {};
      const classification = {
        type: "crm_note" as const,
        confidence: 80,
        reason: "Test",
      };
      const result = extractTitleFromBody(body, headers, classification);
      expect(result).toBe("CRM: John Doe");
    });

    it("uses webhook name in title when no direct title found", () => {
      const body = { content: "Some content" };
      const headers = {};
      const classification = {
        type: "meeting_transcript" as const,
        confidence: 85,
        reason: "Test",
      };
      const webhookName = "Zoom Webhooks";
      const result = extractTitleFromBody(body, headers, classification, webhookName);
      expect(result).toContain("Meeting Transcript");
      expect(result).toContain("Zoom Webhooks");
    });

    it("formats event names nicely", () => {
      const body = { event: "ticket_created" };
      const headers = {};
      const result = extractTitleFromBody(body, headers);
      expect(result).toBe("Ticket Created");
    });

    it("extracts title from nested data structure", () => {
      const body = { data: { title: "Nested Title" } };
      const headers = {};
      const result = extractTitleFromBody(body, headers);
      expect(result).toBe("Nested Title");
    });

    it("uses first line of content as title if reasonable length", () => {
      const body = { content: "This is a good title\nMore content here" };
      const headers = {};
      const result = extractTitleFromBody(body, headers);
      expect(result).toBe("This is a good title");
    });

    it("falls back to classification type + timestamp when no title found", () => {
      const body = { content: "Some content" };
      const headers = {};
      const classification = {
        type: "generic_doc" as const,
        confidence: 50,
        reason: "Test",
      };
      const result = extractTitleFromBody(body, headers, classification);
      expect(result).toContain("Generic Doc");
      expect(result).toMatch(/\d{1,2}:\d{2}/); // Contains time format
    });

    it("uses webhook name + timestamp as fallback", () => {
      const body = { content: "Some content" };
      const headers = {};
      const webhookName = "My Webhook";
      const result = extractTitleFromBody(body, headers, undefined, webhookName);
      expect(result).toContain("My Webhook");
      expect(result).toMatch(/\d{1,2}:\d{2}/); // Contains time format
    });
  });
});

