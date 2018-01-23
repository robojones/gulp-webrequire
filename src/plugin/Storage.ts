export default class Storage <T> {
  private storage: {[name: string]: T} = {}
  private Factory: new () => T


  constructor (Factory: new () => T) {
    this.Factory = Factory
  }

  /**
   * Returns the element with the given name.
   * If no element with the name exists, a new Element gets created.
   * @param name - The name of the element.
   */
  public get (name: string): T {
    if (!this.storage[name]) {
      this.storage[name] = new this.Factory()
    }

    return this.storage[name]
  }

  /**
   * Sets or overwrites the element with the given name.
   * @param name - The name of the element.
   * @param value - The new value.
   */
  public set (name: string, value: T) {
    this.storage[name] = value
  }

  /**
   * Removes an element from the storage.
   * @param name - The name of the element.
   */
  public remove (name: string) {
    delete this.storage[name]
  }

  /**
   * Contains the names of all elements.
   */
  public get keys (): string[] {
    return Object.keys(this.storage)
  }
}
