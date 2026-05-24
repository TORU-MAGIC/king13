// ================================================================
//  キングオブキングス v10.2 - オンラインチャット
// ================================================================
// 定型文 + 絵文字のクイックチャット。
// オンライン対戦中のみ画面右下にチャットボタンを表示し、
// タップでメッセージパネルを開いて送信する。
// PeerJS の既存接続に type:'chat' でメッセージを乗せる。
'use strict';

var CHAT_PRESETS=[
  '👋 こんにちは',
  '✊ よろしく',
  '👍 ナイス！',
  '😱 やられた…',
  '⚔ 攻めるよ',
  '🛡 守ります',
  '💰 金欠…',
  '⏰ ちょっと待って',
  '🎉 GG！',
  '🙇 ありがとう'
];
var CHAT_MAX_LOG=30; // 表示する最新メッセージ数
var _chatLog=[]; // {from, name, msg, t}
var _chatUnread=0;

/* ===== UI 初期化 ===== */
function _ensureChatUI(){
  if(document.getElementById('chatBtn'))return;
  // フロート ボタン（チャットを開く）
  var btn=document.createElement('button');
  btn.id='chatBtn';
  btn.innerHTML='💬';
  btn.title='チャット';
  btn.style.cssText=[
    'position:fixed','right:8px','bottom:120px','z-index:340',
    'width:44px','height:44px','border-radius:50%',
    'background:rgba(20,40,80,.92)','border:1px solid rgba(80,140,220,.6)',
    'color:#c8dff0','font-size:20px','cursor:pointer',
    'display:none','align-items:center','justify-content:center',
    'box-shadow:0 4px 12px rgba(0,0,0,.5)','touch-action:manipulation'
  ].join(';');
  btn.onclick=function(){openChatPanel();};
  document.body.appendChild(btn);

  // 未読バッジ
  var badge=document.createElement('span');
  badge.id='chatBadge';
  badge.style.cssText=[
    'position:absolute','top:-3px','right:-3px','min-width:18px','height:18px',
    'border-radius:9px','background:#e74c3c','color:#fff','font-size:10px',
    'font-weight:bold','display:none','align-items:center','justify-content:center',
    'padding:0 5px','pointer-events:none'
  ].join(';');
  btn.appendChild(badge);

  // パネル本体
  var panel=document.createElement('div');
  panel.id='chatPanel';
  panel.style.cssText=[
    'position:fixed','right:8px','bottom:170px','z-index:345',
    'width:min(280px,calc(100vw - 24px))','max-height:60vh',
    'background:rgba(6,12,24,.97)','border:1px solid rgba(80,140,220,.5)',
    'border-radius:10px','display:none','flex-direction:column',
    'box-shadow:0 6px 24px rgba(0,0,0,.6)',
    'font-family:var(--font)'
  ].join(';');
  panel.innerHTML=
    '<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;border-bottom:1px solid rgba(52,100,160,.3)">'+
      '<span style="color:var(--gold);font-size:12px;font-weight:bold">💬 チャット</span>'+
      '<button onclick="closeChatPanel()" style="background:transparent;border:none;color:#aaa;font-size:14px;cursor:pointer">✕</button>'+
    '</div>'+
    '<div id="chatLog" style="overflow-y:auto;max-height:30vh;padding:8px 12px;font-size:10.5px;line-height:1.7"></div>'+
    '<div style="border-top:1px solid rgba(52,100,160,.3);padding:6px;display:grid;grid-template-columns:1fr 1fr;gap:4px" id="chatPresets"></div>';
  document.body.appendChild(panel);

  // 定型文ボタンを生成
  var pg=document.getElementById('chatPresets');
  CHAT_PRESETS.forEach(function(msg){
    var b=document.createElement('button');
    b.className='btn';
    b.style.cssText='font-size:10px;padding:5px 4px;min-height:30px;margin:0';
    b.textContent=msg;
    b.onclick=function(){sendChatMessage(msg);};
    pg.appendChild(b);
  });
}

/* ===== 表示制御 ===== */
function showChatButton(){
  _ensureChatUI();
  var b=document.getElementById('chatBtn');
  if(b)b.style.display='flex';
}
function hideChatButton(){
  var b=document.getElementById('chatBtn');
  if(b)b.style.display='none';
}
function openChatPanel(){
  _ensureChatUI();
  var p=document.getElementById('chatPanel');
  if(p)p.style.display='flex';
  _chatUnread=0;_updChatBadge();
  _renderChatLog();
}
function closeChatPanel(){
  var p=document.getElementById('chatPanel');
  if(p)p.style.display='none';
}
function _updChatBadge(){
  var b=document.getElementById('chatBadge');
  if(!b)return;
  if(_chatUnread>0){
    b.style.display='flex';
    b.textContent=_chatUnread>9?'9+':_chatUnread;
  } else {
    b.style.display='none';
  }
}
function _renderChatLog(){
  var el=document.getElementById('chatLog');
  if(!el)return;
  if(_chatLog.length===0){
    el.innerHTML='<div style="color:var(--dim);text-align:center;padding:12px;font-size:9.5px">まだメッセージはありません</div>';
    return;
  }
  var html='';
  _chatLog.slice(-CHAT_MAX_LOG).forEach(function(m){
    var pc=(typeof PCOLS!=='undefined'&&PCOLS[m.from])||{light:'#c8dff0',main:'#888'};
    var ts=new Date(m.t);
    var tsStr=String(ts.getHours()).padStart(2,'0')+':'+String(ts.getMinutes()).padStart(2,'0');
    html+='<div style="margin-bottom:4px">';
    html+='<span style="color:'+pc.light+';font-weight:bold">'+_escapeHtml(m.name)+'</span>';
    html+='<span style="color:var(--dim);font-size:8px;margin-left:4px">'+tsStr+'</span><br>';
    html+='<span style="color:#e0e8f0">'+_escapeHtml(m.msg)+'</span>';
    html+='</div>';
  });
  el.innerHTML=html;
  el.scrollTop=el.scrollHeight;
}
function _escapeHtml(s){
  return String(s).replace(/[&<>"']/g,function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
  });
}

/* ===== 送受信 ===== */
function sendChatMessage(msg){
  if(!msg)return;
  if(typeof onlineMode==='undefined'||!onlineMode){
    if(typeof showMsg==='function')showMsg('オンライン対戦中のみ使えます',1500);
    return;
  }
  msg=String(msg).slice(0,60);
  var pid=(typeof myPeerIdx==='number')?myPeerIdx:0;
  var name=(typeof myPlayerName==='string'&&myPlayerName)?myPlayerName:('P'+(pid+1));
  var packet={type:'chat',from:pid,name:name,msg:msg,t:Date.now()};
  // 自分の画面に即時反映
  receiveChatMessage(packet, true);
  // 配信
  if(typeof isHost!=='undefined'&&isHost){
    // ホスト: 全クライアントへ送信
    if(typeof onlineConns!=='undefined'){
      onlineConns.forEach(function(c){try{c.conn.send(packet);}catch(e){}});
    }
  } else {
    // クライアント: ホストへ送信 → ホストが他クライアントに転送
    if(typeof onlineConns!=='undefined'&&onlineConns[0]){
      try{onlineConns[0].conn.send(packet);}catch(e){}
    }
  }
}

function receiveChatMessage(packet, isSelf){
  if(!packet||!packet.msg)return;
  _chatLog.push(packet);
  if(_chatLog.length>200)_chatLog.shift();
  // パネルが閉じていれば未読カウント増・トースト表示
  var panel=document.getElementById('chatPanel');
  var panelOpen=panel&&panel.style.display==='flex';
  if(!isSelf&&!panelOpen){
    _chatUnread++;
    _updChatBadge();
    if(typeof showMsg==='function')showMsg('💬 '+packet.name+': '+packet.msg,2200);
  }
  if(panelOpen)_renderChatLog();
}

/* ===== オンライン受信ハンドラへの統合 =====
 *   既存の handleHostMsg / handleClientMsg をラップして
 *   type:'chat' を捌けるようにする。
 */
window.addEventListener('DOMContentLoaded',function(){
  // ホスト側
  if(typeof handleHostMsg==='function'&&!handleHostMsg._chatHooked){
    var _origHHM=handleHostMsg;
    window.handleHostMsg=function(conn,data,seat){
      if(data&&data.type==='chat'){
        // 受信したチャットを自分で表示 + 他クライアントへ転送
        receiveChatMessage(data,false);
        if(typeof onlineConns!=='undefined'){
          onlineConns.forEach(function(c){
            if(c.conn!==conn){try{c.conn.send(data);}catch(e){}}
          });
        }
        return;
      }
      return _origHHM.apply(this,arguments);
    };
    window.handleHostMsg._chatHooked=true;
  }
  // クライアント側
  if(typeof handleClientMsg==='function'&&!handleClientMsg._chatHooked){
    var _origHCM=handleClientMsg;
    window.handleClientMsg=function(data){
      if(data&&data.type==='chat'){
        receiveChatMessage(data,false);
        return;
      }
      return _origHCM.apply(this,arguments);
    };
    window.handleClientMsg._chatHooked=true;
  }

  /* startGame にフック: オンライン時のみチャットボタンを表示 */
  if(typeof startGame==='function'&&!startGame._chatHooked){
    var _origSG=startGame;
    window.startGame=function(){
      var ret=_origSG.apply(this,arguments);
      try{
        if(typeof onlineMode!=='undefined'&&onlineMode)showChatButton();
        else hideChatButton();
      }catch(e){}
      return ret;
    };
    window.startGame._chatHooked=true;
  }
});
