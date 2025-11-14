import { db } from './firebase';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, addDoc, Timestamp } from 'firebase/firestore';
import type { ApiKey, RateLimit, Webhook, WebhookLog } from '@/types/api';
import crypto from 'crypto';

/**
 * Verify API Key
 */
export async function verifyApiKey(key: string): Promise<ApiKey | null> {
  try {
    const q = query(
      collection(db, 'apiKeys'),
      where('key', '==', key),
      where('status', '==', 'active')
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;

    const apiKey = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as ApiKey;

    // Check if expired
    if (apiKey.expiresAt) {
      const expiryDate = apiKey.expiresAt instanceof Date 
        ? apiKey.expiresAt 
        : (apiKey.expiresAt as any).toDate();
      
      if (expiryDate < new Date()) {
        return null;
      }
    }

    // Update last used
    await updateDoc(doc(db, 'apiKeys', apiKey.id), {
      lastUsed: Timestamp.now()
    });

    return apiKey;
  } catch (error) {
    console.error('Error verifying API key:', error);
    return null;
  }
}

/**
 * Check Rate Limit
 */
export async function checkRateLimit(apiKeyId: string, maxRequests: number): Promise<boolean> {
  try {
    const now = new Date();
    const windowStart = new Date(now.getTime() - 60000); // 1 minute window

    const q = query(
      collection(db, 'rateLimits'),
      where('apiKeyId', '==', apiKeyId),
      where('windowStart', '>=', Timestamp.fromDate(windowStart))
    );

    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      // Create new rate limit record
      await addDoc(collection(db, 'rateLimits'), {
        apiKeyId,
        requests: 1,
        windowStart: Timestamp.now(),
        windowEnd: Timestamp.fromDate(new Date(now.getTime() + 60000))
      });
      return true;
    }

    const rateLimit = snapshot.docs[0].data() as RateLimit;
    
    if (rateLimit.requests >= maxRequests) {
      return false;
    }

    // Increment request count
    await updateDoc(doc(db, 'rateLimits', snapshot.docs[0].id), {
      requests: rateLimit.requests + 1
    });

    return true;
  } catch (error) {
    console.error('Error checking rate limit:', error);
    return false;
  }
}

/**
 * Log API Request
 */
export async function logApiRequest(
  apiKeyId: string,
  method: string,
  endpoint: string,
  statusCode: number
): Promise<void> {
  try {
    await addDoc(collection(db, 'apiLogs'), {
      apiKeyId,
      method,
      endpoint,
      statusCode,
      timestamp: Timestamp.now()
    });

    // Update API key usage count
    const apiKeyRef = doc(db, 'apiKeys', apiKeyId);
    const apiKeyDoc = await getDoc(apiKeyRef);
    if (apiKeyDoc.exists()) {
      const currentCount = apiKeyDoc.data().usageCount || 0;
      await updateDoc(apiKeyRef, {
        usageCount: currentCount + 1
      });
    }
  } catch (error) {
    console.error('Error logging API request:', error);
  }
}

/**
 * Trigger Webhook
 */
export async function triggerWebhook(
  organizationId: string,
  event: string,
  payload: any
): Promise<void> {
  try {
    // Get active webhooks for this event
    const q = query(
      collection(db, 'webhooks'),
      where('organizationId', '==', organizationId),
      where('events', 'array-contains', event),
      where('status', '==', 'active')
    );

    const snapshot = await getDocs(q);

    // Trigger each webhook
    for (const webhookDoc of snapshot.docs) {
      const webhook = { id: webhookDoc.id, ...webhookDoc.data() } as Webhook;
      
      try {
        const signature = generateWebhookSignature(payload, webhook.secret);
        
        const response = await fetch(webhook.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Signature': signature,
            'X-Webhook-Event': event
          },
          body: JSON.stringify(payload)
        });

        // Log webhook attempt
        await addDoc(collection(db, 'webhookLogs'), {
          webhookId: webhook.id,
          event,
          payload,
          response: {
            statusCode: response.status,
            body: await response.text()
          },
          status: response.ok ? 'success' : 'failed',
          attempts: 1,
          createdAt: Timestamp.now()
        });

        // Update webhook
        await updateDoc(doc(db, 'webhooks', webhook.id), {
          lastTriggered: Timestamp.now(),
          failureCount: response.ok ? 0 : (webhook.failureCount + 1)
        });

      } catch (error: any) {
        console.error('Error triggering webhook:', error);
        
        // Log failed attempt
        await addDoc(collection(db, 'webhookLogs'), {
          webhookId: webhook.id,
          event,
          payload,
          status: 'failed',
          attempts: 1,
          error: error.message,
          createdAt: Timestamp.now()
        });

        // Update failure count
        await updateDoc(doc(db, 'webhooks', webhook.id), {
          failureCount: webhook.failureCount + 1
        });
      }
    }
  } catch (error) {
    console.error('Error in triggerWebhook:', error);
  }
}

/**
 * Generate Webhook Signature
 */
function generateWebhookSignature(payload: any, secret: string): string {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(JSON.stringify(payload));
  return hmac.digest('hex');
}

/**
 * Verify Webhook Signature
 */
export function verifyWebhookSignature(
  payload: any,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = generateWebhookSignature(payload, secret);
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

/**
 * Generate API Key
 */
export function generateApiKey(): { key: string; secret: string } {
  const key = 'hug_' + crypto.randomBytes(24).toString('hex');
  const secret = crypto.randomBytes(32).toString('hex');
  return { key, secret };
}
