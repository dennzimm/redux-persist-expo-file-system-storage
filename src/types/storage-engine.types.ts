/**
 * StorageEngine interface
 *
 * @description Any conforming storage api implementing the following methods:
 * setItem getItem removeItem. (These methods must support promises)
 *
 * @see: {@link https://github.com/rt2zz/redux-persist?tab=readme-ov-file#storage-engines}
 */
export interface StorageEngine {
  getItem: (key: string) => Promise<string>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
}
