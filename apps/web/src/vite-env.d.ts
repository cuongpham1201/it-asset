/// <reference types="vite/client" />

declare module 'read-excel-file/browser' {
  const readXlsxFile: (file: Blob) => Promise<Array<Array<string | number | Date | null>>>
  export default readXlsxFile
}

declare module 'write-excel-file/browser' {
  type ExcelOutput = {
    toBlob: () => Promise<Blob>
    toFile: (fileName: string) => Promise<void>
  }
  const writeXlsxFile: (data: unknown[], options: Record<string, unknown>) => ExcelOutput
  export default writeXlsxFile
}
