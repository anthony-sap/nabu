/**
 * Phone Number Utilities
 * 
 * Helpers for normalizing, formatting, and validating phone numbers
 * Focused on Australian numbers with E.164 format (+61...)
 */

/**
 * Normalize phone number to E.164 format
 * Handles Australian phone numbers (04XX XXX XXX or +61 4XX XXX XXX)
 * 
 * @param phone - Raw phone number input
 * @returns Normalized phone number in E.164 format (+61...)
 */
export function normalizePhoneNumber(phone: string): string {
  // Remove all non-digit characters except leading +
  let cleaned = phone.replace(/[^\d+]/g, '');
  
  // If starts with +, keep it
  if (cleaned.startsWith('+')) {
    return cleaned;
  }
  
  // If starts with 0, replace with +61 (Australian)
  if (cleaned.startsWith('0')) {
    return '+61' + cleaned.substring(1);
  }
  
  // If starts with 61, add +
  if (cleaned.startsWith('61')) {
    return '+' + cleaned;
  }
  
  // If starts with 4 (mobile), assume Australian and add +61
  if (cleaned.startsWith('4')) {
    return '+61' + cleaned;
  }
  
  // Otherwise, return as-is with + prefix
  return '+' + cleaned;
}

/**
 * Generate a 6-digit verification code
 * 
 * @returns Random 6-digit code as string
 */
export function generateVerificationCode(): string {
  // Generate random 6-digit number (100000-999999)
  const code = Math.floor(100000 + Math.random() * 900000);
  return code.toString();
}

/**
 * Format phone number for display
 * Converts E.164 format to readable Australian format
 * 
 * @param phone - Phone number in E.164 format
 * @returns Formatted phone number (e.g., "0400 000 000")
 */
export function formatPhoneDisplay(phone: string): string {
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  
  // If starts with 61 (Australian country code), convert to 0-prefixed format
  if (cleaned.startsWith('61') && cleaned.length === 11) {
    const local = '0' + cleaned.substring(2);
    // Format as 0400 000 000
    return `${local.substring(0, 4)} ${local.substring(4, 7)} ${local.substring(7)}`;
  }
  
  // If already starts with 0 and is 10 digits
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    return `${cleaned.substring(0, 4)} ${cleaned.substring(4, 7)} ${cleaned.substring(7)}`;
  }
  
  // Return as-is if format is unexpected
  return phone;
}

/**
 * Validate Australian phone number format
 * 
 * @param phone - Phone number to validate
 * @returns true if valid Australian mobile number
 */
export function isValidAustralianMobile(phone: string): boolean {
  const normalized = normalizePhoneNumber(phone);
  
  // Australian mobile numbers in E.164 format: +614XXXXXXXX (11 digits total)
  const australianMobileRegex = /^\+614\d{8}$/;
  
  return australianMobileRegex.test(normalized);
}

