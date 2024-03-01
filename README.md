# redux-persist-expo-file-system-storage

A highly extensible and configurable storage engine for [Redux Persist](https://github.com/rt2zz/redux-persist) using [Expo FileSystem](https://docs.expo.dev/versions/latest/sdk/filesystem/) for persistence in React Native applications. 

## Table of Contents

- [Why Choose redux-persist-expo-file-system-storage?](#why-choose-redux-persist-expo-file-system-storage)
- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
- [Options](#options)
- [API](#api)
- [Contributing](#contributing)
- [License](#license)

## Why Choose redux-persist-expo-file-system-storage?

This package serves as an alternative to the default AsyncStorage, specifically addressing storage size limitations in Android environments ([#199](https://github.com/rt2zz/redux-persist/issues/199)). It offers a versatile and efficient solution for managing and persisting state in your React Native applications.

## Features

- **Written in TypeScript**: Complete TypeScript support for improved type safety and development experience.

- **Extensibility**: Designed to be easily extended with options for customizing storage behavior through various callbacks.

- **Configurability**: Fine-tune the storage engine with a variety of options, making it adaptable to different project requirements.

- **Debug Mode**: Enable the debug mode for detailed logs during development, helping you troubleshoot and understand the library's actions.

- **Custom Logging**: Utilize your own logger functions for debug and error messages, allowing seamless integration with your application's logging strategy.

## Installation

Choose your preferred package manager and add `redux-persist-expo-file-system-storage` to your React Native project:

```bash
npm install redux-persist-expo-file-system-storage
yarn add redux-persist-expo-file-system-storage
pnpm add redux-persist-expo-file-system-storage
bun add redux-persist-expo-file-system-storage
```

After installation, you're ready to integrate the storage engine into your Redux setup for seamless state persistence.

## Usage

Here's a simple example demonstrating how to integrate `redux-persist-expo-file-system-storage` into your application:

```typescript
import * as FileSystem from "expo-file-system";
import { createExpoFileSystemStorage, type StorageOptions } from 'redux-persist-expo-file-system-storage';
import type { PersistConfig } from "redux-persist";
import { rootReducer, type RootState } from './store.config';

// Either without custom options (Default values can be found in the Options section)
export const expoFileSystemStorage = createExpoFileSystemStorage();

// or with custom options
export const expoFileSystemStorage = createExpoFileSystemStorage({
    storagePath: `${FileSystem.documentDirectory}customPersistStorageData/`,
    encoding: FileSystem.EncodingType.BASE64,
    debug: true,
    logger: {
        debug: customDebugFunction,
        error: customErrorFunction,
    },
    beforeInit: customBeforeInitFunction,
    afterInit: customAfterInitFunction,
}),

// Configuration for Redux Persist
const persistConfig: PersistConfig<RootState> = {
  key: 'root',
  // Use the ExpoFileSystemStorage as the storage engine
  storage: expoFileSystemStorage,
  // ... Add other persist config options if needed
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
    reducer: persistedReducer,
    // ... Add other config options if needed
});
```

## Options

The storage engine provides various options for customization. Fine-tune your storage engine with the following configuration options:

| Option         | Type                                | Default Value                                          | Description                                                                                                                                                                                                  | 
| -------------- | ----------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | 
| `storagePath`  | `string`                            | `FileSystem.documentDirectory + 'persistStorageData/'` | The directory path for storing persisted data. It is recommended to provide a custom path for better organization and to avoid potential conflicts with other files in the default |directory.               |
| `encoding`     | `FileSystem.EncodingType`           | `FileSystem.EncodingType.UTF8`                         | The encoding type for reading and writing files. Use `FileSystem.EncodingType.BASE64` for binary data or if your application deals with non-text data.                                                       |
| `debug`        | `boolean`                           | `false`                                                | Enable/disable debug mode. When enabled, detailed logs will be printed during development, aiding in debugging and understanding the library's actions.                                                      |
| `logger`       | `{ debug: Logger, error: Logger }`  | `{ debug: console.log, error: console.error }`         | Custom logger object with `debug` and `error` methods. You can provide your own logger functions to tailor the logging behavior according to your application's needs.                                       |
| `beforeInit`   | `() => Promise<void> \| void`       | `undefined`                                            | Callback function to be executed before initializing the storage. Use this for performing custom actions or setup before the storage engine is ready.                                                        |
| `afterInit`    | `() => Promise<void> \| void`       | `undefined`                                            | Callback function to be executed after initializing the storage. Use this for performing custom actions or setup after the storage engine is ready.                                                          |

## API

This example demonstrates the direct usage of `getItem` and `setItem` methods from `ExpoFileSystemStorage`. For more details and available methods, please refer to the `ExpoFileSystemStorage` class.

```typescript
import { createExpoFileSystemStorage } from 'redux-persist-expo-file-system-storage';

// Create an instance of ExpoFileSystemStorage
const expoFileSystemStorage = createExpoFileSystemStorage();

// Example usage of getItem
async function exampleGetItem() {
  try {
    const key = 'exampleKey';
    const value = await expoFileSystemStorage.getItem(key);
    console.log(`Item with key '${key}' has value:`, value);
  } catch (error) {
    console.error('Error getting item:', error);
  }
}

// Example usage of setItem
async function exampleSetItem() {
  try {
    const key = 'exampleKey';
    const value = 'exampleValue';
    await expoFileSystemStorage.setItem(key, value);
    console.log(`Item with key '${key}' set successfully!`);
  } catch (error) {
    console.error('Error setting item:', error);
  }
}

exampleGetItem();
exampleSetItem();
```

## Contributing

Contributions are welcome! If you encounter issues or have suggestions, please feel free to open an [issue](https://github.com/dennzimm/redux-persist-expo-file-system-storage/issues) or submit a [pull request](https://github.com/dennzimm/redux-persist-expo-file-system-storage/pulls).

This package uses [Changesets](https://github.com/changesets/changesets/tree/main) for version management. For further information on contributing and working with Changesets, refer to the Changesets Documentation: [Using Changesets](https://github.com/changesets/changesets/blob/main/docs/intro-to-using-changesets.md).

## License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.