import fetch from 'node-fetch';
import { Config } from './config.js';

// The backend is on shared hosting and gets put to sleep to free memory, so the
// first request after an idle period is refused while it cold-starts. Retry with
// a growing delay to give it time to wake up.
const kRetryDelaysMs = [2000, 5000, 10000, 20000];

/**
 * Posts a notification payload to the backend, retrying while it wakes up.
 *
 * @param {object} notificationPayload - The payload to send.
 * @param {string} endpoint - The backend path to post to.
 * @returns {Promise<boolean>} - True if the backend accepted the notification.
 */
export async function notifyBackend(notificationPayload, endpoint = "/rewards/notify")
{
    for (let attempt = 0; attempt <= kRetryDelaysMs.length; attempt++) {
        let retryReason = null;

        try {
            const response = await fetch(Config.backendUrl + endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-API-Key": Config.adminApiKey
                },
                body: JSON.stringify(notificationPayload)
            });

            if (response.ok) {
                console.log("Notification sent successfully.");
                return true;
            }

            const message = await response.text();

            // 4xx means the request itself is wrong (bad key, bad payload), so
            // retrying would just fail the same way. Only retry 5xx.
            if (response.status < 500) {
                console.error(`Failed to send notification. Status: ${response.status}, Message: ${message}`);
                return false;
            }

            retryReason = `status ${response.status}`;
        } catch (error) {
            // Network-level failure: refused, reset, DNS, timeout.
            retryReason = error.message;
        }

        if (attempt === kRetryDelaysMs.length) {
            console.error(`Failed to send notification after ${attempt + 1} attempts: ${retryReason}`);
            return false;
        }

        const delay = kRetryDelaysMs[attempt];
        console.log(`Notification attempt ${attempt + 1} failed (${retryReason}), retrying in ${delay / 1000}s...`);
        await new Promise(resolve => setTimeout(resolve, delay));
    }

    return false;
}
