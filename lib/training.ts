// Mirrors lib/chat.ts's CHAT_IMAGE_* constraints — same limits, kept
// separate so the two features aren't coupled through a shared constant.
export const TRAINING_IMAGE_MAX_BYTES = 8 * 1024 * 1024;
export const TRAINING_IMAGE_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"] as const;
