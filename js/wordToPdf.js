window.wasmWordToPdf = (function () {
    const storedFiles = new Map();
    let seq = 0;
    let netRef = null;
    let inputEl = null;
    let dropEl = null;
    let bound = null;

    function addFiles(fileList) {
        if (!fileList || !fileList.length) return;
        const file = fileList[0];
        const id = 'docx_' + (++seq);
        storedFiles.set(id, file);
        if (netRef) {
            netRef.invokeMethodAsync('FileSelected', {
                id: id,
                name: file.name || 'document.docx',
                size: file.size,
                type: file.type || ''
            });
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
                if (dropEl) dropEl.classList.add('w2p-drag-over');
            },
            dragleave: function (e) {
                e.preventDefault();
                if (dropEl) dropEl.classList.remove('w2p-drag-over');
            },
            drop: function (e) {
                e.preventDefault();
                if (dropEl) dropEl.classList.remove('w2p-drag-over');
                if (e.dataTransfer && e.dataTransfer.files) {
                    addFiles(e.dataTransfer.files);
                }
            }
        };

        if (inputEl) inputEl.addEventListener('change', bound.change);
        if (dropEl) {
            dropEl.addEventListener('dragover', bound.dragover);
            dropEl.addEventListener('dragleave', bound.dragleave);
            dropEl.addEventListener('drop', bound.drop);
        }
    }

    function detach() {
        if (!bound) return;
        if (inputEl) inputEl.removeEventListener('change', bound.change);
        if (dropEl) {
            dropEl.removeEventListener('dragover', bound.dragover);
            dropEl.removeEventListener('dragleave', bound.dragleave);
            dropEl.removeEventListener('drop', bound.drop);
        }
        bound = null;
        storedFiles.clear();
        netRef = null;
    }

    function openPicker() {
        if (inputEl) inputEl.click();
    }

    async function convertDocxToHtml(id) {
        const file = storedFiles.get(id);
        if (!file) throw new Error('File no longer available.');

        const arrayBuffer = await file.arrayBuffer();
        if (typeof mammoth === 'undefined') {
            throw new Error('Mammoth.js library is missing. Please reload the page.');
        }

        const result = await mammoth.convertToHtml({
            arrayBuffer: arrayBuffer,
            includeDefaultStyleMap: true
        });

        return {
            html: result.value || '<p><em>(Empty document)</em></p>',
            messages: (result.messages || []).map(m => m.message)
        };
    }

    async function waitForImages(element) {
        const images = Array.from(element.querySelectorAll('img'));
        const promises = images.map(img => {
            if (img.complete) return Promise.resolve();
            return new Promise(resolve => {
                img.onload = resolve;
                img.onerror = resolve;
            });
        });
        await Promise.all(promises);
    }

    async function generatePdfFromElement(containerEl, filename, options) {
        if (typeof html2pdf === 'undefined') {
            throw new Error('html2pdf library is missing. Please reload the page.');
        }

        if (!containerEl) {
            throw new Error('Document container is missing.');
        }

        // Save original scroll styles before expanding for canvas capture
        const origMaxHeight = containerEl.style.maxHeight;
        const origOverflow = containerEl.style.overflow;
        const origHeight = containerEl.style.height;

        try {
            // Temporarily unconstrain container height so html2canvas captures full document content
            containerEl.style.maxHeight = 'none';
            containerEl.style.height = 'auto';
            containerEl.style.overflow = 'visible';

            await waitForImages(containerEl);

            const opt = {
                margin: Number(options.margin || 10),
                filename: filename || 'converted_document.pdf',
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: {
                    scale: 2,
                    useCORS: true,
                    logging: false,
                    scrollY: 0,
                    scrollX: 0
                },
                jsPDF: {
                    unit: 'mm',
                    format: options.pageSize || 'a4',
                    orientation: options.orientation || 'portrait'
                },
                pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
            };

            await html2pdf().set(opt).from(containerEl).save();
        } finally {
            // Restore preview styling
            containerEl.style.maxHeight = origMaxHeight;
            containerEl.style.overflow = origOverflow;
            containerEl.style.height = origHeight;
        }
    }

    return {
        attach: attach,
        detach: detach,
        openPicker: openPicker,
        convertDocxToHtml: convertDocxToHtml,
        generatePdfFromElement: generatePdfFromElement
    };
})();
