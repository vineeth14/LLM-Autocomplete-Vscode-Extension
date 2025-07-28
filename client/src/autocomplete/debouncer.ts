import { v4 as uuidv4 } from "uuid";

export class RequestDebouncer {
  private currentRequestId: string | null = null;
  private debounceTimeout: NodeJS.Timeout | null = null;

  async delayAndDebounce(debounceDelay: number): Promise<boolean> {
    const requestId = uuidv4();
    this.currentRequestId = requestId;

    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
    }
    return new Promise<boolean>((resolve) => {
      this.debounceTimeout = setTimeout(() => {
        const shouldSkip = this.currentRequestId !== requestId;
        resolve(shouldSkip);
      }, debounceDelay);
    });
  }
  cleanup(): void {
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
      this.debounceTimeout = null;
    }
    this.currentRequestId = null;
  }
}
