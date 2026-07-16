// =============================================================================
// Delivery providers — SMS (mNotify).
//
// A thin fetch-based abstraction so the dispatcher never knows which vendor is
// behind a channel. Ghana-focused mNotify is the first adapter; Twilio/Hubtel
// can be added by implementing SmsProvider and swapping getSmsProvider().
//
// fetch() works in Convex's default runtime, so this needs no "use node".
// Secrets come from env: MNOTIFY_API_KEY, MNOTIFY_SENDER_ID.
// =============================================================================

export type SmsSendResult = { id: string; provider: string };

export interface SmsProvider {
    name: string;
    send(to: string, body: string): Promise<SmsSendResult>;
}

// mNotify Quick SMS. Endpoint + payload per mNotify's REST API; the key is
// passed as a query param and the sender id must be an approved sender.
class MnotifyProvider implements SmsProvider {
    name = "mnotify";
    constructor(
        private apiKey: string,
        private senderId: string,
    ) {}

    async send(to: string, body: string): Promise<SmsSendResult> {
        const url = `https://api.mnotify.com/api/sms/quick?key=${encodeURIComponent(this.apiKey)}`;
        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({
                recipient: [to],
                sender: this.senderId,
                message: body,
                is_schedule: false,
                schedule_date: "",
            }),
        });

        const text = await res.text();
        let data: any = undefined;
        try {
            data = text ? JSON.parse(text) : undefined;
        } catch {
            // non-JSON body
        }

        if (!res.ok) {
            throw new Error(`mNotify HTTP ${res.status}: ${text.slice(0, 200)}`);
        }
        // mNotify returns { status: "success", ... , summary/_id }. Treat anything
        // other than an explicit success as a failure so it can be retried.
        const status = data?.status ?? data?.code;
        if (status && String(status).toLowerCase() !== "success" && String(status) !== "2000") {
            throw new Error(`mNotify error: ${text.slice(0, 200)}`);
        }

        const id =
            data?.data?._id ||
            data?.summary?._id ||
            data?.message_id ||
            data?._id ||
            "unknown";
        return { id: String(id), provider: this.name };
    }
}

/**
 * Resolve the configured SMS provider, or null when unconfigured. The
 * dispatcher treats null as "skip and log skipped_no_provider" rather than an
 * error, so the engine runs cleanly before credentials are set.
 */
export function getSmsProvider(): SmsProvider | null {
    const apiKey = process.env.MNOTIFY_API_KEY;
    const senderId = process.env.MNOTIFY_SENDER_ID;
    if (!apiKey || !senderId) return null;
    return new MnotifyProvider(apiKey, senderId);
}
