/* ============================
   MODAL MANAGEMENT
   ============================ */

function showModal(title, message) {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalMessage').textContent = message;
    document.getElementById('modal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('modal').style.display = 'none';
}

let compressionState = {
    imageFile: null,
    imageOriginalSize: 0,
    imageCompressedData: null,
    imageCompressedSize: 0,
    
    pdfFile: null,
    pdfOriginalSize: 0,
    pdfCompressedData: null,
    pdfCompressedSize: 0,
    
    currentType: null, // 'image' or 'pdf'
};

/* ============================
   IMAGE UPLOAD HANDLING
   ============================ */

const imageUploadBox = document.getElementById('imageUploadBox');
const imageInput = document.getElementById('imageInput');
const imageFileInfo = document.getElementById('imageFileInfo');
const imageFileName = document.getElementById('imageFileName');
const imageOriginalSize = document.getElementById('imageOriginalSize');

imageUploadBox.addEventListener('click', () => imageInput.click());
imageUploadBox.addEventListener('dragover', (e) => {
    e.preventDefault();
    imageUploadBox.style.borderColor = 'var(--color-primary)';
});
imageUploadBox.addEventListener('dragleave', () => {
    imageUploadBox.style.borderColor = 'var(--color-border)';
});
imageUploadBox.addEventListener('drop', (e) => {
    e.preventDefault();
    imageUploadBox.style.borderColor = 'var(--color-border)';
    if (e.dataTransfer.files.length > 0) {
        imageInput.files = e.dataTransfer.files;
        handleImageUpload();
    }
});

imageInput.addEventListener('change', handleImageUpload);

function handleImageUpload() {
    const file = imageInput.files[0];
    if (!file || !file.type.startsWith('image/')) return;

    compressionState.imageFile = file;
    compressionState.imageOriginalSize = file.size;

    imageFileName.textContent = file.name;
    imageOriginalSize.textContent = (file.size / 1024).toFixed(2);
    imageFileInfo.style.display = 'block';
}

/* ============================
   PDF UPLOAD HANDLING
   ============================ */

const pdfUploadBox = document.getElementById('pdfUploadBox');
const pdfInput = document.getElementById('pdfInput');
const pdfFileInfo = document.getElementById('pdfFileInfo');
const pdfFileName = document.getElementById('pdfFileName');
const pdfOriginalSize = document.getElementById('pdfOriginalSize');

pdfUploadBox.addEventListener('click', () => pdfInput.click());
pdfUploadBox.addEventListener('dragover', (e) => {
    e.preventDefault();
    pdfUploadBox.style.borderColor = 'var(--color-primary)';
});
pdfUploadBox.addEventListener('dragleave', () => {
    pdfUploadBox.style.borderColor = 'var(--color-border)';
});
pdfUploadBox.addEventListener('drop', (e) => {
    e.preventDefault();
    pdfUploadBox.style.borderColor = 'var(--color-border)';
    if (e.dataTransfer.files.length > 0) {
        pdfInput.files = e.dataTransfer.files;
        handlePDFUpload();
    }
});

pdfInput.addEventListener('change', handlePDFUpload);

function handlePDFUpload() {
    const file = pdfInput.files[0];
    if (!file || file.type !== 'application/pdf') return;

    compressionState.pdfFile = file;
    compressionState.pdfOriginalSize = file.size;

    pdfFileName.textContent = file.name;
    pdfOriginalSize.textContent = (file.size / 1024).toFixed(2);
    pdfFileInfo.style.display = 'block';
}

/* ============================
   IMAGE COMPRESSION ENGINE
   ============================ */

async function compressImage() {
    if (!compressionState.imageFile) {
        showModal('Upload Required', 'Please select an image first');
        return;
    }

    const targetSizeInput = document.getElementById('imageTargetSize').value;
    const targetUnit = document.getElementById('imageSizeUnit').value;

    if (!targetSizeInput) {
        showModal('Target Size Required', 'Please enter a target size');
        return;
    }

    let targetBytes = parseInt(targetSizeInput);
    if (targetUnit === 'mb') {
        targetBytes = targetBytes * 1024 * 1024;
    } else {
        targetBytes = targetBytes * 1024;
    }

    const loadingEl = document.getElementById('imageLoading');
    const compressBtn = document.getElementById('imageCompressBtn');

    loadingEl.style.display = 'block';
    compressBtn.disabled = true;

    try {
        const compressed = await performImageCompression(
            compressionState.imageFile,
            targetBytes
        );

        compressionState.imageCompressedData = compressed.blob;
        compressionState.imageCompressedSize = compressed.blob.size;
        compressionState.currentType = 'image';

        displayResults(
            compressionState.imageOriginalSize,
            compressed.blob.size,
            targetBytes,
            compressed.message
        );
    } catch (error) {
        console.error('Compression error:', error);
        showModal('Compression Error', 'Unable to compress image. Please try a different file.');
    } finally {
        loadingEl.style.display = 'none';
        compressBtn.disabled = false;
    }
}

async function performImageCompression(file, targetBytes) {
    return new Promise((resolve) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            const img = new Image();

            img.onload = () => {
                let quality = 0.9;
                let width = img.width;
                let height = img.height;
                let attempts = 0;
                const maxAttempts = 20;

                function tryCompress() {
                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    canvas.toBlob(
                        (blob) => {
                            const currentSize = blob.size;
                            const ratio = currentSize / targetBytes;

                            if (ratio <= 1.05 || attempts >= maxAttempts) {
                                let message = 'Compression complete';
                                if (ratio > 1.05) {
                                    message = 'Best possible compression achieved';
                                }
                                resolve({
                                    blob: blob,
                                    message: message,
                                });
                                return;
                            }

                            if (ratio > 1.1) {
                                // Size too large, reduce quality
                                quality = Math.max(0.1, quality * 0.85);
                            } else if (ratio < 0.95) {
                                // Size too small, increase quality slightly
                                quality = Math.min(1.0, quality * 1.05);
                            }

                            // If quality is very low, try reducing dimensions
                            if (quality < 0.3 && width > 400) {
                                width = Math.floor(width * 0.9);
                                height = Math.floor(height * 0.9);
                            }

                            attempts++;
                            tryCompress();
                        },
                        'image/jpeg',
                        quality
                    );
                }

                tryCompress();
            };

            img.src = e.target.result;
        };

        reader.readAsDataURL(file);
    });
}

/* ============================
   PDF COMPRESSION ENGINE
   ============================ */

async function compressPDF() {
    if (!compressionState.pdfFile) {
        showModal('Upload Required', 'Please select a PDF first');
        return;
    }

    const targetSizeInput = document.getElementById('pdfTargetSize').value;
    const targetUnit = document.getElementById('pdfSizeUnit').value;

    if (!targetSizeInput) {
        showModal('Target Size Required', 'Please enter a target size');
        return;
    }

    let targetBytes = parseInt(targetSizeInput);
    if (targetUnit === 'mb') {
        targetBytes = targetBytes * 1024 * 1024;
    } else {
        targetBytes = targetBytes * 1024;
    }

    const loadingEl = document.getElementById('pdfLoading');
    const compressBtn = document.getElementById('pdfCompressBtn');

    loadingEl.style.display = 'block';
    compressBtn.disabled = true;

    try {
        const compressed = await performPDFCompressionBackend(
            compressionState.pdfFile,
            targetBytes
        );

        compressionState.pdfCompressedData = compressed.blob;
        compressionState.pdfCompressedSize = compressed.size;
        compressionState.currentType = 'pdf';

        // Evaluate compression result and show appropriate feedback
        const evaluation = evaluateCompressionResult(
            compressed.originalSize,
            compressed.size,
            compressed.targetSize
        );

        // Show evaluation modal first
        showModal(evaluation.title, evaluation.message);

        // Then display results
        displayResults(
            compressed.originalSize,
            compressed.size,
            compressed.targetSize,
            evaluation.resultMessage
        );
    } catch (error) {
        console.error('PDF compression error:', error);
        
        if (error.message === 'COMPRESSION_LIMIT_REACHED') {
            showModal(
                'Compression Limit Reached',
                'This PDF cannot be reduced further due to its internal structure (images, fonts, or encoding). Try a larger target size or a different PDF.'
            );
        } else if (error.message.includes('Server not reachable')) {
            showModal('Server Error', error.message);
        } else {
            showModal('Compression Error', error.message || 'Unable to compress PDF. Please try again.');
        }
    } finally {
        loadingEl.style.display = 'none';
        compressBtn.disabled = false;
    }
}

/* ============================
   COMPRESSION RESULT EVALUATION
   ============================ */

function evaluateCompressionResult(originalSize, compressedSize, targetSize) {
    /**
     * Evaluates compression results against target and returns appropriate feedback
     * 
     * Case 1: Target Achieved (within 10% of target)
     * Case 2: Partial Success (smaller than original but not target)
     * Case 3: No Reduction (less than 5% size reduction)
     */
    
    const sizeReductionPercent = ((originalSize - compressedSize) / originalSize) * 100;
    const isCloseToTarget = compressedSize <= targetSize * 1.1;
    const hasReduction = compressedSize < originalSize;
    const hasNoReduction = Math.abs(originalSize - compressedSize) < (originalSize * 0.05);
    
    // Case 1: Target Achieved
    if (isCloseToTarget && hasReduction) {
        return {
            title: 'Compression Successful',
            message: 'Your PDF has been compressed close to the target size.',
            resultMessage: 'Target size achieved! Your file is ready to download.'
        };
    }
    
    // Case 3: No Reduction (must check before Case 2)
    if (hasNoReduction) {
        return {
            title: 'Compression Not Possible',
            message: 'This PDF cannot be reduced further due to its internal structure (images, fonts, or encoding).',
            resultMessage: 'No significant compression possible for this file.'
        };
    }
    
    // Case 2: Partial Success
    if (hasReduction) {
        return {
            title: 'Partial Compression',
            message: `Your PDF has been reduced to its best possible size. The file was compressed by ${sizeReductionPercent.toFixed(1)}%, but the target could not be fully reached.`,
            resultMessage: `Compression achieved: ${sizeReductionPercent.toFixed(1)}% reduction. Target not reached due to file structure limits.`
        };
    }
    
    // Fallback (should not reach here)
    return {
        title: 'Compression Complete',
        message: 'PDF compression process finished.',
        resultMessage: 'Compression completed.'
    };
}

async function performPDFCompressionBackend(file, targetBytes) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('targetSize', targetBytes.toString());

    try {
        const response = await fetch('http://localhost:5000/compress-pdf', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const contentType = response.headers.get('content-type');
            let errorMsg = 'Unable to compress PDF. File may be complex.';
            
            if (contentType && contentType.includes('application/json')) {
                try {
                    const errorData = await response.json();
                    errorMsg = errorData.error || errorMsg;
                } catch (e) {
                    // JSON parse failed, use default message
                }
            }
            
            throw new Error(errorMsg);
        }

        const compressedBlob = await response.blob();
        const originalSize = parseInt(response.headers.get('X-Original-Size') || '0');
        const compressedSize = parseInt(response.headers.get('X-Compressed-Size') || '0');
        const targetSize = parseInt(response.headers.get('X-Target-Size') || '0');
        const success = response.headers.get('X-Success') === 'true';
        const message = response.headers.get('X-Message') || 'Compression complete';

        if (!success) {
            throw new Error('COMPRESSION_LIMIT_REACHED');
        }

        return {
            blob: compressedBlob,
            size: compressedSize,
            originalSize: originalSize,
            targetSize: targetSize,
            message: message,
        };
    } catch (error) {
        if (error.message === 'COMPRESSION_LIMIT_REACHED') {
            throw error;
        }
        if (error instanceof TypeError) {
            throw new Error('Server not reachable. Please try again later.');
        }
        throw new Error(error.message || 'Backend compression failed');
    }
}

/* ============================
   RESULT DISPLAY
   ============================ */

function displayResults(originalSize, compressedSize, targetSize, message) {
    const resultSection = document.getElementById('resultSection');
    const resultMessage = document.getElementById('resultMessage');

    document.getElementById('resultOriginalSize').textContent =
        (originalSize / 1024).toFixed(2) + ' KB';
    document.getElementById('resultCompressedSize').textContent =
        (compressedSize / 1024).toFixed(2) + ' KB';
    document.getElementById('resultTargetSize').textContent =
        (targetSize / 1024).toFixed(2) + ' KB';

    const reductionPercent = (
        ((originalSize - compressedSize) / originalSize) *
        100
    ).toFixed(1);
    document.getElementById('resultReduction').textContent =
        reductionPercent + '%';

    resultMessage.textContent = message;

    resultSection.style.display = 'block';
    resultSection.scrollIntoView({ behavior: 'smooth' });
}

/* ============================
   DOWNLOAD FUNCTIONALITY
   ============================ */

function downloadCompressed() {
    let blob, filename;

    if (compressionState.currentType === 'image') {
        blob = compressionState.imageCompressedData;
        filename = compressionState.imageFile.name.split('.')[0] + '_compressed.jpg';
    } else if (compressionState.currentType === 'pdf') {
        blob = compressionState.pdfCompressedData;
        filename = compressionState.pdfFile.name.split('.')[0] + '_compressed.pdf';
    }

    if (!blob) {
        showModal('Download Error', 'No compressed file available');
        return;
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/* ============================
   RESET COMPRESSION
   ============================ */

function resetCompression() {
    // Clear file inputs
    document.getElementById('imageInput').value = '';
    document.getElementById('pdfInput').value = '';

    // Clear file info displays
    document.getElementById('imageFileInfo').style.display = 'none';
    document.getElementById('pdfFileInfo').style.display = 'none';

    // Clear input fields
    document.getElementById('imageTargetSize').value = '';
    document.getElementById('pdfTargetSize').value = '';

    // Hide result section
    document.getElementById('resultSection').style.display = 'none';

    // Reset state
    compressionState = {
        imageFile: null,
        imageOriginalSize: 0,
        imageCompressedData: null,
        imageCompressedSize: 0,

        pdfFile: null,
        pdfOriginalSize: 0,
        pdfCompressedData: null,
        pdfCompressedSize: 0,

        currentType: null,
    };

    // Scroll to tools section
    document.querySelector('.tools-section').scrollIntoView({ behavior: 'smooth' });
}

/* ============================
   INITIALIZATION
   ============================ */

document.addEventListener('DOMContentLoaded', () => {
    // Initialization code if needed
    console.log('Application loaded');
});
