(() => {
  'use strict';

  const SAVE_KEY='hinata-senki-chapter4-save-v1';
  const modal=document.querySelector('#modal');
  const content=document.querySelector('#modalContent');

  function readSave(){
    try{
      const raw=localStorage.getItem(SAVE_KEY);
      return raw?JSON.parse(raw):null;
    }catch{return null;}
  }

  function addContinueButton(){
    if(!content||document.querySelector('#continueToChapter5'))return;
    const save=readSave();
    const clearHeading=[...content.querySelectorAll('h2')].some(node=>node.textContent.includes('第4章クリア'));
    if(!save?.cleared&&!clearHeading)return;
    let actions=content.querySelector('.campaign-next');
    if(!actions){
      actions=document.createElement('div');
      actions.className='campaign-next';
      content.appendChild(actions);
    }
    const button=document.createElement('button');
    button.id='continueToChapter5';
    button.textContent='第5章へ進む';
    button.onclick=()=>{location.href='../chapter5/';};
    actions.prepend(button);
  }

  function offerResume(){
    const save=readSave();
    if(!save?.cleared||!modal||!content)return;
    if(!content.querySelector('h2')?.textContent.includes('第4章クリア')){
      content.innerHTML=`
        <h2>第4章クリア済み</h2>
        <p>直前にクリアした部隊・所持品・軍資金を引き継いで続行できます。</p>
        <div class="campaign-next"><button id="continueToChapter5">第5章へ進む</button></div>`;
      content.querySelector('#continueToChapter5').onclick=()=>{location.href='../chapter5/';};
      if(!modal.open)modal.showModal();
    }else addContinueButton();
  }

  const observer=new MutationObserver(addContinueButton);
  if(content)observer.observe(content,{childList:true,subtree:true});
  setTimeout(offerResume,550);
})();
