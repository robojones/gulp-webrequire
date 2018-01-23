export default class List<T> extends Array<T> {
  /**
   * Appends an element to the list if the list does not already contain the element.
   * Returns true if the element was inserted.
   * @param element - This element will be appended to the list.
   */
  public add (element: T): boolean {
    if (this.includes(element)) {
      return false
    }

    this.push(element)
    return true
  }

  /**
   * Removes an element from the list.
   * Returns false if the element was not contained in the list.
   * @param element - This element will be removed from the list.
   */
  public remove (element: T): boolean {
    const i = this.indexOf(element)
    if (i === -1) {
      return false
    }

    this.splice(i, 1)
    return true
  }
}
