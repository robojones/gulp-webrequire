export default interface SourceMap {
  /** The name of the file. */
  file: string
  mappings: string
  names: string[]
  /** The names of the source files. */
  sources: string[]
  /** The contents of the source files */
  sourcesContent: string[]
  version: 3
}
