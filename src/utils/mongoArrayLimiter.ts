// src/utils/mongoArrayLimiter.ts
import { Buffer } from 'buffer';
import { Model } from 'mongoose';

const MAX_DOCUMENT_SIZE = 16 * 1024 * 1024; // 16MB
const RESERVED_OVERHEAD = 512 * 1024; // Reserve 512KB for metadata/fields
const MAX_DATA_SIZE = MAX_DOCUMENT_SIZE - RESERVED_OVERHEAD;

function buildLimitedArray(items: string[]): string[] {
    const result: string[] = [];
    let totalSize = 0;

    for (const item of items) {
        const itemSize = Buffer.byteLength(item, 'utf8') + 4; // estimate
        if (totalSize + itemSize > MAX_DATA_SIZE) break;
        result.push(item);
        totalSize += itemSize;
    }

    return result;
}

export async function saveLimitedArray(
    model: Model<any>,
    userId: string,
    field: string,
    newItem: string | string[]
) {
    const newItems = Array.isArray(newItem) ? newItem : [newItem];

    const existing = await model.findOne({ userId });
    const existingArray: string[] = existing?.[field] || [];

    const updatedArray = buildLimitedArray([...newItems, ...existingArray]);

    await model.updateOne(
        { userId },
        { $set: { [field]: updatedArray } },
        { upsert: true }
    );
}
