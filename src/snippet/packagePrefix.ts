if (!(window as any).registerModule) {
  const queue = [];
  (window as any).moduleQueue = queue;
  (window as any).registerModule = queue.push.bind(queue)
}
