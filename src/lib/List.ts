export default class List<T> extends Array<T> {
  /**
   * Appends elements to the list if the list does not already contain them.
   * Returns true if all elements were inserted.
   * Elements are not inserted if they already exist.
   * @param elements - Elements that will be appended to the list.
   * @example
   * const a = new List(1, 2)
   * a.add(2) // false
   * a.add(2, 3) // false
   * a.add(4) // true
   */
  public add (...elements: T[]): boolean {
    let inserted = true

    for (const element of elements) {
      if (this.includes(element)) {
        inserted = false
        continue
      }

      this.push(element)
    }

    return inserted
  }

  /**
   * Removes elements from the list.
   * Returns false if an element was not contained in the list.
   * @param elements - Elements that will be removed from the list.
   * @example
   * const a = new List(1, 2)
   * a.remove(1) // true
   * a.remove(2, 3) // false
   * a.remove(4) // false
   */
  public remove (...elements: T[]): boolean {
    let removed = true
    for (const element of elements) {
      const i = this.indexOf(element)
      if (i === -1) {
        removed = false
        continue
      }

      this.splice(i, 1)
    }

    return removed
  }

  /**
   * Returns a list containing all elements that only this list OR only the other list contains.
   * @param other - The list to compare this list to.
   * @example
   * const a = new List(1, 2)
   * const b = new list(2, 3)
   * a.uncovered(b) // [ 1, 3 ]
   */
  public diff (other: T[]): List<T> {
    const thisToOther = this.filter(element => !other.includes(element))
    const otherToThis = other.filter(element => !this.includes(element))

    return new List(...thisToOther, ...otherToThis)
  }

  /**
   * Returns a list containing all elements of this list that are contained in the other array/list.
   * @param other - The list to compare this list to.
   * @example
   * const a = new List(1, 2)
   * const b = new list(2, 3)
   * a.uncovered(b) // [ 2 ]
   */
  public covered (other: T[]): List<T> {
    const thisToOther = this.filter(element => other.includes(element))
    return new List(...thisToOther)
  }

  /**
   * Returns a list containing all elements of this list that are not contained in the other array/list.
   * @param other - The list to compare this list to.
   * @example
   * const a = new List(1, 2)
   * const b = new list(2, 3)
   * a.uncovered(b) // [ 1 ]
   */
  public uncovered (other: T[]): List<T> {
    const thisToOther = this.filter(element => !other.includes(element))
    return new List(...thisToOther)
  }
}
