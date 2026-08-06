(() => {
  'use strict';

  const NativeBlob = window.Blob;

  function patchPortraitSource(source) {
    if (!source.includes("const SAVE_KEY = 'hinata-senki-chapter6-save-v1'")) return source;
    const oldBlock = "    '潮紗理菜':portraitData.sarina || '',\n    '河田陽菜':portraitData.hina || ''\n  };";
    const newBlock = "    '潮紗理菜':portraitData.sarina || '',\n    '河田陽菜':portraitData.hina || '',\n    '濱岸ひより':portraitData.hiyori || '',\n    '山口陽世':portraitData.haruyo || ''\n  };";
    if (!source.includes(oldBlock)) return source;
    return source.replace(oldBlock, newBlock);
  }

  function PortraitPatchedBlob(parts = [], options = {}) {
    if (options?.type === 'text/javascript') {
      const text = parts.map(part => typeof part === 'string' ? part : '').join('');
      if (text.includes('hinata-senki-chapter6-save-v1')) {
        return new NativeBlob([patchPortraitSource(text)], options);
      }
    }
    return new NativeBlob(parts, options);
  }

  PortraitPatchedBlob.prototype = NativeBlob.prototype;
  Object.setPrototypeOf(PortraitPatchedBlob, NativeBlob);
  window.Blob = PortraitPatchedBlob;
})();
