import { vi } from 'vitest';

// Default Node-safe stub for expo-secure-store in Vitest when a test file does not provide its own vi.mock.
vi.mock('expo-secure-store', () => ({
  isAvailableAsync: async () => false,
  getItemAsync: async () => null,
  setItemAsync: async () => undefined,
  deleteItemAsync: async () => undefined,
}));
