import fs from 'node:fs';
import path from 'node:path';
import { Event, type Lavamusic } from '../../structures/index';

const LOGS_DIR = path.resolve('logs');
const MAX_FILES = 5;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB per file

export default class Debug extends Event {
    client: Lavamusic;
    private currentIndex = 0;
    private currentStream: fs.WriteStream | null = null;

    constructor(client: Lavamusic, file: string) {
        super(client, file, {
            name: 'debug',
        });
        this.client = client;
        try {
            if (!fs.existsSync(LOGS_DIR)) {
                fs.mkdirSync(LOGS_DIR, { recursive: true });
            }
            this.openStream();
        } catch (error) {
            this.client.logger.warn(`Failed to create logs directory: ${error instanceof Error ? error.message : String(error)}. Debug logging disabled.`);
            // Continue running without debug logging
        }
    }

    private getLogPath(index: number): string {
        return path.join(LOGS_DIR, `debug-${index}.log`);
    }

    private openStream(): void {
        try {
            this.currentStream?.end();
            this.currentStream = fs.createWriteStream(this.getLogPath(this.currentIndex), { flags: 'a' });
        } catch (error) {
            this.client.logger.warn(`Failed to open log stream: ${error instanceof Error ? error.message : String(error)}`);
            this.currentStream = null;
        }
    }

    private rotate(): void {
        if (!this.currentStream) return;
        
        const filePath = this.getLogPath(this.currentIndex);
        try {
            const stats = fs.statSync(filePath);
            if (stats.size >= MAX_FILE_SIZE) {
                this.currentIndex = (this.currentIndex + 1) % MAX_FILES;
                // Overwrite the next file instead of appending
                this.currentStream?.end();
                this.currentStream = fs.createWriteStream(this.getLogPath(this.currentIndex), { flags: 'w' });
            }
        } catch {
            // File doesn't exist yet, no rotation needed
        }
    }

    public async run(eventKey: string, eventData: any): Promise<void> {
        const timestamp = new Date().toISOString();
        const line = `[${timestamp}] [${eventKey}] ${typeof eventData === 'string' ? eventData : JSON.stringify(eventData)}\n`;
        
        // Only write to stream if available
        if (this.currentStream) {
            try {
                this.currentStream.write(line);
                this.rotate();
            } catch (error) {
                // Silently fail to avoid crashing the bot
            }
        }
    }
}
