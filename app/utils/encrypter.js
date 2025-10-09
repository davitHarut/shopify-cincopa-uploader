import crypto from 'crypto';

// --- Start: Constants from C# Encrypter class ---
const SaltSize = 16; // 128-bit
const IvSize = 16; // 128-bit
const KeySize = 32; // 256-bit key
// const Iter = 100000; // Not used in the final DeriveKey method, but kept for reference
// --- End: Constants ---


/**
 * Encodes a Buffer into a URL-safe Base64 string.
 * This is equivalent to the C# Base64UrlEncode method.
 * @param {Buffer} buffer The data to encode.
 * @returns {string} The URL-safe Base64 encoded string.
 */
function base64UrlEncode(buffer) {
    return buffer.toString('base64')
        .replace(/=/g, '') // Remove padding
        .replace(/\+/g, '-') // Replace + with -
        .replace(/\//g, '_'); // Replace / with _
}

/**
 * Derives a key using HKDF (HMAC-based Key Derivation Function) with SHA256.
 * This is a direct port of the C# DeriveKey method.
 * @param {string} password The password to derive the key from.
 * @param {Buffer} salt The salt for the key derivation.
 * @returns {Buffer} The derived key.
 */
function deriveKey(password, salt) {
    // HKDF-Extract: Creates a pseudorandom key (prk) from the input key material.
    const hmacExtract = crypto.createHmac('sha256', salt);
    hmacExtract.update(password, 'utf8');
    const prk = hmacExtract.digest();

    // HKDF-Expand: Expands the prk into the desired key length.
    let okm = Buffer.alloc(0); // Output keying material
    let t = Buffer.alloc(0);
    let counter = 1;

    while (okm.length < KeySize) {
        // The input for the HMAC is the previous hash result (T) concatenated with a counter byte.
        const input = Buffer.concat([t, Buffer.from([counter])]);

        const hmacExpand = crypto.createHmac('sha256', prk);
        hmacExpand.update(input);
        t = hmacExpand.digest();

        okm = Buffer.concat([okm, t]);
        counter++;
    }

    // Return the key with the exact required size.
    return okm.slice(0, KeySize);
}


/**
 * Encrypts a plaintext string using AES-256-CBC.
 * The output format is [salt][iv][ciphertext], encoded as a URL-safe Base64 string.
 * This is a direct port of the C# Encrypt method.
 * @param {string} password The password (or parent_token) used for encryption.
 * @param {string} plaintext The string to encrypt.
 * @returns {string} The encrypted, URL-safe Base64 string.
 */
export function encrypt(password, plaintext) {
    const salt = crypto.randomBytes(SaltSize);
    const key = deriveKey(password, salt);
    const iv = crypto.randomBytes(IvSize);

    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    
    // Encrypt the plaintext.
    const encryptedPayload = Buffer.concat([
        cipher.update(plaintext, 'utf8'),
        cipher.final()
    ]);

    // Concatenate salt, IV, and the encrypted payload.
    const result = Buffer.concat([salt, iv, encryptedPayload]);

    return base64UrlEncode(result);
}


