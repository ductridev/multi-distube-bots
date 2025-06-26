/**
 * Gets random IPv6 Address from a block
 *
 * @param {string} ip the IPv6 block in CIDR-Notation
 * @returns {string}
 */
export const getRandomIPv6 = (ip: string) => {
    if (!isIPv6(ip)) {
        throw new Error("Invalid IPv6 format");
    }

    const [rawAddr, rawMask] = ip.split("/");
    const mask = parseInt(rawMask, 10);

    if (isNaN(mask) || mask > 128 || mask < 1) {
        throw new Error("Invalid IPv6 subnet mask (must be between 1 and 128)");
    }

    const base10addr = normalizeIP(rawAddr);

    const fullMaskGroups = Math.floor(mask / 16);
    const remainingBits = mask % 16;

    const result = new Array(8).fill(0);

    for (let i = 0; i < 8; i++) {
        if (i < fullMaskGroups) {
            result[i] = base10addr[i];
        } else if (i === fullMaskGroups && remainingBits > 0) {
            const groupMask = 0xffff << (16 - remainingBits);
            const randomPart = Math.floor(Math.random() * (1 << (16 - remainingBits)));
            result[i] = (base10addr[i] & groupMask) | randomPart;
        } else {
            result[i] = Math.floor(Math.random() * 0x10000);
        }
    }

    return result.map(x => x.toString(16).padStart(4, "0")).join(":");
};

const isIPv6 = (ip: string) => {
    const IPV6_REGEX =
        /^(?:(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|(?:[0-9a-fA-F]{1,4}:){1,7}:|(?:[0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|(?:[0-9a-fA-F]{1,4}:){1,5}(?::[0-9a-fA-F]{1,4}){1,2}|(?:[0-9a-fA-F]{1,4}:){1,4}(?::[0-9a-fA-F]{1,4}){1,3}|(?:[0-9a-fA-F]{1,4}:){1,3}(?::[0-9a-fA-F]{1,4}){1,4}|(?:[0-9a-fA-F]{1,4}:){1,2}(?::[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:(?:(?::[0-9a-fA-F]{1,4}){1,6})|:(?:(?::[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(?::[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(?:ffff(?::0{1,4}){0,1}:){0,1}(?:(?:25[0-5]|(?:2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(?:25[0-5]|(?:2[0-4]|1{0,1}[0-9]){0,1}[0-9])|(?:[0-9a-fA-F]{1,4}:){1,4}:(?:(?:25[0-5]|(?:2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(?:25[0-5]|(?:2[0-4]|1{0,1}[0-9]){0,1}[0-9]))(?:\/(?:1[0-1][0-9]|12[0-8]|[1-9][0-9]|[1-9]))?$/;
    return IPV6_REGEX.test(ip);
};

/**
 * Normalizes an IPv6 address into an array of 8 integers
 * @param {string} ip - IPv6 address
 * @returns {number[]} - Array of 8 integers representing the address
 */
const normalizeIP = (ip: string) => {
    const parts = ip.split("::");
    let start = parts[0] ? parts[0].split(":") : [];
    let end = parts[1] ? parts[1].split(":") : [];

    const missing = 8 - (start.length + end.length);
    const zeros = new Array(missing).fill("0");

    const full = [...start, ...zeros, ...end];

    return full.map(part => parseInt(part || "0", 16));
};