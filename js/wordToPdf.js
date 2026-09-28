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
                dropEl.classList.add('w2p-drag-over');
            },
            dragleave: function (e) {
                e.preventDefault();
                dropEl.classList.remove('w2p-drag-over');
            },
            drop: function (e) {
                e.preventDefault();
                dropEl.classList.remove('w2p-drag-over');
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

        const result = await mammoth.convertToHtml({ arrayBuffer: arrayBuffer });
        return {
            html: result.value || '<p><em>(Empty document)</em></p>',
            messages: (result.messages || []).map(m => m.message)
        };
    }

    async function generatePdfFromElement(containerEl, filename, options) {
        if (typeof html2pdf === 'undefined') {
            throw new Error('html2pdf library is missing. Please reload the page.');
        }

        const opt = {
            margin: Number(options.margin || 10),
            filename: filename || 'converted_document.pdf',
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, logging: false },
            jsPDF: {
                unit: 'mm',
                format: options.pageSize || 'a4',
                orientation: options.orientation || 'portrait'
            }
        };

        await html2pdf().set(opt).from(containerEl).save();
    }

    return {
        attach: attach,
        detach: detach,
        openPicker: openPicker,
        convertDocxToHtml: convertDocxToHtml,
        generatePdfFromElement: generatePdfFromElement
    };
})();
