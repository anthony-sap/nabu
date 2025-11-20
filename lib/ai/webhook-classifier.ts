/**
 * Webhook Classification Service
 * 
 * Analyzes webhook payloads (headers and content) to classify them into types:
 * - meeting_transcript
 * - call_transcript
 * - system_log
 * - chat_export
 * - crm_note
 * - ticket_update
 * - analytics_event
 * - calendar_event
 * - email_forward
 * - generic_doc
 */

export interface WebhookClassification {
  type: string; // Any classification type - not limited to predefined types
  confidence: number; // 0-100
  reason: string;
  extractedContent?: string; // Cleaned text for Note.content
  extractedTitle?: string; // Cleaned title for Note.title
}

/**
 * Classify webhook payload using headers first, then content
 */
export async function classifyWebhookPayload(
  headers: Record<string, string>,
  body: any,
  webhookName?: string,
  webhookDescription?: string
): Promise<WebhookClassification> {
  // Step 1: Try header-based heuristics (fast, no AI needed)
  const headerClassification = classifyByHeaders(headers, body, webhookName, webhookDescription);
  if (headerClassification.confidence >= 70) {
    // Extract title for header-based classification
    const extractedTitle = extractTitleFromBody(body, headers, headerClassification, webhookName);
    return {
      ...headerClassification,
      extractedTitle,
    };
  }

  // Step 2: Try content-based classification (slower, uses AI if needed)
  const contentClassification = await classifyByContent(headers, body, webhookName, webhookDescription);
  
  // Use content classification if it has higher confidence
  const finalClassification = contentClassification.confidence > headerClassification.confidence
    ? contentClassification
    : headerClassification;
  
  // Extract title for final classification
  const extractedTitle = extractTitleFromBody(body, headers, finalClassification, webhookName);
  
  return {
    ...finalClassification,
    extractedTitle,
  };
}

/**
 * Classify based on HTTP headers (fast heuristic approach)
 */
export function classifyByHeaders(
  headers: Record<string, string>,
  body: any,
  webhookName?: string,
  webhookDescription?: string
): WebhookClassification {
  const contentType = headers["content-type"]?.toLowerCase() || "";
  const userAgent = headers["user-agent"]?.toLowerCase() || "";
  const xSource = headers["x-source"]?.toLowerCase() || "";
  const xEventType = headers["x-event-type"]?.toLowerCase() || "";
  const xType = headers["x-type"]?.toLowerCase() || "";

  // Check webhook name and description for keywords (user-provided context)
  const webhookContext = `${webhookName || ""} ${webhookDescription || ""}`.toLowerCase();
  
  if (webhookContext) {
    // Meeting/Call transcript indicators from webhook context
    if (
      webhookContext.includes("meeting") ||
      webhookContext.includes("transcript") ||
      webhookContext.includes("zoom") ||
      webhookContext.includes("google meet") ||
      webhookContext.includes("teams meeting")
    ) {
      if (webhookContext.includes("call") || webhookContext.includes("phone")) {
        return {
          type: "call_transcript",
          confidence: 90,
          reason: `Webhook context indicates call transcript: ${webhookName || "unnamed"}`,
        };
      }
      return {
        type: "meeting_transcript",
        confidence: 90,
        reason: `Webhook context indicates meeting transcript: ${webhookName || "unnamed"}`,
      };
    }

    // CRM indicators from webhook context
    if (
      webhookContext.includes("crm") ||
      webhookContext.includes("salesforce") ||
      webhookContext.includes("hubspot") ||
      webhookContext.includes("pipedrive") ||
      webhookContext.includes("customer") ||
      webhookContext.includes("lead")
    ) {
      return {
        type: "crm_note",
        confidence: 85,
        reason: `Webhook context indicates CRM: ${webhookName || "unnamed"}`,
      };
    }

    // Calendar indicators from webhook context
    if (
      webhookContext.includes("calendar") ||
      webhookContext.includes("event") ||
      webhookContext.includes("appointment") ||
      webhookContext.includes("schedule")
    ) {
      return {
        type: "calendar_event",
        confidence: 85,
        reason: `Webhook context indicates calendar: ${webhookName || "unnamed"}`,
      };
    }

    // Ticket/Support indicators from webhook context
    if (
      webhookContext.includes("ticket") ||
      webhookContext.includes("support") ||
      webhookContext.includes("zendesk") ||
      webhookContext.includes("intercom") ||
      webhookContext.includes("issue")
    ) {
      return {
        type: "ticket_update",
        confidence: 85,
        reason: `Webhook context indicates ticket/support: ${webhookName || "unnamed"}`,
      };
    }

    // Chat indicators from webhook context
    if (
      webhookContext.includes("slack") ||
      webhookContext.includes("discord") ||
      webhookContext.includes("teams") ||
      webhookContext.includes("chat") ||
      webhookContext.includes("message")
    ) {
      return {
        type: "chat_export",
        confidence: 85,
        reason: `Webhook context indicates chat/messaging: ${webhookName || "unnamed"}`,
      };
    }

    // Email indicators from webhook context
    if (
      webhookContext.includes("email") ||
      webhookContext.includes("mail") ||
      webhookContext.includes("gmail") ||
      webhookContext.includes("outlook")
    ) {
      return {
        type: "email_forward",
        confidence: 85,
        reason: `Webhook context indicates email: ${webhookName || "unnamed"}`,
      };
    }

    // Analytics indicators from webhook context
    if (
      webhookContext.includes("analytics") ||
      webhookContext.includes("tracking") ||
      webhookContext.includes("event") ||
      webhookContext.includes("metric")
    ) {
      return {
        type: "analytics_event",
        confidence: 85,
        reason: `Webhook context indicates analytics: ${webhookName || "unnamed"}`,
      };
    }

    // System log indicators from webhook context
    if (
      webhookContext.includes("log") ||
      webhookContext.includes("monitoring") ||
      webhookContext.includes("system") ||
      webhookContext.includes("error")
    ) {
      return {
        type: "system_log",
        confidence: 80,
        reason: `Webhook context indicates system log: ${webhookName || "unnamed"}`,
      };
    }
  }

  // Meeting/Call transcript indicators
  if (
    userAgent.includes("transcription") ||
    userAgent.includes("otter") ||
    userAgent.includes("rev") ||
    xType.includes("transcript") ||
    xType.includes("meeting")
  ) {
    if (xType.includes("call") || userAgent.includes("call")) {
      return {
        type: "call_transcript",
        confidence: 85,
        reason: "Header indicates call transcript service",
      };
    }
    return {
      type: "meeting_transcript",
      confidence: 85,
      reason: "Header indicates meeting transcript service",
    };
  }

  // CRM indicators
  if (
    xSource.includes("crm") ||
    xSource.includes("salesforce") ||
    xSource.includes("hubspot") ||
    xSource.includes("pipedrive")
  ) {
    return {
      type: "crm_note",
      confidence: 80,
      reason: `Header indicates CRM source: ${xSource}`,
    };
  }

  // Analytics/Tracking indicators
  if (
    xEventType ||
    xType.includes("event") ||
    xType.includes("track") ||
    userAgent.includes("analytics")
  ) {
    return {
      type: "analytics_event",
      confidence: 75,
      reason: "Header indicates analytics/tracking event",
    };
  }

  // Calendar indicators
  if (
    xSource.includes("calendar") ||
    xSource.includes("google calendar") ||
    xSource.includes("outlook") ||
    userAgent.includes("calendar")
  ) {
    return {
      type: "calendar_event",
      confidence: 80,
      reason: "Header indicates calendar service",
    };
  }

  // Email indicators
  if (
    xSource.includes("email") ||
    xSource.includes("mail") ||
    contentType.includes("message/rfc822")
  ) {
    return {
      type: "email_forward",
      confidence: 75,
      reason: "Header indicates email source",
    };
  }

  // Ticket/Support system indicators
  if (
    xSource.includes("ticket") ||
    xSource.includes("zendesk") ||
    xSource.includes("intercom") ||
    xSource.includes("support")
  ) {
    return {
      type: "ticket_update",
      confidence: 80,
      reason: "Header indicates ticket/support system",
    };
  }

  // Chat/Slack indicators
  if (
    xSource.includes("slack") ||
    xSource.includes("discord") ||
    xSource.includes("teams") ||
    xSource.includes("chat")
  ) {
    return {
      type: "chat_export",
      confidence: 75,
      reason: "Header indicates chat/messaging service",
    };
  }

  // System log indicators
  if (
    xSource.includes("log") ||
    xSource.includes("monitoring") ||
    userAgent.includes("logger")
  ) {
    return {
      type: "system_log",
      confidence: 70,
      reason: "Header indicates logging/monitoring service",
    };
  }

  // Default: generic doc (low confidence)
  return {
    type: "generic_doc",
    confidence: 30,
    reason: "No specific header indicators found",
  };
}

/**
 * Classify based on content analysis (uses AI if needed)
 * For now, uses heuristics. Can be enhanced with OpenAI API later.
 */
export async function classifyByContent(
  headers: Record<string, string>,
  body: any,
  webhookName?: string,
  webhookDescription?: string
): Promise<WebhookClassification> {
  // Extract text content from body
  const textContent = extractTextFromBody(body);
  
  // Include webhook context in analysis
  const contextParts: string[] = [];
  if (webhookName) {
    contextParts.push(`Webhook name: ${webhookName}`);
  }
  if (webhookDescription) {
    contextParts.push(`Description: ${webhookDescription}`);
  }
  const contextualContent = contextParts.length > 0
    ? `${contextParts.join(". ")}. Content: ${textContent}`
    : textContent;
  
  const textLower = contextualContent.toLowerCase();
  
  // Extract title early for use in classification
  const extractedTitle = extractTitleFromBody(body, headers, undefined, webhookName);

  // Meeting transcript keywords
  if (
    textLower.includes("meeting") ||
    textLower.includes("transcript") ||
    textLower.includes("minutes") ||
    textLower.includes("attendees")
  ) {
    return {
      type: "meeting_transcript",
      confidence: 70,
      reason: "Content contains meeting-related keywords",
      extractedContent: textContent,
      extractedTitle: extractTitleFromBody(body, headers, { type: "meeting_transcript", confidence: 70, reason: "" }, webhookName),
    };
  }

  // Call transcript keywords
  if (
    textLower.includes("call") ||
    textLower.includes("phone conversation") ||
    textLower.includes("voice recording")
  ) {
    return {
      type: "call_transcript",
      confidence: 70,
      reason: "Content contains call-related keywords",
      extractedContent: textContent,
      extractedTitle: extractTitleFromBody(body, headers, { type: "call_transcript", confidence: 70, reason: "" }, webhookName),
    };
  }

  // CRM note keywords
  if (
    textLower.includes("customer") ||
    textLower.includes("lead") ||
    textLower.includes("opportunity") ||
    textLower.includes("deal")
  ) {
    return {
      type: "crm_note",
      confidence: 65,
      reason: "Content contains CRM-related keywords",
      extractedContent: textContent,
      extractedTitle: extractTitleFromBody(body, headers, { type: "crm_note", confidence: 65, reason: "" }, webhookName),
    };
  }

  // Ticket keywords
  if (
    textLower.includes("ticket") ||
    textLower.includes("issue") ||
    textLower.includes("support request")
  ) {
    return {
      type: "ticket_update",
      confidence: 65,
      reason: "Content contains ticket/support keywords",
      extractedContent: textContent,
      extractedTitle: extractTitleFromBody(body, headers, { type: "ticket_update", confidence: 65, reason: "" }, webhookName),
    };
  }

  // Default: generic doc
  const defaultClassification: WebhookClassification = {
    type: "generic_doc",
    confidence: 50,
    reason: "Content analysis did not match specific patterns",
    extractedContent: textContent,
    extractedTitle: extractTitleFromBody(body, headers, { type: "generic_doc", confidence: 50, reason: "" }, webhookName),
  };
  return defaultClassification;
}

/**
 * Extract title from webhook payload with classification awareness
 */
export function extractTitleFromBody(
  body: any,
  headers: Record<string, string>,
  classification?: WebhookClassification,
  webhookName?: string
): string {
  // Priority 1: Direct title fields (highest priority)
  if (body && typeof body === "object") {
    // Common title fields
    if (body.title) return String(body.title).trim();
    if (body.subject) return String(body.subject).trim();
    if (body.name) return String(body.name).trim();
    
    // Classification-specific fields
    if (classification) {
      switch (classification.type) {
        case "meeting_transcript":
          if (body.meetingTitle) return String(body.meetingTitle).trim();
          if (body.meetingName) return String(body.meetingName).trim();
          if (body.topic) return `Meeting: ${String(body.topic).trim()}`;
          if (body.meeting) {
            const meeting = body.meeting;
            if (typeof meeting === "object" && meeting.title) {
              return String(meeting.title).trim();
            }
            if (typeof meeting === "string") {
              return `Meeting: ${meeting.trim()}`;
            }
          }
          break;
        case "call_transcript":
          if (body.callTitle) return String(body.callTitle).trim();
          if (body.callerName) return `Call with ${String(body.callerName).trim()}`;
          if (body.call) {
            const call = body.call;
            if (typeof call === "object" && call.title) {
              return String(call.title).trim();
            }
          }
          break;
        case "crm_note":
          if (body.contactName) return `CRM: ${String(body.contactName).trim()}`;
          if (body.accountName) return `CRM: ${String(body.accountName).trim()}`;
          if (body.opportunityName) return `CRM: ${String(body.opportunityName).trim()}`;
          if (body.contact) {
            const contact = body.contact;
            if (typeof contact === "object" && contact.name) {
              return `CRM: ${String(contact.name).trim()}`;
            }
          }
          break;
        case "ticket_update":
          if (body.ticketTitle) return String(body.ticketTitle).trim();
          if (body.ticketId) return `Ticket #${String(body.ticketId).trim()}`;
          if (body.issueTitle) return String(body.issueTitle).trim();
          if (body.ticket) {
            const ticket = body.ticket;
            if (typeof ticket === "object") {
              if (ticket.title) return String(ticket.title).trim();
              if (ticket.id) return `Ticket #${String(ticket.id).trim()}`;
            }
          }
          break;
        case "calendar_event":
          if (body.eventTitle) return String(body.eventTitle).trim();
          if (body.summary) return String(body.summary).trim();
          if (body.eventName) return String(body.eventName).trim();
          if (body.event) {
            const event = body.event;
            if (typeof event === "object" && event.title) {
              return String(event.title).trim();
            }
            if (typeof event === "object" && event.summary) {
              return String(event.summary).trim();
            }
          }
          break;
        case "email_forward":
          if (body.emailSubject) return String(body.emailSubject).trim();
          if (body.from) {
            const from = body.from;
            if (typeof from === "object" && from.email) {
              return `Email from ${String(from.email).trim()}`;
            }
            return `Email from ${String(from).trim()}`;
          }
          break;
      }
    }
    
    // Event/type-based titles
    if (body.event) {
      const eventStr = String(body.event).trim();
      // Format event names nicely (snake_case to Title Case)
      const formatted = eventStr
        .replace(/_/g, " ")
        .replace(/\b\w/g, (l) => l.toUpperCase());
      return formatted;
    }
    
    if (body.type) {
      const typeStr = String(body.type).trim();
      return typeStr.charAt(0).toUpperCase() + typeStr.slice(1);
    }
    
    // Nested data structures
    if (body.data && typeof body.data === "object") {
      if (body.data.title) return String(body.data.title).trim();
      if (body.data.subject) return String(body.data.subject).trim();
      if (body.data.name) return String(body.data.name).trim();
    }
    
    // Payload structure analysis
    if (body.payload && typeof body.payload === "object") {
      if (body.payload.title) return String(body.payload.title).trim();
      if (body.payload.subject) return String(body.payload.subject).trim();
    }
  }
  
  // Priority 2: Header-based titles
  if (headers["x-title"]) return headers["x-title"].trim();
  if (headers["x-subject"]) return headers["x-subject"].trim();
  if (headers["subject"]) return headers["subject"].trim();
  
  // Priority 3: Classification + Webhook context (before content extraction)
  if (classification && webhookName) {
    const typeLabel = classification.type
      .replace(/_/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase());
    
    // Use webhook name with classification type
    return `${typeLabel} from ${webhookName}`;
  }
  
  // Priority 4: Classification type only
  if (classification) {
    const typeLabel = classification.type
      .replace(/_/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase());
    
    const date = new Date();
    const dateStr = date.toLocaleDateString("en-US", { 
      month: "short", 
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
    
    return `${typeLabel} - ${dateStr}`;
  }
  
  // Priority 5: Content-based title extraction (first line or summary)
  // Only use if we don't have classification context
  if (body && typeof body === "object") {
    const content = extractTextFromBody(body);
    if (content) {
      const firstLine = content.split("\n")[0].trim();
      // Use first line if it's reasonable length and not too long
      // Also check if it looks like a title (not just generic content)
      if (
        firstLine.length > 0 && 
        firstLine.length < 100 && 
        firstLine.length > 5 &&
        !firstLine.toLowerCase().includes("some content") &&
        !firstLine.toLowerCase().includes("random text")
      ) {
        return firstLine;
      }
    }
  }
  
  // Priority 6: Webhook name + timestamp
  if (webhookName) {
    const date = new Date();
    const dateStr = date.toLocaleDateString("en-US", { 
      month: "short", 
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
    return `${webhookName} - ${dateStr}`;
  }
  
  // Priority 7: Final fallback
  const date = new Date();
  const dateStr = date.toLocaleDateString("en-US", { 
    month: "short", 
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
  return `Webhook - ${dateStr}`;
}

/**
 * Extract text content from body (various formats)
 */
export function extractTextFromBody(body: any): string {
  if (typeof body === "string") {
    return body;
  }

  if (body && typeof body === "object") {
    // Try common content fields
    if (body.content) return String(body.content);
    if (body.text) return String(body.text);
    if (body.body) return String(body.body);
    if (body.message) return String(body.message);
    if (body.transcript) return String(body.transcript);
    if (body.description) return String(body.description);
    if (body.summary) return String(body.summary);

    // If it's an array, join items
    if (Array.isArray(body)) {
      return body.map((item) => extractTextFromBody(item)).join("\n");
    }

    // Try to extract all string values
    const strings: string[] = [];
    function extractStrings(obj: any): void {
      if (typeof obj === "string") {
        strings.push(obj);
      } else if (Array.isArray(obj)) {
        obj.forEach(extractStrings);
      } else if (obj && typeof obj === "object") {
        Object.values(obj).forEach(extractStrings);
      }
    }
    extractStrings(body);
    return strings.join("\n");
  }

  return "";
}

