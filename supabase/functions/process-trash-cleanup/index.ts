/**
 * Process Trash Cleanup Edge Function (Standalone)
 * 
 * This function is called by pg_cron daily to permanently delete notes
 * that have been in trash for more than 60 days.
 * 
 * Process:
 * - Finds notes where deletedAt < NOW() - 60 days
 * - Identifies associated files (Attachments & ImageAttachments)
 * - Checks if files are referenced by other active notes/thoughts
 * - Deletes unreferenced files from Supabase storage
 * - Performs hard delete on database records:
 *   - NoteChunks (cascade via FK)
 *   - NoteTags (cascade via FK)
 *   - NoteLinks (cascade via FK)
 *   - Unreferenced Attachments
 *   - Unreferenced ImageAttachments
 *   - The Note itself
 * - Logs all deletions to AuditLog
 * 
 * STANDALONE: Does not require calling Next.js API - all logic is self-contained.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { init } from "https://esm.sh/@paralleldrive/cuid2@2.2.2";

// Initialize CUID generator for audit log IDs
const createId = init({ length: 25 });

// CORS headers for the response
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Configuration
const RETENTION_DAYS = 60;
const MAX_NOTES_PER_RUN = 20;
const MAX_CONCURRENT_TENANTS = 5;

interface DeletedNote {
  id: string;
  tenantId: string | null;
  userId: string;
  title: string;
  deletedAt: string;
  deletedBy: string | null;
}

interface FileAttachment {
  id: string;
  noteId: string | null;
  thoughtId: string | null;
  fileName?: string;
  storagePath?: string;
  fileUrl?: string;
}

/**
 * Check if an attachment is referenced by any active note or thought
 */
async function isAttachmentReferenced(
  supabase: any,
  attachmentId: string,
  currentNoteId: string
): Promise<boolean> {
  // Check if any active note (other than the one being deleted) references this attachment
  const { data: activeNoteRefs, error: noteError } = await supabase
    .from("Attachment")
    .select("noteId")
    .eq("id", attachmentId)
    .not("noteId", "is", null)
    .neq("noteId", currentNoteId)
    .is("deletedAt", null)
    .limit(1);

  if (noteError) {
    console.error("Error checking note references:", noteError);
    return true; // Err on the side of caution
  }

  if (activeNoteRefs && activeNoteRefs.length > 0) {
    // Check if those notes are actually not deleted
    const { data: activeNotes, error: checkError } = await supabase
      .from("Note")
      .select("id")
      .eq("id", activeNoteRefs[0].noteId)
      .is("deletedAt", null)
      .limit(1);

    if (checkError) {
      console.error("Error checking note status:", checkError);
      return true;
    }

    if (activeNotes && activeNotes.length > 0) {
      return true;
    }
  }

  // Check if any active thought references this attachment
  const { data: activeThoughtRefs, error: thoughtError } = await supabase
    .from("Attachment")
    .select("thoughtId")
    .eq("id", attachmentId)
    .not("thoughtId", "is", null)
    .is("deletedAt", null)
    .limit(1);

  if (thoughtError) {
    console.error("Error checking thought references:", thoughtError);
    return true;
  }

  if (activeThoughtRefs && activeThoughtRefs.length > 0) {
    // Check if those thoughts are actually not deleted
    const { data: activeThoughts, error: checkError } = await supabase
      .from("Thought")
      .select("id")
      .eq("id", activeThoughtRefs[0].thoughtId)
      .is("deletedAt", null)
      .limit(1);

    if (checkError) {
      console.error("Error checking thought status:", checkError);
      return true;
    }

    if (activeThoughts && activeThoughts.length > 0) {
      return true;
    }
  }

  return false;
}

/**
 * Check if an image attachment is referenced by any active note
 */
async function isImageAttachmentReferenced(
  supabase: any,
  imageId: string,
  currentNoteId: string
): Promise<boolean> {
  // Check if any active note (other than the one being deleted) references this image
  const { data: activeRefs, error } = await supabase
    .from("ImageAttachment")
    .select("noteId")
    .eq("id", imageId)
    .neq("noteId", currentNoteId)
    .is("deletedAt", null)
    .limit(1);

  if (error) {
    console.error("Error checking image references:", error);
    return true; // Err on the side of caution
  }

  if (activeRefs && activeRefs.length > 0) {
    // Check if those notes are actually not deleted
    const { data: activeNotes, error: checkError } = await supabase
      .from("Note")
      .select("id")
      .eq("id", activeRefs[0].noteId)
      .is("deletedAt", null)
      .limit(1);

    if (checkError) {
      console.error("Error checking note status:", checkError);
      return true;
    }

    if (activeNotes && activeNotes.length > 0) {
      return true;
    }
  }

  return false;
}

/**
 * Delete file from Supabase storage
 */
async function deleteFileFromStorage(
  supabase: any,
  storagePath: string
): Promise<boolean> {
  try {
    const { error } = await supabase.storage
      .from("note-images")
      .remove([storagePath]);

    if (error) {
      console.error(`Failed to delete file from storage: ${storagePath}`, error);
      return false;
    }

    console.log(`  ✓ Deleted file from storage: ${storagePath}`);
    return true;
  } catch (error) {
    console.error(`Exception deleting file: ${storagePath}`, error);
    return false;
  }
}

/**
 * Create audit log entry
 */
async function createAuditLog(
  supabase: any,
  entityType: string,
  entityId: string,
  action: string,
  userId: string | null,
  tenantId: string | null,
  oldData: any
): Promise<void> {
  try {
    const now = new Date().toISOString();
    await supabase.from("AuditLog").insert({
      id: createId(),
      entityType,
      entityId,
      action,
      eventStatus: "success",
      oldData: oldData || {},
      createdAt: now,
      createdBy: "system:trash-cleanup",
      tenantId,
    });
  } catch (error) {
    console.error("Failed to create audit log:", error);
  }
}

/**
 * Process a single note deletion
 */
async function processNoteDeletion(
  supabase: any,
  note: DeletedNote
): Promise<{ success: boolean; filesDeleted: number; error?: string }> {
  try {
    console.log(`\nProcessing note ${note.id}...`);
    console.log(`  Title: ${note.title.substring(0, 50)}${note.title.length > 50 ? "..." : ""}`);
    console.log(`  Deleted: ${note.deletedAt}`);
    console.log(`  TenantId: ${note.tenantId}`);

    let filesDeleted = 0;

    // 1. Get all attachments for this note
    const { data: attachments, error: attachError } = await supabase
      .from("Attachment")
      .select("id, noteId, thoughtId, fileName, fileUrl")
      .eq("noteId", note.id);

    if (attachError) {
      console.error("  Error fetching attachments:", attachError);
    } else if (attachments && attachments.length > 0) {
      console.log(`  Found ${attachments.length} attachment(s)`);

      for (const attachment of attachments) {
        const isReferenced = await isAttachmentReferenced(supabase, attachment.id, note.id);
        
        if (isReferenced) {
          console.log(`  ⊘ Attachment ${attachment.id} is referenced elsewhere, skipping`);
        } else {
          // Delete from storage if fileUrl exists
          if (attachment.fileUrl) {
            // Extract storage path from URL or use fileUrl
            await deleteFileFromStorage(supabase, attachment.fileUrl);
          }

          // Delete attachment record
          const { error: deleteError } = await supabase
            .from("Attachment")
            .delete()
            .eq("id", attachment.id);

          if (deleteError) {
            console.error(`  Error deleting attachment ${attachment.id}:`, deleteError);
          } else {
            console.log(`  ✓ Deleted attachment ${attachment.id}`);
            filesDeleted++;
            await createAuditLog(supabase, "Attachment", attachment.id, "permanent_delete", note.userId, note.tenantId, attachment);
          }
        }
      }
    }

    // 2. Get all image attachments for this note
    const { data: images, error: imageError } = await supabase
      .from("ImageAttachment")
      .select("id, noteId, storagePath, filename")
      .eq("noteId", note.id);

    if (imageError) {
      console.error("  Error fetching images:", imageError);
    } else if (images && images.length > 0) {
      console.log(`  Found ${images.length} image(s)`);

      for (const image of images) {
        const isReferenced = await isImageAttachmentReferenced(supabase, image.id, note.id);
        
        if (isReferenced) {
          console.log(`  ⊘ Image ${image.id} is referenced elsewhere, skipping`);
        } else {
          // Delete from storage
          if (image.storagePath) {
            await deleteFileFromStorage(supabase, image.storagePath);
          }

          // Delete image record
          const { error: deleteError } = await supabase
            .from("ImageAttachment")
            .delete()
            .eq("id", image.id);

          if (deleteError) {
            console.error(`  Error deleting image ${image.id}:`, deleteError);
          } else {
            console.log(`  ✓ Deleted image attachment ${image.id}`);
            filesDeleted++;
            await createAuditLog(supabase, "ImageAttachment", image.id, "permanent_delete", note.userId, note.tenantId, image);
          }
        }
      }
    }

    // 3. Delete NoteChunks (will cascade to related records)
    const { error: chunkError } = await supabase
      .from("NoteChunk")
      .delete()
      .eq("noteId", note.id);

    if (chunkError) {
      console.error("  Error deleting chunks:", chunkError);
    } else {
      console.log("  ✓ Deleted note chunks");
    }

    // 4. Delete NoteTags
    const { error: tagError } = await supabase
      .from("NoteTag")
      .delete()
      .eq("noteId", note.id);

    if (tagError) {
      console.error("  Error deleting note tags:", tagError);
    } else {
      console.log("  ✓ Deleted note tags");
    }

    // 5. Delete NoteLinks (both incoming and outgoing)
    const { error: linkError1 } = await supabase
      .from("NoteLink")
      .delete()
      .eq("fromNoteId", note.id);

    const { error: linkError2 } = await supabase
      .from("NoteLink")
      .delete()
      .eq("toNoteId", note.id);

    if (linkError1 || linkError2) {
      console.error("  Error deleting note links:", linkError1 || linkError2);
    } else {
      console.log("  ✓ Deleted note links");
    }

    // 6. Delete EmbeddingJobs for this note
    const { error: jobError } = await supabase
      .from("EmbeddingJob")
      .delete()
      .eq("entityType", "NOTE")
      .eq("entityId", note.id);

    if (jobError) {
      console.error("  Error deleting embedding jobs:", jobError);
    } else {
      console.log("  ✓ Deleted embedding jobs");
    }

    // 7. Finally, delete the note itself
    const { error: noteError } = await supabase
      .from("Note")
      .delete()
      .eq("id", note.id);

    if (noteError) {
      console.error("  Error deleting note:", noteError);
      throw noteError;
    }

    console.log("  ✓ Permanently deleted note");
    
    // Create audit log for note deletion
    await createAuditLog(supabase, "Note", note.id, "permanent_delete", note.userId, note.tenantId, {
      id: note.id,
      title: note.title,
      deletedAt: note.deletedAt,
      deletedBy: note.deletedBy,
    });

    return { success: true, filesDeleted };
  } catch (error) {
    console.error(`  ❌ Failed to process note ${note.id}:`, error);
    return { success: false, filesDeleted: 0, error: error.message };
  }
}

/**
 * Process a single thought deletion
 */
async function processThoughtDeletion(
  supabase: any,
  thought: { id: string; tenantId: string | null; userId: string; content: string; deletedAt: string; deletedBy: string | null }
): Promise<{ success: boolean; filesDeleted: number; error?: string }> {
  try {
    console.log(`\nProcessing thought ${thought.id}...`);
    console.log(`  Content: ${thought.content.substring(0, 50)}${thought.content.length > 50 ? "..." : ""}`);
    console.log(`  Deleted: ${thought.deletedAt}`);

    let filesDeleted = 0;

    // 1. Get all attachments for this thought
    const { data: attachments, error: attachError } = await supabase
      .from("Attachment")
      .select("id, noteId, thoughtId, fileName, fileUrl")
      .eq("thoughtId", thought.id);

    if (attachError) {
      console.error("  Error fetching attachments:", attachError);
    } else if (attachments && attachments.length > 0) {
      console.log(`  Found ${attachments.length} attachment(s)`);

      for (const attachment of attachments) {
        const isReferenced = await isAttachmentReferenced(supabase, attachment.id, "");
        
        if (isReferenced) {
          console.log(`  ⊘ Attachment ${attachment.id} is referenced elsewhere, skipping`);
        } else {
          // Delete from storage if fileUrl exists
          if (attachment.fileUrl) {
            await deleteFileFromStorage(supabase, attachment.fileUrl);
          }

          // Delete attachment record
          const { error: deleteError } = await supabase
            .from("Attachment")
            .delete()
            .eq("id", attachment.id);

          if (deleteError) {
            console.error(`  Error deleting attachment ${attachment.id}:`, deleteError);
          } else {
            console.log(`  ✓ Deleted attachment ${attachment.id}`);
            filesDeleted++;
            await createAuditLog(supabase, "Attachment", attachment.id, "permanent_delete", thought.userId, thought.tenantId, attachment);
          }
        }
      }
    }

    // 2. Delete ThoughtChunks
    const { error: chunkError } = await supabase
      .from("ThoughtChunk")
      .delete()
      .eq("thoughtId", thought.id);

    if (chunkError) {
      console.error("  Error deleting chunks:", chunkError);
    } else {
      console.log("  ✓ Deleted thought chunks");
    }

    // 3. Delete EmbeddingJobs for this thought
    const { error: jobError } = await supabase
      .from("EmbeddingJob")
      .delete()
      .eq("entityType", "THOUGHT")
      .eq("entityId", thought.id);

    if (jobError) {
      console.error("  Error deleting embedding jobs:", jobError);
    } else {
      console.log("  ✓ Deleted embedding jobs");
    }

    // 4. Finally, delete the thought itself
    const { error: thoughtError } = await supabase
      .from("Thought")
      .delete()
      .eq("id", thought.id);

    if (thoughtError) {
      console.error("  Error deleting thought:", thoughtError);
      throw thoughtError;
    }

    console.log("  ✓ Permanently deleted thought");
    
    // Create audit log for thought deletion
    await createAuditLog(supabase, "Thought", thought.id, "permanent_delete", thought.userId, thought.tenantId, {
      id: thought.id,
      content: thought.content.substring(0, 100),
      deletedAt: thought.deletedAt,
      deletedBy: thought.deletedBy,
    });

    return { success: true, filesDeleted };
  } catch (error) {
    console.error(`  ❌ Failed to process thought ${thought.id}:`, error);
    return { success: false, filesDeleted: 0, error: error.message };
  }
}

/**
 * Process notes and thoughts for a single tenant
 */
async function processTenantItems(
  supabase: any,
  tenantId: string | null,
  cutoffDate: string
): Promise<{ processed: number; errors: number; filesDeleted: number }> {
  console.log(`\n--- Processing tenant: ${tenantId || "NULL"} ---`);

  // Get notes for this tenant
  const noteQuery = supabase
    .from("Note")
    .select("id, tenantId, userId, title, deletedAt, deletedBy")
    .lt("deletedAt", cutoffDate)
    .not("deletedAt", "is", null)
    .limit(MAX_NOTES_PER_RUN);

  // Get thoughts for this tenant
  const thoughtQuery = supabase
    .from("Thought")
    .select("id, tenantId, userId, content, deletedAt, deletedBy")
    .lt("deletedAt", cutoffDate)
    .not("deletedAt", "is", null)
    .limit(MAX_NOTES_PER_RUN);

  // Apply tenant filter to both
  if (tenantId) {
    noteQuery.eq("tenantId", tenantId);
    thoughtQuery.eq("tenantId", tenantId);
  } else {
    noteQuery.is("tenantId", null);
    thoughtQuery.is("tenantId", null);
  }

  const [notesResult, thoughtsResult] = await Promise.all([
    noteQuery,
    thoughtQuery,
  ]);

  if (notesResult.error) {
    console.error(`Error querying notes for tenant ${tenantId}:`, notesResult.error);
  }

  if (thoughtsResult.error) {
    console.error(`Error querying thoughts for tenant ${tenantId}:`, thoughtsResult.error);
  }

  const notes = notesResult.data || [];
  const thoughts = thoughtsResult.data || [];

  if (notes.length === 0 && thoughts.length === 0) {
    console.log(`No items to process for tenant ${tenantId}`);
    return { processed: 0, errors: 0, filesDeleted: 0 };
  }

  console.log(`Found ${notes.length} note(s) and ${thoughts.length} thought(s) to permanently delete`);

  let successCount = 0;
  let errorCount = 0;
  let totalFilesDeleted = 0;

  // Process notes
  for (const note of notes as DeletedNote[]) {
    const result = await processNoteDeletion(supabase, note);
    if (result.success) {
      successCount++;
      totalFilesDeleted += result.filesDeleted;
    } else {
      errorCount++;
    }
  }

  // Process thoughts
  for (const thought of thoughts) {
    const result = await processThoughtDeletion(supabase, thought);
    if (result.success) {
      successCount++;
      totalFilesDeleted += result.filesDeleted;
    } else {
      errorCount++;
    }
  }

  return {
    processed: successCount,
    errors: errorCount,
    filesDeleted: totalFilesDeleted,
  };
}

/**
 * Main handler
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("=== PROCESS TRASH CLEANUP STARTED ===");
    const startTime = Date.now();

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    console.log("Environment variables:");
    console.log(`  SUPABASE_URL: ${supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : "MISSING"}`);
    console.log(`  SUPABASE_SERVICE_ROLE_KEY: ${supabaseServiceKey ? `SET (length: ${supabaseServiceKey.length})` : "MISSING"}`);

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Calculate cutoff date (60 days ago)
    const cutoffDate = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
    console.log(`Cutoff date for permanent deletion: ${cutoffDate}`);
    console.log(`(Notes and thoughts deleted before this date will be permanently removed)`);

    // Get distinct tenants with old deleted notes or thoughts
    const [noteTenantsResult, thoughtTenantsResult] = await Promise.all([
      supabase
        .from("Note")
        .select("tenantId")
        .lt("deletedAt", cutoffDate)
        .not("deletedAt", "is", null),
      supabase
        .from("Thought")
        .select("tenantId")
        .lt("deletedAt", cutoffDate)
        .not("deletedAt", "is", null),
    ]);

    if (noteTenantsResult.error) {
      console.error("Error querying note tenants:", noteTenantsResult.error);
      throw noteTenantsResult.error;
    }

    if (thoughtTenantsResult.error) {
      console.error("Error querying thought tenants:", thoughtTenantsResult.error);
      throw thoughtTenantsResult.error;
    }

    // Extract unique tenant IDs from both notes and thoughts
    const noteTenants = (noteTenantsResult.data || []).map(n => n.tenantId);
    const thoughtTenants = (thoughtTenantsResult.data || []).map(t => t.tenantId);
    const uniqueTenants = [...new Set([...noteTenants, ...thoughtTenants])];
    console.log(`Found ${uniqueTenants.length} tenant(s) with items to delete`);

    if (uniqueTenants.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No items need permanent deletion",
          processed: 0,
          filesDeleted: 0,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Process tenants in batches
    let totalProcessed = 0;
    let totalErrors = 0;
    let totalFilesDeleted = 0;

    // Process tenants concurrently (up to MAX_CONCURRENT_TENANTS at a time)
    for (let i = 0; i < uniqueTenants.length; i += MAX_CONCURRENT_TENANTS) {
      const batch = uniqueTenants.slice(i, i + MAX_CONCURRENT_TENANTS);
      console.log(`\nProcessing batch of ${batch.length} tenant(s)...`);

      const results = await Promise.all(
        batch.map(tenantId => processTenantItems(supabase, tenantId, cutoffDate))
      );

      for (const result of results) {
        totalProcessed += result.processed;
        totalErrors += result.errors;
        totalFilesDeleted += result.filesDeleted;
      }
    }

    const duration = Date.now() - startTime;
    console.log(`\n=== PROCESS TRASH CLEANUP COMPLETED ===`);
    console.log(`Items permanently deleted: ${totalProcessed}`);
    console.log(`Files deleted: ${totalFilesDeleted}`);
    console.log(`Errors: ${totalErrors}`);
    console.log(`Duration: ${duration}ms`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Permanently deleted ${totalProcessed} items and ${totalFilesDeleted} files with ${totalErrors} errors`,
        processed: totalProcessed,
        filesDeleted: totalFilesDeleted,
        errors: totalErrors,
        duration,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("=== PROCESS TRASH CLEANUP ERROR ===");
    console.error(error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

