import React, { useState, useRef, useEffect } from 'react';
// IMAGE & PDF SUPPORT ENABLED
import { FileText, X, Upload, ChevronLeft, ChevronRight, Trash2, RotateCw, Download, Loader2, GripVertical, Image as ImageIcon } from 'lucide-react';
import { PDFDocument, degrees, PageSizes } from 'pdf-lib';
import { useToast } from '../context/ToastContext';

interface PdfFile {
    id: string;
    file: File;
    name: string;
    type: 'pdf' | 'image';
    rotation: number; // 0, 90, 180, 270
    previewUrl: string;
}

export const PdfManager: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [files, setFiles] = useState<PdfFile[]>([]);
    const [isMerging, setIsMerging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { showToast } = useToast();

    // Release object URLs on unmount to prevent leaks
    useEffect(() => {
        return () => {
            files.forEach(f => URL.revokeObjectURL(f.previewUrl));
        };
    }, []);

    const processFiles = (newFileObjects: File[]) => {
        const processed = newFileObjects.map(f => {
            const isImage = f.type.startsWith('image/');
            return {
                id: Math.random().toString(36).substring(7),
                file: f,
                name: f.name,
                type: isImage ? 'image' : 'pdf',
                rotation: 0,
                previewUrl: URL.createObjectURL(f)
            } as PdfFile;
        });
        setFiles(prev => [...prev, ...processed]);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const validFiles = Array.from(e.target.files).filter(f =>
                f.type === 'application/pdf' ||
                f.type === 'image/png' ||
                f.type === 'image/jpeg' ||
                f.type === 'image/jpg'
            );
            processFiles(validFiles);
            // Reset input so same files can be selected again
            e.target.value = '';
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer.files) {
            const validFiles = Array.from(e.dataTransfer.files).filter(f =>
                f.type === 'application/pdf' ||
                f.type === 'image/png' ||
                f.type === 'image/jpeg' ||
                f.type === 'image/jpg'
            );
            processFiles(validFiles);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const rotateFile = (id: string) => {
        setFiles(prev => prev.map(f => {
            if (f.id === id) {
                const newRot = (f.rotation + 90) % 360;
                return { ...f, rotation: newRot };
            }
            return f;
        }));
    };

    const removeFile = (id: string) => {
        setFiles(prev => {
            const file = prev.find(f => f.id === id);
            if (file) URL.revokeObjectURL(file.previewUrl);
            return prev.filter(f => f.id !== id);
        });
    };

    const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);

    const handleDragStart = (e: React.DragEvent, index: number) => {
        setDraggedItemIndex(index);
        e.dataTransfer.effectAllowed = "move";
    };

    const handleCardDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        e.stopPropagation();
        if (draggedItemIndex === null || draggedItemIndex === index) return;

        const newFiles = [...files];
        const draggedItem = newFiles[draggedItemIndex];
        newFiles.splice(draggedItemIndex, 1);
        newFiles.splice(index, 0, draggedItem);

        setFiles(newFiles);
        setDraggedItemIndex(index);
    };

    const handleCardDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDraggedItemIndex(null);
    };

    const clearAllFiles = () => {
        files.forEach(f => URL.revokeObjectURL(f.previewUrl));
        setFiles([]);
    };

    const handleMerge = async () => {
        if (files.length < 2) {
            showToast("Add at least 2 files (PDF or Images) to merge.", 'error');
            return;
        }

        setIsMerging(true);
        try {
            const mergedPdf = await PDFDocument.create();

            for (const item of files) {
                const arrayBuffer = await item.file.arrayBuffer();

                if (item.type === 'pdf') {
                    const pdf = await PDFDocument.load(arrayBuffer);
                    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());

                    copiedPages.forEach((page) => {
                        if (item.rotation !== 0) {
                            const { angle } = page.getRotation();
                            page.setRotation(degrees(angle + item.rotation));
                        }
                        mergedPdf.addPage(page);
                    });
                } else {
                    // Handle Image
                    let image;
                    if (item.file.type === 'image/jpeg' || item.file.type === 'image/jpg') {
                        image = await mergedPdf.embedJpg(arrayBuffer);
                    } else {
                        image = await mergedPdf.embedPng(arrayBuffer);
                    }

                    const page = mergedPdf.addPage(PageSizes.A4);
                    const { width, height } = page.getSize();

                    // Scale image to fit within page margins
                    const margin = 50;
                    const availableWidth = width - (margin * 2);
                    const availableHeight = height - (margin * 2);

                    const imgDims = image.scaleToFit(availableWidth, availableHeight);

                    // Center image
                    const x = (width - imgDims.width) / 2;
                    const y = (height - imgDims.height) / 2;

                    page.drawImage(image, {
                        x,
                        y,
                        width: imgDims.width,
                        height: imgDims.height,
                        rotate: degrees(item.rotation) // Native image rotation
                    });

                    // If rotated 90 or 270, we might want to rotate the Page itself or rotate the image draw?
                    // Simple approach: Rotate the drawing. But if we rotate drawing 90deg, we need to adjust XY.
                    // Easier approach for user expectation: Rotate the PAGE if user asks for rotation.
                    // But if we rotate page, it rotates standard A4.
                    // Let's stick to rotating the Image Element if complex, OR just rotate the page container.
                    // Re-applying User rotation to the PAGE is safest for consistency with PDF behavior.
                    if (item.rotation !== 0) {
                        page.setRotation(degrees(item.rotation));
                    }
                }
            }

            const mergedPdfBytes = await mergedPdf.save();
            const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = url;
            link.download = `merged_${Date.now()}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            showToast("PDFs Merged & List Cleared!", 'success');
            clearAllFiles(); // Auto-clear after success
        } catch (error) {
            console.error(error);
            showToast("Merge failed. Check file types.", 'error');
        } finally {
            setIsMerging(false);
        }
    };

    return (
        <>
            {!isOpen && (
                <div className="pdf-manager-container">
                    <button className="pdf-fab" onClick={() => setIsOpen(true)}>
                        <FileText size={24} />
                        <span className="fab-badge">{files.length > 0 ? files.length : '+'}</span>
                    </button>
                </div>
            )}

            {isOpen && (
                <div className="pdf-modal-overlay">
                    <div className="pdf-center-modal">
                        <div className="pdf-header">
                            <h3>PDF Studio</h3>
                            <div className="header-actions">
                                {files.length > 0 && (
                                    <button onClick={clearAllFiles} className="action-btn" title="Clear All" style={{ marginRight: 10, color: '#f44336' }}>
                                        <Trash2 size={16} /> Clear
                                    </button>
                                )}
                                <button onClick={() => fileInputRef.current?.click()} className="add-btn" title="Add Files">
                                    <Upload size={16} /> Add Files
                                </button>
                                <button onClick={() => setIsOpen(false)} className="close-btn-icon"><X size={20} /></button>
                            </div>
                        </div>

                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileSelect}
                            accept=".pdf, .png, .jpg, .jpeg"
                            multiple
                            style={{ display: 'none' }}
                        />

                        <div
                            className="pdf-grid-container"
                            onDrop={handleDrop}
                            onDragOver={handleDragOver}
                        >
                            {files.length === 0 ? (
                                <div className="grid-empty-state" onClick={() => fileInputRef.current?.click()}>
                                    <Upload size={64} style={{ opacity: 0.3, marginBottom: 20 }} />
                                    <p style={{ fontSize: '18px', fontWeight: 500 }}>Drop PDFs & Images here</p>
                                    <p style={{ fontSize: '14px', opacity: 0.7 }}>Combine documents + photos</p>
                                </div>
                            ) : (
                                files.map((item, index) => (
                                    <div
                                        key={item.id}
                                        className={`pdf-card ${draggedItemIndex === index ? 'dragging' : ''}`}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, index)}
                                        onDragOver={(e) => handleCardDragOver(e, index)}
                                        onDrop={handleCardDrop}
                                    >
                                        <div className="card-preview">
                                            <div
                                                className="preview-frame-wrapper"
                                                style={{ transform: `rotate(${item.rotation}deg)` }}
                                            >
                                                {item.type === 'pdf' ? (
                                                    <>
                                                        <iframe
                                                            src={`${item.previewUrl}#page=1&view=Fit&toolbar=0&navpanes=0&scrollbar=0`}
                                                            tabIndex={-1}
                                                            title={item.name}
                                                            scrolling="no"
                                                        />
                                                        <div className="iframe-blocker" />
                                                    </>
                                                ) : (
                                                    <img
                                                        src={item.previewUrl}
                                                        alt={item.name}
                                                        style={{
                                                            width: '100%',
                                                            height: '100%',
                                                            objectFit: 'contain',
                                                            pointerEvents: 'none'
                                                        }}
                                                    />
                                                )}
                                            </div>

                                            <div className="card-overlay">
                                                <button onClick={() => rotateFile(item.id)} className="overlay-btn" title="Rotate">
                                                    <RotateCw size={20} />
                                                </button>
                                                <button onClick={() => removeFile(item.id)} className="overlay-btn delete" title="Remove">
                                                    <Trash2 size={20} />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="card-footer">
                                            <div className="truncate-text" title={item.name}>
                                                {item.type === 'image' && <ImageIcon size={12} style={{ marginRight: 4, display: 'inline-block' }} />}
                                                {item.name}
                                            </div>
                                            <div className="card-reorder">
                                                <GripVertical size={16} style={{ opacity: 0.5 }} />
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="pdf-footer-bar">
                            <div className="footer-info">
                                <span className="file-count">{files.length} Item{files.length !== 1 ? 's' : ''}</span>
                                <span className="footer-hint">Ready to Merge</span>
                            </div>
                            <button
                                className="merge-btn-primary"
                                onClick={handleMerge}
                                disabled={files.length < 2 || isMerging}
                            >
                                {isMerging ? <Loader2 size={18} className="spin" /> : <Download size={18} />}
                                {isMerging ? ' Processing...' : ' Merge & Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
