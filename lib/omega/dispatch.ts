/**
 * OMEGA Task Dispatch via OMEGA SDK.
 *
 * Task dispatch interface for SilentApply APIs.
 * Correlation ID is threaded into all SDK calls.
 */

import { createCorrelationLogger } from './correlation';
import { getOmegaClient } from './sdk';

type TaskName = 'resume.ingest' | 'qa.answer' | 'booking.notify';

interface ResumeIngestInput {
  profileId: string;
  resumeId: string;
  fileUrl: string;
  fileType: 'pdf' | 'docx';
}

interface ResumeIngestOutput {
  correlationId: string;
  status: 'success' | 'failure';
  resumeId?: string;
  chunkCount?: number;
  error?: {
    code: string;
    message: string;
    retriable: boolean;
  };
}

interface QAAnswerInput {
  profileId: string;
  question: string;
  recruiterEmail?: string;
  recruiterName?: string;
}

interface QAAnswerOutput {
  correlationId: string;
  profileId: string;
  status: 'answered' | 'refused' | 'failure';
  answer?: string;
  refusalReason?: string;
  qaRecordId?: string;
  sources?: string[];
  error?: {
    code: string;
    message: string;
    retriable: boolean;
  };
}

interface BookingNotifyInput {
  bookingId: string;
  profileId: string;
  recruiterEmail: string;
  recruiterName?: string;
  slotStart: string;
  slotEnd: string;
  notifyCandidate: boolean;
}

interface BookingNotifyOutput {
  correlationId: string;
  bookingId: string;
  status: 'success' | 'partial' | 'failure';
  recruiterNotified: boolean;
  candidateNotified?: boolean;
  error?: {
    code: string;
    message: string;
    retriable: boolean;
  };
}

interface TaskDefinition {
  'resume.ingest': {
    input: ResumeIngestInput;
    output: ResumeIngestOutput;
  };
  'qa.answer': {
    input: QAAnswerInput;
    output: QAAnswerOutput;
  };
  'booking.notify': {
    input: BookingNotifyInput;
    output: BookingNotifyOutput;
  };
}

interface DispatchResult<T extends TaskName> {
  taskId: string;
  taskName: T;
  correlationId: string;
  dispatched: true;
}

interface ExecuteResult<T extends TaskName> {
  taskId: string;
  taskName: T;
  correlationId: string;
  result: TaskDefinition[T]['output'];
}

/**
 * Dispatch a task for async (fire-and-forget) execution
 *
 * Use for background tasks that don't need immediate results.
 * Correlation ID is threaded through for observability.
 */
export async function dispatchTask<T extends TaskName>(
  taskName: T,
  payload: TaskDefinition[T]['input'],
  correlationId: string
): Promise<DispatchResult<T>> {
  const log = createCorrelationLogger(correlationId);
  const client = getOmegaClient();
  const created = await client.tasks.create(taskName, payload as unknown as Record<string, unknown>, {
    correlationId,
  });

  const taskId = created.taskId;
  log.info('task.dispatched', { taskId, taskName });

  return {
    taskId,
    taskName,
    correlationId,
    dispatched: true
  };
}

/**
 * Execute a task synchronously and return the result
 *
 * Use for tasks that need immediate results (e.g., Q&A responses).
 * Correlation ID is threaded through for observability.
 */
export async function executeTask<T extends TaskName>(
  taskName: T,
  payload: TaskDefinition[T]['input'],
  correlationId: string
): Promise<ExecuteResult<T>> {
  const log = createCorrelationLogger(correlationId);
  const client = getOmegaClient();

  log.info('task.execute_started', {
    taskName
  });

  const startTime = Date.now();
  let taskId = '';

  try {
    const created = await client.tasks.create(taskName, payload as unknown as Record<string, unknown>, {
      correlationId,
    });
    taskId = created.taskId;
    const completedTask = await client.tasks.waitForCompletion(taskId, {
      pollIntervalMs: 500,
      timeoutMs: 60_000,
    });

    if (completedTask.status !== 'completed') {
      throw new Error(`Task ${taskId} ended in status '${completedTask.status}'`);
    }

    const result = (completedTask.result ?? {}) as unknown as TaskDefinition[T]['output'];

    const durationMs = Date.now() - startTime;
    log.info('task.execute_completed', {
      taskId,
      taskName,
      status: (result as { status: string }).status,
      durationMs
    });

    return {
      taskId,
      taskName,
      correlationId,
      result
    };
  } catch (err) {
    const durationMs = Date.now() - startTime;
    log.error('task.execute_failed', err, { taskId, taskName, durationMs });
    throw err;
  }
}
