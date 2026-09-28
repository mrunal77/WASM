window.wasmMarkdownVisualizer = (function () {
    let bound = null;
    let inputEl = null;
    let dropEl = null;
    let netRef = null;

    function parseMarkdown(markdownText) {
        if (typeof marked === 'undefined') {
            return '<p><em>Error: marked.js library failed to load.</em></p>';
        }
        try {
            // Configure marked options
            marked.setOptions({
                gfm: true,
                breaks: true,
                headerIds: true,
                mangle: false
            });

            let rawHtml = marked.parse(markdownText || '');
            return rawHtml;
        } catch (e) {
            return '<p class="text-danger">Failed to parse Markdown: ' + e.message + '</p>';
        }
    }

    function highlightCodeBlocks(containerEl) {
        if (!containerEl || typeof hljs === 'undefined') return;
        const codeBlocks = containerEl.querySelectorAll('pre code');
        codeBlocks.forEach(function (block) {
            hljs.highlightElement(block);
        });
    }

    function attachDropzone(input, drop, net) {
        inputEl = input;
        dropEl = drop;
        netRef = net;

        bound = {
            change: function () {
                if (inputEl.files && inputEl.files.length) {
                    readFile(inputEl.files[0]);
                    inputEl.value = '';
                }
            },
            dragover: function (e) {
                e.preventDefault();
                if (dropEl) dropEl.classList.add('mdv-drag-over');
            },
            dragleave: function (e) {
                e.preventDefault();
                if (dropEl) dropEl.classList.remove('mdv-drag-over');
            },
            drop: function (e) {
                e.preventDefault();
                if (dropEl) dropEl.classList.remove('mdv-drag-over');
                if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) {
                    readFile(e.dataTransfer.files[0]);
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

    function readFile(file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            const content = e.target.result;
            if (netRef) {
                netRef.invokeMethodAsync('FileLoaded', {
                    name: file.name || 'document.md',
                    size: file.size,
                    content: content
                });
            }
        };
        reader.readAsText(file);
    }

    function detachDropzone() {
        if (!bound) return;
        if (inputEl) inputEl.removeEventListener('change', bound.change);
        if (dropEl) {
            dropEl.removeEventListener('dragover', bound.dragover);
            dropEl.removeEventListener('dragleave', bound.dragleave);
            dropEl.removeEventListener('drop', bound.drop);
        }
        bound = null;
        netRef = null;
    }

    function openPicker() {
        if (inputEl) inputEl.click();
    }

    function downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType || 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    return {
        parseMarkdown: parseMarkdown,
        highlightCodeBlocks: highlightCodeBlocks,
        attachDropzone: attachDropzone,
        detachDropzone: detachDropzone,
        openPicker: openPicker,
        downloadFile: downloadFile
    };
})();
