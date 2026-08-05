(() => {
  'use strict';

  function patchSource(source) {
    const selectionBlock = "    if (clicked) {\n      if (clicked.faction==='ally' && !clicked.acted) selectUnit(clicked);";
    const stationaryActionBlock = "    if (clicked && selected && clicked.id===selected.id && selected.faction==='ally' && !selected.acted) {\n      showActions(selected);\n      return;\n    }\n\n    if (clicked) {\n      if (clicked.faction==='ally' && !clicked.acted) selectUnit(clicked);";
    if (!source.includes(selectionBlock)) throw new Error('その場行動の選択処理を特定できませんでした');
    return source.replace(selectionBlock,stationaryActionBlock);
  }

  async function start() {
    try {
      const response = await fetch('./game.js?v=1');
      if (!response.ok) throw new Error(`game.js ${response.status}`);
      const patched = patchSource(await response.text());
      const url = URL.createObjectURL(new Blob([patched],{type:'text/javascript'}));
      const script = document.createElement('script');
      script.src = url;
      script.onload = () => URL.revokeObjectURL(url);
      script.onerror = () => console.error('第3章の更新読み込みに失敗しました');
      document.body.appendChild(script);
    } catch (error) {
      console.error(error);
      const toast = document.querySelector('#toast');
      if (toast) {
        toast.textContent='更新の読み込みに失敗しました。再読み込みしてください。';
        toast.classList.add('show');
      }
    }
  }

  start();
})();
