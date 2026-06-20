const STORAGE_KEY = 'construmart-vr-progress';

class Progress {
  private visited = new Set<string>();

  constructor() {
    this.load();
  }

  private load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) this.visited = new Set(JSON.parse(raw) as string[]);
    } catch {
      /* ignore */
    }
  }

  private save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...this.visited]));
    } catch {
      /* ignore */
    }
  }

  markVisited(aisleId: string) {
    this.visited.add(aisleId);
    this.save();
  }

  isVisited(aisleId: string) {
    return this.visited.has(aisleId);
  }

  count() {
    return this.visited.size;
  }

  reset() {
    this.visited.clear();
    this.save();
  }
}

export const progress = new Progress();
