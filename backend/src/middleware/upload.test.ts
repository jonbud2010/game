import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import multer from 'multer';
import {
  processAndSaveImage,
  uploadSingleImage,
  handleUploadError,
  deleteImageFile,
  setupStaticFileServing
} from './upload';

// Mock dependencies
vi.mock('fs/promises');
vi.mock('sharp');
vi.mock('multer', () => {
  const mockMulterSingle = vi.fn();
  const mockMulterInstance = {
    single: mockMulterSingle
  };
  const mockStorage = { _handleFile: vi.fn(), _removeFile: vi.fn() };
  
  // Mock MulterError constructor
  class MockMulterError extends Error {
    code: string;
    field?: string;

    constructor(code: string, field?: string) {
      super(`MulterError: ${code}`);
      this.code = code;
      this.field = field;
      this.name = 'MulterError';
    }
  }

  const mockedMulter = vi.fn().mockReturnValue(mockMulterInstance);
  mockedMulter.memoryStorage = vi.fn().mockReturnValue(mockStorage);
  mockedMulter.MulterError = MockMulterError;
  
  return {
    default: mockedMulter,
    MulterError: MockMulterError
  };
});

const mockedFs = vi.mocked(fs);
const mockedSharp = vi.mocked(sharp);
const mockedMulter = vi.mocked(multer);

// Mock sharp instance
const mockSharpInstance = {
  resize: vi.fn().mockReturnThis(),
  webp: vi.fn().mockReturnThis(),
  toBuffer: vi.fn()
};

describe('Upload Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let mockJson: ReturnType<typeof vi.fn>;
  let mockStatus: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockJson = vi.fn();
    mockStatus = vi.fn().mockReturnValue({ json: mockJson });
    mockNext = vi.fn();
    
    mockRequest = {
      body: {},
      file: undefined
    };
    mockResponse = {
      json: mockJson,
      status: mockStatus
    };

    // Reset all mocks
    vi.clearAllMocks();

    // Setup sharp mock
    mockedSharp.mockReturnValue(mockSharpInstance as any);
    mockSharpInstance.toBuffer.mockResolvedValue(Buffer.from('processed-image-data'));
    
    // Mock file system operations
    mockedFs.writeFile.mockResolvedValue(undefined);
    mockedFs.access.mockResolvedValue(undefined);
    mockedFs.mkdir.mockResolvedValue(undefined);
    mockedFs.unlink.mockResolvedValue(undefined);
  });

  describe('processAndSaveImage', () => {
    const mockBuffer = Buffer.from('test-image-data');
    const originalName = 'test-image.jpg';

    it('should process player image correctly', async () => {
      const result = await processAndSaveImage(mockBuffer, originalName, 'players');

      expect(mockedSharp).toHaveBeenCalledWith(mockBuffer);
      expect(mockSharpInstance.resize).toHaveBeenCalledWith(400, 400, {
        fit: 'cover',
        position: 'center'
      });
      expect(mockSharpInstance.webp).toHaveBeenCalledWith({ quality: 85 });
      expect(mockSharpInstance.toBuffer).toHaveBeenCalled();

      expect(result).toMatch(/^\/uploads\/images\/players\/test-image_\d+\.webp$/);
      expect(mockedFs.writeFile).toHaveBeenCalled();
    });

    it('should process formation image correctly', async () => {
      const result = await processAndSaveImage(mockBuffer, originalName, 'formations');

      expect(mockSharpInstance.resize).toHaveBeenCalledWith(800, null, {
        fit: 'inside',
        withoutEnlargement: true
      });
      expect(mockSharpInstance.webp).toHaveBeenCalledWith({ quality: 90 });

      expect(result).toMatch(/^\/uploads\/images\/formations\/test-image_\d+\.webp$/);
    });

    it('should process pack image correctly', async () => {
      const result = await processAndSaveImage(mockBuffer, originalName, 'packs');

      expect(mockSharpInstance.resize).toHaveBeenCalledWith(300, 300, {
        fit: 'cover',
        position: 'center'
      });
      expect(mockSharpInstance.webp).toHaveBeenCalledWith({ quality: 85 });

      expect(result).toMatch(/^\/uploads\/images\/packs\/test-image_\d+\.webp$/);
    });

    it('should sanitize filename with special characters', async () => {
      const specialName = 'test@image#with$special%chars.jpg';
      const result = await processAndSaveImage(mockBuffer, specialName, 'players');

      expect(result).toMatch(/test_image_with_special_chars_\d+\.webp$/);
    });

    it('should handle sharp processing errors', async () => {
      mockSharpInstance.toBuffer.mockRejectedValue(new Error('Sharp processing failed'));

      await expect(processAndSaveImage(mockBuffer, originalName, 'players'))
        .rejects.toThrow('Failed to process image');
    });

    it('should handle file system write errors', async () => {
      mockedFs.writeFile.mockRejectedValue(new Error('Write failed'));

      await expect(processAndSaveImage(mockBuffer, originalName, 'players'))
        .rejects.toThrow('Failed to process image');
    });
  });

  describe('uploadSingleImage middleware', () => {
    let middleware: any;

    beforeEach(() => {
      // Get the mocked multer instance and setup the single mock
      const mockInstance = mockedMulter();
      const mockSingle = mockInstance.single as vi.MockedFunction<any>;
      mockSingle.mockReturnValue((req: any, res: any, next: any) => next());
      
      // Get the actual middleware function (second element of the array)  
      const middlewareArray = uploadSingleImage('players');
      middleware = middlewareArray[1];
    });

    it('should continue when no file is uploaded', async () => {
      mockRequest.file = undefined;

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRequest.body.imageUrl).toBeUndefined();
    });

    it('should process uploaded file successfully', async () => {
      mockRequest.file = {
        buffer: Buffer.from('test-image-data'),
        originalname: 'test.jpg',
        size: 1024,
        mimetype: 'image/jpeg'
      } as Express.Multer.File;

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRequest.body.imageUrl).toMatch(/^\/uploads\/images\/players\/test_\d+\.webp$/);
    });

    it('should handle image processing errors', async () => {
      mockRequest.file = {
        buffer: Buffer.from('test-image-data'),
        originalname: 'test.jpg',
        size: 1024,
        mimetype: 'image/jpeg'
      } as Express.Multer.File;

      mockSharpInstance.toBuffer.mockRejectedValue(new Error('Processing failed'));

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Image upload failed',
        details: 'Failed to process image'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle unknown errors gracefully', async () => {
      mockRequest.file = {
        buffer: Buffer.from('test-image-data'),
        originalname: 'test.jpg',
        size: 1024,
        mimetype: 'image/jpeg'
      } as Express.Multer.File;

      // Mock processAndSaveImage to throw a non-Error object
      mockedSharp.mockImplementation(() => {
        throw 'String error';
      });

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Image upload failed',
        details: 'Failed to process image'
      });
    });
  });

  describe('handleUploadError', () => {
    it('should handle file size limit errors', () => {
      const error = new multer.MulterError('LIMIT_FILE_SIZE', 'image');

      handleUploadError(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'File too large',
        message: 'Image must be smaller than 5MB'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle file count limit errors', () => {
      const error = new multer.MulterError('LIMIT_FILE_COUNT', 'image');

      handleUploadError(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Too many files',
        message: 'Only one image can be uploaded at a time'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle invalid file type errors', () => {
      const error = new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.');

      handleUploadError(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Invalid file type',
        message: 'Only JPEG, PNG, and WebP images are allowed'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should pass through other errors', () => {
      const error = new Error('Some other error');

      handleUploadError(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockStatus).not.toHaveBeenCalled();
    });

    it('should handle non-multer errors', () => {
      const error = new Error('Generic error');

      handleUploadError(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('deleteImageFile', () => {
    it('should delete valid image file', async () => {
      const imageUrl = '/uploads/images/players/test.webp';

      await deleteImageFile(imageUrl);

      expect(mockedFs.unlink).toHaveBeenCalledWith(
        path.join(process.cwd(), 'uploads/images/players/test.webp')
      );
    });

    it('should skip deletion for non-upload URLs', async () => {
      const imageUrl = '/external/image.jpg';

      await deleteImageFile(imageUrl);

      expect(mockedFs.unlink).not.toHaveBeenCalled();
    });

    it('should skip deletion for empty URLs', async () => {
      await deleteImageFile('');
      await deleteImageFile(null as any);
      await deleteImageFile(undefined as any);

      expect(mockedFs.unlink).not.toHaveBeenCalled();
    });

    it('should handle file deletion errors gracefully', async () => {
      const imageUrl = '/uploads/images/players/test.webp';
      mockedFs.unlink.mockRejectedValue(new Error('File not found'));

      // Should not throw error
      await expect(deleteImageFile(imageUrl)).resolves.toBeUndefined();

      expect(mockedFs.unlink).toHaveBeenCalled();
    });
  });

  describe('setupStaticFileServing', () => {
    it('should setup express static middleware', () => {
      const mockApp = {
        use: vi.fn()
      };
      const mockStatic = vi.fn();
      
      // Mock express.static
      const originalRequire = require;
      const mockExpress = { static: mockStatic };
      
      vi.mock('express', () => mockExpress);
      require = vi.fn().mockReturnValue(mockExpress);

      setupStaticFileServing(mockApp);

      expect(mockApp.use).toHaveBeenCalledWith('/uploads', expect.any(Function));
      
      // Restore require
      require = originalRequire;
    });
  });

  describe('multer configuration', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should configure multer with correct options', async () => {
      // Re-import to trigger multer configuration
      vi.resetModules();
      await import('./upload');

      expect(mockedMulter).toHaveBeenCalledWith({
        storage: expect.any(Object),
        fileFilter: expect.any(Function),
        limits: {
          fileSize: 5 * 1024 * 1024,
          files: 1
        }
      });
    });

    it('should accept valid file types', () => {
      const mockCallback = vi.fn();
      const validFile: Express.Multer.File = {
        mimetype: 'image/jpeg'
      } as Express.Multer.File;

      // Get the fileFilter function from the multer call
      const multerCall = mockedMulter.mock.calls[0];
      if (multerCall && multerCall[0] && typeof multerCall[0] === 'object' && 'fileFilter' in multerCall[0]) {
        const fileFilter = multerCall[0].fileFilter;
        if (typeof fileFilter === 'function') {
          fileFilter({} as any, validFile, mockCallback);
          expect(mockCallback).toHaveBeenCalledWith(null, true);
        }
      }
    });

    it('should reject invalid file types', () => {
      const mockCallback = vi.fn();
      const invalidFile: Express.Multer.File = {
        mimetype: 'text/plain'
      } as Express.Multer.File;

      // Get the fileFilter function from the multer call
      const multerCall = mockedMulter.mock.calls[0];
      if (multerCall && multerCall[0] && typeof multerCall[0] === 'object' && 'fileFilter' in multerCall[0]) {
        const fileFilter = multerCall[0].fileFilter;
        if (typeof fileFilter === 'function') {
          fileFilter({} as any, invalidFile, mockCallback);
          expect(mockCallback).toHaveBeenCalledWith(
            new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.')
          );
        }
      }
    });
  });
});