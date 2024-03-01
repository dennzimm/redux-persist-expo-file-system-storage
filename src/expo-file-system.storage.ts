import * as FileSystem from "expo-file-system";
import type { RequiredDeep, SetOptional } from "type-fest";
import type { StorageEngine } from "./types/storage-engine.types";
import type { Logger } from "./types/storage-logger.types";
import type { StorageOptions } from "./types/storage-options.types";
import { deepParseJson } from "./utils/deep-parse-json.util";

/**
 * Represents a storage engine that uses Expo FileSystem for persistence.
 */
class ExpoFileSystemStorage implements StorageEngine {
  /**
   * The name of the ExpoFileSystemStorage class.
   */
  public static name = "ExpoFileSystemStorage";

  /**
   * The options for the ExpoFileSystemStorage class.
   */
  private options: SetOptional<
    RequiredDeep<StorageOptions>,
    "beforeInit" | "afterInit"
  >;

  /**
   * Set to keep track of already read keys during the current session.
   */
  private readonly readKeys: Set<string> = new Set();

  /**
   * Indicates whether the storage has been initialized.
   */
  private isInitialized: boolean = false;

  /**
   * A promise that represents the initialization process of the storage.
   */
  private initializationPromise: Promise<void> | null = null;

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

    this.initializationPromise = this.initialize();
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
    await this.waitForInitialization();

    const isKeyReadForTheFirstTime = !this.readKeys.has(key);

    this.readKeys.add(key);

    const { encoding } = this.options;

    try {
      const content = await FileSystem.readAsStringAsync(this.pathForKey(key), {
        encoding,
      });

      this.logDebugMessageInDebugMode(
        `(${this.getItem.name}): Get item for key '${key}'`,
        deepParseJson(content)
      );

      if (onSuccess) {
        await onSuccess(content);
      }

      return content;
    } catch (error) {
      const isItemExistent = await this.itemExists(key);

      if (isKeyReadForTheFirstTime && !isItemExistent) {
        this.logDebugMessageInDebugMode(
          `(${this.getItem.name}): Item for key '${key}' was read for the first time, but it doesn't exist in the storage. Maybe it was not set yet.`
        );

        return "";
      }

      const errorMessage = isKeyReadForTheFirstTime
        ? `(${this.getItem.name}): Error getting item for key '${key}'. The item was read for the first time and exists in the storage, but an error occurred while reading it.`
        : `(${this.getItem.name}): Error getting item for key '${key}'`;

      return this.handleStorageError(errorMessage, error, onFail);
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
    await this.waitForInitialization();

    try {
      const fileNames = await FileSystem.readDirectoryAsync(
        this.options.storagePath
      );

      const encodedFileNames = fileNames.map((fileName) =>
        decodeURIComponent(fileName)
      );

      this.logDebugMessageInDebugMode(
        `(${this.getAllKeys.name}): Getting all keys`,
        encodedFileNames
      );

      if (onSuccess) {
        await onSuccess(encodedFileNames);
      }

      return encodedFileNames;
    } catch (error) {
      return this.handleStorageError(
        `(${this.getAllKeys.name}): Error getting all keys`,
        error,
        onFail
      );
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
    await this.waitForInitialization();

    const { encoding } = this.options;

    try {
      await FileSystem.writeAsStringAsync(this.pathForKey(key), value, {
        encoding,
      });

      this.logDebugMessageInDebugMode(
        `(${this.setItem.name}): Set item for key '${key}'`,
        deepParseJson(value)
      );

      if (onSuccess) {
        await onSuccess();
      }

      return Promise.resolve();
    } catch (error) {
      return this.handleStorageError(
        `(${this.setItem.name}): Error setting item for key '${key}'`,
        error,
        onFail
      );
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
    await this.waitForInitialization();

    try {
      await FileSystem.deleteAsync(this.pathForKey(key), { idempotent: true });

      this.logDebugMessageInDebugMode(
        `(${this.removeItem.name}): Remove item for key '${key}'`
      );

      if (onSuccess) {
        await onSuccess();
      }

      return Promise.resolve();
    } catch (error) {
      return this.handleStorageError(
        `(${this.removeItem.name}): Error removing item for key '${key}'`,
        error,
        onFail
      );
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
    await this.waitForInitialization();

    this.logDebugMessageInDebugMode(
      `(${this.clear.name}): Clearing storage...`
    );

    this.readKeys.clear();

    try {
      await FileSystem.deleteAsync(this.options.storagePath, {
        idempotent: true,
      });

      await FileSystem.makeDirectoryAsync(this.options.storagePath, {
        intermediates: true,
      });

      this.logDebugMessageInDebugMode(
        `(${this.clear.name}): Storage cleared successfully!`
      );

      if (onSuccess) {
        await onSuccess();
      }

      return Promise.resolve();
    } catch (error) {
      return this.handleStorageError(
        `(${this.clear.name}): Error clearing storage`,
        error,
        onFail
      );
    }
  }

  /**
   * Checks if an item with the specified key exists in the storage.
   *
   * @param key - The key of the item to check.
   * @returns A promise that resolves to a boolean indicating whether the item exists or not.
   */
  public async itemExists(key: string): Promise<boolean> {
    await this.waitForInitialization();

    try {
      const { exists } = await FileSystem.getInfoAsync(this.pathForKey(key));

      return exists;
    } catch (error) {
      return false;
    }
  }

  /**
   * Checks if there are any stored items in the storage directory.
   *
   * @returns A promise that resolves to a boolean indicating whether there are stored items or not.
   */
  public async hasStoredItems(): Promise<boolean> {
    await this.waitForInitialization();

    let hasStoredItems = false;

    try {
      const fileNames = await FileSystem.readDirectoryAsync(
        this.options.storagePath
      );

      hasStoredItems = fileNames.length > 0;
    } catch (error) {
      this.handleStorageError(
        `(${this.hasStoredItems.name}): Error checking for stored items`,
        error
      );
    } finally {
      this.logDebugMessageInDebugMode(
        `(${this.hasStoredItems.name}): Has stored items: '${hasStoredItems}'`
      );

      return hasStoredItems;
    }
  }

  /**
   * Logs all the stored items.
   *
   * @returns A promise that resolves when the logging is complete.
   */
  public async logStoredItems(): Promise<void> {
    await this.waitForInitialization();

    this.logDebugMessageInDebugMode(
      `(${this.logStoredItems.name}): Logging stored items...`
    );

    if (!(await this.hasStoredItems())) {
      this.logDebugMessage(
        `(${this.logStoredItems.name}): No stored items found`
      );

      return;
    }

    const keys = await this.getAllKeys();

    await Promise.all(
      keys.map(async (key) => {
        const { encoding } = this.options;

        try {
          const content = await FileSystem.readAsStringAsync(
            this.pathForKey(key),
            {
              encoding,
            }
          );

          this.logDebugMessage(
            `(${this.logStoredItems.name}): Key: '${key}', Content:`,
            deepParseJson(content)
          );
        } catch (error) {
          return this.handleStorageError(
            `(${this.logStoredItems.name}): Error logging stored items`,
            error
          );
        }
      })
    );

    this.logDebugMessageInDebugMode(
      `(${this.logStoredItems.name}): Stored items logged successfully!`
    );
  }

  /**
   * Initializes the storage by creating a new directory if it doesn't exist or using an existing directory.
   *
   * @returns A promise that resolves when the initialization is complete.
   */
  private async initialize(): Promise<void> {
    this.logDebugMessageInDebugMode(
      `(${this.initialize.name}): Initializing storage...`
    );

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

      this.logDebugMessageInDebugMode(
        `(${this.initialize.name}): Using existing directory for storage with path: '${this.options.storagePath}'`
      );

      if (this.options.afterInit) {
        await this.options.afterInit();
      }

      this.isInitialized = true;

      this.logDebugMessageInDebugMode(
        `(${this.initialize.name}): Storage initialized successfully!`
      );
    } catch (error) {
      return this.handleStorageError(
        `(${this.initialize.name}): Error initializing storage`,
        error
      );
    }
  }

  /**
   * Waits for the initialization of the storage.
   * If the storage is already initialized, it returns immediately.
   * If the storage is not yet initialized, it waits for the initialization to complete before returning.
   *
   * @returns A Promise that resolves when the storage is initialized.
   * @throws An error if the initialization has failed.
   */
  private async waitForInitialization(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    if (!this.initializationPromise) {
      throw new Error(
        `(${this.waitForInitialization.name}): The initialization has failed (INITIALIZATION_PROMISE_NOT_FOUND)`
      );
    }

    await this.initializationPromise;
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
      `\u001b[36m${ExpoFileSystemStorage.name}: ${message}\u001b[0m`,
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
      this.logDebugMessage(`[DEBUG] ${message}`, ...optionalParams);
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
      `\u001b[31m${ExpoFileSystemStorage.name}: ${message}\u001b[0m`,
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
