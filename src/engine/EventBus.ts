type Handler<T> = (payload: T) => void

export class EventBus {
  private handlers = new Map<string, Handler<unknown>[]>()

  on<T = unknown>(event: string, handler: Handler<T>): void {
    if (!this.handlers.has(event)) this.handlers.set(event, [])
    this.handlers.get(event)!.push(handler as Handler<unknown>)
  }

  off<T = unknown>(event: string, handler: Handler<T>): void {
    const list = this.handlers.get(event)
    if (!list) return
    this.handlers.set(
      event,
      list.filter((h) => h !== (handler as Handler<unknown>)),
    )
  }

  emit<T = unknown>(event: string, payload: T): void {
    const list = this.handlers.get(event)
    if (!list) return
    for (const h of list) h(payload)
  }
}
