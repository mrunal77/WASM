window.wasmFileCompressor = (function () {
    const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp'];
    const IMAGE_EXT = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp'];
    const MAX_BYTES = 100 * 1024 * 1024;

    const storedFiles = new Map();
    const storedUrls = new Map();
    let seq = 0;
    let netRef = null;
    let inputEl = null;
    let dropEl = null;
    let bound = null;

    function isPdf(file) {
        const type = (file.type || '').toLowerCase();
        const name = (file.name || '').toLowerCase();
        return type === 'application/pdf' || name.endsWith('.pdf');
    }

    function addFiles(fileList) {
        const report = [];
        for (const file of Array.from(fileList)) {
            const id = 'fc_' + (++seq);
            storedFiles.set(id, file);
            report.push({ id, name: file.name || 'unnamed', size: file.size, type: file.type || '' });
        }
        if (report.length && netRef) {
            netRef.invokeMethodAsync('FilesSelected', report);
        }
    }

    function attach(input, drop, net) {
        inputEl = input;
        dropEl = drop;
        netRef = net;

        bound = {
            change: function () {
                addFiles(inputEl.files);
                inputEl.value = '';
            },
            dragover: function (e) {
                e.preventDefault();
                dropEl.classList.add('fc-drag-over');
            },
            dragleave: function (e) {
                e.preventDefault();
                dropEl.classList.remove('fc-drag-over');
            },
            drop: function (e) {
                e.preventDefault();
                dropEl.classList.remove('fc-drag-over');
                if (e.dataTransfer && e.dataTransfer.files) {
                    addFiles(e.dataTransfer.files);
                }
            }
        };

        inputEl.addEventListener('change', bound.change);
        dropEl.addEventListener('dragover', bound.dragover);
        dropEl.addEventListener('dragleave', bound.dragleave);
        dropEl.addEventListener('drop', bound.drop);
    }

    function detach() {
        if (!bound || !inputEl || !dropEl) return;
        inputEl.removeEventListener('change', bound.change);
        dropEl.removeEventListener('dragover', bound.dragover);
        dropEl.removeEventListener('dragleave', bound.dragleave);
        dropEl.removeEventListener('drop', bound.drop);
        bound = null;
        releaseAll();
        netRef = null;
    }

    function openPicker() {
        if (inputEl) inputEl.click();
    }

    function release(id) {
        if (storedUrls.has(id)) {
            URL.revokeObjectURL(storedUrls.get(id));
            storedUrls.delete(id);
        }
        storedFiles.delete(id);
    }

    function releaseAll() {
        for (const url of storedUrls.values()) URL.revokeObjectURL(url);
        storedUrls.clear();
        storedFiles.clear();
    }

    /* ---------- image compression ---------- */

    async function toBlob(canvas, type, quality) {
        return new Promise(function (resolve, reject) {
            canvas.toBlob(function (b) {
                if (b) resolve(b);
                else reject(new Error('encode-failed'));
            }, type, quality);
        });
    }

    function resolveTargetMime(file, format) {
        if (format === 'image/jpeg' || format === 'image/webp' || format === 'image/png') return format;
        const type = (file.type || '').toLowerCase();
        if (type === 'image/jpeg' || type === 'image/webp' || type === 'image/png') return type;
        return 'image/jpeg';
    }

    async function compressImageCore(file, options) {
        let bitmap;
        try {
            bitmap = await createImageBitmap(file);
        } catch (e) {
            throw new Error('could-not-decode');
        }

        const originalWidth = bitmap.width;
        const originalHeight = bitmap.height;
        let width = originalWidth;
        let height = originalHeight;

        const maxDim = Number(options.maxDimension) || 0;
        if (maxDim > 0 && Math.max(width, height) > maxDim) {
            const scale = maxDim / Math.max(width, height);
            width = Math.max(1, Math.round(width * scale));
            height = Math.max(1, Math.round(height * scale));
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        const target = resolveTargetMime(file, options.format);

        if (target === 'image/jpeg') {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, width, height);
        }
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = options.smoothing || 'high';
        ctx.drawImage(bitmap, 0, 0, width, height);
        if (typeof bitmap.close === 'function') bitmap.close();

        const quality = Math.min(1, Math.max(0.05, Number(options.quality) || 0.75));
        let blob = await toBlob(canvas, target, quality);

        if (blob.type !== target && target === 'image/webp') {
            blob = await toBlob(canvas, 'image/jpeg', quality);
        }
        if (!blob) throw new Error('encode-failed');

        return { blob, width, height, originalWidth, originalHeight };
    }

    /* ---------- PDF compression ---------- */

    async function compressPdfCore(file, options) {
        if (!window.PDFLib) throw new Error('pdf-lib-missing');

        const bytes = new Uint8Array(await file.arrayBuffer());
        let doc;
        try {
            doc = await PDFLib.PDFDocument.load(bytes, { updateMetadata: false });
        } catch (e) {
            const name = (e && e.name) || '';
            if (name === 'EncryptedPDFError' || /encrypted/i.test(e && e.message ? e.message : '')) {
                throw new Error('pdf-encrypted');
            }
            throw new Error('invalid-pdf');
        }

        if (options.stripMetadata) {
            doc.setTitle('');
            doc.setAuthor('');
            doc.setSubject('');
            doc.setKeywords([]);
            doc.setProducer('');
            doc.setCreator('');
        }

        const saved = await doc.save({ useObjectStreams: true });
        const blob = new Blob([saved], { type: 'application/pdf' });
        return { blob };
    }

    /* ---------- facade used by Blazor ---------- */

    function friendlyError(err) {
        const msg = err && err.message ? err.message : 'unknown-error';
        const map = {
            'could-not-decode': 'This image could not be decoded by your browser.',
            'encode-failed': 'The image encoder could not produce the output.',
            'pdf-encrypted': 'This PDF is password protected and cannot be compressed.',
            'invalid-pdf': 'This file is not a readable PDF.',
            'pdf-lib-missing': 'The PDF library failed to load. Check your connection and reload.',
            'file-too-large': 'This file exceeds the 100 MB limit.'
        };
        return map[msg] || (msg === 'file-not-found' ? 'File no longer available.' : 'Compression failed: ' + msg);
    }

    async function compress(id, options) {
        const file = storedFiles.get(id);
        if (!file) return { success: false, error: 'file-not-found' };
        if (file.size > MAX_BYTES) return { success: false, error: 'file-too-large' };

        try {
            let result;
            let keptOriginal = false;
            let outBlob;
            let outMime = file.type || 'application/octet-stream';
            let outWidth = 0;
            let outHeight = 0;
            let outOriginalWidth = 0;
            let outOriginalHeight = 0;

            if (isPdf(file)) {
                result = await compressPdfCore(file, options);
            } else {
                result = await compressImageCore(file, options);
            }

            if (result.blob.size < file.size) {
                outBlob = result.blob;
                keptOriginal = false;
                outMime = result.blob.type || file.type;
                outWidth = result.width || 0;
                outHeight = result.height || 0;
                outOriginalWidth = result.originalWidth || 0;
                outOriginalHeight = result.originalHeight || 0;
            } else {
                // Compression made the file bigger (or equal): keep the original.
                outBlob = file;
                keptOriginal = true;
                outMime = file.type || 'application/octet-stream';
                outWidth = result.originalWidth || 0;
                outHeight = result.originalHeight || 0;
                outOriginalWidth = outWidth;
                outOriginalHeight = outHeight;
            }

            if (storedUrls.has(id)) {
                URL.revokeObjectURL(storedUrls.get(id));
                storedUrls.delete(id);
            }
            const url = URL.createObjectURL(outBlob);
            storedUrls.set(id, url);

            return {
                success: true,
                url,
                size: outBlob.size,
                mime: outMime,
                keptOriginal,
                width: outWidth,
                height: outHeight,
                originalWidth: outOriginalWidth,
                originalHeight: outOriginalHeight
            };
        } catch (err) {
            return { success: false, error: friendlyError(err) };
        }
    }

    function download(url, filename) {
        const a = document.createElement('a');
        a.href = url;
        a.download = filename || 'compressed';
        document.body.appendChild(a);
        a.click();
        a.remove();
    }

    return {
        attach: attach,
        detach: detach,
        openPicker: openPicker,
        release: release,
        compress: compress,
        download: download,
        _internal: {
            compressImageCore: compressImageCore,
            compressPdfCore: compressPdfCore,
            addFiles: addFiles
        }
    };
})();