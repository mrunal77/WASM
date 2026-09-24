window.wasmCodeGen = {
    render: function (el, code, language, langLabel, theme, filename, fontSize, showLineNumbers, showWindowChrome) {
        if (!el) return;

        const raw = (code || '').replace(/\r\n/g, '\n');
        const text = raw.endsWith('\n') ? raw.slice(0, -1) : raw;

        el.className = 'snippet-card';
        el.dataset.theme = theme || 'one-dark';
        el.style.setProperty('--code-font-size', (fontSize || 15) + 'px');

        let highlighted = this.escapeHtml(text);
        if (window.hljs) {
            const lang = language || 'plaintext';
            if (hljs.getLanguage(lang)) {
                try {
                    highlighted = hljs.highlight(text, { language: lang, ignoreIllegal: true }).value;
                } catch (e) {
                    // keep the escaped plain text fallback
                }
            }
        }

        const lines = highlighted.split('\n');
        const numbers = showLineNumbers !== false;

        const dots = showWindowChrome === false ? '' :
            '<span class="snippet-dot snippet-dot-red"></span>' +
            '<span class="snippet-dot snippet-dot-amber"></span>' +
            '<span class="snippet-dot snippet-dot-green"></span>';

        let html =
            '<div class="snippet-bar">' +
            '<div class="snippet-dots">' + dots + '</div>' +
            '<span class="snippet-filename">' + this.escapeHtml(filename || 'code') + '</span>' +
            '<span class="snippet-lang">' + this.escapeHtml(langLabel || '') + '</span>' +
            '</div>' +
            '<div class="snippet-body">';

        for (let i = 0; i < lines.length; i++) {
            const num = numbers ? '<span class="snippet-line-num">' + (i + 1) + '</span>' : '';
            const content = lines[i].length ? lines[i] : ' ';
            html += '<div class="snippet-line">' + num + '<span class="snippet-line-text">' + content + '</span></div>';
        }

        html += '</div>';
        el.innerHTML = html;
    },

    escapeHtml: function (s) {
        return (s || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    },

    capture: async function (el, scale) {
        if (!window.html2canvas) throw new Error('image library not loaded');
        return window.html2canvas(el, {
            scale: scale || 2,
            backgroundColor: null,
            useCORS: true,
            logging: false
        });
    },

    downloadPng: async function (el, filename) {
        try {
            const canvas = await this.capture(el);
            const url = canvas.toDataURL('image/png');
            const a = document.createElement('a');
            a.href = url;
            a.download = filename || 'code-screenshot.png';
            document.body.appendChild(a);
            a.click();
            a.remove();
            return 'ok';
        } catch (err) {
            return err && err.message ? err.message : 'download-failed';
        }
    },

    copyImage: async function (el) {
        try {
            const canvas = await this.capture(el);
            const blob = await new Promise((resolve, reject) => {
                canvas.toBlob(b => b ? resolve(b) : reject(new Error('png-encoding')), 'image/png');
            });
            await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
            return 'ok';
        } catch (err) {
            return err && err.message ? err.message : 'clipboard-failed';
        }
    },

    copyCode: async function (code) {
        try {
            await navigator.clipboard.writeText(code || '');
            return 'ok';
        } catch (err) {
            return err && err.message ? err.message : 'clipboard-failed';
        }
    }
};