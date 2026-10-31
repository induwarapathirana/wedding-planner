"use server";

/**
 * WhatsApp Business Cloud API Integration
 * Send messages to guests via WhatsApp after RSVP confirmation
 */

const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;

interface WhatsAppMessageParams {
    to: string; // Guest's WhatsApp number (format: +1234567890)
    guestName: string;
    coupleNames: string;
    weddingDate: string;
    status: 'accepted' | 'declined';
}

/**
 * Send a WhatsApp message using Meta's Cloud API
 */
export async function sendWhatsAppMessage(params: WhatsAppMessageParams): Promise<{ success: boolean; error?: string }> {
    // Skip if credentials not configured
    if (!WHATSAPP_PHONE_NUMBER_ID || !WHATSAPP_ACCESS_TOKEN) {
        console.warn("WhatsApp credentials not configured. Skipping message send.");
        return { success: false, error: "WhatsApp not configured" };
    }

    // Format phone number (remove spaces, dashes, etc.)
    const formattedPhone = params.to.replace(/[^0-9+]/g, '');

    // Validate phone number format
    if (!formattedPhone.startsWith('+') || formattedPhone.length < 10) {
        console.error("Invalid phone number format:", params.to);
        return { success: false, error: "Invalid phone number format" };
    }

    // Build message based on RSVP status
    const message = params.status === 'accepted'
        ? `Hello ${params.guestName}! 🎉\n\nThank you for confirming your attendance at ${params.coupleNames}'s wedding on ${params.weddingDate}!\n\nWe're so excited to celebrate with you.\n\nSee you there! ✨`
        : `Hello ${params.guestName},\n\nThank you for letting us know. We're sorry you can't make it to our wedding, but we appreciate your response.\n\nYou'll be missed! 💕`;

    try {
        const response = await fetch(
            `https://graph.facebook.com/v18.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messaging_product: 'whatsapp',
                    to: formattedPhone,
                    type: 'text',
                    text: {
                        body: message
                    }
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            console.error("WhatsApp API Error:", data);
            return { success: false, error: data.error?.message || 'Failed to send message' };
        }

        console.log("WhatsApp message sent successfully:", data);
        return { success: true };
    } catch (error: any) {
        console.error("WhatsApp send error:", error);
        return { success: false, error: error.message };
    }
}
