import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { NabuHeader } from "@/components/nabu/nabu-header";
import { NabuMobileNav } from "@/components/nabu/nabu-mobile-nav";

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-[#0a1428] text-white selection:bg-[#00B3A6]/30">
      {/* Brand tokens */}
      <style>{`
        :root{
          --nabu-mint:#00B3A6; --nabu-deep:#071633; --nabu-lapis:#1E40AF; --nabu-gold:#C59B2F; --nabu-clay:#E7DCC7;
        }
        .glass{ backdrop-filter:saturate(140%) blur(10px); background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.08); }
      `}</style>

      {/* NAV */}
      <NabuMobileNav />
      <NabuHeader />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute -top-32 -left-32 h-[42rem] w-[42rem] rounded-full bg-[var(--nabu-mint)]/10 blur-3xl"/>
        <div className="absolute -bottom-24 -right-24 h-[36rem] w-[36rem] rounded-full bg-[var(--nabu-lapis)]/20 blur-3xl"/>
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-24 text-center">
          <Badge variant="outline" className="bg-[var(--nabu-mint)]/10 text-[var(--nabu-mint)] border-[var(--nabu-mint)]/30 hover:bg-[var(--nabu-mint)]/15">
            Help Center
          </Badge>
          <h1 className="mt-6 text-5xl sm:text-6xl font-serif leading-tight">
            Frequently Asked Questions
          </h1>
          <p className="mt-6 text-lg text-white/80 max-w-2xl mx-auto">
            Everything you need to know about Nabu's features, capabilities, and how to make the most of your note-taking experience.
          </p>
        </div>
      </section>

      {/* FAQ SECTIONS */}
      <section className="py-12 bg-[#0c1831] border-t border-white/5">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-16">
          
          {/* 1. GETTING STARTED & CORE CONCEPTS */}
          <div>
            <h2 className="text-3xl font-serif text-[var(--nabu-mint)] mb-6">Getting Started & Core Concepts</h2>
            <Accordion type="single" collapsible className="space-y-4">
              <AccordionItem value="what-is-nabu" className="glass rounded-xl border-white/10 px-6">
                <AccordionTrigger className="text-lg font-semibold hover:text-[var(--nabu-mint)] transition-colors">
                  What is Nabu?
                </AccordionTrigger>
                <AccordionContent className="text-white/80 pt-4">
                  Nabu is a feed-first notes system designed to capture quick thoughts from anywhere—web, chat apps, email—and automatically organize them into structured notes. It uses AI to suggest tags, link related ideas, and generate summaries that help you find information fast. Think of it as your intelligent knowledge companion that captures everything you think about and makes it instantly retrievable.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="thoughts-vs-notes" className="glass rounded-xl border-white/10 px-6">
                <AccordionTrigger className="text-lg font-semibold hover:text-[var(--nabu-mint)] transition-colors">
                  What are Thoughts vs Notes?
                </AccordionTrigger>
                <AccordionContent className="text-white/80 pt-4">
                  <p className="mb-3">
                    <strong className="text-white">Thoughts</strong> are quick captures—short ideas, reminders, or snippets you want to save without overthinking. They appear in your Feed and are perfect for capturing information on the go.
                  </p>
                  <p className="mb-3">
                    <strong className="text-white">Notes</strong> are more structured, long-form content with rich formatting, images, and links. You can promote one or more Thoughts into a Note when you're ready to develop an idea further.
                  </p>
                  <p>
                    Nabu intelligently detects your intent: short, single-line text becomes a Thought; longer, structured content becomes a Note. You always have control to change this classification.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="feed-work" className="glass rounded-xl border-white/10 px-6">
                <AccordionTrigger className="text-lg font-semibold hover:text-[var(--nabu-mint)] transition-colors">
                  How does the Feed work?
                </AccordionTrigger>
                <AccordionContent className="text-white/80 pt-4">
                  The Feed is your central hub for all captured Thoughts. It shows recent captures in chronological order, complete with AI-suggested tags and clustering indicators when related Thoughts are detected. You can quickly promote Thoughts to Notes, accept tag suggestions, or group similar items together—all from one streamlined interface.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="tags-vs-folders" className="glass rounded-xl border-white/10 px-6">
                <AccordionTrigger className="text-lg font-semibold hover:text-[var(--nabu-mint)] transition-colors">
                  What's the difference between Tags and Folders?
                </AccordionTrigger>
                <AccordionContent className="text-white/80 pt-4">
                  <p className="mb-3">
                    <strong className="text-white">Tags</strong> are flexible labels (like #client-acme, #meeting-prep, #ideas) that can be applied to multiple notes. A single note can have many tags, and tags work across your entire workspace for powerful filtering and search.
                  </p>
                  <p>
                    <strong className="text-white">Folders</strong> provide hierarchical organization—each note lives in one folder at a time. Use folders for major projects or categories, and tags for cross-cutting themes and topics.
                  </p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          {/* 2. CAPTURE & INPUT */}
          <div>
            <h2 className="text-3xl font-serif text-[var(--nabu-mint)] mb-6">Capture & Input</h2>
            <Accordion type="single" collapsible className="space-y-4">
              <AccordionItem value="capture-thoughts" className="glass rounded-xl border-white/10 px-6">
                <AccordionTrigger className="text-lg font-semibold hover:text-[var(--nabu-mint)] transition-colors">
                  How do I capture Thoughts?
                </AccordionTrigger>
                <AccordionContent className="text-white/80 pt-4">
                  You can capture Thoughts directly from the web app using the quick capture form in your Feed, or from external channels like WhatsApp, Telegram, Teams, or email. Simply type your thought and hit enter—Nabu handles the rest, including auto-tagging and storage.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="capture-channels" className="glass rounded-xl border-white/10 px-6">
                <AccordionTrigger className="text-lg font-semibold hover:text-[var(--nabu-mint)] transition-colors">
                  What capture channels are supported?
                </AccordionTrigger>
                <AccordionContent className="text-white/80 pt-4">
                  Nabu supports multiple capture channels: <strong className="text-white">Web</strong> (direct app input), <strong className="text-white">Telegram</strong>, <strong className="text-white">WhatsApp</strong>, <strong className="text-white">Teams</strong>, <strong className="text-white">Email</strong>, and <strong className="text-white">Voice</strong> notes. Each channel seamlessly sends your content to your Feed, preserving timestamps and source information for full context.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="capture-images" className="glass rounded-xl border-white/10 px-6">
                <AccordionTrigger className="text-lg font-semibold hover:text-[var(--nabu-mint)] transition-colors">
                  Can I capture with images or attachments?
                </AccordionTrigger>
                <AccordionContent className="text-white/80 pt-4">
                  Yes! You can attach images, documents, and files to both Thoughts and Notes. Images can be uploaded via drag-and-drop, paste, or file picker. Nabu automatically compresses images (up to 2MB, 1920px max dimension) for optimal storage while maintaining quality. SVG files are supported without compression for perfect scaling.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="voice-notes" className="glass rounded-xl border-white/10 px-6">
                <AccordionTrigger className="text-lg font-semibold hover:text-[var(--nabu-mint)] transition-colors">
                  Does Nabu support voice notes?
                </AccordionTrigger>
                <AccordionContent className="text-white/80 pt-4">
                  Yes, voice is a supported capture channel. Voice notes sent through integrated channels are automatically transcribed and stored as Thoughts, making your spoken ideas instantly searchable and organized.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          {/* 3. SMART ORGANIZATION */}
          <div>
            <h2 className="text-3xl font-serif text-[var(--nabu-mint)] mb-6">Smart Organization</h2>
            <Accordion type="single" collapsible className="space-y-4">
              <AccordionItem value="ai-tagging" className="glass rounded-xl border-white/10 px-6">
                <AccordionTrigger className="text-lg font-semibold hover:text-[var(--nabu-mint)] transition-colors">
                  How does AI tagging work?
                </AccordionTrigger>
                <AccordionContent className="text-white/80 pt-4">
                  <p className="mb-3">
                    When you create or edit content, Nabu's AI analyzes the text and suggests relevant tags based on context, entities (people, companies, projects), and topics. The system is intelligent about timing—it waits for a 2-minute cooldown after you stop editing to avoid generating redundant suggestions while you're actively working.
                  </p>
                  <p className="mb-3">
                    Tag suggestions appear as a notification with a confidence score. You can accept all, select specific tags, or dismiss them entirely. The system learns from your choices to improve future suggestions.
                  </p>
                  <p>
                    AI-suggested tags are visually distinguished with a dashed border and sparkle icon until you accept them, at which point they become standard tags.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="create-tags" className="glass rounded-xl border-white/10 px-6">
                <AccordionTrigger className="text-lg font-semibold hover:text-[var(--nabu-mint)] transition-colors">
                  Can I create my own tags?
                </AccordionTrigger>
                <AccordionContent className="text-white/80 pt-4">
                  Absolutely! You can create tags manually by typing #hashtag directly in your note content using the rich text editor. The mention dropdown will suggest existing tags as you type, or you can create new ones on the fly. Multi-word tags are fully supported (e.g., #product-launch-2024).
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="tag-types" className="glass rounded-xl border-white/10 px-6">
                <AccordionTrigger className="text-lg font-semibold hover:text-[var(--nabu-mint)] transition-colors">
                  What are tag types (Topic, Project, Client)?
                </AccordionTrigger>
                <AccordionContent className="text-white/80 pt-4">
                  Nabu supports different tag types to help you organize by context: <strong className="text-white">Topic</strong> tags categorize by subject matter, <strong className="text-white">Project</strong> tags group work initiatives, <strong className="text-white">Client</strong> tags track customer-related notes, and <strong className="text-white">Other</strong> for anything else. This typing helps with filtering and creating specialized views like client notebooks.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="folder-suggestion" className="glass rounded-xl border-white/10 px-6">
                <AccordionTrigger className="text-lg font-semibold hover:text-[var(--nabu-mint)] transition-colors">
                  How does folder suggestion work?
                </AccordionTrigger>
                <AccordionContent className="text-white/80 pt-4">
                  When you create a new note or promote a Thought to a Note, Nabu's AI analyzes the content and suggests the most appropriate folder based on your existing folder structure and the note's topic. You can accept the suggestion or choose a different folder—it's completely optional and designed to save you time organizing.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="promote-thoughts" className="glass rounded-xl border-white/10 px-6">
                <AccordionTrigger className="text-lg font-semibold hover:text-[var(--nabu-mint)] transition-colors">
                  How do I promote Thoughts to Notes?
                </AccordionTrigger>
                <AccordionContent className="text-white/80 pt-4">
                  From your Feed, select one or more Thoughts and click the promote action. Nabu will create a new Note with a suggested title and content prefilled from your selected Thoughts. Any accepted tags transfer automatically. You can also bulk-promote multiple related Thoughts into a single comprehensive Note.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          {/* 4. RICH TEXT EDITOR & CONTENT */}
          <div>
            <h2 className="text-3xl font-serif text-[var(--nabu-mint)] mb-6">Rich Text Editor & Content</h2>
            <Accordion type="single" collapsible className="space-y-4">
              <AccordionItem value="formatting-options" className="glass rounded-xl border-white/10 px-6">
                <AccordionTrigger className="text-lg font-semibold hover:text-[var(--nabu-mint)] transition-colors">
                  What formatting options are available?
                </AccordionTrigger>
                <AccordionContent className="text-white/80 pt-4">
                  Nabu uses a powerful Lexical rich text editor with full formatting support: bold, italic, underline, headings, lists (ordered and unordered), code blocks, quotes, links, and inline mentions (@notes, #tags). The editor also supports drag-and-drop for images and maintains clean, structured content.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="add-images" className="glass rounded-xl border-white/10 px-6">
                <AccordionTrigger className="text-lg font-semibold hover:text-[var(--nabu-mint)] transition-colors">
                  Can I add images to notes?
                </AccordionTrigger>
                <AccordionContent className="text-white/80 pt-4">
                  Yes! You can add images to notes via drag-and-drop, paste from clipboard, or the image upload button. Images are fully integrated into the editor with selection support (click to select, keyboard navigation), visual indicators, and dual deletion methods (keyboard Delete/Backspace or hover button).
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="image-formats" className="glass rounded-xl border-white/10 px-6">
                <AccordionTrigger className="text-lg font-semibold hover:text-[var(--nabu-mint)] transition-colors">
                  What image formats are supported?
                </AccordionTrigger>
                <AccordionContent className="text-white/80 pt-4">
                  Nabu supports all common image formats: JPEG, PNG, GIF, WebP, and SVG. SVG files receive special treatment—they're stored without compression to preserve their infinite scaling capability and crisp rendering at any size. Other formats are automatically optimized for web delivery.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="image-upload-process" className="glass rounded-xl border-white/10 px-6">
                <AccordionTrigger className="text-lg font-semibold hover:text-[var(--nabu-mint)] transition-colors">
                  How does image upload work?
                </AccordionTrigger>
                <AccordionContent className="text-white/80 pt-4">
                  <p className="mb-3">
                    Nabu uses a secure backend-generated signed URL system for uploads. When you add an image, the backend creates a temporary, single-use upload URL (5-minute expiry) that your browser uses to upload directly to secure storage. This means no credentials are ever exposed to the frontend.
                  </p>
                  <p>
                    The upload includes real-time progress tracking, client-side compression (except for SVGs), and automatic confirmation once complete. All uploads are validated for ownership and multi-tenant isolation to ensure security.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="image-size-limits" className="glass rounded-xl border-white/10 px-6">
                <AccordionTrigger className="text-lg font-semibold hover:text-[var(--nabu-mint)] transition-colors">
                  Are there size limits for images?
                </AccordionTrigger>
                <AccordionContent className="text-white/80 pt-4">
                  Images are automatically compressed to a maximum of 2MB file size and 1920px on the longest dimension. This optimization happens client-side before upload, ensuring fast page loads while maintaining excellent visual quality. SVG files have no size restrictions since they're vector-based.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          {/* 5. SEARCH & DISCOVERY */}
          <div>
            <h2 className="text-3xl font-serif text-[var(--nabu-mint)] mb-6">Search & Discovery</h2>
            <Accordion type="single" collapsible className="space-y-4">
              <AccordionItem value="semantic-search" className="glass rounded-xl border-white/10 px-6">
                <AccordionTrigger className="text-lg font-semibold hover:text-[var(--nabu-mint)] transition-colors">
                  How does semantic search work?
                </AccordionTrigger>
                <AccordionContent className="text-white/80 pt-4">
                  <p className="mb-3">
                    Semantic search finds notes by meaning, not just exact keywords. Nabu uses OpenAI's text-embedding-3-small model to convert your content into 512-dimensional vectors that capture semantic meaning. When you search, your query is also converted to a vector, and Nabu finds notes with similar meaning using mathematical similarity (cosine distance).
                  </p>
                  <p className="mb-3">
                    For example, searching "client meeting" will find notes about "customer calls" or "stakeholder discussions" even if those exact words aren't present. The system understands context and relationships between concepts.
                  </p>
                  <p>
                    To handle long notes efficiently, content is automatically chunked into ~2000 character segments with 200-character overlap, ensuring important context isn't lost at boundaries. Each chunk is embedded separately, so you get precise matches within large documents.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="keyword-vs-semantic" className="glass rounded-xl border-white/10 px-6">
                <AccordionTrigger className="text-lg font-semibold hover:text-[var(--nabu-mint)] transition-colors">
                  What's the difference between keyword and semantic search?
                </AccordionTrigger>
                <AccordionContent className="text-white/80 pt-4">
                  <strong className="text-white">Keyword search</strong> looks for exact text matches—fast and precise when you know the specific terms. <strong className="text-white">Semantic search</strong> understands meaning and context, finding conceptually related content even with different wording. Keyword search is great for names and specific phrases; semantic search excels at finding ideas and themes.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="hybrid-search" className="glass rounded-xl border-white/10 px-6">
                <AccordionTrigger className="text-lg font-semibold hover:text-[var(--nabu-mint)] transition-colors">
                  How does hybrid search combine both?
                </AccordionTrigger>
                <AccordionContent className="text-white/80 pt-4">
                  <p className="mb-3">
                    Nabu's hybrid search combines the best of both approaches: keyword search (40% weight) for exact matches and semantic search (60% weight) for conceptual relevance. The system runs both searches in parallel, then blends the results using a weighted average of scores.
                  </p>
                  <p>
                    This means you get both precise term matches AND related concepts in your results. The weights are configurable, but the default 40/60 split has been optimized to provide the most useful results across different query types.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="filter-tags" className="glass rounded-xl border-white/10 px-6">
                <AccordionTrigger className="text-lg font-semibold hover:text-[var(--nabu-mint)] transition-colors">
                  Can I filter by tags?
                </AccordionTrigger>
                <AccordionContent className="text-white/80 pt-4">
                  Yes! Search results can be filtered by one or more tags to narrow results to specific projects, clients, or topics. Tag filters work alongside keyword and semantic search, giving you powerful ways to drill down to exactly what you need.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="find-related" className="glass rounded-xl border-white/10 px-6">
                <AccordionTrigger className="text-lg font-semibold hover:text-[var(--nabu-mint)] transition-colors">
                  How do I find related notes?
                </AccordionTrigger>
                <AccordionContent className="text-white/80 pt-4">
                  Nabu automatically suggests related notes based on semantic similarity, shared tags, and explicit links. When viewing a note, you'll see a "Related Notes" section showing relevant content. You can also use the search system to find conceptually similar notes by searching for key concepts from your current note.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          {/* 6. LINKING & RELATIONSHIPS */}
          <div>
            <h2 className="text-3xl font-serif text-[var(--nabu-mint)] mb-6">Linking & Relationships</h2>
            <Accordion type="single" collapsible className="space-y-4">
              <AccordionItem value="link-notes" className="glass rounded-xl border-white/10 px-6">
                <AccordionTrigger className="text-lg font-semibold hover:text-[var(--nabu-mint)] transition-colors">
                  How do I link notes together?
                </AccordionTrigger>
                <AccordionContent className="text-white/80 pt-4">
                  You can link notes using @ mentions in the editor (type @ to see a list of your notes), or add explicit links in the metadata sidebar's "Linked Notes" section. Links are bidirectional—when you link Note A to Note B, both notes show the relationship.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="link-relations" className="glass rounded-xl border-white/10 px-6">
                <AccordionTrigger className="text-lg font-semibold hover:text-[var(--nabu-mint)] transition-colors">
                  What are link relations (Related, Expands, Supports, Contradicts, Follows Up)?
                </AccordionTrigger>
                <AccordionContent className="text-white/80 pt-4">
                  <p className="mb-3">
                    Link relations add context to connections between notes:
                  </p>
                  <ul className="space-y-2 ml-4">
                    <li><strong className="text-white">Related:</strong> General connection between topics</li>
                    <li><strong className="text-white">Expands:</strong> One note elaborates on ideas in another</li>
                    <li><strong className="text-white">Supports:</strong> Evidence or arguments that strengthen another note</li>
                    <li><strong className="text-white">Contradicts:</strong> Conflicting information or alternative viewpoints</li>
                    <li><strong className="text-white">Follows Up:</strong> Continuation or update to a previous note</li>
                  </ul>
                  <p className="mt-3">
                    These relations help you build a knowledge graph that captures not just what connects, but how and why ideas relate.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="suggest-related" className="glass rounded-xl border-white/10 px-6">
                <AccordionTrigger className="text-lg font-semibold hover:text-[var(--nabu-mint)] transition-colors">
                  How does Nabu suggest related notes?
                </AccordionTrigger>
                <AccordionContent className="text-white/80 pt-4">
                  Nabu uses semantic similarity from the vector embedding system to identify conceptually related notes. The system compares vector embeddings to find notes with similar themes, topics, or context, even if they don't share exact keywords or tags.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          {/* 7. COLLABORATION & SHARING */}
          <div>
            <h2 className="text-3xl font-serif text-[var(--nabu-mint)] mb-6">Collaboration & Sharing</h2>
            <Accordion type="single" collapsible className="space-y-4">
              <AccordionItem value="share-notes" className="glass rounded-xl border-white/10 px-6">
                <AccordionTrigger className="text-lg font-semibold hover:text-[var(--nabu-mint)] transition-colors">
                  Can I share notes with my team?
                </AccordionTrigger>
                <AccordionContent className="text-white/80 pt-4">
                  Yes! Notes can be shared with specific team members within your workspace. Shared notes are explicitly marked and maintain full audit trails of who accessed and modified them.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="permission-levels" className="glass rounded-xl border-white/10 px-6">
                <AccordionTrigger className="text-lg font-semibold hover:text-[var(--nabu-mint)] transition-colors">
                  What permission levels exist (View, Comment, Edit)?
                </AccordionTrigger>
                <AccordionContent className="text-white/80 pt-4">
                  Nabu supports three permission levels: <strong className="text-white">View</strong> (read-only access), <strong className="text-white">Comment</strong> (can add comments but not edit), and <strong className="text-white">Edit</strong> (full modification rights). You control exactly what each person can do with your shared content.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="share-folders-tags" className="glass rounded-xl border-white/10 px-6">
                <AccordionTrigger className="text-lg font-semibold hover:text-[var(--nabu-mint)] transition-colors">
                  Can I share entire folders or tags?
                </AccordionTrigger>
                <AccordionContent className="text-white/80 pt-4">
                  Yes! You can share entire folders or tag collections, making it easy to give team members access to a whole project or client workspace at once. All notes within a shared folder or tag inherit the sharing permissions.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="data-private" className="glass rounded-xl border-white/10 px-6">
                <AccordionTrigger className="text-lg font-semibold hover:text-[var(--nabu-mint)] transition-colors">
                  Is my data private by default?
                </AccordionTrigger>
                <AccordionContent className="text-white/80 pt-4">
                  Absolutely. All notes are private by default—only you can see them unless you explicitly share. The multi-tenant architecture ensures complete data isolation between workspaces, and the audit system tracks every access for full transparency.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          {/* 8. AI FEATURES */}
          <div>
            <h2 className="text-3xl font-serif text-[var(--nabu-mint)] mb-6">AI Features</h2>
            <Accordion type="single" collapsible className="space-y-4">
              <AccordionItem value="ai-capabilities" className="glass rounded-xl border-white/10 px-6">
                <AccordionTrigger className="text-lg font-semibold hover:text-[var(--nabu-mint)] transition-colors">
                  What AI capabilities does Nabu have?
                </AccordionTrigger>
                <AccordionContent className="text-white/80 pt-4">
                  <p className="mb-3">
                    Nabu leverages AI throughout the platform:
                  </p>
                  <ul className="space-y-2 ml-4">
                    <li><strong className="text-white">Smart tagging:</strong> Automatic tag suggestions based on content analysis</li>
                    <li><strong className="text-white">Semantic search:</strong> Find notes by meaning using vector embeddings</li>
                    <li><strong className="text-white">Content classification:</strong> Automatically detect whether input should be a Thought or Note</li>
                    <li><strong className="text-white">Folder suggestions:</strong> Recommend optimal folders for new notes</li>
                    <li><strong className="text-white">Related notes:</strong> Surface connections between similar content</li>
                    <li><strong className="text-white">Summaries:</strong> Generate concise overviews of longer content</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="content-classification" className="glass rounded-xl border-white/10 px-6">
                <AccordionTrigger className="text-lg font-semibold hover:text-[var(--nabu-mint)] transition-colors">
                  How does content classification work?
                </AccordionTrigger>
                <AccordionContent className="text-white/80 pt-4">
                  <p className="mb-3">
                    Nabu uses heuristic analysis to classify content as it's captured. The system looks at multiple signals:
                  </p>
                  <ul className="space-y-2 ml-4">
                    <li><strong className="text-white">Length:</strong> Very short content (&lt;150 chars) → Thought</li>
                    <li><strong className="text-white">Structure:</strong> Multiple paragraphs or formatting → Note</li>
                    <li><strong className="text-white">Intent markers:</strong> Questions, action items, reminders → Thought</li>
                    <li><strong className="text-white">Content type:</strong> Lists, headers, structured prose → Note</li>
                  </ul>
                  <p className="mt-3">
                    The classification includes a confidence score, and you can always override the decision manually.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="ai-suggested-tags" className="glass rounded-xl border-white/10 px-6">
                <AccordionTrigger className="text-lg font-semibold hover:text-[var(--nabu-mint)] transition-colors">
                  What are AI-suggested tags?
                </AccordionTrigger>
                <AccordionContent className="text-white/80 pt-4">
                  AI-suggested tags are intelligent recommendations generated by analyzing your content for entities (people, companies), topics, and themes. They appear after a cooldown period when you've finished editing (minimum 200 characters, fewer than 3 existing tags). You can accept, reject, or cherry-pick specific suggestions.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="ai-accuracy" className="glass rounded-xl border-white/10 px-6">
                <AccordionTrigger className="text-lg font-semibold hover:text-[var(--nabu-mint)] transition-colors">
                  How accurate are AI suggestions?
                </AccordionTrigger>
                <AccordionContent className="text-white/80 pt-4">
                  AI suggestions are highly contextual and improve over time. The system targets 60%+ acceptance rate for tag suggestions. Each suggestion includes a confidence score, and the system learns from your accept/reject patterns to improve future recommendations. You always have full control to modify or ignore suggestions.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="accept-reject-ai" className="glass rounded-xl border-white/10 px-6">
                <AccordionTrigger className="text-lg font-semibold hover:text-[var(--nabu-mint)] transition-colors">
                  Can I accept/reject AI suggestions?
                </AccordionTrigger>
                <AccordionContent className="text-white/80 pt-4">
                  Yes! All AI suggestions are optional. You can accept all suggestions with one click, select individual tags to accept, or dismiss everything. Rejecting suggestions adds a cooldown period so you won't be repeatedly prompted with the same content.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          {/* 9. DATA & STORAGE */}
          <div>
            <h2 className="text-3xl font-serif text-[var(--nabu-mint)] mb-6">Data & Storage</h2>
            <Accordion type="single" collapsible className="space-y-4">
              <AccordionItem value="data-storage" className="glass rounded-xl border-white/10 px-6">
                <AccordionTrigger className="text-lg font-semibold hover:text-[var(--nabu-mint)] transition-colors">
                  How is my data stored?
                </AccordionTrigger>
                <AccordionContent className="text-white/80 pt-4">
                  All data is stored in a secure PostgreSQL database with pgvector extension for semantic search. Images and attachments are stored in Supabase Storage with secure, time-limited access URLs. Data at rest is encrypted, and all database operations enforce multi-tenant isolation for complete privacy.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="multi-tenancy" className="glass rounded-xl border-white/10 px-6">
                <AccordionTrigger className="text-lg font-semibold hover:text-[var(--nabu-mint)] transition-colors">
                  What is multi-tenancy?
                </AccordionTrigger>
                <AccordionContent className="text-white/80 pt-4">
                  Multi-tenancy means each workspace (tenant) has completely isolated data. Your notes, thoughts, and files are never visible to other workspaces. Database middleware automatically filters all queries by tenantId, ensuring bulletproof data separation without requiring manual security checks in application code.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="storage-usage" className="glass rounded-xl border-white/10 px-6">
                <AccordionTrigger className="text-lg font-semibold hover:text-[var(--nabu-mint)] transition-colors">
                  Can I see storage usage?
                </AccordionTrigger>
                <AccordionContent className="text-white/80 pt-4">
                  Yes! The Storage page provides detailed statistics including total storage used, number of files, storage by file type, and a list of your largest files. You can identify space-consuming content and manage your storage efficiently.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="audit-logging" className="glass rounded-xl border-white/10 px-6">
                <AccordionTrigger className="text-lg font-semibold hover:text-[var(--nabu-mint)] transition-colors">
                  Is there audit logging?
                </AccordionTrigger>
                <AccordionContent className="text-white/80 pt-4">
                  <p className="mb-3">
                    Yes, comprehensive audit logging is built into every database model. All records track:
                  </p>
                  <ul className="space-y-2 ml-4">
                    <li><strong className="text-white">createdAt / createdBy:</strong> When and who created it</li>
                    <li><strong className="text-white">updatedAt / updatedBy:</strong> When and who last modified it</li>
                    <li><strong className="text-white">deletedAt / deletedBy:</strong> When and who deleted it (if soft-deleted)</li>
                  </ul>
                  <p className="mt-3">
                    This provides full traceability for compliance, security, and collaboration transparency.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="soft-delete" className="glass rounded-xl border-white/10 px-6">
                <AccordionTrigger className="text-lg font-semibold hover:text-[var(--nabu-mint)] transition-colors">
                  What happens to deleted items (soft delete)?
                </AccordionTrigger>
                <AccordionContent className="text-white/80 pt-4">
                  Nabu uses soft deletes—when you delete something, it's marked as deleted (deletedAt timestamp) but not removed from the database. This enables recovery if you accidentally delete something important, maintains referential integrity, and preserves audit history. Soft-deleted items are automatically hidden from queries and search results.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          {/* 10. AUTO-SAVE & SYNC */}
          <div>
            <h2 className="text-3xl font-serif text-[var(--nabu-mint)] mb-6">Auto-Save & Sync</h2>
            <Accordion type="single" collapsible className="space-y-4">
              <AccordionItem value="auto-save-work" className="glass rounded-xl border-white/10 px-6">
                <AccordionTrigger className="text-lg font-semibold hover:text-[var(--nabu-mint)] transition-colors">
                  How does auto-save work?
                </AccordionTrigger>
                <AccordionContent className="text-white/80 pt-4">
                  <p className="mb-3">
                    Nabu uses a dual auto-save system for maximum reliability:
                  </p>
                  <ul className="space-y-2 ml-4">
                    <li><strong className="text-white">Local save every 5 seconds:</strong> Changes are saved to browser localStorage for instant recovery</li>
                    <li><strong className="text-white">Server sync every 60 seconds:</strong> Changes are persisted to the database for cross-device access</li>
                    <li><strong className="text-white">Save on page leave:</strong> Both beforeunload and component unmount handlers ensure nothing is lost</li>
                  </ul>
                  <p className="mt-3">
                    You'll see visual indicators showing "Saved locally" or "Synced" status.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="local-vs-server" className="glass rounded-xl border-white/10 px-6">
                <AccordionTrigger className="text-lg font-semibold hover:text-[var(--nabu-mint)] transition-colors">
                  What's the difference between local save and server sync?
                </AccordionTrigger>
                <AccordionContent className="text-white/80 pt-4">
                  <strong className="text-white">Local save</strong> stores to your browser's localStorage—instant but only accessible on this device/browser. <strong className="text-white">Server sync</strong> saves to the database—takes slightly longer but accessible everywhere and permanent. The system uses timestamps to always load the newest version, whether local or server.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="prevent-data-loss" className="glass rounded-xl border-white/10 px-6">
                <AccordionTrigger className="text-lg font-semibold hover:text-[var(--nabu-mint)] transition-colors">
                  Will I lose data if my browser crashes?
                </AccordionTrigger>
                <AccordionContent className="text-white/80 pt-4">
                  No! With local saves every 5 seconds and server syncs every 60 seconds, the maximum you could lose is a few seconds of typing. When you reopen the app, Nabu automatically loads the most recent version (local vs server) with smart conflict resolution.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="cross-device-sync" className="glass rounded-xl border-white/10 px-6">
                <AccordionTrigger className="text-lg font-semibold hover:text-[var(--nabu-mint)] transition-colors">
                  How does cross-device sync work?
                </AccordionTrigger>
                <AccordionContent className="text-white/80 pt-4">
                  Once your changes are synced to the server (every 60 seconds), they're immediately available on all your devices. Opening a note on another device loads the latest server version. If you have local unsaved changes on device A and server changes from device B, Nabu shows a notification and lets you choose which version to keep.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          {/* 11. TECHNICAL & SECURITY */}
          <div>
            <h2 className="text-3xl font-serif text-[var(--nabu-mint)] mb-6">Technical & Security</h2>
            <Accordion type="single" collapsible className="space-y-4">
              <AccordionItem value="data-secure" className="glass rounded-xl border-white/10 px-6">
                <AccordionTrigger className="text-lg font-semibold hover:text-[var(--nabu-mint)] transition-colors">
                  Is my data secure?
                </AccordionTrigger>
                <AccordionContent className="text-white/80 pt-4">
                  Yes. Nabu uses industry-standard security practices: encrypted data at rest, HTTPS for all connections, signed time-limited URLs for file access (5-minute expiry), no frontend credential exposure, multi-tenant isolation enforced at the database level, and comprehensive audit logging. Authentication is handled by Kinde with support for SSO and MFA.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="authentication" className="glass rounded-xl border-white/10 px-6">
                <AccordionTrigger className="text-lg font-semibold hover:text-[var(--nabu-mint)] transition-colors">
                  How does authentication work?
                </AccordionTrigger>
                <AccordionContent className="text-white/80 pt-4">
                  Nabu uses Kinde for authentication, supporting email/password, social logins, and enterprise SSO. Sessions are securely managed with HTTP-only cookies. Role-based access control (ADMIN, USER) determines permissions, and all API endpoints validate authentication and tenant membership before allowing access.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="embedding-system" className="glass rounded-xl border-white/10 px-6">
                <AccordionTrigger className="text-lg font-semibold hover:text-[var(--nabu-mint)] transition-colors">
                  What's the embedding system?
                </AccordionTrigger>
                <AccordionContent className="text-white/80 pt-4">
                  <p className="mb-3">
                    The embedding system powers semantic search by converting text into mathematical vectors that capture meaning. Here's how it works:
                  </p>
                  <ul className="space-y-2 ml-4">
                    <li><strong className="text-white">Model:</strong> OpenAI text-embedding-3-small (512 dimensions, ~$0.02 per 1,000 notes)</li>
                    <li><strong className="text-white">Chunking:</strong> Long content split into ~2000 character chunks with 200 char overlap</li>
                    <li><strong className="text-white">Storage:</strong> Vectors stored in separate NoteChunk/ThoughtChunk tables with pgvector</li>
                    <li><strong className="text-white">Processing:</strong> Background jobs batch-generate embeddings after 2-minute editing cooldown</li>
                    <li><strong className="text-white">Search:</strong> ivfflat indexes enable fast similarity search across millions of vectors</li>
                  </ul>
                  <p className="mt-3">
                    This architecture makes semantic search both powerful and cost-effective.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="image-storage-technical" className="glass rounded-xl border-white/10 px-6">
                <AccordionTrigger className="text-lg font-semibold hover:text-[var(--nabu-mint)] transition-colors">
                  How are images stored?
                </AccordionTrigger>
                <AccordionContent className="text-white/80 pt-4">
                  Images are stored in Supabase Storage with a secure three-step process: 1) Backend generates a temporary signed upload URL (5-min expiry, single-use); 2) Frontend uploads directly using plain fetch() API; 3) Backend confirms upload and creates database record. Public URLs are also time-limited and validated for ownership. No storage credentials ever reach the frontend.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="delete-data" className="glass rounded-xl border-white/10 px-6">
                <AccordionTrigger className="text-lg font-semibold hover:text-[var(--nabu-mint)] transition-colors">
                  What happens to my data when I delete something?
                </AccordionTrigger>
                <AccordionContent className="text-white/80 pt-4">
                  Most deletions are soft deletes—records are marked with a deletedAt timestamp but remain in the database for potential recovery and audit purposes. Soft-deleted items are automatically filtered from all queries. Related records use CASCADE relationships in the database schema, so deleting a note also removes its tags, links, and chunks while maintaining referential integrity.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="trash-restore" className="glass rounded-xl border-white/10 px-6">
                <AccordionTrigger className="text-lg font-semibold hover:text-[var(--nabu-mint)] transition-colors">
                  Can I restore deleted notes and thoughts?
                </AccordionTrigger>
                <AccordionContent className="text-white/80 pt-4">
                  <p className="mb-3">
                    Yes! When you delete a note or thought, it moves to the Trash where you can restore it at any time. The Trash page shows all deleted items (both notes and thoughts) in a unified table view with a Type column, search functionality, and bulk restore capabilities.
                  </p>
                  <p>
                    Deleted items retain all their data—content, tags, folders, attachments, and links—so when you restore them, everything comes back exactly as it was. You can access the Trash from the main navigation menu.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="permanent-deletion" className="glass rounded-xl border-white/10 px-6">
                <AccordionTrigger className="text-lg font-semibold hover:text-[var(--nabu-mint)] transition-colors">
                  How long are deleted items kept?
                </AccordionTrigger>
                <AccordionContent className="text-white/80 pt-4">
                  <p className="mb-3">
                    Deleted notes and thoughts are kept in the Trash for <strong className="text-white">60 days</strong> before being permanently removed. This gives you plenty of time to recover accidentally deleted items while ensuring your storage doesn't fill up with old deleted content.
                  </p>
                  <p className="mb-3">
                    The Trash page shows a countdown for each item, indicating how many days remain until permanent deletion. Items closer to permanent deletion are highlighted with a warning badge (red for ≤7 days, yellow for ≤30 days).
                  </p>
                  <p>
                    When an item is permanently deleted after 60 days, the system automatically checks if any attached files (images and attachments) are referenced by other active notes or thoughts. Only unreferenced files are removed from storage, ensuring shared files aren't accidentally deleted.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="trash-bulk-actions" className="glass rounded-xl border-white/10 px-6">
                <AccordionTrigger className="text-lg font-semibold hover:text-[var(--nabu-mint)] transition-colors">
                  Can I restore multiple items at once?
                </AccordionTrigger>
                <AccordionContent className="text-white/80 pt-4">
                  Absolutely! The Trash page supports bulk operations for both notes and thoughts. You can select multiple items using checkboxes (or use "Select All") and restore them all with one click. The table view shows the Type column to distinguish between notes and thoughts, making it easy to scan through deleted items, search by title or content, and perform batch operations efficiently.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-24 bg-gradient-to-b from-[#0c1831] to-[#071633] border-t border-white/5">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-serif text-white mb-4">Ready to try Nabu?</h2>
          <p className="text-lg text-white/70 mb-8 max-w-2xl mx-auto">
            Start capturing your thoughts and let Nabu handle the organization. No credit card required.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Button size="lg" className="bg-[#00B3A6] hover:bg-[#00B3A6]/90 text-[#071633] shadow-lg shadow-[#00B3A6]/20">
              <a href="/register">Get started free</a>
            </Button>
            <Button variant="outline" size="lg" className="border-white/15 hover:bg-white/5 hover:border-white/35 text-white">
              <a href="/nabu">Learn more</a>
            </Button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/5 py-12 bg-[#071633]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="6" y="8" width="20" height="16" rx="2" stroke="var(--nabu-mint)" strokeWidth="2" fill="none"/>
                  <line x1="6" y1="14" x2="26" y2="14" stroke="var(--nabu-mint)" strokeWidth="2"/>
                </svg>
                <span className="text-xl font-serif text-white">Nabu</span>
              </div>
              <p className="text-sm text-white/60">Your intelligent note-taking companion</p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white mb-3">Product</h3>
              <ul className="space-y-2 text-sm text-white/60">
                <li><a href="/nabu" className="hover:text-[var(--nabu-mint)] transition-colors">Features</a></li>
                <li><a href="/pricing" className="hover:text-[var(--nabu-mint)] transition-colors">Pricing</a></li>
                <li><a href="/faq" className="hover:text-[var(--nabu-mint)] transition-colors">FAQ</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white mb-3">Company</h3>
              <ul className="space-y-2 text-sm text-white/60">
                <li><a href="/blog" className="hover:text-[var(--nabu-mint)] transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-[var(--nabu-mint)] transition-colors">About</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white mb-3">Legal</h3>
              <ul className="space-y-2 text-sm text-white/60">
                <li><a href="#" className="hover:text-[var(--nabu-mint)] transition-colors">Privacy</a></li>
                <li><a href="#" className="hover:text-[var(--nabu-mint)] transition-colors">Terms</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-white/5 text-center text-sm text-white/40">
            © {new Date().getFullYear()} Nabu. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

