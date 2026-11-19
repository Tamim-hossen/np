import 'server-only';

import type { SendResponse } from 'firebase-admin/messaging';
import { getMongoClient } from '@/lib/mongodb';
import { messaging } from '@/lib/firebase-admin';

interface AdminDevice {
  firebaseUid: string;
  deviceToken: string;
  platform: 'android' | 'ios';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/** FCM multicast limit per request */
const FCM_BATCH_SIZE = 500;

/** Error codes that indicate a token is permanently invalid */
const INVALID_TOKEN_CODES = new Set([
  'messaging/invalid-registration-token',
  'messaging/registration-token-not-registered',
]);

function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

/**
 * Sends an FCM push notification to all active admin devices after a new
 * contact form message is saved to MongoDB.
 *
 * This function is intentionally fire-and-forget: it never throws — all
 * errors are caught and logged so the caller's response is never affected.
 */
export async function sendNewMessageNotification(messageId: string): Promise<void> {
  try {
    const client = await getMongoClient();
    const collection = client.db().collection<AdminDevice>('adminDevices');

    const devices = await collection.find({ isActive: true }).toArray();

    if (devices.length === 0) {
      return;
    }

    const tokens = devices.map((d) => d.deviceToken);
    const batches = chunk(tokens, FCM_BATCH_SIZE);

    const invalidTokens: string[] = [];

    for (const batchTokens of batches) {
      let response;
      try {
        response = await messaging.sendEachForMulticast({
          tokens: batchTokens,
          notification: {
            title: 'New Website Message',
            body: 'You received a new contact form submission.',
          },
          data: {
            type: 'NEW_MESSAGE',
            messageId,
          },
        });
      } catch (err) {
        console.error('FCM multicast batch failed:', err);
        // Don't rethrow — try remaining batches
        continue;
      }

      if (response.failureCount > 0) {
        response.responses.forEach((res: SendResponse, idx: number) => {
          if (!res.success && res.error) {
            const code = res.error.code;
            if (INVALID_TOKEN_CODES.has(code)) {
              invalidTokens.push(batchTokens[idx]);
            } else {
              console.error('FCM delivery error for token index', idx, res.error);
            }
          }
        });
      }
    }

    // Deactivate permanently invalid tokens in MongoDB
    if (invalidTokens.length > 0) {
      await collection.updateMany(
        { deviceToken: { $in: invalidTokens } },
        { $set: { isActive: false, updatedAt: new Date() } },
      );
      console.info(`Deactivated ${invalidTokens.length} invalid FCM device token(s).`);
    }
  } catch (err) {
    // Top-level guard: never propagate errors to the caller
    console.error('sendNewMessageNotification encountered an unexpected error:', err);
  }
}
