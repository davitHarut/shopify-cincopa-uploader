import { encrypt } from './encrypter.js';

/**
 * Creates a self-generated temporary token.
 * This is a direct port of the C# createSelfGeneratedTempTokenV3getTempAPIKeyV2 method.
 *
 * @param {string} parent_token The main token to derive the temporary token from.
 * @param {Date} expire The expiration date and time for the token.
 * @param {string|null} [permissions=null] Optional permissions string.
 * @param {string|null} [rid=null] Optional resource ID.
 * @param {string|null} [fid=null] Optional file ID.
 * @param {string|null} [sourceipv4=null] Optional source IPv4 address.
 * @param {string|null} [host=null] Optional host.
 * @returns {string} The generated temporary token.
 */
export function createSelfGeneratedTempTokenV3getTempAPIKeyV2(parent_token, expire, permissions = null, rid = null, fid = null, sourceipv4 = null, host = null) {
    if (!parent_token) {
        throw new Error("empty parent_token not allowed");
    }

    const keyfreg = parent_token.split('i', 2);
    const accid = keyfreg[0];
    const last4_parent_token = parent_token.slice(-4);

    let payload = expire.toISOString();

    if (permissions != null) {
        payload += `!p${permissions}`;
    }
    if (rid != null) {
        payload += `!r${rid}`;
    }
    if (fid != null) {
        payload += `!f${fid}`;
    }
    if (sourceipv4 != null) {
        payload += `!i${sourceipv4}`;
    }
    if (host != null) {
        payload += `!h${host}`;
    }

    const emsg = encrypt(parent_token, payload);

    return `${accid}i3${last4_parent_token}${emsg}`;
}