// ================================================================
//  キングオブキングス v10.2 - 戦歴・統計システム
// ================================================================
// ゲーム終了時に localStorage に戦績を蓄積。
// タイトル画面の「📜 戦歴」ボタンからモーダルで閲覧できる。
'use strict';

var HISTORY_KEY='kok9_history';
var HISTORY_MAX=50; // 直近50戦まで保持

/* ===== ロード/セーブ ===== */
function loadHistory(){
  try{
    var s=localStorage.getItem(HISTORY_KEY);
    if(!s)return {games:[],aggregate:_emptyAggregate()};
    var d=JSON.parse(s);
    if(!d.games)d.games=[];
    if(!d.aggregate)d.aggregate=_emptyAggregate();
    return d;
  }catch(e){return {games:[],aggregate:_emptyAggregate()};}
}
function saveHistory(d){
  try{localStorage.setItem(HISTORY_KEY,JSON.stringify(d));}catch(e){console.warn('[history] save failed:',e);}
}
function _emptyAggregate(){
  return {
    totalGames:0, wins:0, losses:0, draws:0,
    totalRounds:0, totalKills:0, totalLosses:0, totalCaptures:0,
    bestWinRound:0, longestGame:0,
    unitUsage:{},   // {type: count}  生産・配備したユニット
    unitKills:{},   // {type: count}  撃破に貢献したユニット
    modes:{offline:0, online:0, scenario:0},
    lastPlayed:0
  };
}

/* ===== 戦績の記録（ゲーム終了時に呼ぶ） ===== */
function recordGameResult(){
  if(!GS||!GS.over)return;
  var d=loadHistory();
  var myPid=(typeof getMyPid==='function')?getMyPid():0;
  var iWon=(GS.winner===myPid);
  var iAlive=GS.players[myPid]&&GS.players[myPid].alive;
  var mode='offline';
  if(typeof onlineMode!=='undefined'&&onlineMode)mode='online';
  if(GS.scenarioMode)mode='scenario';

  var entry={
    date:Date.now(),
    mode:mode,
    rounds:GS.round,
    winner:GS.winner,
    winnerName:GS.winner>=0?(GS.players[GS.winner]&&GS.players[GS.winner].name):'引き分け',
    np:GS.np,
    myPid:myPid,
    myResult:iWon?'win':(iAlive?'draw':'loss'),
    myStats:GS.stats[myPid]?Object.assign({},GS.stats[myPid]):null,
    // 各プレイヤーの成績サマリ
    players:GS.players.map(function(p,i){
      return {
        name:p.name,
        aiType:p.aiType,
        alive:!!p.alive,
        killed:GS.stats[i]?GS.stats[i].killed:0,
        lost:GS.stats[i]?GS.stats[i].lost:0,
        captured:GS.stats[i]?GS.stats[i].captured:0
      };
    })
  };
  d.games.unshift(entry);
  if(d.games.length>HISTORY_MAX)d.games.length=HISTORY_MAX;

  // 集計更新
  var ag=d.aggregate;
  ag.totalGames++;
  if(iWon)ag.wins++;
  else if(iAlive)ag.draws++;
  else ag.losses++;
  ag.totalRounds+=GS.round;
  ag.totalKills+=(entry.myStats?entry.myStats.killed:0);
  ag.totalLosses+=(entry.myStats?entry.myStats.lost:0);
  ag.totalCaptures+=(entry.myStats?entry.myStats.captured:0);
  if(iWon&&(ag.bestWinRound===0||GS.round<ag.bestWinRound))ag.bestWinRound=GS.round;
  if(GS.round>ag.longestGame)ag.longestGame=GS.round;
  ag.modes[mode]=(ag.modes[mode]||0)+1;
  ag.lastPlayed=Date.now();

  // ユニット使用統計
  GS.units.forEach(function(u){
    if(u.owner!==myPid)return;
    ag.unitUsage[u.type]=(ag.unitUsage[u.type]||0)+1;
  });

  saveHistory(d);
}

/* ===== モーダル表示 ===== */
function openHistoryModal(){
  var d=loadHistory();
  var ag=d.aggregate;
  var html='';
  if(ag.totalGames===0){
    html+='<div style="text-align:center;padding:24px;color:var(--dim);font-size:11px">まだ戦歴がありません。<br>ゲームをプレイすると、ここに自動で記録されます。</div>';
  } else {
    var winRate=ag.totalGames>0?((ag.wins/ag.totalGames)*100).toFixed(1):'0';
    var avgRound=ag.totalGames>0?(ag.totalRounds/ag.totalGames).toFixed(1):'0';
    html+='<div class="prow3"><div style="color:var(--gold);font-weight:bold;margin-bottom:6px">📊 累計統計</div>';
    html+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:10px">';
    html+='<div>🏆 通算成績</div><div><b style="color:#7dffa8">'+ag.wins+'勝</b> '+ag.draws+'分 <b style="color:#ff9080">'+ag.losses+'敗</b></div>';
    html+='<div>📈 勝率</div><div><b style="color:var(--gold)">'+winRate+'%</b> ('+ag.totalGames+'戦)</div>';
    html+='<div>⚔ 総撃破</div><div>'+ag.totalKills+'体</div>';
    html+='<div>💀 総損失</div><div>'+ag.totalLosses+'体</div>';
    html+='<div>🏰 総占領</div><div>'+ag.totalCaptures+'箇所</div>';
    html+='<div>⏱ 平均ラウンド</div><div>'+avgRound+' R</div>';
    if(ag.bestWinRound>0)html+='<div>⚡ 最短勝利</div><div>'+ag.bestWinRound+' R</div>';
    html+='<div>📏 最長戦</div><div>'+ag.longestGame+' R</div>';
    html+='</div></div>';

    // モード別
    html+='<div class="prow3"><div style="color:var(--gold);font-weight:bold;margin-bottom:6px">🎮 モード別プレイ数</div>';
    html+='<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;font-size:10px;text-align:center">';
    html+='<div><div style="color:var(--dim);font-size:8px">🗺 オフライン</div><b>'+(ag.modes.offline||0)+'</b></div>';
    html+='<div><div style="color:var(--dim);font-size:8px">🌐 オンライン</div><b>'+(ag.modes.online||0)+'</b></div>';
    html+='<div><div style="color:var(--dim);font-size:8px">⚔ シナリオ</div><b>'+(ag.modes.scenario||0)+'</b></div>';
    html+='</div></div>';

    // ユニット使用ランキング（上位5体）
    var unitArr=Object.entries(ag.unitUsage).sort(function(a,b){return b[1]-a[1];}).slice(0,5);
    if(unitArr.length>0){
      html+='<div class="prow3"><div style="color:var(--gold);font-weight:bold;margin-bottom:6px">🏅 よく使うユニット TOP5</div>';
      html+='<div style="font-size:10px;line-height:1.9">';
      unitArr.forEach(function(e,i){
        var ud=UDEFS[e[0]]||{name:e[0],sym:'?'};
        var medal=['🥇','🥈','🥉','4位','5位'][i];
        html+='<div style="display:flex;justify-content:space-between"><span>'+medal+' '+ud.sym+' '+ud.name+'</span><span style="color:var(--gold)">'+e[1]+'回</span></div>';
      });
      html+='</div></div>';
    }

    // 直近の戦闘ログ（最大10戦）
    html+='<div class="prow3"><div style="color:var(--gold);font-weight:bold;margin-bottom:6px">📜 直近の対戦 (最新'+Math.min(10,d.games.length)+'件)</div>';
    html+='<div style="font-size:9.5px;line-height:1.7">';
    d.games.slice(0,10).forEach(function(g){
      var dt=new Date(g.date);
      var dateStr=(dt.getMonth()+1)+'/'+dt.getDate()+' '+dt.getHours()+':'+String(dt.getMinutes()).padStart(2,'0');
      var resColor=g.myResult==='win'?'#7dffa8':g.myResult==='loss'?'#ff9080':'#c8c8c8';
      var resSym=g.myResult==='win'?'🏆 勝':g.myResult==='loss'?'💀 敗':'🤝 分';
      var modeLabel={offline:'🗺',online:'🌐',scenario:'⚔'}[g.mode]||'?';
      html+='<div style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px solid rgba(30,60,100,.2)">';
      html+='<span style="color:'+resColor+'">'+resSym+'</span>';
      html+='<span style="flex:1;margin:0 6px;color:var(--dim);font-size:8.5px">'+modeLabel+' '+g.np+'P / R'+g.rounds+' / '+dateStr+'</span>';
      html+='<span style="color:'+resColor+';font-size:9px">撃破'+(g.myStats?g.myStats.killed:0)+'</span>';
      html+='</div>';
    });
    html+='</div></div>';

    // クリアボタン
    html+='<div style="text-align:center;margin-top:10px">';
    html+='<button class="btn" style="border-color:rgba(231,76,60,.5);color:#ff8080;max-width:200px;margin:0 auto" onclick="clearHistory()">🗑 戦歴をクリア</button>';
    html+='</div>';
  }
  document.getElementById('infoContent').innerHTML=html;
  document.getElementById('infoModalTitle').textContent='📜 戦歴・統計';
  document.getElementById('infoBg').classList.add('show');
  document.getElementById('infoSheet').classList.add('show');
}

function clearHistory(){
  if(!confirm('全ての戦歴を削除します。よろしいですか？'))return;
  try{localStorage.removeItem(HISTORY_KEY);}catch(e){}
  openHistoryModal();
  if(typeof showMsg==='function')showMsg('戦歴をクリアしました',1500);
}

/* ===== showGameOver にフック: ゲーム終了時に自動記録 ===== */
window.addEventListener('DOMContentLoaded',function(){
  if(typeof showGameOver==='function'&&!showGameOver._historyHooked){
    var _origSGO=showGameOver;
    window.showGameOver=function(){
      try{recordGameResult();}catch(e){console.warn('[history] record failed:',e);}
      return _origSGO.apply(this,arguments);
    };
    window.showGameOver._historyHooked=true;
  }

  /* ===== タイトル画面に「📜 戦歴」ボタンを動的追加 ===== */
  try{
    var modeBox=document.getElementById('modeBox');
    if(modeBox&&!document.getElementById('btnHistory')){
      var btn=document.createElement('button');
      btn.id='btnHistory';
      btn.className='btn';
      btn.style.cssText='border-color:rgba(100,200,200,.5);color:#80e8e8';
      btn.innerHTML='📜 戦歴・統計を見る';
      btn.onclick=function(){openHistoryModal();};
      modeBox.appendChild(btn);
    }
  }catch(e){console.warn('[history] button injection failed:',e);}
});
