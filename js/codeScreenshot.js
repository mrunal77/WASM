window.wasmCodeGen = {
    _previewEl: null,
    _fitScale: 1,

    init: function () {
        if (this._fitted) return;
        this._fitted = true;
        const self = this;
        window.addEventListener('resize', function () {
            if (self._previewEl) self.fit(self._previewEl);
        });
    },

    render: function (el, code, language, langLabel, theme, filename, fontSize, showLineNumbers, showWindowChrome) {
        if (!el) return;
        this.init();

        const raw = (code || '').replace(/\r\n/g, '\n');
        const text = raw.endsWith('\n') ? raw.slice(0, -1) : raw;

        el.className = 'snippet-card';
        el.classList.remove('snippet-fitted');
        el.style.transform = '';
        el.style.width = '';
        el.style.height = '';
        this._fitScale = 1;
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
        this._previewEl = el;

        if (!el.parentElement || !el.parentElement.classList.contains('snippet-fit')) {
            const wrapper = document.createElement('div');
            wrapper.className = 'snippet-fit';
            el.parentNode.insertBefore(wrapper, el);
            wrapper.appendChild(el);
        }

        const fit = () => this.fit(el);
        requestAnimationFrame(fit);
        requestAnimationFrame(function () { requestAnimationFrame(fit); });
        if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(fit);
        }
    },

    fit: function (el) {
        const wrapper = el.parentElement;
        if (!wrapper || !wrapper.classList.contains('snippet-fit')) return;
        const stageInner = wrapper.parentElement;
        if (!stageInner || !el.isConnected) return;

        el.classList.remove('snippet-fitted');
        el.style.transform = '';
        el.style.width = '';
        el.style.height = '';
        el.style.maxWidth = '';
        wrapper.classList.remove('snippet-fit--scaled');
        wrapper.style.width = '';
        wrapper.style.height = '';
        this._fitScale = 1;

        const cs = getComputedStyle(stageInner);
        const pad = (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0);
        const avail = stageInner.clientWidth - pad;
        if (!avail) return;

        const body = el.querySelector('.snippet-body') || el;
        const bar = el.querySelector('.snippet-bar');
        let naturalW = body.scrollWidth;
        if (bar) naturalW = Math.max(naturalW, bar.scrollWidth);
        if (!naturalW) return;
        if (naturalW <= avail + 1) return;

        const isNarrow = !window.matchMedia || window.matchMedia('(max-width: 767.98px)').matches;
        if (!isNarrow) return;

        const s = Math.max(0.2, avail / naturalW);
        const naturalH = el.getBoundingClientRect().height;
        el.style.maxWidth = 'none';
        el.style.width = naturalW + 'px';
        el.style.height = naturalH + 'px';
        el.style.transformOrigin = 'left top';
        el.style.transform = 'scale(' + s + ')';
        wrapper.style.width = (naturalW * s) + 'px';
        wrapper.style.height = (naturalH * s) + 'px';
        wrapper.classList.add('snippet-fit--scaled');
        el.classList.add('snippet-fitted');
        this._fitScale = s;
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
        const s = this._fitScale || 1;
        const target = (scale || 2) / s;
        return window.html2canvas(el, {
            scale: target,
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