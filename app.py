from flask import Flask, request, send_file, jsonify
from flask_cors import CORS
import fitz  # PyMuPDF
import io

app = Flask(__name__)
CORS(app)

# ============================
# PDF COMPRESSION ENGINE
# ============================

def compress_pdf_iterative(pdf_bytes, target_bytes, max_iterations=15):
    """
    Iteratively compress PDF to target size.
    
    Args:
        pdf_bytes: Original PDF as bytes
        target_bytes: Target file size in bytes
        max_iterations: Maximum compression attempts
    
    Returns:
        dict with compressed PDF blob and metadata
    """
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    original_size = len(pdf_bytes)
    
    best_result = {
        'blob': pdf_bytes,
        'size': original_size,
        'iterations': 0
    }
    
    # Compression parameters
    image_quality = 85  # Start with decent quality
    image_shrink = 1     # Image downscaling factor
    
    for iteration in range(max_iterations):
        try:
            # Create compression options
            options = {
                'deflate': True,
                'image_quality': image_quality,
            }
            
            # Re-open document for fresh compression
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
            
            # Remove metadata
            metadata = doc.metadata
            if metadata:
                doc.set_metadata({
                    'title': '',
                    'author': '',
                    'subject': '',
                    'keywords': '',
                    'creator': '',
                    'producer': '',
                })
            
            # Compress images in document
            if image_shrink > 1 or image_quality < 95:
                compress_images_in_pdf(doc, image_quality, image_shrink)
            
            # Export compressed PDF
            output = io.BytesIO()
            doc.save(output, deflate=True, garbage=4, incremental=False)
            doc.close()
            
            compressed_bytes = output.getvalue()
            compressed_size = len(compressed_bytes)
            
            # Update best result
            best_result['blob'] = compressed_bytes
            best_result['size'] = compressed_size
            best_result['iterations'] = iteration + 1
            
            # Calculate ratio
            ratio = compressed_size / target_bytes
            
            # Check if within acceptable range (±5%)
            if 0.95 <= ratio <= 1.05:
                return {
                    'blob': compressed_bytes,
                    'size': compressed_size,
                    'original_size': original_size,
                    'iterations': iteration + 1,
                    'message': 'Target size achieved',
                    'success': True
                }
            
            # If too large, be more aggressive
            if ratio > 1.15:
                image_quality = max(30, image_quality - 15)
                image_shrink = min(3, image_shrink + 0.5)
            elif ratio > 1.05:
                image_quality = max(30, image_quality - 5)
                image_shrink = min(2.5, image_shrink + 0.25)
            else:
                # Already close to target, fine-tune
                image_quality = min(95, image_quality + 2)
            
        except Exception as e:
            print(f"Iteration {iteration + 1} error: {e}")
            continue
    
    # Return best result achieved
    return {
        'blob': best_result['blob'],
        'size': best_result['size'],
        'original_size': original_size,
        'iterations': best_result['iterations'],
        'message': 'Best possible compression achieved',
        'success': best_result['size'] <= target_bytes * 1.1  # Within 10%
    }


def compress_images_in_pdf(doc, quality, shrink_factor):
    """
    Compress images within PDF document.
    """
    for page_num in range(len(doc)):
        page = doc[page_num]
        
        # Get image blocks
        images = page.get_images()
        
        for img_index in images:
            try:
                xref = img_index[0]
                pix = fitz.Pixmap(doc, xref)
                
                # Downscale image if needed
                if shrink_factor > 1:
                    new_width = max(72, int(pix.width / shrink_factor))
                    new_height = max(72, int(pix.height / shrink_factor))
                    pix = pix.shrink(max(1, int(shrink_factor)))
                
                # Convert RGBA to RGB if possible
                if pix.n - pix.alpha > 3:  # CMYK
                    pix = fitz.Pixmap(fitz.csRGB, pix)
                
                # Compress and replace
                img_data = pix.tobytes(output='jpeg', jpg_quality=quality)
                
                # Replace in document
                doc.replace_image(xref, stream=img_data)
                
            except Exception as e:
                print(f"Image compression error: {e}")
                continue


# ============================
# API ENDPOINT
# ============================

@app.route('/compress-pdf', methods=['POST'])
def compress_pdf():
    """
    Endpoint to compress PDF to target size.
    
    Expected POST body:
    - file: PDF file
    - targetSize: Target size in bytes
    """
    try:
        # Get uploaded file
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided', 'details': 'File field missing'}), 400
        
        file = request.files['file']
        target_size_str = request.form.get('targetSize', '')
        
        if not file or file.filename == '':
            return jsonify({'error': 'Invalid file', 'details': 'Empty file'}), 400
        
        if not target_size_str:
            return jsonify({'error': 'No target size provided', 'details': 'targetSize missing'}), 400
        
        try:
            target_size = int(target_size_str)
        except ValueError:
            return jsonify({'error': 'Invalid target size', 'details': 'targetSize must be integer'}), 400
        
        # Read PDF
        pdf_bytes = file.read()
        
        # Compress
        result = compress_pdf_iterative(pdf_bytes, target_size)
        
        # Return compressed PDF
        response = send_file(
            io.BytesIO(result['blob']),
            mimetype='application/pdf',
            as_attachment=False
        )
        
        # Add metadata headers
        response.headers['X-Original-Size'] = str(result['original_size'])
        response.headers['X-Compressed-Size'] = str(result['size'])
        response.headers['X-Target-Size'] = str(target_size)
        response.headers['X-Iterations'] = str(result['iterations'])
        response.headers['X-Message'] = result['message']
        response.headers['X-Success'] = str(result['success']).lower()
        
        return response
        
    except Exception as e:
        print(f"Compression error: {e}")
        return jsonify({'error': 'Compression failed', 'details': str(e)}), 500


# ============================
# HEALTH CHECK
# ============================

@app.route('/api/health', methods=['GET'])
def health():
    return {'status': 'healthy'}, 200


if __name__ == '__main__':
    app.run(debug=True, port=5000, host='localhost')
