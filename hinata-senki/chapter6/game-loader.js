(async()=>{
  'use strict';
  try {
    const paths=[
      './code/part-00.txt','./code/part-01.txt','./code/part-02.txt',
      './code/part-03.txt','./code/part-04.txt','./code/part-05.txt'
    ];
    const parts=await Promise.all(paths.map(async path=>{
      const response=await fetch(`${path}?v=1`);
      if(!response.ok)throw new Error(`${path} ${response.status}`);
      return response.text();
    }));
    const binary=atob(parts.join(''));
    const bytes=Uint8Array.from(binary,char=>char.charCodeAt(0));
    const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    const source=await new Response(stream).text();
    const url=URL.createObjectURL(new Blob([source],{type:'text/javascript'}));
    const script=document.createElement('script');
    script.src=url;
    script.onload=()=>URL.revokeObjectURL(url);
    script.onerror=()=>console.error('第6章の起動に失敗しました');
    document.body.appendChild(script);
  }catch(error){
    console.error(error);
    const toast=document.querySelector('#toast');
    if(toast){toast.textContent='第6章の読み込みに失敗しました。再読み込みしてください。';toast.classList.add('show');}
  }
})();
