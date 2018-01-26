const w = window as any
if (!w.registerModule) {
  const queue = []
  w.moduleQueue = queue
  w.registerModule = queue.push.bind(queue)
}
