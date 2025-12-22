<!-- f91ec53a-3799-45a0-811c-e2b710e6f866 9b7e024e-6699-493b-8fe0-ba22f0daa78b -->
# Fix API Fetch Errors

## Problems

1. The `ThoughtsActivityFeed` component throws "Failed to fetch thoughts" error without showing the actual API error message
2. The `fetchFolderNotes` function throws "Invalid query parameters" error when called with invalid folderId values

## Root Cause Analysis

### Issue 1: Thoughts API Error Handling

- The API route exists and uses `getUserContext()` which throws "Unauthorized" if user is not authenticated
- The frontend error handling only checks `response.ok` but doesn't read the response body to show the actual error message
- Error could be: Authentication failure (401), Server error (500), Network error, or Invalid response format

### Issue 2: Notes API folderId Validation

- `fetchFolderNotes` function signature requires `folderId: string` but doesn't validate it's a valid CUID
- The validation schema in `noteQuerySchema` expects either a valid CUID or the string `'null'`
- When an invalid folderId is passed, the validation fails with "Invalid query parameters"
- The function should handle null/undefined values or validate the folderId before making the API call

## Solution

### For Thoughts API:

1. Read the actual error message from the API response body
2. Display more detailed error information to help diagnose the issue
3. Handle different error scenarios (auth, network, server errors)

### For Notes API:

1. Update `fetchFolderNotes` to validate folderId before making the API call
2. Handle null/undefined folderId values properly (convert to 'null' string)
3. Improve error messages to show validation details

## Implementation Steps

### 1. Fix fetchFolderNotes validation

- Update `fetchFolderNotes` in `components/nabu/notes/api.ts` to validate folderId
- Convert null/undefined to 'null' string for uncategorized notes
- Add better error handling with actual API error messages

### 2. Update error handling in thoughts-activity-feed.tsx

- Modify the `loadThoughts` function to read the response body even when `!response.ok`
- Parse the JSON error response and extract the error message
- Update error state to show the actual API error message
- Add better error logging for debugging

### 3. Update refreshThoughts function

- Apply the same error handling improvements to the `refreshThoughts` function

### 4. Test error scenarios

- Verify that authentication errors show properly
- Verify that server errors show properly
- Verify that network errors are handled gracefully
- Verify that invalid folderId values are handled correctly

## Files to Modify

- `components/nabu/notes/api.ts` - Fix `fetchFolderNotes` to validate folderId and improve error handling
- `components/nabu/notes/thoughts-activity-feed.tsx` - Improve error handling in `loadThoughts` and `refreshThoughts` functions

### To-dos

- [ ] Update fetchFolderNotes to validate folderId and handle null/undefined values properly
- [ ] Update loadThoughts function to read and display actual API error messages from response body
- [ ] Update refreshThoughts function with the same error handling improvements
- [ ] Verify error handling works for auth errors, server errors, network errors, and invalid folderId values