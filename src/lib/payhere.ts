import crypto from 'crypto';

export function generatePayHereHash(
    merchantId: string,
    orderId: string,
    amount: number,
    currency: string,
    merchantSecret: string
): string {
    // Format amount to 2 decimal places as required by PayHere
    const formattedAmount = amount.toFixed(2);

    // 1. Hash the secret
    const hashedSecret = crypto
        .createHash('md5')
        .update(merchantSecret)
        .digest('hex')
        .toUpperCase();

    // 2. Create the string to hash
    // merchant_id + order_id + amount + currency + hashed_secret
    const stringToHash =
        merchantId +
        orderId +
        formattedAmount +
        currency +
        hashedSecret;

    // 3. Generate final hash
    return crypto
        .createHash('md5')
        .update(stringToHash)
        .digest('hex')
        .toUpperCase();
}

/**
 * Verify PayHere webhook signature
 * Formula: md5(merchant_id + order_id + payhere_amount + payhere_currency + status_code + md5(merchant_secret).toUpperCase()).toUpperCase()
 */
export function verifyPayHereSignature(
    merchantId: string,
    orderId: string,
    amount: string,
    currency: string,
    statusCode: string,
    receivedSignature: string,
    merchantSecret: string
): boolean {
    if (!merchantSecret) return false;

    // 1. Hash the merchant secret
    const hashedSecret = crypto
        .createHash('md5')
        .update(merchantSecret)
        .digest('hex')
        .toUpperCase();

    // 2. Create the verification string
    const stringToHash = merchantId + orderId + amount + currency + statusCode + hashedSecret;

    // 3. Generate expected signature
    const expectedSignature = crypto
        .createHash('md5')
        .update(stringToHash)
        .digest('hex')
        .toUpperCase();

    // 4. Compare signatures (timing-safe comparison)
    try {
        return crypto.timingSafeEqual(
            Buffer.from(expectedSignature),
            Buffer.from(receivedSignature.toUpperCase())
        );
    } catch {
        return false;
    }
}
