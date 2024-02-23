import type { EncodingType } from "expo-file-system";
import type { Logger } from "./storage-logger.types";

/**
 * Options for configuring the ExpoFileSystemStorage.
 */
export interface StorageOptions {
  beforeInit?: () => Promise<void> | void;
  afterInit?: () => Promise<void> | void;
  storagePath?: string;
  encoding?: EncodingType;
  debug?: boolean;
  logger?: {
    debug?: Logger;
    error?: Logger;
  };
}
