import * as FileSystem from "expo-file-system";
import type { RequiredDeep, SetOptional } from "type-fest";
import type { Logger } from "./types/storage-logger.types";
import type { StorageOptions } from "./types/storage-options.types";
import type { StorageEngine } from "./types/storage-engine.types";

/**
 * Represents a storage engine that uses Expo FileSystem for persistence.
 */
class ExpoFileSystemStorage implements StorageEngine {
  /**
   * The options for the ExpoFileSystemStorage class.
   */
  private options: SetOptional<
    RequiredDeep<StorageOptions>,
    "beforeInit" | "afterInit"
  >;

  /**
   * A promise that resolves when the storage is ready.
   */
  private ready: Promise<void>;

  /**
   * Constructs a new instance of the ExpoFileSystemStorage class.
   * @param customOptions - The custom options for the storage.
   */
  constructor(customOptions: StorageOptions = {}) {
    this.options = {
      storagePath: `${FileSystem.documentDirectory}persistStorageData/`,
      encoding: FileSystem.EncodingType.UTF8,
      ...customOptions,
      debug: customOptions.debug ?? false,
      logger: {
        debug: console.log,
        error: console.error,
        ...customOptions.logger,
      },
    };

    this.ready = this.initialize();
  }

  /**
   * Returns a boolean value indicating whether debug mode is enabled.
   *
   * @returns True if debug mode is enabled, false otherwise.
   */
  private get isDebugModeEnabled(): boolean {
    return this.options.debug;
  }

  /**
   * The logger object used for logging debug and error messages.
   *
   * @returns The logger object.
   */
  private get logger(): {
    debug: Logger;
    error: Logger;
  } {
    return this.options.logger;
  }

  /**
   * Retrieves the value associated with the specified key from the storage.
   *
   * @param key - The key of the item to retrieve.
   * @param onSuccess - Optional callback function to be called with the retrieved content if the operation is successful.
   * @param onFail - Optional callback function to be called if the operation fails.
   * @returns A Promise that resolves to the retrieved content.
   */
  public async getItem(
    key: string,
    onSuccess?: (content: string) => Promise<void> | void,
    onFail?: (error: Error) => Promise<void> | void
  ): Promise<string> {
    await this.ready;

    this.logDebugMessageInDebugMode(`(${this.getItem.name}): Get item for key '${key}'`);

    const { encoding } = this.options;

    try {
      const content = await FileSystem.readAsStringAsync(this.pathForKey(key), {
        encoding,
      });

      if (onSuccess) {
        await onSuccess(content);
      }

      return content;
    } catch (error) {
      return this.handleStorageError(`(${this.getItem.name}): Error getting item for key '${key}'`, error, onFail);
    }
  }

  /**
   * Retrieves all the keys stored in the Expo file system storage.
   *
   * @param onSuccess - Optional callback function to be called with the retrieved keys.
   * @param onFail - Optional callback function to be called if an error occurs during retrieval.
   * @returns A promise that resolves to an array of string keys.
   */
  public async getAllKeys(
    onSuccess?: (keys: string[]) => Promise<void> | void,
    onFail?: (error: Error) => Promise<void> | void
  ): Promise<string[]> {
    await this.ready;

    this.logDebugMessageInDebugMode(`(${this.getAllKeys.name}): Getting all keys`);

    try {
      const fileNames = await FileSystem.readDirectoryAsync(
        this.options.storagePath
      );

      const encodedFileNames = fileNames.map((fileName) =>
        decodeURIComponent(fileName)
      );

      if (onSuccess) {
        await onSuccess(encodedFileNames);
      }

      return encodedFileNames;
    } catch (error) {
      return this.handleStorageError(`(${this.getAllKeys.name}): Error getting all keys`, error, onFail);
    }
  }

  /**
   * Sets the value for the specified key in the storage.
   *
   * @param key - The key to set the value for.
   * @param value - The value to set.
   * @param onSuccess - Optional callback function to be called when the item is successfully set.
   * @param onFail - Optional callback function to be called when an error occurs while setting the item.
   * @returns A Promise that resolves when the item is successfully set, or rejects with an error if an error occurs.
   */
  public async setItem(
    key: string,
    value: string,
    onSuccess?: () => Promise<void> | void,
    onFail?: (error: Error) => Promise<void> | void
  ): Promise<void> {
    await this.ready;

    this.logDebugMessageInDebugMode(`(${this.setItem.name}): Set item for key '${key}'`);

    const { encoding } = this.options;

    try {
      await FileSystem.writeAsStringAsync(this.pathForKey(key), value, {
        encoding,
      });

      if (onSuccess) {
        await onSuccess();
      }

      return Promise.resolve();
    } catch (error) {
      return this.handleStorageError(`(${this.setItem.name}): Error setting item for key '${key}'`, error, onFail);
    }
  }

  /**
   * Removes an item from the storage.
   *
   * @param key - The key of the item to remove.
   * @param onSuccess - Optional callback function to be called when the item is successfully removed.
   * @param onFail - Optional callback function to be called when an error occurs while removing the item.
   * @returns A promise that resolves when the item is removed successfully, or rejects with an error if removal fails.
   */
  public async removeItem(
    key: string,
    onSuccess?: () => Promise<void> | void,
    onFail?: (error: Error) => Promise<void> | void
  ): Promise<void> {
    await this.ready;

    this.logDebugMessageInDebugMode(`(${this.removeItem.name}): Remove item for key '${key}'`);

    try {
      await FileSystem.deleteAsync(this.pathForKey(key), { idempotent: true });

      if (onSuccess) {
        await onSuccess();
      }

      return Promise.resolve();
    } catch (error) {
      return this.handleStorageError(`(${this.removeItem.name}): Error removing item for key '${key}'`, error, onFail);
    }
  }

  /**
   * Clears the storage by deleting the storage path and recreating it.
   *
   * @param onSuccess - Optional callback function to be called after the storage is cleared successfully.
   * @param onFail - Optional callback function to be called if an error occurs while clearing the storage.
   * @returns A promise that resolves when the storage is cleared successfully, or rejects with an error if clearing the storage fails.
   */
  public async clear(
    onSuccess?: () => Promise<void> | void,
    onFail?: (error: Error) => Promise<void> | void
  ): Promise<void> {
    await this.ready;

    this.logDebugMessageInDebugMode(`(${this.clear.name}): Clearing storage...`);

    try {
      await FileSystem.deleteAsync(this.options.storagePath, {
        idempotent: true,
      });

      await FileSystem.makeDirectoryAsync(this.options.storagePath, {
        intermediates: true,
      });

      this.logDebugMessageInDebugMode(`(${this.clear.name}): Storage cleared successfully!`);

      if (onSuccess) {
        await onSuccess();
      }

      return Promise.resolve();
    } catch (error) {
      return this.handleStorageError(`(${this.clear.name}): Error clearing storage`, error, onFail);
    }
  }

  /**
   * Checks if there are any stored items in the storage directory.
   *
   * @returns A promise that resolves to a boolean indicating whether there are stored items or not.
   */
  public hasStoredItems(): Promise<boolean> {
    this.logDebugMessageInDebugMode(`(${this.hasStoredItems.name}): Checking if there are stored items...`);

    const hasStoredItems = FileSystem.readDirectoryAsync(this.options.storagePath)
    .then((fileNames) => fileNames.length > 0)
    .catch(() => false);

    this.logDebugMessageInDebugMode(`(${this.hasStoredItems.name}): Has stored items: '${hasStoredItems}'`);

    return hasStoredItems;
  }

  /**
   * Initializes the storage by creating a new directory if it doesn't exist or using an existing directory.
   * @returns A promise that resolves when the initialization is complete.
   */
  private async initialize(): Promise<void> {
    if (this.options.beforeInit) {
      await this.options.beforeInit();
    }

    try {
      const info = await FileSystem.getInfoAsync(this.options.storagePath);

      if (!info.exists) {
        this.logDebugMessageInDebugMode(
          `(${this.initialize.name}): Creating new directory for storage with path: '${this.options.storagePath}'`
        );

        return FileSystem.makeDirectoryAsync(this.options.storagePath, {
          intermediates: true,
        });
      }

      this.logDebugMessageInDebugMode(`(${this.initialize.name}): Using existing directory for storage with path: '${this.options.storagePath}'`);

      if (this.options.afterInit) {
        await this.options.afterInit();
      }

      return Promise.resolve();
    } catch (error) {
      return this.handleStorageError(`(${this.initialize.name}): Error initializing storage`, error);
    }
  }

  /**
   * Returns the file path for a given key.
   * Replaces any characters that are not alphanumeric, period, hyphen, or underscore with a hyphen.
   *
   * @param key - The key used to generate the file path.
   * @returns The file path for the given key.
   */
  private pathForKey(key: string): string {
    const fileName = key.replace(/[^a-z0-9.\-_]/gi, "-");

    return `${this.options.storagePath}${fileName}`;
  }

  /**
   * Logs a debug message with optional parameters.
   *
   * @param message - The debug message to log.
   * @param optionalParams - Optional parameters to include in the log message.
   */
  private logDebugMessage(message: string, ...optionalParams: unknown[]): void {
    this.logger.debug(
      `${ExpoFileSystemStorage.name}:`,
      message,
      ...optionalParams
    );
  }

  /**
   * Logs a debug message if debug mode is enabled.
   *
   * @param message - The debug message to log.
   * @param optionalParams - Optional parameters to include in the log message.
   */
  private logDebugMessageInDebugMode(
    message: string,
    ...optionalParams: unknown[]
  ): void {
    if (this.isDebugModeEnabled) {
      this.logDebugMessage(message, ...optionalParams);
    }
  }

  /**
   * Logs an error message with optional parameters.
   *
   * @param message - The error message to log.
   * @param optionalParams - Optional parameters to include in the log.
   */
  private logErrorMessage(message: string, ...optionalParams: unknown[]): void {
    this.logger.error(
      `${ExpoFileSystemStorage.name}:`,
      message,
      ...optionalParams
    );
  }

  /**
   * Handles storage errors and logs the error message.
   * If provided, calls the `onFail` function with a new Error object containing the error message.
   * Throws the original error.
   *
   * @param errorMessage - The error message.
   * @param error - The original error object.
   * @param onFail - Optional function to be called when handling the error.
   * @returns A promise that never resolves, as it always throws the original error.
   */
  private async handleStorageError(
    errorMessage: string,
    error: unknown,
    onFail?: (error: Error) => Promise<void> | void
  ): Promise<never> {
    const detailedErrorMessage = `${errorMessage}: ${(error as Error).message}`;

    this.logErrorMessage(detailedErrorMessage, error);

    if (onFail) {
      await onFail(new Error(detailedErrorMessage));
    }

    throw error;
  }
}

/**
 * Creates an instance of ExpoFileSystemStorage.
 *
 * @param options - The storage options.
 * @returns An instance of ExpoFileSystemStorage.
 */
export function createExpoFileSystemStorage(
  options?: StorageOptions
): ExpoFileSystemStorage {
  return new ExpoFileSystemStorage(options);
}
