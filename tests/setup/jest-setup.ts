const mockAsyncStorage = {
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => {}),
  removeItem: jest.fn(async () => {}),
  clear: jest.fn(async () => {}),
  getAllKeys: jest.fn(async () => []),
  multiGet: jest.fn(async () => []),
  multiSet: jest.fn(async () => {}),
  multiRemove: jest.fn(async () => {}),
};

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);
