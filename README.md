# File Size Reducer

A free, fast, and secure online tool to compress images and PDFs to your exact target file size without losing quality.

## Features

- **Image Compression**: Compress images to your exact target size using Canvas API
- **PDF Compression**: Compress PDFs to your exact target size using PyMuPDF
- **No Account Required**: Free to use without registration
- **Privacy-Focused**: Files are processed locally (images) or server-side (PDFs)
- **Fast Processing**: Iterative compression algorithm for optimal results
- **No File Size Limits**: Handle any file size

## Project Structure

```
.
├── index.html          # Main HTML frontend
├── styles.css          # Styling (mobile-responsive)
├── app.js              # Frontend JavaScript (image/PDF handling)
├── backend.py          # Flask server for PDF compression
├── requirements.txt    # Python dependencies
├── about.html          # About page
└── README.md          # This file
```

## Tech Stack

### Frontend
- HTML5, CSS3, JavaScript
- Canvas API for image compression
- Drag-and-drop file uploads

### Backend
- **Flask** - Web framework
- **PyMuPDF (fitz)** - PDF compression
- **Flask-CORS** - Cross-origin request support

## Installation

### Prerequisites
- Python 3.8+
- pip (Python package manager)

### Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/file-size-reducer.git
cd file-size-reducer
```

2. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Run the Flask server:
```bash
python backend.py
```

5. Open the application:
- Frontend: Open `index.html` in your browser
- Backend API: `http://localhost:5000`

## Usage

### Image Compression
1. Click the image upload box or drag-and-drop an image
2. Enter your target file size (KB or MB)
3. Click "Compress Image"
4. Download the compressed image

### PDF Compression
1. Click the PDF upload box or drag-and-drop a PDF
2. Enter your target file size (KB or MB)
3. Click "Compress PDF"
4. Download the compressed PDF

## API Endpoints

### POST `/compress-pdf`
Compress a PDF file to target size.

**Request:**
- `file`: PDF file (form-data)
- `targetSize`: Target size in bytes

**Response:**
```json
{
  "blob": "binary data",
  "size": 12345,
  "original_size": 50000,
  "iterations": 8,
  "message": "Target size achieved",
  "success": true
}
```

## Compression Algorithms

### Image Compression
- Uses Canvas API to re-encode images with reduced quality
- Iteratively reduces quality until target size is reached
- If quality becomes too low, dimensions are also reduced
- Supports JPEG output for all images

### PDF Compression
- Uses PyMuPDF for robust PDF manipulation
- Iteratively compresses images within the PDF
- Adjusts image quality (30-95) and shrink factors (1-3)
- Removes metadata to reduce file size
- Uses deflate compression for optimal output

## Configuration

### PDF Compression Settings
Edit `backend.py` to adjust:
- `image_quality`: Starting quality (30-95)
- `max_iterations`: Maximum compression attempts
- `deflate`: Compression method

### Image Compression Settings
Edit `app.js` to adjust:
- `quality`: Starting quality (0.1-1.0)
- `maxAttempts`: Maximum compression attempts
- Dimension reduction thresholds

## Limitations

- PDFs with complex layouts may not compress as expected
- Very small target sizes may result in quality loss
- Large files may take longer to process
- Some file formats may not be supported

## Performance Notes

- Image compression is performed client-side (browser)
- PDF compression is performed server-side for better accuracy
- Browser session may be required for PDF compression

## Browser Compatibility

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support (iOS 13+)
- Opera: Full support

## License

MIT License - See LICENSE file for details

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

For issues, questions, or suggestions, please open an issue on GitHub.

---

Made with ❤️ for optimizing your files
