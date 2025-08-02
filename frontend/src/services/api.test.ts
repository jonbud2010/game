import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiService } from './api';

// Mock fetch for testing
global.fetch = vi.fn();
const mockFetch = fetch as ReturnType<typeof vi.fn>;

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
} as any;
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('ApiService Player Methods', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue('mock-token');
  });

  describe('getPlayers', () => {
    it('should fetch players successfully', async () => {
      const mockPlayers = [
        {
          id: '1',
          name: 'Test Player',
          points: 85,
          position: 'ST',
          color: 'RED',
          marketPrice: 100,
          theme: 'Test Theme',
          percentage: 0.05,
          imageUrl: '/test-image.jpg'
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockPlayers })
      } as Response);

      const result = await apiService.getPlayers();

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/players',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock-token'
          })
        })
      );
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockPlayers);
    });

    it('should handle fetch errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ error: 'Server error' })
      } as Response);

      await expect(apiService.getPlayers()).rejects.toThrow('Server error');
    });
  });

  describe('createPlayer', () => {
    it('should create player with FormData', async () => {
      const mockPlayer = {
        id: '1',
        name: 'New Player',
        points: 75,
        position: 'ST',
        color: 'BLUE',
        marketPrice: 150,
        theme: 'New Theme',
        percentage: 0.03,
        imageUrl: '/new-image.jpg'
      };

      const formData = new FormData();
      formData.append('name', 'New Player');
      formData.append('points', '75');

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockPlayer })
      } as Response);

      const result = await apiService.createPlayer(formData);

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/players',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-token'
          }),
          body: formData
        })
      );
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockPlayer);
    });
  });

  describe('deletePlayer', () => {
    it('should delete player successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      } as Response);

      const result = await apiService.deletePlayer('test-id');

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/players/test-id',
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-token'
          })
        })
      );
      expect(result.success).toBe(true);
    });
  });
});

describe('FormData Integration Test', () => {
  it('should properly handle FormData creation', () => {
    const formData = new FormData();
    formData.append('name', 'Test Player');
    formData.append('points', '85');
    formData.append('position', 'ST');
    formData.append('color', 'RED');
    formData.append('marketPrice', '100');
    formData.append('theme', 'Test Theme');
    formData.append('percentage', '0.05');

    // Test that FormData contains expected values
    expect(formData.get('name')).toBe('Test Player');
    expect(formData.get('points')).toBe('85');
    expect(formData.get('position')).toBe('ST');
    expect(formData.get('color')).toBe('RED');
    expect(formData.get('marketPrice')).toBe('100');
    expect(formData.get('theme')).toBe('Test Theme');
    expect(formData.get('percentage')).toBe('0.05');
  });

  it('should handle file uploads in FormData', () => {
    const formData = new FormData();
    const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    
    formData.append('image', mockFile);
    formData.append('name', 'Player with Image');

    expect(formData.get('image')).toBe(mockFile);
    expect(formData.get('name')).toBe('Player with Image');
  });
});