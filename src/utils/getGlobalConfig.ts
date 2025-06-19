// src/utils/getGlobalConfig.ts
import { GlobalConfigModel } from '../models/GlobalConfig';

export async function getGlobalValue<T = any>(key: string): Promise<T | undefined> {
    const entry = await GlobalConfigModel.findOne({ key });
    return entry?.value;
}
