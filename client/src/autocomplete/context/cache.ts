export class CompletionCache {
<<<<<<< HEAD
	private cache = new Map<
		string,
		{ completion: string; timestamp: number }
	>();
	private maxSize = 100;

	get(prefix: string): string | undefined {
		const entry = this.cache.get(prefix);
		if (entry) {
			entry.timestamp = Date.now();
			return entry.completion;
		}
		return undefined;
	}

	put(prefix: string, completion: string): void {
		if (this.cache.size >= this.maxSize) {
			const oldestKey = this.findOldestKey();
			this.cache.delete(oldestKey);
		}
		this.cache.set(prefix, {
			completion,
			timestamp: Date.now(),
		});
	}
	private findOldestKey(): string {
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
=======
  private cache = new Map<string, { completion: string; timestamp: number }>();
  private maxSize = 100;

  get(prefix: string): string | undefined {
    const entry = this.cache.get(prefix);
    if (entry) {
      entry.timestamp = Date.now();
      return entry.completion;
    }
    return undefined;
  }

  put(prefix: string, completion: string): void {
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.findOldestKey();
      this.cache.delete(oldestKey);
    }
    this.cache.set(prefix, {
      completion,
      timestamp: Date.now(),
    });
  }
  private findOldestKey(): string {
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
>>>>>>> main
}
