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
