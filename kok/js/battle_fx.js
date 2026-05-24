// ================================================================
//  キングオブキングス v10.2 - 戦闘演出強化
//  ① 戦闘開始カメラズーム
//  ② 必殺技カットイン（crit/awakened/×4特効/chain3+）
//  ③ ユニット別専用攻撃エフェクト（16種）
// ================================================================
'use strict';

/* ====================================================================
 * ① 戦闘開始カメラズーム
 * ================================================================== */
function applyBattleStartZoom(){
  var arena=document.querySelector('.b-arena');
  if(arena){
    arena.classList.remove('do-battle-zoom-in');
    void arena.offsetWidth;
    arena.classList.add('do-battle-zoom-in');
    // 終了後にクラス除去（再生成時にチラつかない）
    setTimeout(function(){arena&&arena.classList.remove('do-battle-zoom-in');},900);
  }
  // 背景フラッシュ
  var bs=document.getElementById('battleScreen');
  if(bs){
    bs.classList.remove('do-battle-flash-in');
    void bs.offsetWidth;
    bs.classList.add('do-battle-flash-in');
    setTimeout(function(){bs&&bs.classList.remove('do-battle-flash-in');},700);
  }
}

/* ====================================================================
 * ② 必殺技カットイン
 *   - 大型の中央オーバーレイ。背景は回転コニックグラデ。
 *   - 1秒で自動消滅。pointer-events:none。
 *   - 引数:
 *     unitType: ユニット種別
 *     ownerPid: 所有プレイヤーID（色決定）
 *     opts: {name, sub, isCrit, isAwakened, elem, atkStyle}
 * ================================================================== */
function showSkillCutin(unitType, ownerPid, opts){
  opts=opts||{};
  // 既存カットインがあれば即削除
  var old=document.getElementById('skillCutin');
  if(old&&old.parentElement)old.parentElement.removeChild(old);

  var pc=(typeof PCOLS!=='undefined'&&PCOLS[ownerPid])||{main:'#888',light:'#ccc',dark:'#444'};
  var ud=(typeof UDEFS!=='undefined'&&UDEFS[unitType])||{name:unitType,sym:'?',elem:'none'};
  var ei=(typeof ELEM_INFO!=='undefined'&&ELEM_INFO[opts.elem||ud.elem||'none'])||{col:'#fff',name:''};
  var sym=ud.sym||'⚔';
  var name=opts.name||ud.name||unitType;
  var sub=opts.sub||'SPECIAL STRIKE';

  // 強度別の色合い
  var accentColor=opts.isCrit?'#ffdc44':opts.isAwakened?'#c8a8ff':pc.light;
  var glowColor=opts.isCrit?'rgba(255,140,30,.85)':opts.isAwakened?'rgba(180,120,255,.7)':pc.main;

  var el=document.createElement('div');
  el.id='skillCutin';
  el.className='b-skill-cutin '+(opts.isCrit?'crit':'')+(opts.isAwakened?' awakened':'');
  el.style.setProperty('--accent',accentColor);
  el.style.setProperty('--glow',glowColor);
  el.style.setProperty('--elem',ei.col);
  el.innerHTML=
    '<div class="scu-bg"></div>'+
    '<div class="scu-streak"></div>'+
    '<div class="scu-inner">'+
      '<div class="scu-sym" style="color:'+ei.col+'">'+sym+'</div>'+
      '<div class="scu-textwrap">'+
        '<div class="scu-name" style="color:'+accentColor+'">'+name+'</div>'+
        '<div class="scu-sub">'+sub+'</div>'+
      '</div>'+
    '</div>';
  document.body.appendChild(el);

  // 自動消滅
  setTimeout(function(){if(el&&el.parentElement)el.parentElement.removeChild(el);},950);

  // 同時にスクリーンフラッシュ（クリティカル時のみ）
  if(opts.isCrit){
    var fl=document.createElement('div');
    fl.className='b-skill-flash';
    document.body.appendChild(fl);
    setTimeout(function(){if(fl&&fl.parentElement)fl.parentElement.removeChild(fl);},380);
  }
}

/* ====================================================================
 * ③ ユニット別専用攻撃エフェクト
 *   - 既存 spawnAttackSignature の後に呼ばれる「追加レイヤー」
 *   - 各ユニットに見た目で識別できる固有パターンを与える
 * ================================================================== */
function spawnUnitSpecificFx(x1,y1,x2,y2,type,elem,col,isCrit){
  if(!type)return;
  var ei=(typeof ELEM_INFO!=='undefined'&&ELEM_INFO[elem||'none'])||{col:'#fff'};

  switch(type){
    case 'ninja':
      // 闇の三日月斬撃 + シャドウ残像
      _fxCrescentSlash(x1,y1,x2,y2,'#8844ff',isCrit?5:3);
      _fxShadowTrail(x1,y1,x2,y2,'#440080',isCrit?16:10);
      break;
    case 'assassin':
      // 連続多段斬り + ブラッドミスト
      _fxMultiSlash(x1,y1,x2,y2,'#ff2244',isCrit?6:4);
      _fxBloodMist(x2,y2,isCrit?35:22);
      break;
    case 'paladin':
      // 聖なる十字光 + 光柱
      _fxHolyCross(x2,y2,'#ffffaa',isCrit?1.5:1);
      _fxLightPillar(x2,y2,'#fff0aa',isCrit);
      break;
    case 'knight':
      // 騎馬突撃 + 砂塵
      _fxCavalryCharge(x1,y1,x2,y2,'#ffcc44',col);
      _fxDustCloud(x2,y2,18);
      break;
    case 'berserker':
      // 紅蓮の渦 + 怒気バースト
      _fxRageVortex(x2,y2,'#ff3300',isCrit?40:26);
      break;
    case 'witch':
      // 闇の螺旋 + ヘックスサークル
      _fxDarkSpiral(x2,y2,'#aa44ff',isCrit?32:20);
      _fxHexCircle(x2,y2,'#ee44ff');
      break;
    case 'hero':
      // 黄金の十字バースト + 聖光
      _fxGoldCross(x2,y2,'#ffdd44',isCrit?2:1.4);
      _fxHolyBeam(x1,y1,x2,y2,'#fff0aa');
      break;
    case 'phoenix':
      // 炎の翼 + 火の粉雨
      _fxFireWings(x2,y2,'#ff6644',isCrit);
      _fxEmberRain(x2,y2,'#ff8844',isCrit?40:24);
      break;
    case 'golem':
      // 大地の亀裂 + 岩石飛散
      _fxEarthCrack(x2,y2,'#aa8844',isCrit?5:3);
      _fxRockShards(x2,y2,'#998866',16);
      break;
    case 'titan':
      // 巨大衝撃波（多重リング）+ 地震
      _fxGiantShockwave(x2,y2,'#ddbb88',isCrit?3:2);
      _fxMicroShake();
      break;
    case 'valkyrie':
      // 雷撃の槍 + 稲妻
      _fxLightningStrike(x2,y2,'#ffee44',isCrit);
      _fxThunderArcs(x2,y2,'#aaccff',isCrit?6:4);
      break;
    case 'monk':
      // 螺旋気弾 + 黄色エネルギーリング
      _fxKiBlast(x1,y1,x2,y2,'#ffcc44');
      _fxKiRings(x2,y2,'#ffee88',3);
      break;
    case 'dualblader':
      // X字交差斬り + 双流
      _fxCrossSlash(x2,y2,'#88ddff',isCrit?1.6:1.2);
      break;
    case 'pirate':
      // 砲弾爆発 + 黒煙
      _fxCannonExplosion(x2,y2,'#ff8800',isCrit);
      _fxSmokePuffs(x2,y2,'#444444',12);
      break;
    case 'dragonknight':
      // 雷槍貫通 + シールドオーラ
      _fxSpearPierce(x1,y1,x2,y2,'#88ccff');
      _fxShieldAura(x1,y1,'#aaccff');
      break;
    case 'healer':
      // 光の癒し弾（攻撃時も光る）
      _fxHealingBolt(x1,y1,x2,y2,'#aaffaa');
      break;
    case 'spy':
      // 影の急襲線
      _fxShadowDash(x1,y1,x2,y2,'#6644aa');
      break;
    case 'arcanelord':
      // プリズマティックリング（3色重ね）
      _fxPrismaticRings(x2,y2,isCrit);
      break;
    case 'necromancer':
      // 緑の瘴気 + 髑髏オーラ
      _fxMiasma(x2,y2,'#44ff66',isCrit?30:20);
      break;
    case 'king':
      // 王の威光 黄金波動
      _fxRoyalAura(x2,y2,'#ffdd44',isCrit?2:1.4);
      break;
    case 'soldier':
      // 槍突き火花
      _fxSparkBurst(x2,y2,col||'#ffffff',12);
      break;
    case 'skeleton':
      // 骨片散布
      _fxBoneShards(x2,y2,'#ddccaa',10);
      break;
    case 'mage':
      // 魔法陣（青）+ 短いビーム
      _fxMageCircle(x2,y2,'#88ccff',isCrit);
      break;
    case 'archer':
    case 'catapult':
      // 既存処理が十分なのでスキップ
      break;
  }
}

/* ====================================================================
 * 個別エフェクト関数（particles 配列に流し込む）
 *   グローバル `particles` と `spawnShockwave` は render.js に存在
 * ================================================================== */

// 三日月斬撃
function _fxCrescentSlash(x1,y1,x2,y2,col,count){
  for(var k=0;k<count;k++){
    var offset=(k-(count-1)/2)*14;
    var nx=(x2-x1),ny=(y2-y1);
    var len=Math.sqrt(nx*nx+ny*ny)||1;
    var px=-ny/len*offset,py=nx/len*offset;
    for(var i=0;i<10;i++){
      var t=i/9,xx=x1+px+(x2-x1)*t,yy=y1+py+(y2-y1)*t;
      particles.push({x:xx,y:yy,vx:(Math.random()-.5)*4,vy:(Math.random()-.5)*4,sz:Math.random()*5+4,col:i%3?'#fff':col,alpha:1,type:'magic',decay:.04});
    }
  }
}

// シャドウ残像
function _fxShadowTrail(x1,y1,x2,y2,col,count){
  for(var i=0;i<count;i++){
    var t=i/count,xx=x1+(x2-x1)*t,yy=y1+(y2-y1)*t;
    particles.push({x:xx,y:yy,vx:(Math.random()-.5)*2,vy:-2-Math.random()*2,sz:Math.random()*9+4,col:col,alpha:.7,type:'magic',decay:.025});
  }
}

// 多段斬り（赤い軌跡が連続）
function _fxMultiSlash(x1,y1,x2,y2,col,count){
  for(var k=0;k<count;k++){
    (function(idx){
      setTimeout(function(){
        for(var i=0;i<12;i++){
          var t=i/11,off=(idx-count/2)*10;
          var xx=x1+(x2-x1)*t,yy=y1+off+(y2-y1)*t;
          particles.push({x:xx,y:yy,vx:(Math.random()-.5)*6,vy:(Math.random()-.5)*4,sz:Math.random()*6+3,col:i%2?col:'#fff',alpha:1,type:'hit',decay:.05});
        }
      },idx*45);
    })(k);
  }
}

// 血飛沫
function _fxBloodMist(x,y,count){
  for(var i=0;i<count;i++){
    var a=Math.random()*Math.PI*2,sp=Math.random()*9+3;
    particles.push({x:x,y:y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-2,sz:Math.random()*4+2,col:'#cc1122',alpha:1,type:'hit',decay:.035});
  }
}

// 聖なる十字
function _fxHolyCross(x,y,col,scale){
  scale=scale||1;
  // 縦線
  for(var i=0;i<24;i++){
    var dy=(i-12)*(8*scale);
    particles.push({x:x,y:y+dy,vx:0,vy:-2,sz:6*scale,col:i%2?'#fff':col,alpha:.85,type:'magic',decay:.028});
  }
  // 横線
  for(var i=0;i<24;i++){
    var dx=(i-12)*(8*scale);
    particles.push({x:x+dx,y:y,vx:dx>0?2:-2,vy:0,sz:6*scale,col:i%2?'#fff':col,alpha:.85,type:'magic',decay:.028});
  }
  spawnShockwave(x,y,col,90*scale);
}

// 光柱
function _fxLightPillar(x,y,col,isCrit){
  for(var i=0;i<30;i++){
    particles.push({x:x+(Math.random()-.5)*40,y:y-i*8,vx:0,vy:-2-Math.random()*3,sz:Math.random()*10+5,col:i%3===0?'#fff':col,alpha:.9,type:'magic',decay:.018});
  }
  if(isCrit)spawnShockwave(x,y,col,120);
}

// 騎馬突撃
function _fxCavalryCharge(x1,y1,x2,y2,col,baseCol){
  var dx=x2-x1,dy=y2-y1,len=Math.sqrt(dx*dx+dy*dy)||1;
  for(var i=0;i<20;i++){
    var t=i/19,xx=x1+dx*t,yy=y1+dy*t;
    particles.push({x:xx,y:yy+(Math.random()-.5)*20,vx:dx/len*6+(Math.random()-.5)*3,vy:-1-Math.random()*2,sz:Math.random()*8+4,col:i%3?'#fff':col,alpha:1,type:'hit',decay:.04});
  }
  spawnShockwave(x2,y2,baseCol||col,80);
}

// 砂塵
function _fxDustCloud(x,y,count){
  for(var i=0;i<count;i++){
    var a=Math.random()*Math.PI;
    particles.push({x:x+(Math.random()-.5)*30,y:y+10,vx:Math.cos(a)*(Math.random()*4+1),vy:-Math.random()*3,sz:Math.random()*9+6,col:'#aa9966',alpha:.6,type:'magic',decay:.025});
  }
}

// 紅蓮の渦
function _fxRageVortex(x,y,col,count){
  for(var i=0;i<count;i++){
    var a=i/count*Math.PI*2*3;
    var r=15+i*1.2;
    particles.push({x:x+Math.cos(a)*r,y:y+Math.sin(a)*r,vx:-Math.cos(a)*5,vy:-Math.sin(a)*5-2,sz:Math.random()*8+5,col:i%4===0?'#ffaa00':col,alpha:1,type:'magic',decay:.025});
  }
  spawnShockwave(x,y,col,110);
}

// 闇の螺旋
function _fxDarkSpiral(x,y,col,count){
  for(var i=0;i<count;i++){
    (function(idx){
      setTimeout(function(){
        var a=idx*0.5,r=idx*2.5+10;
        for(var j=0;j<3;j++){
          var ang=a+j*Math.PI*2/3;
          particles.push({x:x+Math.cos(ang)*r,y:y+Math.sin(ang)*r,vx:Math.cos(ang)*3,vy:Math.sin(ang)*3-1,sz:Math.random()*7+3,col:j%2?'#fff':col,alpha:1,type:'magic',decay:.03});
        }
      },idx*18);
    })(i);
  }
}

// ヘックスサークル
function _fxHexCircle(x,y,col){
  for(var i=0;i<6;i++){
    var a=i/6*Math.PI*2;
    for(var j=0;j<8;j++){
      var t=j/7;
      var xx=x+Math.cos(a)*40*t+Math.cos(a+Math.PI/3)*40*(1-t);
      var yy=y+Math.sin(a)*40*t+Math.sin(a+Math.PI/3)*40*(1-t);
      particles.push({x:xx,y:yy,vx:0,vy:0,sz:3,col:col,alpha:.7,type:'hit',decay:.04});
    }
  }
}

// 黄金十字バースト
function _fxGoldCross(x,y,col,scale){
  scale=scale||1;
  spawnShockwave(x,y,'#ffeebb',90*scale);
  spawnShockwave(x,y,col,140*scale);
  for(var i=0;i<60;i++){
    var a=i/60*Math.PI*2;
    var sp=12*scale;
    particles.push({x:x,y:y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-3,sz:Math.random()*9+4,col:i%4===0?'#fff':col,alpha:1,type:'magic',decay:.018});
  }
}

// 聖光ビーム
function _fxHolyBeam(x1,y1,x2,y2,col){
  for(var i=0;i<25;i++){
    var t=i/24,xx=x1+(x2-x1)*t,yy=y1+(y2-y1)*t;
    particles.push({x:xx,y:yy,vx:0,vy:-2,sz:Math.random()*7+6,col:i%3===0?'#fff':col,alpha:.9,type:'magic',decay:.028});
  }
}

// 炎の翼
function _fxFireWings(x,y,col,isCrit){
  var spread=isCrit?70:50;
  for(var i=0;i<26;i++){
    var t=i/25;
    var ay=-spread+t*spread*2;
    particles.push({x:x-30-i*1.5,y:y+ay,vx:-2-Math.random()*3,vy:(Math.random()-.5)*4,sz:Math.random()*10+5,col:i%3===0?'#fff':col,alpha:1,type:'magic',decay:.025});
    particles.push({x:x+30+i*1.5,y:y+ay,vx:2+Math.random()*3,vy:(Math.random()-.5)*4,sz:Math.random()*10+5,col:i%3===0?'#fff':col,alpha:1,type:'magic',decay:.025});
  }
}

// 火の粉雨
function _fxEmberRain(x,y,col,count){
  for(var i=0;i<count;i++){
    particles.push({x:x+(Math.random()-.5)*70,y:y-50-Math.random()*30,vx:(Math.random()-.5)*2,vy:Math.random()*5+2,sz:Math.random()*4+2,col:col,alpha:1,type:'magic',decay:.02});
  }
}

// 大地の亀裂
function _fxEarthCrack(x,y,col,count){
  for(var i=0;i<count;i++){
    var a=i/count*Math.PI*2;
    for(var j=0;j<10;j++){
      var r=j*8;
      particles.push({x:x+Math.cos(a)*r,y:y+Math.sin(a)*r+5,vx:0,vy:1,sz:Math.random()*5+3,col:j%2?col:'#665544',alpha:.85,type:'hit',decay:.04});
    }
  }
}

// 岩石飛散
function _fxRockShards(x,y,col,count){
  for(var i=0;i<count;i++){
    var a=Math.random()*Math.PI*2,sp=Math.random()*10+4;
    particles.push({x:x,y:y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-5,sz:Math.random()*7+4,col:col,alpha:1,type:'hit',decay:.025});
  }
}

// 巨大衝撃波
function _fxGiantShockwave(x,y,col,scale){
  scale=scale||1;
  spawnShockwave(x,y,col,90*scale);
  setTimeout(function(){spawnShockwave(x,y,'#fff',120*scale);},80);
  setTimeout(function(){spawnShockwave(x,y,col,160*scale);},160);
}

// 軽い画面振動
function _fxMicroShake(){
  var bs=document.getElementById('battleScreen');
  if(bs){bs.classList.remove('do-screen-shake');void bs.offsetWidth;bs.classList.add('do-screen-shake');}
}

// 雷撃の槍
function _fxLightningStrike(x,y,col,isCrit){
  for(var i=0;i<20;i++){
    var yy=y-300+i*15+Math.sin(i*.7)*15;
    var xx=x+(Math.random()-.5)*12;
    particles.push({x:xx,y:yy,vx:0,vy:0,sz:Math.random()*8+6,col:i%2?'#fff':col,alpha:1,type:'magic',decay:.04});
  }
  spawnShockwave(x,y,col,isCrit?120:80);
}

// 稲妻アーク
function _fxThunderArcs(x,y,col,count){
  for(var k=0;k<count;k++){
    var a=k/count*Math.PI*2;
    for(var i=0;i<10;i++){
      var r=i*7;
      var ang=a+Math.sin(i*.8)*.5;
      particles.push({x:x+Math.cos(ang)*r,y:y+Math.sin(ang)*r,vx:0,vy:0,sz:Math.random()*5+2,col:i%2?'#fff':col,alpha:1,type:'hit',decay:.06});
    }
  }
}

// 螺旋気弾
function _fxKiBlast(x1,y1,x2,y2,col){
  var dx=x2-x1,dy=y2-y1;
  for(var i=0;i<20;i++){
    var t=i/19,xx=x1+dx*t,yy=y1+dy*t;
    var a=t*Math.PI*4,r=8;
    particles.push({x:xx+Math.cos(a)*r,y:yy+Math.sin(a)*r,vx:0,vy:0,sz:Math.random()*8+5,col:i%2?'#fff':col,alpha:1,type:'magic',decay:.035});
  }
}

// 気のリング
function _fxKiRings(x,y,col,count){
  for(var i=0;i<count;i++){
    (function(idx){setTimeout(function(){spawnShockwave(x,y,col,60+idx*30);},idx*100);})(i);
  }
}

// X字交差斬り
function _fxCrossSlash(x,y,col,scale){
  scale=scale||1;
  // 「\」斬撃
  for(var i=0;i<20;i++){
    var t=i/19-.5;
    particles.push({x:x+t*80*scale,y:y+t*80*scale,vx:0,vy:0,sz:Math.random()*7+4,col:i%2?'#fff':col,alpha:1,type:'magic',decay:.04});
  }
  // 「/」斬撃 — 少し遅延
  setTimeout(function(){
    for(var i=0;i<20;i++){
      var t=i/19-.5;
      particles.push({x:x+t*80*scale,y:y-t*80*scale,vx:0,vy:0,sz:Math.random()*7+4,col:i%2?'#fff':col,alpha:1,type:'magic',decay:.04});
    }
  },150);
}

// 砲弾爆発
function _fxCannonExplosion(x,y,col,isCrit){
  spawnShockwave(x,y,col,isCrit?140:100);
  for(var i=0;i<40;i++){
    var a=Math.random()*Math.PI*2,sp=Math.random()*16+5;
    particles.push({x:x,y:y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-4,sz:Math.random()*9+5,col:i%3?'#ffaa00':col,alpha:1,type:'magic',decay:.022});
  }
}

// 黒煙
function _fxSmokePuffs(x,y,col,count){
  for(var i=0;i<count;i++){
    particles.push({x:x+(Math.random()-.5)*40,y:y+(Math.random()-.5)*40,vx:(Math.random()-.5)*1,vy:-1-Math.random()*2,sz:Math.random()*14+8,col:col,alpha:.5,type:'magic',decay:.012});
  }
}

// 雷槍貫通
function _fxSpearPierce(x1,y1,x2,y2,col){
  var dx=x2-x1,dy=y2-y1;
  for(var i=0;i<25;i++){
    var t=i/24,xx=x1+dx*t,yy=y1+dy*t;
    particles.push({x:xx,y:yy,vx:0,vy:0,sz:Math.random()*6+5,col:i%2?'#fff':col,alpha:1,type:'magic',decay:.045});
  }
  spawnShockwave(x2,y2,col,90);
}

// シールドオーラ
function _fxShieldAura(x,y,col){
  for(var i=0;i<12;i++){
    var a=i/12*Math.PI*2;
    particles.push({x:x+Math.cos(a)*30,y:y+Math.sin(a)*30,vx:Math.cos(a)*1,vy:Math.sin(a)*1,sz:5,col:col,alpha:.8,type:'magic',decay:.025});
  }
}

// 癒し光弾
function _fxHealingBolt(x1,y1,x2,y2,col){
  var dx=x2-x1,dy=y2-y1;
  for(var i=0;i<15;i++){
    var t=i/14,xx=x1+dx*t,yy=y1+dy*t-Math.sin(t*Math.PI)*40;
    particles.push({x:xx,y:yy,vx:0,vy:0,sz:Math.random()*8+5,col:i%3===0?'#fff':col,alpha:1,type:'magic',decay:.03});
  }
}

// 影の急襲線
function _fxShadowDash(x1,y1,x2,y2,col){
  for(var i=0;i<15;i++){
    var t=i/14,xx=x1+(x2-x1)*t,yy=y1+(y2-y1)*t;
    particles.push({x:xx+(Math.random()-.5)*20,y:yy+(Math.random()-.5)*20,vx:0,vy:0,sz:Math.random()*8+4,col:col,alpha:.7,type:'magic',decay:.03});
  }
}

// プリズマティックリング
function _fxPrismaticRings(x,y,isCrit){
  var cols=['#ff4488','#44aaff','#88ff88','#ffaa44','#cc44ff'];
  cols.forEach(function(c,i){
    setTimeout(function(){spawnShockwave(x,y,c,70+i*25);},i*60);
  });
  if(isCrit){
    for(var i=0;i<40;i++){
      var a=i/40*Math.PI*2,sp=8;
      particles.push({x:x,y:y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-2,sz:Math.random()*8+4,col:cols[i%5],alpha:1,type:'magic',decay:.022});
    }
  }
}

// 緑の瘴気
function _fxMiasma(x,y,col,count){
  for(var i=0;i<count;i++){
    var a=Math.random()*Math.PI*2;
    particles.push({x:x+Math.cos(a)*15,y:y+Math.sin(a)*15,vx:Math.cos(a)*(Math.random()*3+1),vy:Math.sin(a)*(Math.random()*3+1)-2,sz:Math.random()*12+6,col:i%4===0?'#000':col,alpha:.65,type:'magic',decay:.015});
  }
}

// 王の威光
function _fxRoyalAura(x,y,col,scale){
  scale=scale||1;
  spawnShockwave(x,y,'#ffffff',60*scale);
  spawnShockwave(x,y,col,110*scale);
  for(var i=0;i<24;i++){
    var a=i/24*Math.PI*2;
    particles.push({x:x,y:y,vx:Math.cos(a)*7,vy:Math.sin(a)*7,sz:Math.random()*9+5,col:i%3===0?'#fff':col,alpha:1,type:'magic',decay:.024});
  }
}

// 火花バースト
function _fxSparkBurst(x,y,col,count){
  for(var i=0;i<count;i++){
    var a=Math.random()*Math.PI*2,sp=Math.random()*8+3;
    particles.push({x:x,y:y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-2,sz:Math.random()*4+2,col:i%2?'#fff':col,alpha:1,type:'hit',decay:.05});
  }
}

// 骨片散布
function _fxBoneShards(x,y,col,count){
  for(var i=0;i<count;i++){
    var a=Math.random()*Math.PI*2,sp=Math.random()*7+3;
    particles.push({x:x,y:y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-3,sz:Math.random()*5+3,col:col,alpha:1,type:'hit',decay:.03});
  }
}

// 魔法陣
function _fxMageCircle(x,y,col,isCrit){
  for(var r=0;r<3;r++){spawnShockwave(x,y,col,50+r*30);}
  for(var i=0;i<18;i++){
    var a=i/18*Math.PI*2,rad=30;
    particles.push({x:x+Math.cos(a)*rad,y:y+Math.sin(a)*rad,vx:0,vy:0,sz:4,col:col,alpha:.85,type:'magic',decay:.03});
  }
  if(isCrit){
    for(var i=0;i<24;i++){
      var a=i/24*Math.PI*2,sp=6;
      particles.push({x:x,y:y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-2,sz:Math.random()*7+3,col:'#fff',alpha:1,type:'magic',decay:.028});
    }
  }
}

/* ====================================================================
 * 既存関数のラップ（フック設置）
 * ================================================================== */
window.addEventListener('DOMContentLoaded',function(){
  /* ① showBattle 全体をラップ: カメラズーム + 必殺技カットイン */
  if(typeof showBattle==='function'&&!showBattle._fxV2Hooked){
    var _origShowBattle=showBattle;
    showBattle=function(res,cb,fast){
      // CPU vs CPU で skip される場合はカメラズームしない（オーバーヘッド回避）
      var isCpuBattle=GS&&typeof isHuman==='function'&&!isHuman(res&&res.atkOwner)&&!isHuman(res&&res.defOwner);
      var willSkip=(typeof battleSpeedMode!=='undefined'&&battleSpeedMode==='skip'&&isCpuBattle);
      if(onlineMode&&res){
        var iAmInv=(res.atkOwner===myPeerIdx||res.defOwner===myPeerIdx);
        if(!iAmInv&&isCpuBattle&&battleSpeedMode==='skip')willSkip=true;
      }
      if(!willSkip&&res){
        // 60ms 後にカメラズーム発動（DOM がアクティブ化された後）
        setTimeout(applyBattleStartZoom,60);
        // 必殺技カットイン: crit / awakened / 特効×4以上 / chain≥3 で発動
        var chainV=(GS&&GS.players&&GS.players[res.atkOwner]&&GS.players[res.atkOwner]._chain)||0;
        var trigger=res.isCrit||res.atkAwakened||res.affMult>=4||chainV>=3;
        if(trigger){
          var atkName=(res.atkAwakened&&getAwakenDef&&getAwakenDef(res.atkType))
            ?getAwakenDef(res.atkType).name:UDEFS[res.atkType].name;
          var sub='SPECIAL STRIKE';
          if(res.isCrit)sub='💥 CRITICAL STRIKE';
          else if(res.affMult>=5)sub='⚔ ULTIMATE WEAKNESS ×5';
          else if(res.affMult>=4)sub='⚔ SUPER EFFECTIVE ×4';
          else if(res.atkAwakened)sub='✨ AWAKENED POWER';
          else if(chainV>=3)sub='🔥 CHAIN ×'+chainV;
          // 戦闘画面表示直後にカットイン（200ms遅延 — ズームと被らせる）
          setTimeout(function(){
            showSkillCutin(res.atkType,res.atkOwner,{
              name:atkName,sub:sub,
              isCrit:res.isCrit,
              isAwakened:res.atkAwakened,
              elem:res.atkElem
            });
          },200);
        }
      }
      return _origShowBattle.apply(this,arguments);
    };
    showBattle._fxV2Hooked=true;
  }

  /* ③ spawnAttackSignature をラップ: ユニット別エフェクトを追加レイヤーで重ねる */
  if(typeof spawnAttackSignature==='function'&&!spawnAttackSignature._fxV2Hooked){
    var _origSAS=spawnAttackSignature;
    spawnAttackSignature=function(x1,y1,x2,y2,type,elem,col,isCrit){
      _origSAS.apply(this,arguments);
      try{spawnUnitSpecificFx(x1,y1,x2,y2,type,elem,col,isCrit);}
      catch(e){console.warn('[fx] spawnUnitSpecificFx failed:',e);}
    };
    spawnAttackSignature._fxV2Hooked=true;
  }
});
