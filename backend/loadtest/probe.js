// Preloaded into the load-test server process (`node --require probe.js server.js`).
// Reports CPU, memory and event-loop lag to the runner once per second over IPC.
const { monitorEventLoopDelay } = require('perf_hooks');

if (typeof process.send === 'function') {
  const lag = monitorEventLoopDelay({ resolution: 10 });
  lag.enable();

  let lastCpu = process.cpuUsage();
  let lastAt = process.hrtime.bigint();

  const timer = setInterval(() => {
    const now = process.hrtime.bigint();
    const cpu = process.cpuUsage(lastCpu); // delta since the previous tick
    const elapsedUs = Number(now - lastAt) / 1000;
    lastCpu = process.cpuUsage();
    lastAt = now;
    const mem = process.memoryUsage();

    process.send({
      t: Date.now(),
      // 100% = one full core. Node runs JavaScript on one thread, so ~100% means saturated.
      cpuPct: ((cpu.user + cpu.system) / elapsedUs) * 100,
      rssMb: mem.rss / 1048576,
      heapMb: mem.heapUsed / 1048576,
      lagP99Ms: lag.percentile(99) / 1e6,
      lagMaxMs: lag.max / 1e6,
    });
    lag.reset();
  }, 1000);
  timer.unref();
}
