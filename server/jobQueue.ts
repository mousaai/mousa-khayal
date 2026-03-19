/**
 * jobQueue.ts — نظام طابور الإنتاج الذكي
 * يدعم 500 مستخدم متزامن مع:
 * - حد أقصى MAX_CONCURRENT jobs تعمل في نفس الوقت
 * - طابور انتظار لبقية المستخدمين
 * - تقدير وقت الانتظار
 * - rate limiting لكل مستخدم
 * - graceful degradation عند الحمل الزائد
 */

const MAX_CONCURRENT = 10;       // أقصى عدد jobs تعمل في نفس الوقت
const MAX_QUEUE_SIZE = 490;      // أقصى حجم طابور الانتظار
const MAX_PER_USER = 3;          // أقصى عدد jobs لكل مستخدم في الطابور
const AVG_JOB_DURATION_MS = 90_000; // متوسط وقت الإنتاج (90 ثانية)

interface QueuedJob {
  jobId: string;
  userId: string;
  fn: () => Promise<void>;
  addedAt: number;
  resolve: () => void;
  reject: (err: Error) => void;
}

class JobQueue {
  private running = 0;
  private queue: QueuedJob[] = [];
  private userJobCounts = new Map<string, number>(); // userId → عدد jobs في الطابور
  private jobStartTimes = new Map<string, number>(); // jobId → وقت البدء

  /** عدد الـ jobs الجارية حالياً */
  get activeCount() { return this.running; }

  /** عدد الـ jobs في الطابور */
  get queuedCount() { return this.queue.length; }

  /** إجمالي الـ jobs (جارية + منتظرة) */
  get totalCount() { return this.running + this.queue.length; }

  /** وقت الانتظار المتوقع بالثواني */
  estimatedWaitSeconds(position: number): number {
    // كل MAX_CONCURRENT jobs تنتهي في AVG_JOB_DURATION_MS
    const batchesAhead = Math.ceil(position / MAX_CONCURRENT);
    return Math.ceil((batchesAhead * AVG_JOB_DURATION_MS) / 1000);
  }

  /** موقع المستخدم في الطابور (0 = يعمل الآن) */
  getQueuePosition(jobId: string): number {
    const idx = this.queue.findIndex(j => j.jobId === jobId);
    if (idx === -1) return 0; // يعمل الآن أو انتهى
    return idx + 1;
  }

  /**
   * إضافة job إلى الطابور
   * @returns موقع في الطابور (0 = يبدأ فوراً)
   */
  async enqueue(jobId: string, userId: string, fn: () => Promise<void>): Promise<{ position: number; waitSeconds: number }> {
    // فحص حجم الطابور الكلي
    if (this.queue.length >= MAX_QUEUE_SIZE) {
      throw new Error(`QUEUE_FULL:الطابور ممتلئ حالياً (${MAX_QUEUE_SIZE} طلب في الانتظار). حاول مرة أخرى بعد قليل.`);
    }

    // فحص حد المستخدم
    const userCount = this.userJobCounts.get(userId) ?? 0;
    if (userCount >= MAX_PER_USER) {
      throw new Error(`USER_LIMIT:لديك ${userCount} طلبات في الانتظار. يرجى الانتظار حتى تكتمل قبل إضافة المزيد.`);
    }

    // إذا كان هناك مكان فوري → ابدأ مباشرة
    if (this.running < MAX_CONCURRENT) {
      this.running++;
      this.jobStartTimes.set(jobId, Date.now());
      this.runJob(jobId, userId, fn);
      return { position: 0, waitSeconds: 0 };
    }

    // وضع في الطابور
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
    } catch (e) {
      console.error(`[JobQueue] Job ${jobId} failed:`, e);
    } finally {
      this.running--;
      this.jobStartTimes.delete(jobId);
      this.processNext();
    }
  }

  private processNext() {
    if (this.queue.length === 0 || this.running >= MAX_CONCURRENT) return;

    const next = this.queue.shift()!;
    this.userJobCounts.set(next.userId, Math.max(0, (this.userJobCounts.get(next.userId) ?? 1) - 1));
    if ((this.userJobCounts.get(next.userId) ?? 0) === 0) {
      this.userJobCounts.delete(next.userId);
    }

    this.running++;
    this.jobStartTimes.set(next.jobId, Date.now());
    next.resolve(); // يُطلق الـ Promise في enqueue

    this.runJob(next.jobId, next.userId, next.fn);
  }

  /** إلغاء job من الطابور */
  cancel(jobId: string): boolean {
    const idx = this.queue.findIndex(j => j.jobId === jobId);
    if (idx === -1) return false;

    const job = this.queue.splice(idx, 1)[0];
    this.userJobCounts.set(job.userId, Math.max(0, (this.userJobCounts.get(job.userId) ?? 1) - 1));
    job.reject(new Error('CANCELLED:تم إلغاء الطلب'));
    return true;
  }

  /** إحصاءات النظام */
  stats() {
    return {
      running: this.running,
      queued: this.queue.length,
      total: this.totalCount,
      maxConcurrent: MAX_CONCURRENT,
      maxQueue: MAX_QUEUE_SIZE,
      utilizationPercent: Math.round((this.running / MAX_CONCURRENT) * 100),
    };
  }
}

// Singleton — نفس الطابور لكل السيرفر
export const jobQueue = new JobQueue();
