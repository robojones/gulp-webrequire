import * as Vinyl from 'vinyl'
import File from './File'

export default interface VinylWithRequirements extends Vinyl {
  /**
   * This array contains the names (as file objects) of the dependencies of this file.
   */
  requirements?: File[]

  /**
   * If the file is not a wrapper it has references to a wrapper.
   * This object contains the pre and postfix of the wrapper.
   */
  wrapper?: {
    pre: VinylWithRequirements,
    post: VinylWithRequirements
  }
}
