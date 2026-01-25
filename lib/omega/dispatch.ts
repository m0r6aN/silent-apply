/**
 * OMEGA Task Dispatch
 *
 * Task dispatch interface for SilentApply agents.
 * Supports both fire-and-forget async execution and synchronous execution.
 * Correlation ID threaded through for observability.
 */

import { createCorrelationLogger } from './correlation';
import { executeResumeIngest, ResumeIngestInput, ResumeIngestOutput } from './tasks/resumeIngest';
import { executeQAAnswer, QAAnswerInput, QAAnswerOutput } from './tasks/qaAnswer';
import { executeBookingNotify, BookingNotifyInput, BookingNotifyOutput } from './tasks/bookingNotify';

type TaskName = 'resume.ingest' | 'qa.answer' | 'booking.notify';

interface TaskDefinition {
  'resume.ingest': {
    input: Omit<ResumeIngestInput, 'correlationId'>;
    output: ResumeIngestOutput;
  };
  'qa.answer': {
    input: Omit<QAAnswerInput, 'correlationId'>;
    output: QAAnswerOutput;
  };
  'booking.notify': {
    input: Omit<BookingNotifyInput, 'correlationId'>;
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
  const taskId = `task_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  log.info('task.dispatched', {
    taskId,
    taskName
  });

  // Fire-and-forget execution
  setImmediate(async () => {
    const taskLog = createCorrelationLogger(correlationId);
    taskLog.info('task.execution_started', { taskId, taskName });

    try {
      let result: unknown;

      switch (taskName) {
        case 'resume.ingest':
          result = await executeResumeIngest({
            correlationId,
            ...payload as TaskDefinition['resume.ingest']['input']
          });
          break;

        case 'qa.answer':
          result = await executeQAAnswer({
            correlationId,
            ...payload as TaskDefinition['qa.answer']['input']
          });
          break;

        case 'booking.notify':
          result = await executeBookingNotify({
            correlationId,
            ...payload as TaskDefinition['booking.notify']['input']
          });
          break;

        default:
          throw new Error(`Unknown task: ${taskName}`);
      }

      taskLog.info('task.execution_completed', {
        taskId,
        taskName,
        status: (result as { status: string }).status
      });
    } catch (err) {
      taskLog.error('task.execution_failed', err, { taskId, taskName });
    }
  });

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
  const taskId = `task_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  log.info('task.execute_started', {
    taskId,
    taskName
  });

  const startTime = Date.now();

  try {
    let result: TaskDefinition[T]['output'];

    switch (taskName) {
      case 'resume.ingest':
        result = await executeResumeIngest({
          correlationId,
          ...payload as TaskDefinition['resume.ingest']['input']
        }) as TaskDefinition[T]['output'];
        break;

      case 'qa.answer':
        result = await executeQAAnswer({
          correlationId,
          ...payload as TaskDefinition['qa.answer']['input']
        }) as TaskDefinition[T]['output'];
        break;

      case 'booking.notify':
        result = await executeBookingNotify({
          correlationId,
          ...payload as TaskDefinition['booking.notify']['input']
        }) as TaskDefinition[T]['output'];
        break;

      default:
        throw new Error(`Unknown task: ${taskName}`);
    }

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
