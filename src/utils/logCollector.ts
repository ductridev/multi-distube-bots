import { mkdirSync, existsSync } from 'fs';
import fs, { appendFile } from 'fs/promises';
import path from 'path';
import mongoose, { Schema, Document, model } from 'mongoose';

const MAX_MESSAGE_LENGTH = 10000;
const LOG_DIR = path.resolve('./logs');

// Ensure log directory exists
if (!existsSync(LOG_DIR)) mkdirSync(LOG_DIR);

// Interface & Schema
export interface ILog extends Document {
    level: string;
    timestamp: string;
    caller?: string;
    message: string;
}

const logSchema = new Schema<ILog>({
    level: { type: String, required: true },
    timestamp: { type: String, required: true },
    caller: { type: String },
    message: { type: String, required: true },
});

const LogModel = model<ILog>('Log', logSchema);

// Init DB if not already connected
if (!mongoose.connection.readyState) {
    const uri = process.env.MONGOOSE_URL || 'mongodb://localhost:27017/logs';
    mongoose.connect(uri, {
        dbName: process.env.MONGOOSE_DB_NAME || 'bot_logs',
    }).then(() => {
        console.log('✅ [LogCollector] MongoDB connected');
    }).catch(err => {
        console.error('❌ [LogCollector] MongoDB connection error:', err);
    });
}

const isProd = process.env.NODE_ENV === 'production';

const originalLog = console.log;
const originalWarn = console.warn;
const originalError = console.error;
const originalInfo = console.info;

const getTimestamp = (): string => new Date().toISOString();

const getCallerInfo = (): string => {
    const err = new Error();
    const stack = err.stack?.split('\n') || [];
    const callerLine = stack.find(line => !line.includes('logCollector') && !line.includes('Error'));
    return callerLine?.trim() ?? '';
};

const writeToFile = async (level: string, line: string) => {
    const logFilePath = path.join(LOG_DIR, `${level.toLowerCase()}.log`);
    try {
        await appendFile(logFilePath, line + '\n', { encoding: 'utf8' });
    } catch (err: any) {
        originalError(`❌ Failed to write to ${logFilePath}: ${err.message}`);
    }
};

const safeStringify = (obj: any): string => {
    return JSON.stringify(obj, (_, value) =>
        typeof value === 'bigint' ? value.toString() + 'n' : value
    );
};

const overrideConsoleMethod = (
    methodName: keyof Console,
    originalMethod: (...args: any[]) => void
) => {
    (console[methodName] as (...args: any[]) => void) = (...args: any[]) => {
        const level = methodName.toUpperCase();
        const timestamp = getTimestamp();
        const caller = getCallerInfo();
        const message = args
            .map(arg =>
                arg instanceof Error ? arg.toString()
                    : typeof arg === 'object' ? safeStringify(arg)
                        : String(arg)
            )
            .join(' ')
            .slice(0, MAX_MESSAGE_LENGTH);

        const line = `[${level} ${timestamp}] (${caller}): ${message}`;

        // Save to MongoDB
        LogModel.create({ level, timestamp, caller, message }).catch(err => {
            originalError('❌ Error saving log to DB:', err.message);
        });

        // Save to file
        writeToFile(level.toLowerCase(), line);

        // Print to console (dev only)
        if (!isProd) originalMethod.call(console, ...args);
    };
};

// Override console methods
overrideConsoleMethod('log', originalLog);
overrideConsoleMethod('warn', originalWarn);
overrideConsoleMethod('error', originalError);
overrideConsoleMethod('info', originalInfo);

// Utilities
export async function getLogs(): Promise<string> {
    const logs = await LogModel.find().sort({ _id: 1 }).lean();
    return logs.map(log => `[${log.level} ${log.timestamp}] (${log.caller}): ${log.message}`).join('\n');
}

export async function clearLogs(): Promise<void> {
    await LogModel.deleteMany({});
    for (const level of ['log', 'info', 'warn', 'error']) {
        const filePath = path.join(LOG_DIR, `${level}.log`);
        if (existsSync(filePath)) await fs.writeFile(filePath, '', 'utf8');
    }
}

export async function writeLogsToFile(outputPath = './logs/combined.log'): Promise<string> {
    const content = await getLogs();
    const fullPath = path.resolve(outputPath);
    await fs.writeFile(fullPath, content, 'utf8');
    return fullPath;
}
