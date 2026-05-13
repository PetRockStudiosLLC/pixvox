interface FileSaveOptions {
  suggestedName?: string;
  types?: FilePickerFileType[];
  excludeAcceptAllFiletype?: boolean;
}

interface FilePickerFileType {
  description?: string;
  accept: Record<string, string[]>;
}

interface FileSystemFileHandle {
  name: string;
  createWritable(): Promise<FileSystemWritableFileStream>;
}

interface FileSystemWritableFileStream extends WritableStream {
  write(data: string | Blob | Uint8Array<ArrayBufferLike> | ArrayBuffer): Promise<void>;
  close(): Promise<void>;
}

interface Window {
  showSaveFilePicker(options?: FileSaveOptions): Promise<FileSystemFileHandle>;
}
