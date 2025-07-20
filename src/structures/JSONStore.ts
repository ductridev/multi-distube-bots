import { MiniMap } from "lavalink-client";
import { readFileSync } from "node:fs";
import { writeFile } from "node:fs/promises";

export class JSONStore {
    public data: MiniMap<string, string>;
    public filePath: string;

    constructor(filePath?: string) {
        this.filePath = filePath ?? `${process.cwd()}/queueData.json`;
        this.data = new MiniMap<string, string>();
        this.initLoadData();
    }

    /** Load existing file or initialize a new one */
    private async initLoadData(): Promise<void> {
        try {
            const raw = readFileSync(this.filePath, "utf-8");
            const entries = this.JSONtoEntries(raw);
            this.data = new MiniMap<string, string>(entries);
        } catch {
            // If file missing or corrupted, create it
            await writeFile(this.filePath, this.mapToJSON(this.data), "utf-8");
        }
    }

    /** Convert JSON string to entries array */
    private JSONtoEntries(json: string): [string, string][] {
        return Object.entries(JSON.parse(json));
    }

    /** Convert map entries into JSON string */
    private mapToJSON(map: MiniMap<string, string>): string {
        return JSON.stringify(Object.fromEntries(Array.from(map.entries())));
    }

    /** Get a stored value by key */
    public get(key: string): string | undefined {
        return this.data.get(key);
    }

    /** Set a value (stringified JSON), update cache and persist to file */
    public async set(key: string, value: string): Promise<void> {
        this.data.set(key, value);
        await writeFile(this.filePath, this.mapToJSON(this.data), "utf-8");
    }

    /** Delete a key, update cache and persist to file */
    public async delete(key: string): Promise<void> {
        this.data.delete(key);
        await writeFile(this.filePath, this.mapToJSON(this.data), "utf-8");
    }
}
