/// <reference types="vite/client" />

declare module 'read-excel-file/browser' {
  const readXlsxFile: (file: Blob) => Promise<Array<Array<string | number | Date | null>>>
  export default readXlsxFile
}

declare module 'write-excel-file/browser' {
  const writeXlsxFile: (data: unknown[], options: Record<string, unknown>) => Promise<void>
  export default writeXlsxFile
}
