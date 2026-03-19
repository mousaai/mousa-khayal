/**
 * jobQueue.test.ts — اختبارات نظام الطابور الذكي
 * يغطي: الحد الأقصى للـ jobs المتزامنة، الطابور، إلغاء الـ jobs، الإحصاءات
 */
import { describe, it, expect, beforeEach } from "vitest";

// ── نسخة مستقلة من JobQueue للاختبار ──────────────────────────────────────────
const MAX_CONCURRENT_TEST = 3;
const MAX_QUEUE_SIZE_TEST = 5;
const MAX_PER_USER_TEST = 2;
const AVG_JOB_DURATION_MS_TEST = 1000;

class TestJobQueue {
  private running = 0;
  private queue: Array<{
    jobId: string;
    userId: string;
    fn: () => Promise<void>;
    addedAt: number;
    resolve: () => void;
    reject: (err: Error) => void;
  }> = [];
  private userJobCounts = new Map<string, number>();
  private jobStartTimes = new Map<string, number>();

  get activeCount() { return this.running; }
  get queuedCount() { return this.queue.length; }
  get totalCount() { return this.running + this.queue.length; }

  estimatedWaitSeconds(position: number): number {
    const batchesAhead = Math.ceil(position / MAX_CONCURRENT_TEST);
    return Math.ceil((batchesAhead * AVG_JOB_DURATION_MS_TEST) / 1000);
  }

  getQueuePosition(jobId: string): number {
    const idx = this.queue.findIndex(j => j.jobId === jobId);
    if (idx === -1) return 0;
    return idx + 1;
  }

  async enqueue(jobId: string, userId: string, fn: () => Promise<void>): Promise<{ position: number; waitSeconds: number }> {
    if (this.queue.length >= MAX_QUEUE_SIZE_TEST) {
      throw new Error(`QUEUE_FULL:الطابور ممتلئ`);
    }
    const userCount = this.userJobCounts.get(userId) ?? 0;
    if (userCount >= MAX_PER_USER_TEST) {
      throw new Error(`USER_LIMIT:تجاوزت الحد`);
    }
    if (this.running < MAX_CONCURRENT_TEST) {
      this.running++;
      this.jobStartTimes.set(jobId, Date.now());
      this.runJob(jobId, userId, fn);
      return { position: 0, waitSeconds: 0 };
    }
    const position = this.queue.length + 1;
    const waitSeconds = this.estimatedWaitSeconds(position);
    await new Promise<void>((resolve, reject) => {
      this.queue.push({ jobId, userId, fn, addedAt: Date.now(), resolve, reject });
      this.userJobCounts.set(userId, (this.userJobCounts.get(userId) ?? 0) + 1);
    });
    return { position, waitSeconds };
  }

  private async runJob(jobId: string, userId: string, fn: () => Promise<void>) {
    try {
      await fn();
    } finally {
      this.running--;
      this.jobStartTimes.delete(jobId);
      this.processNext();
    }
  }

  private processNext() {
    if (this.queue.length === 0 || this.running >= MAX_CONCURRENT_TEST) return;
    const next = this.queue.shift()!;
    this.userJobCounts.set(next.userId, Math.max(0, (this.userJobCounts.get(next.userId) ?? 1) - 1));
    if ((this.userJobCounts.get(next.userId) ?? 0) === 0) {
      this.userJobCounts.delete(next.userId);
    }
    this.running++;
    this.jobStartTimes.set(next.jobId, Date.now());
    next.resolve();
    this.runJob(next.jobId, next.userId, next.fn);
  }

  cancel(jobId: string): boolean {
    const idx = this.queue.findIndex(j => j.jobId === jobId);
    if (idx === -1) return false;
    const job = this.queue.splice(idx, 1)[0];
    this.userJobCounts.set(job.userId, Math.max(0, (this.userJobCounts.get(job.userId) ?? 1) - 1));
    job.reject(new Error('CANCELLED:تم الإلغاء'));
    return true;
  }

  stats() {
    return {
      running: this.running,
      queued: this.queue.length,
      total: this.totalCount,
      maxConcurrent: MAX_CONCURRENT_TEST,
      maxQueue: MAX_QUEUE_SIZE_TEST,
      utilizationPercent: Math.round((this.running / MAX_CONCURRENT_TEST) * 100),
    };
  }
}

// ── الاختبارات ────────────────────────────────────────────────────────────────

describe("JobQueue — نظام الطابور الذكي", () => {
  let queue: TestJobQueue;

  beforeEach(() => {
    queue = new TestJobQueue();
  });

  it("يبدأ فوراً إذا كان هناك مكان (position=0)", async () => {
    const started: string[] = [];
    const p = queue.enqueue("job1", "user1", async () => {
      started.push("job1");
    });
    const { position } = await p;
    expect(position).toBe(0);
    expect(started).toContain("job1");
  });

  it("يدعم MAX_CONCURRENT jobs في نفس الوقت", async () => {
    const running: string[] = [];
    const promises: Promise<any>[] = [];
    // ملء الـ slots المتاحة
    for (let i = 0; i < MAX_CONCURRENT_TEST; i++) {
      const jobId = `job${i}`;
      promises.push(
        queue.enqueue(jobId, `user${i}`, async () => {
          running.push(jobId);
          await new Promise(r => setTimeout(r, 50));
        })
      );
    }
    // انتظر بدء الـ jobs
    await new Promise(r => setTimeout(r, 10));
    expect(queue.activeCount).toBe(MAX_CONCURRENT_TEST);
  });

  it("يضع الـ job في الطابور إذا امتلأت الـ slots", async () => {
    // ملء الـ slots
    for (let i = 0; i < MAX_CONCURRENT_TEST; i++) {
      queue.enqueue(`job${i}`, `user${i}`, async () => {
        await new Promise(r => setTimeout(r, 100));
      });
    }
    await new Promise(r => setTimeout(r, 5));
    // الـ job التالي يجب أن يكون في الطابور
    let queuedPosition = -1;
    const queuedPromise = queue.enqueue("queued_job", "user_q", async () => {}).then(({ position }) => {
      queuedPosition = position;
    });
    await new Promise(r => setTimeout(r, 5));
    expect(queue.queuedCount).toBe(1);
    expect(queue.getQueuePosition("queued_job")).toBe(1);
  });

  it("يرفض الطلب إذا امتلأ الطابور", async () => {
    // ملء الـ slots
    for (let i = 0; i < MAX_CONCURRENT_TEST; i++) {
      queue.enqueue(`slot${i}`, `user${i}`, async () => {
        await new Promise(r => setTimeout(r, 1000));
      });
    }
    await new Promise(r => setTimeout(r, 5));
    // ملء الطابور
    for (let i = 0; i < MAX_QUEUE_SIZE_TEST; i++) {
      queue.enqueue(`q${i}`, `qu${i}`, async () => {}).catch(() => {});
    }
    await new Promise(r => setTimeout(r, 5));
    // الطلب الزائد يجب أن يُرفض
    await expect(
      queue.enqueue("overflow", "user_overflow", async () => {})
    ).rejects.toThrow("QUEUE_FULL");
  });

  it("يرفض المستخدم الذي تجاوز الحد", async () => {
    // ملء الـ slots
    for (let i = 0; i < MAX_CONCURRENT_TEST; i++) {
      queue.enqueue(`slot${i}`, `other${i}`, async () => {
        await new Promise(r => setTimeout(r, 1000));
      });
    }
    await new Promise(r => setTimeout(r, 5));
    // المستخدم يضيف MAX_PER_USER_TEST jobs
    for (let i = 0; i < MAX_PER_USER_TEST; i++) {
      queue.enqueue(`user_job${i}`, "heavy_user", async () => {}).catch(() => {});
    }
    await new Promise(r => setTimeout(r, 5));
    // الطلب الزائد يُرفض
    await expect(
      queue.enqueue("extra_job", "heavy_user", async () => {})
    ).rejects.toThrow("USER_LIMIT");
  });

  it("يُلغي job من الطابور بنجاح", async () => {
    // ملء الـ slots
    for (let i = 0; i < MAX_CONCURRENT_TEST; i++) {
      queue.enqueue(`slot${i}`, `user${i}`, async () => {
        await new Promise(r => setTimeout(r, 1000));
      });
    }
    await new Promise(r => setTimeout(r, 5));
    // إضافة job للطابور
    const cancelPromise = queue.enqueue("to_cancel", "user_c", async () => {});
    await new Promise(r => setTimeout(r, 5));
    expect(queue.queuedCount).toBe(1);
    // إلغاء
    const cancelled = queue.cancel("to_cancel");
    expect(cancelled).toBe(true);
    expect(queue.queuedCount).toBe(0);
    await expect(cancelPromise).rejects.toThrow("CANCELLED");
  });

  it("يُعيد إحصاءات صحيحة", async () => {
    const stats = queue.stats();
    expect(stats.running).toBe(0);
    expect(stats.queued).toBe(0);
    expect(stats.maxConcurrent).toBe(MAX_CONCURRENT_TEST);
    expect(stats.maxQueue).toBe(MAX_QUEUE_SIZE_TEST);
    expect(stats.utilizationPercent).toBe(0);
  });

  it("يحسب وقت الانتظار المتوقع بشكل صحيح", () => {
    // position=1 → batch 1 → 1 ثانية
    expect(queue.estimatedWaitSeconds(1)).toBe(1);
    // position=3 → batch 1 → 1 ثانية (MAX_CONCURRENT_TEST=3)
    expect(queue.estimatedWaitSeconds(3)).toBe(1);
    // position=4 → batch 2 → 2 ثانية
    expect(queue.estimatedWaitSeconds(4)).toBe(2);
  });

  it("يُعيد 0 لـ getQueuePosition إذا لم يكن في الطابور", () => {
    expect(queue.getQueuePosition("nonexistent")).toBe(0);
  });
});
