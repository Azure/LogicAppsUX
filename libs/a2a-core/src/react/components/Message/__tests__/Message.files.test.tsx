import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Message } from '../Message';
import type { Message as MessageType } from '../../../types';

describe('Message - File and Image Rendering', () => {
  const baseMessage: MessageType = {
    id: '1',
    content: 'Message with files',
    sender: 'assistant',
    timestamp: new Date('2024-01-01T14:30:00'),
    status: 'sent',
  };

  describe('Image Rendering', () => {
    it('renders a single image with base64 data', () => {
      const messageWithImage: MessageType = {
        ...baseMessage,
        files: [
          {
            name: 'test-image.png',
            mimeType: 'image/png',
            data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
          },
        ],
      };

      const { container } = render(<Message message={messageWithImage} />);

      // Check that image is rendered
      const img = container.querySelector('img');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute(
        'src',
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
      );
      expect(img).toHaveAttribute('alt', 'test-image.png');
    });

    it('displays image file name above the image', () => {
      const messageWithImage: MessageType = {
        ...baseMessage,
        files: [
          {
            name: 'screenshot.png',
            mimeType: 'image/png',
            data: 'base64data',
          },
        ],
      };

      render(<Message message={messageWithImage} />);

      expect(screen.getByText('screenshot.png')).toBeInTheDocument();
    });

    it('renders multiple images', () => {
      const messageWithImages: MessageType = {
        ...baseMessage,
        files: [
          {
            name: 'image1.png',
            mimeType: 'image/png',
            data: 'base64data1',
          },
          {
            name: 'image2.jpg',
            mimeType: 'image/jpeg',
            data: 'base64data2',
          },
        ],
      };

      const { container } = render(<Message message={messageWithImages} />);

      const images = container.querySelectorAll('img');
      expect(images).toHaveLength(2);
      expect(screen.getByText('image1.png')).toBeInTheDocument();
      expect(screen.getByText('image2.jpg')).toBeInTheDocument();
    });

    it('renders image without file name if name is not provided', () => {
      const messageWithImage: MessageType = {
        ...baseMessage,
        files: [
          {
            name: '',
            mimeType: 'image/png',
            data: 'base64data',
          },
        ],
      };

      const { container } = render(<Message message={messageWithImage} />);

      const img = container.querySelector('img');
      expect(img).toBeInTheDocument();
      // File name should not be displayed
      const fileNameElements = container.querySelectorAll('.imageFileName');
      expect(fileNameElements).toHaveLength(0);
    });

    it('supports different image mime types', () => {
      const imageTypes = [
        { mimeType: 'image/png', name: 'test.png' },
        { mimeType: 'image/jpeg', name: 'test.jpg' },
        { mimeType: 'image/gif', name: 'test.gif' },
        { mimeType: 'image/webp', name: 'test.webp' },
      ];

      imageTypes.forEach(({ mimeType, name }) => {
        const messageWithImage: MessageType = {
          ...baseMessage,
          files: [
            {
              name,
              mimeType,
              data: 'base64data',
            },
          ],
        };

        const { container } = render(<Message message={messageWithImage} />);
        const img = container.querySelector('img');
        expect(img).toBeInTheDocument();
        expect(img?.getAttribute('src')).toContain(mimeType);
      });
    });
  });

  describe('Non-Image File Rendering', () => {
    it('renders non-image files with document icon', () => {
      const messageWithFile: MessageType = {
        ...baseMessage,
        files: [
          {
            name: 'document.pdf',
            mimeType: 'application/pdf',
            data: 'base64data',
          },
        ],
      };

      const { container } = render(<Message message={messageWithFile} />);

      // Should not render as image
      const img = container.querySelector('img');
      expect(img).not.toBeInTheDocument();

      // Should show file name
      expect(screen.getByText('document.pdf')).toBeInTheDocument();
    });

    it('handles mixed image and non-image files', () => {
      const messageWithMixedFiles: MessageType = {
        ...baseMessage,
        files: [
          {
            name: 'image.png',
            mimeType: 'image/png',
            data: 'base64imagedata',
          },
          {
            name: 'document.pdf',
            mimeType: 'application/pdf',
            data: 'base64pdfdata',
          },
        ],
      };

      const { container } = render(<Message message={messageWithMixedFiles} />);

      // Should render one image
      const images = container.querySelectorAll('img');
      expect(images).toHaveLength(1);

      // Should show both file names
      expect(screen.getByText('image.png')).toBeInTheDocument();
      expect(screen.getByText('document.pdf')).toBeInTheDocument();
    });
  });

  describe('Message Layout with Files', () => {
    it('renders image within the message', () => {
      const messageWithImage: MessageType = {
        ...baseMessage,
        files: [
          {
            name: 'test.png',
            mimeType: 'image/png',
            data: 'base64data',
          },
        ],
      };

      const { container } = render(<Message message={messageWithImage} />);

      // Image should be present in the rendered component
      const img = container.querySelector('img');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', 'data:image/png;base64,base64data');
    });

    it('renders message content along with images', () => {
      const messageWithImageAndText: MessageType = {
        ...baseMessage,
        content: 'Here is the image you requested:',
        files: [
          {
            name: 'result.png',
            mimeType: 'image/png',
            data: 'base64data',
          },
        ],
      };

      const { container } = render(<Message message={messageWithImageAndText} />);

      // Both text and image should be present
      expect(screen.getByText(/Here is the image you requested/)).toBeInTheDocument();
      const img = container.querySelector('img');
      expect(img).toBeInTheDocument();
    });
  });

  describe('Security and Validation', () => {
    it('rejects files with invalid/unsafe mime types', () => {
      const messageWithInvalidMime: MessageType = {
        ...baseMessage,
        files: [
          {
            name: 'suspicious.exe',
            mimeType: 'application/x-executable',
            data: 'base64data',
          },
        ],
      };

      const { container } = render(<Message message={messageWithInvalidMime} />);

      // Should not render as image
      const img = container.querySelector('img');
      expect(img).not.toBeInTheDocument();

      // Should show as non-image file
      expect(screen.getByText('suspicious.exe')).toBeInTheDocument();
    });

    it('provides fallback alt text for images without names', () => {
      const messageWithUnnamedImage: MessageType = {
        ...baseMessage,
        files: [
          {
            name: '',
            mimeType: 'image/png',
            data: 'base64data',
          },
        ],
      };

      const { container } = render(<Message message={messageWithUnnamedImage} />);

      const img = container.querySelector('img');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('alt', 'Attached image');
    });

    it('validates mime type case-insensitively', () => {
      const messageWithUppercaseMime: MessageType = {
        ...baseMessage,
        files: [
          {
            name: 'test.PNG',
            mimeType: 'IMAGE/PNG',
            data: 'base64data',
          },
        ],
      };

      const { container } = render(<Message message={messageWithUppercaseMime} />);

      const img = container.querySelector('img');
      expect(img).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty files array', () => {
      const messageWithEmptyFiles: MessageType = {
        ...baseMessage,
        files: [],
      };

      const { container } = render(<Message message={messageWithEmptyFiles} />);

      const img = container.querySelector('img');
      expect(img).not.toBeInTheDocument();
    });

    it('handles message without files property', () => {
      const messageWithoutFiles: MessageType = {
        ...baseMessage,
      };

      const { container } = render(<Message message={messageWithoutFiles} />);

      const img = container.querySelector('img');
      expect(img).not.toBeInTheDocument();
    });

    it('handles files with empty data', () => {
      const messageWithEmptyData: MessageType = {
        ...baseMessage,
        files: [
          {
            name: 'empty.png',
            mimeType: 'image/png',
            data: '',
          },
        ],
      };

      const { container } = render(<Message message={messageWithEmptyData} />);

      // Should still render the image element (even with empty data)
      const img = container.querySelector('img');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', 'data:image/png;base64,');
    });

    it('handles files with special characters in name', () => {
      const messageWithSpecialChars: MessageType = {
        ...baseMessage,
        files: [
          {
            name: 'test & file (1).png',
            mimeType: 'image/png',
            data: 'base64data',
          },
        ],
      };

      render(<Message message={messageWithSpecialChars} />);

      expect(screen.getByText('test & file (1).png')).toBeInTheDocument();
    });
  });
});
