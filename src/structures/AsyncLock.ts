export default class AsyncLock {
    private locks: Map<string, Promise<void>> = new Map();

    async acquire(key: string, fn: () => Promise<void>): Promise<void> {
        const previous = this.locks.get(key) ?? Promise.resolve();

        let release: () => void;
        const current = new Promise<void>(resolve => { release = resolve; });

        this.locks.set(key, previous.then(() => current));

        try {
            await previous;  // Wait for previous lock to finish
            await fn();      // Run actual function
        } finally {
            release!();      // Unlock
            if (this.locks.get(key) === current) {
                this.locks.delete(key);
            }
        }
    }
}