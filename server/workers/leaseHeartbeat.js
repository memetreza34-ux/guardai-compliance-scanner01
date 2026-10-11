const { setTimeout: delay } = require('node:timers/promises');

function startLeaseHeartbeat({ jobRepository, jobId, workerId, leaseSeconds, sleep = delay }) {
  const controller = new AbortController();
  let heartbeatError = null;
  const intervalMs = Math.max(5000, Math.min(30000, Math.floor((leaseSeconds * 1000) / 3)));

  const promise = (async () => {
    while (!controller.signal.aborted) {
      try {
        await sleep(intervalMs, undefined, { signal: controller.signal });
      } catch (error) {
        if (error?.name === 'AbortError') break;
        heartbeatError = error;
        break;
      }
      if (controller.signal.aborted) break;
      try {
        await jobRepository.renewLease({ jobId, workerId, leaseSeconds });
      } catch (error) {
        heartbeatError = error;
        break;
      }
    }
  })();

  return {
    async stop() {
      controller.abort();
      try {
        await promise;
      } catch (error) {
        if (error?.name !== 'AbortError' && !heartbeatError) heartbeatError = error;
      }
      return heartbeatError;
    },
    getError() {
      return heartbeatError;
    },
  };
}


module.exports = { startLeaseHeartbeat };
