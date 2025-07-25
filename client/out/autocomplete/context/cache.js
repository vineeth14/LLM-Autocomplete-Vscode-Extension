class CompletionCache {
    constructor() {
        this.cache = new Map();
        this.maxSize = 100;
    }
    get(prefix) {
        const entry = this.cache.get(prefix);
        if (entry) {
            entry.timestamp = Date.now();
            return entry.completion;
        }
        return undefined;
    }
    put(prefix, completion) {
        if (this.cache.size >= this.maxSize) {
            const oldestKey = this.findOldestKey();
            this.cache.delete(oldestKey);
        }
        this.cache.set(prefix, {
            completion,
            timestamp: Date.now(),
        });
    }
    findOldestKey() {
        let oldestKey = "";
        let oldestTime = Date.now();
        for (const [key, entry] of this.cache) {
            if (entry.timestamp < oldestTime) {
                oldestTime = entry.timestamp;
                oldestKey = key;
            }
        }
        return oldestKey;
    }
}
//# sourceMappingURL=cache.js.map