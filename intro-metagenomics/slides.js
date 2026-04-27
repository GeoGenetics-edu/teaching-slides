
const COLORS={ga:'#0d9488',gb:'#3b82f6',gc:'#8b5cf6',gd:'#d97706',host:'#94a3b8',bad:'#dc2626',adapter:'#f59e0b'};
const GCOLS=[COLORS.ga,COLORS.gb,COLORS.gc,COLORS.gd];

// Slide ID resolver — eliminates hardcoded index numbers
const SID=(function(){
  const cache={};
  return function(id){
    if(cache[id]!==undefined) return cache[id];
    const sections=document.querySelectorAll('.reveal .slides>section');
    for(let i=0;i<sections.length;i++){
      if(sections[i].getAttribute('data-slide-id')===id){cache[id]=i;return i}
    }
    console.warn('Slide ID not found:',id);
    return -1;
  }
})();

const ACOLS=[...GCOLS,COLORS.host];
const W=[4,2.5,2.5,1,1.5];
function rng(s){return()=>{s=(s*16807+1)%2147483647;return(s-1)/2147483646}}
function ease(t){return t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2}

/* === Basic Reads (slide 2) === */
class Reads{
  constructor(id,opts={}){
    this.c=document.getElementById(id);if(!this.c)return;
    this.ctx=this.c.getContext('2d');this.nh=opts.noHost||false;
    this.reads=[];this.hover=null;this.ok=false;
    this.c.addEventListener('mousemove',e=>this.onM(e));
    this.c.addEventListener('mouseleave',()=>{this.hover=null;if(this.ok)this.draw()});
  }
  init(){
    const r=this.c.getBoundingClientRect();
    if(r.width<10||r.height<10)return false;
    const d=devicePixelRatio||1;
    this.c.width=r.width*d;this.c.height=r.height*d;
    this.ctx.setTransform(d,0,0,d,0,0);
    this.w=r.width;this.h=r.height;this.ok=true;return true;
  }
  gen(seed){
    if(!this.init())return;
    const R=rng(seed||Math.floor(Math.random()*1e5));
    this.reads=[];
    const cols=this.nh?GCOLS:ACOLS, wts=this.nh?W.slice(0,4):W, tw=wts.reduce((a,b)=>a+b,0);
    const rh=6,gap=4,px=10,py=6;
    const rows=Math.floor((this.h-py*2)/(rh+gap));
    for(let r=0;r<rows;r++){let x=px;const y=py+r*(rh+gap);
      while(x<this.w-px-20){const w=24+R()*56;
        let rv=R()*tw,cum=0,col=cols[0];
        for(let i=0;i<wts.length;i++){cum+=wts[i];if(rv<cum){col=cols[i];break}}
        this.reads.push({x,y,w,h:rh,color:col,isH:col===COLORS.host,d:R()*.8});
        x+=w+4+R()*4;
      }
    }
    this.animIn();
  }
  animIn(){
    const s=performance.now(),dur=800;
    const tick=n=>{const p=Math.min((n-s)/dur,1);
      this.ctx.clearRect(0,0,this.w,this.h);
      for(const r of this.reads){const t=Math.max(0,Math.min(1,(p-r.d)/(1-r.d)));
        const e=ease(t);this.dr(r,r.w*e,e)}
      if(p<1)requestAnimationFrame(tick);else this.draw();
    };requestAnimationFrame(tick);
  }
  dr(r,w,op){
    if(w<1)return;const c=this.ctx,rad=r.h/2;
    c.globalAlpha=r.isH?op*.35:op*.85;
    c.beginPath();c.roundRect(r.x,r.y,w,r.h,rad);c.fillStyle=r.color;c.fill();
    c.globalAlpha*=.15;c.beginPath();c.roundRect(r.x,r.y,w,r.h*.4,[rad,rad,0,0]);c.fillStyle='#fff';c.fill();
    if(this.hover===r){c.globalAlpha=.25;c.shadowColor=r.color;c.shadowBlur=10;
      c.beginPath();c.roundRect(r.x-1,r.y-1,w+2,r.h+2,rad+1);c.fillStyle=r.color;c.fill();c.shadowBlur=0}
    c.globalAlpha=1;
  }
  draw(){this.ctx.clearRect(0,0,this.w,this.h);for(const r of this.reads)this.dr(r,r.w,r.isH?.35:.85)}
  onM(e){if(!this.ok)return;const b=this.c.getBoundingClientRect(),mx=e.clientX-b.left,my=e.clientY-b.top;
    let f=null;for(const r of this.reads)if(mx>=r.x&&mx<=r.x+r.w&&my>=r.y&&my<=r.y+r.h){f=r;break}
    if(f!==this.hover){this.hover=f;this.draw();
      this.c.title=f?`${f.color===COLORS.ga?'Genome A':f.color===COLORS.gb?'Genome B':f.color===COLORS.gc?'Genome C':f.color===COLORS.gd?'Genome D':'Host'} read, ~${Math.round(f.w*3)}bp`:''}}
}

/* === QC Animation (slide 3) === */
class QCCanvas{
  constructor(id){
    this.c=document.getElementById(id);if(!this.c)return;
    this.ctx=this.c.getContext('2d');this.reads=[];this.ok=false;this.phase=0;this.animating=false;this.stepQueue=[];
  }
  init(){
    const r=this.c.getBoundingClientRect();
    if(r.width<10||r.height<10)return false;
    const d=devicePixelRatio||1;
    this.c.width=r.width*d;this.c.height=r.height*d;
    this.ctx.setTransform(d,0,0,d,0,0);
    this.w=r.width;this.h=r.height;this.ok=true;return true;
  }
  gen(seed){
    if(!this.init())return;this.phase=0;this.animating=false;
    const R=rng(seed||42);this.reads=[];
    const rh=7,gap=4,px=10,py=6;
    // Higher host weight for dramatic QC effect
    const cols=ACOLS,wts=[3.5,2,2,0.8,3],tw=wts.reduce((a,b)=>a+b,0);
    const rows=Math.floor((this.h-py*2)/(rh+gap));
    for(let row=0;row<rows;row++){let x=px;const y=py+row*(rh+gap);
      while(x<this.w-px-20){
        const baseW=22+R()*52;
        let rv=R()*tw,cum=0,col=cols[0];
        for(let i=0;i<wts.length;i++){cum+=wts[i];if(rv<cum){col=cols[i];break}}
        const isHost=col===COLORS.host;
        let prob='clean';
        if(isHost){prob='host'}
        else{const rr=R();if(rr<.35)prob='tail';else if(rr<.55)prob='adapter'}
        const tailW=prob==='tail'?(8+R()*14):0;
        const adapterW=prob==='adapter'?(8+R()*12):0;
        const totalW=baseW+tailW+adapterW;
        // Reads that become too short after trimming (base < 38px ~ <100bp)
        const tooShort=(!isHost&&(prob==='tail'||prob==='adapter')&&baseW<38);
        this.reads.push({
          x,y,h:rh,baseW,tailW,adapterW,totalW,
          color:col,isHost,prob,tooShort,
          trimmed:0,shortFade:1,hostFade:1,
          d:R()*.8
        });
        x+=totalW+4+R()*4;
      }
    }
    this.highlightStep(0);this.animIn();
  }
  animIn(){
    const s=performance.now(),dur=800;
    const tick=n=>{const p=Math.min((n-s)/dur,1);
      this.ctx.clearRect(0,0,this.w,this.h);
      for(const r of this.reads){const t=Math.max(0,Math.min(1,(p-r.d)/(1-r.d)));
        this.drawRead(r,ease(t))}
      if(p<1)requestAnimationFrame(tick);else{this.draw();this.updateCounter()}
    };requestAnimationFrame(tick);
  }
  drawRead(r,alpha){
    if(alpha<=0)return;const c=this.ctx,rad=r.h/2;
    const vis=r.isHost?r.hostFade*.35:r.shortFade;
    if(vis<=0.01)return;
    const bw=r.baseW;
    c.globalAlpha=alpha*.85*vis;
    c.beginPath();c.roundRect(r.x,r.y,bw,r.h,r.prob==='clean'&&r.tailW===0&&r.adapterW===0?rad:[rad,0,0,rad]);
    c.fillStyle=r.color;c.fill();
    c.globalAlpha=alpha*.12*vis;
    c.beginPath();c.roundRect(r.x,r.y,bw,r.h*.4,[rad,0,0,0]);c.fillStyle='#fff';c.fill();
    if(r.tailW>0){
      const tw=r.tailW*(1-r.trimmed);
      if(tw>0.5){c.globalAlpha=alpha*.5*vis;
        const grad=c.createLinearGradient(r.x+bw,0,r.x+bw+tw,0);
        grad.addColorStop(0,r.color);grad.addColorStop(.3,COLORS.bad);grad.addColorStop(1,COLORS.bad);
        c.beginPath();c.roundRect(r.x+bw,r.y,tw,r.h,[0,rad,rad,0]);c.fillStyle=grad;c.fill()}
    }
    if(r.adapterW>0){
      const aw=r.adapterW*(1-r.trimmed);
      if(aw>0.5){c.globalAlpha=alpha*.7*vis;
        c.beginPath();c.roundRect(r.x+bw+r.tailW*(1-r.trimmed),r.y,aw,r.h,[0,rad,rad,0]);
        c.fillStyle=COLORS.adapter;c.fill()}
    }
    if(r.isHost&&r.hostFade>0.01){
      c.globalAlpha=alpha*.2*r.hostFade;c.setLineDash([3,3]);c.strokeStyle='#475569';c.lineWidth=1;
      c.beginPath();c.roundRect(r.x-1,r.y-1,r.totalW+2,r.h+2,rad+1);c.stroke();c.setLineDash([]);}
    // Too-short reads: red tint after trimming to flag them before length-filter removes them
    if(r.tooShort&&r.trimmed>0.9&&r.shortFade>0.3){
      c.globalAlpha=alpha*.35*r.shortFade;
      c.beginPath();c.roundRect(r.x,r.y,bw,r.h,rad);c.fillStyle=COLORS.bad;c.fill();}
    c.globalAlpha=1;
  }
  draw(){this.ctx.clearRect(0,0,this.w,this.h);for(const r of this.reads)this.drawRead(r,1)}
  updateCounter(){
    const el=document.getElementById('qc-counter');if(!el)return;
    const total=this.reads.length;
    const issues=this.reads.filter(r=>r.prob!=='clean').length;
    const short=this.reads.filter(r=>r.tooShort).length;
    const host=this.reads.filter(r=>r.isHost).length;
    const kept=this.reads.filter(r=>!r.isHost&&!r.tooShort).length;
    if(this.phase===0)el.textContent=`${total} reads (${issues} with issues)`;
    else if(this.phase===1)el.textContent=`Trimmed ${this.reads.filter(r=>r.prob==='tail'||r.prob==='adapter').length} reads`;
    else if(this.phase===2)el.textContent=`${short} reads too short, removed`;
    else if(this.phase===3)el.textContent=`${host} host reads removed`;
    else el.textContent=`${kept} clean reads ready for assembly`;
  }
  highlightStep(n){
    const stepColors=['#dc2626','#ea580c','#d97706','#94a3b8','#16a34a'];
    for(let i=0;i<5;i++){
      const el=document.getElementById('qc-step-'+i);if(!el)continue;
      el.style.opacity=i===n?'1':'0.4';
      el.style.borderColor=i===n?stepColors[i]:'#e2e8f0';
      el.style.boxShadow=i===n?'0 2px 12px rgba(0,0,0,.08)':'none';
    }
  }
  /* Called by reveal fragment events */
  goToStep(step){
    if(this.animating){this.stepQueue.push(step);return false}
    return this._execStep(step);
  }
  _drainQueue(){if(this.stepQueue.length>0&&!this.animating){const s=this.stepQueue.shift();this._execStep(s)}}
  _execStep(step){
    if(this.animating)return false;
    // Fast-forward if phase is behind
    while(this.phase<step-1&&this.phase<4){
      const s=this.phase+1;
      if(s===1){this.phase=1;this.highlightStep(1);for(const r of this.reads){if(r.prob==='tail'||r.prob==='adapter')r.trimmed=1}this.draw()}
      else if(s===2){this.phase=2;this.highlightStep(2);for(const r of this.reads){if(r.tooShort)r.shortFade=0}this.draw()}
      else if(s===3){this.phase=4;this.highlightStep(4);for(const r of this.reads){if(r.isHost)r.hostFade=0}this.draw()}
    }
    if(step===1&&this.phase===0){
      this.animating=true;this.phase=1;this.highlightStep(1);
      document.getElementById('qc-canvas-label').textContent='Trimming low-quality tails and adapters...';
      this.animate((r,e)=>{if(r.prob==='tail'||r.prob==='adapter')r.trimmed=e},1200,()=>{
        document.getElementById('qc-canvas-label').textContent='Tails and adapters removed';
        this.updateCounter();this.animating=false;this._drainQueue();
      });return true;
    }
    if(step===2&&this.phase===1){
      this.animating=true;this.phase=2;this.highlightStep(2);
      document.getElementById('qc-canvas-label').textContent='Filtering reads too short after trimming...';
      this.animate((r,e)=>{if(r.tooShort)r.shortFade=1-e},800,()=>{
        document.getElementById('qc-canvas-label').textContent='Short reads removed';
        this.updateCounter();this.animating=false;this._drainQueue();
      });return true;
    }
    if(step===3&&this.phase===2){
      this.animating=true;this.phase=3;this.highlightStep(3);
      document.getElementById('qc-canvas-label').textContent='Removing host-derived reads...';
      this.animate((r,e)=>{if(r.isHost)r.hostFade=1-e},1000,()=>{
        this.phase=4;this.highlightStep(4);
        document.getElementById('qc-canvas-label').textContent='Clean microbial reads';
        document.getElementById('qc-canvas-label').style.color='#16a34a';
        this.updateCounter();this.animating=false;this._drainQueue();
      });return true;
    }
    return false;
  }
  animate(apply,dur,cb){
    const s=performance.now();
    const tick=n=>{const p=Math.min((n-s)/dur,1);const e=ease(p);
      for(const r of this.reads)apply.call(null,r,e);
      this.draw();
      if(p<1)requestAnimationFrame(tick);else cb();
    };requestAnimationFrame(tick);
  }
  goBack(step){
    // Reverse to a previous state
    if(step===0){this.phase=0;for(const r of this.reads){r.trimmed=0;r.shortFade=1;r.hostFade=1}
      this.highlightStep(0);document.getElementById('qc-canvas-label').textContent='Raw reads with problems';
      document.getElementById('qc-canvas-label').style.color='';this.draw();this.updateCounter();}
    else if(step===1){this.phase=1;for(const r of this.reads){r.shortFade=1;r.hostFade=1}
      this.highlightStep(1);document.getElementById('qc-canvas-label').textContent='Tails and adapters removed';
      document.getElementById('qc-canvas-label').style.color='';this.draw();this.updateCounter();}
    else if(step===2){this.phase=2;for(const r of this.reads){r.hostFade=1}
      this.highlightStep(2);document.getElementById('qc-canvas-label').textContent='Short reads removed';
      document.getElementById('qc-canvas-label').style.color='';this.draw();this.updateCounter();}
  }
}

/* === Per-base Quality Plot (slide 4) === */
class QPlot{
  constructor(id,type){this.c=document.getElementById(id);if(!this.c)return;this.ctx=this.c.getContext('2d');this.type=type;this.ok=false}
  init(){const r=this.c.getBoundingClientRect();if(r.width<10||r.height<10)return false;const d=devicePixelRatio||1;this.c.width=r.width*d;this.c.height=r.height*d;this.ctx.setTransform(d,0,0,d,0,0);this.w=r.width;this.h=r.height;this.ok=true;return true}
  draw(prog){
    const c=this.ctx,w=this.w,h=this.h,R=rng(this.type==='good'?42:99);
    const P={t:14,r:16,b:34,l:46},pw=w-P.l-P.r,ph=h-P.t-P.b,qM=42,ys=ph/qM;
    c.clearRect(0,0,w,h);
    // Background quality bands
    c.fillStyle='#dcfce7';c.fillRect(P.l,P.t,pw,(qM-28)*ys);
    c.fillStyle='#fef9c3';c.fillRect(P.l,P.t+(qM-28)*ys,pw,8*ys);
    c.fillStyle='#fee2e2';c.fillRect(P.l,P.t+(qM-20)*ys,pw,20*ys);
    // Band labels
    c.font='10px "DM Sans"';c.textAlign='left';
    c.fillStyle='#16a34a';c.globalAlpha=.5;c.fillText('Good',P.l+4,P.t+12);
    c.fillStyle='#ca8a04';c.fillText('Warning',P.l+4,P.t+(qM-24)*ys+4);
    c.fillStyle='#dc2626';c.fillText('Poor',P.l+4,P.t+(qM-10)*ys+4);
    c.globalAlpha=1;
    // Grid
    c.strokeStyle='#e2e8f0';c.lineWidth=.5;
    for(let q=10;q<=40;q+=10){const y=P.t+(qM-q)*ys;c.beginPath();c.moveTo(P.l,y);c.lineTo(P.l+pw,y);c.stroke()}
    // Axes
    c.strokeStyle='#94a3b8';c.lineWidth=1;c.beginPath();c.moveTo(P.l,P.t);c.lineTo(P.l,P.t+ph);c.lineTo(P.l+pw,P.t+ph);c.stroke();
    // Y labels
    c.fillStyle='#64748b';c.font='9px "DM Mono"';c.textAlign='right';
    for(let q=0;q<=40;q+=10)c.fillText(q,P.l-5,P.t+(qM-q)*ys+3);
    // Axis titles
    c.textAlign='center';c.font='10px "DM Sans"';c.fillStyle='#475569';
    c.fillText('Read position',P.l+pw/2,h-6);
    c.save();c.translate(11,P.t+ph/2);c.rotate(-Math.PI/2);c.fillText('Phred quality',0,0);c.restore();
    // Box plots
    const n=30,nv=Math.ceil(n*prog);
    for(let i=0;i<nv;i++){
      const x=P.l+(i+.5)*pw/n,bw=pw/n*.52;
      let med,q1,q3,lo,hi;
      if(this.type==='good'){med=34-i*.1+(R()-.5)*.8;q1=med-1.5-R()*.8;q3=med+1.5+R()*.8;lo=Math.max(2,q1-2.5-R()*1.5);hi=Math.min(41,q3+2+R()*1.2)}
      else{const d=Math.pow(i/n,1.5);med=34-d*22+(R()-.5)*1.5;const sp=1.5+d*5;q1=med-sp;q3=med+sp*.6;lo=Math.max(2,q1-3-R()*3);hi=Math.min(41,q3+2+R()*2)}
      const ym=P.t+(qM-med)*ys,y1=P.t+(qM-q1)*ys,y3=P.t+(qM-q3)*ys,yl=P.t+(qM-lo)*ys,yh=P.t+(qM-hi)*ys;
      c.strokeStyle='#94a3b8';c.lineWidth=.7;
      c.beginPath();c.moveTo(x,yh);c.lineTo(x,y3);c.moveTo(x,y1);c.lineTo(x,yl);c.stroke();
      c.beginPath();c.moveTo(x-bw*.25,yh);c.lineTo(x+bw*.25,yh);c.moveTo(x-bw*.25,yl);c.lineTo(x+bw*.25,yl);c.stroke();
      c.fillStyle=med>=28?'rgba(187,247,208,.8)':med>=20?'rgba(254,240,138,.8)':'rgba(254,202,202,.8)';
      c.fillRect(x-bw/2,y3,bw,y1-y3);c.strokeStyle='#64748b';c.lineWidth=.5;c.strokeRect(x-bw/2,y3,bw,y1-y3);
      c.strokeStyle='#dc2626';c.lineWidth=1.3;c.beginPath();c.moveTo(x-bw/2,ym);c.lineTo(x+bw/2,ym);c.stroke();
    }
  }
  animate(){if(!this.init())return;const s=performance.now();const tick=n=>{const p=Math.min((n-s)/1200,1);this.draw(ease(p));if(p<1)requestAnimationFrame(tick)};requestAnimationFrame(tick)}
}

/* === Diagnostic QC Plots (slide 5) === */
function drawDiagPlots(){
  // Adapter content plot
  drawAdapterPlot('diag-adapter');
  drawGCPlot('diag-gc');
  drawOverrepPlot('diag-overrep');
}
function initCanvas(id){
  const c=document.getElementById(id);if(!c)return null;
  const r=c.getBoundingClientRect();if(r.width<10||r.height<10)return null;
  const d=devicePixelRatio||1;c.width=r.width*d;c.height=r.height*d;
  const ctx=c.getContext('2d');ctx.setTransform(d,0,0,d,0,0);
  return{c,ctx,w:r.width,h:r.height};
}
function drawAdapterPlot(id){
  const cv=initCanvas(id);if(!cv)return;const{ctx:c,w,h}=cv;
  const P={t:10,r:12,b:30,l:38},pw=w-P.l-P.r,ph=h-P.t-P.b,R=rng(77);
  c.fillStyle='#fff';c.fillRect(0,0,w,h);
  // Warning zone above 5%
  const warnY=P.t+ph*(1-5/30); // y where 5% is on the scale (max=30%)
  c.fillStyle='rgba(254,242,242,.3)';c.fillRect(P.l,P.t,pw,warnY-P.t);
  // Axes
  c.strokeStyle='#94a3b8';c.lineWidth=1;c.beginPath();c.moveTo(P.l,P.t);c.lineTo(P.l,P.t+ph);c.lineTo(P.l+pw,P.t+ph);c.stroke();
  c.fillStyle='#64748b';c.font='9px "DM Sans"';c.textAlign='center';c.fillText('Position in read (bp)',P.l+pw/2,h-6);
  c.save();c.translate(10,P.t+ph/2);c.rotate(-Math.PI/2);c.fillText('% Adapter',0,0);c.restore();
  // Y-axis labels (0-30%)
  c.font='10px "DM Mono"';c.textAlign='right';
  for(let p=0;p<=30;p+=10){const y=P.t+ph*(1-p/30);c.fillText(p+'%',P.l-4,y+3)}
  // X-axis labels
  c.textAlign='center';
  for(let bp=1;bp<=150;bp+=30){const x=P.l+bp/150*pw;c.fillText(bp,x,P.t+ph+12)}
  // Sigmoid-like adapter curves: near-zero until ~100bp, then sharp rise
  // Mimics FastQC with separate adapter types
  const adapters=[
    {name:'Illumina Universal',color:COLORS.adapter,onset:.62,steep:18,max:.25},
    {name:'Nextera Transposase',color:'#ea580c',onset:.70,steep:15,max:.12},
    {name:'SOLID Small RNA',color:'#94a3b8',onset:.80,steep:12,max:.04}
  ];
  const sigmoid=(x,onset,steep,max)=>max/(1+Math.exp(-steep*(x-onset)));
  adapters.forEach((a,ai)=>{
    c.beginPath();
    for(let i=0;i<=150;i++){
      const t=i/150;const x=P.l+t*pw;
      const v=sigmoid(t,a.onset,a.steep,a.max)+(R()-.5)*.003;
      const y=P.t+ph*(1-Math.max(0,v)/0.30);
      i===0?c.moveTo(x,y):c.lineTo(x,y);
    }
    c.strokeStyle=a.color;c.lineWidth=1.5;c.globalAlpha=.8;c.stroke();c.globalAlpha=1;
    // Fill under
    c.lineTo(P.l+pw,P.t+ph);c.lineTo(P.l,P.t+ph);c.closePath();
    c.fillStyle=a.color;c.globalAlpha=.06;c.fill();c.globalAlpha=1;
  });
  // 5% threshold line
  c.setLineDash([4,3]);c.strokeStyle='#dc2626';c.lineWidth=1;
  c.beginPath();c.moveTo(P.l,warnY);c.lineTo(P.l+pw,warnY);c.stroke();c.setLineDash([]);
  c.fillStyle='#dc2626';c.font='10px "DM Mono"';c.textAlign='right';c.fillText('5% flag',P.l+pw-4,warnY-4);
  // Legend
  const legY=P.t+8;
  adapters.forEach((a,i)=>{
    const lx=P.l+8,ly=legY+i*12;
    c.fillStyle=a.color;c.globalAlpha=.8;c.fillRect(lx,ly,10,2);c.globalAlpha=1;
    c.fillStyle='#334155';c.font='9px "DM Sans"';c.textAlign='left';c.fillText(a.name,lx+14,ly+3);
  });
}
function drawGCPlot(id){
  const cv=initCanvas(id);if(!cv)return;const{ctx:c,w,h}=cv;
  const P={t:10,r:12,b:30,l:38},pw=w-P.l-P.r,ph=h-P.t-P.b;
  c.fillStyle='#fff';c.fillRect(0,0,w,h);
  // Axes
  c.strokeStyle='#94a3b8';c.lineWidth=1;c.beginPath();c.moveTo(P.l,P.t);c.lineTo(P.l,P.t+ph);c.lineTo(P.l+pw,P.t+ph);c.stroke();
  c.fillStyle='#64748b';c.font='9px "DM Sans"';c.textAlign='center';c.fillText('GC content (%)',P.l+pw/2,h-6);
  c.save();c.translate(10,P.t+ph/2);c.rotate(-Math.PI/2);c.fillText('Frequency',0,0);c.restore();
  // X labels
  c.font='10px "DM Mono"';c.textAlign='center';
  for(let g=0;g<=100;g+=25)c.fillText(g,P.l+g/100*pw,P.t+ph+12);
  // Multimodal GC distribution — sum of 3 gaussians
  const gauss=(x,mu,sig)=>Math.exp(-0.5*Math.pow((x-mu)/sig,2));
  // Theoretical line (unimodal)
  c.beginPath();
  for(let i=0;i<=100;i++){
    const x=P.l+i/100*pw;const y=P.t+ph-gauss(i,50,12)*ph*.6;
    i===0?c.moveTo(x,y):c.lineTo(x,y);
  }
  c.strokeStyle='#94a3b8';c.lineWidth=1;c.setLineDash([4,3]);c.stroke();c.setLineDash([]);
  c.fillStyle='#94a3b8';c.font='9px "DM Sans"';c.textAlign='left';c.fillText('theoretical',P.l+pw*.72,P.t+ph*.55);
  // Observed (multimodal)
  c.beginPath();
  for(let i=0;i<=100;i++){
    const x=P.l+i/100*pw;
    const v=gauss(i,35,8)*.9+gauss(i,52,6)*.6+gauss(i,68,9)*.45;
    const y=P.t+ph-v*ph*.55;
    i===0?c.moveTo(x,y):c.lineTo(x,y);
  }
  c.strokeStyle=COLORS.gb;c.lineWidth=2;c.stroke();
  // Fill
  c.lineTo(P.l+pw,P.t+ph);c.lineTo(P.l,P.t+ph);c.closePath();c.fillStyle='rgba(59,130,246,.08)';c.fill();
  // Peak labels
  c.fillStyle=COLORS.gb;c.font='9px "DM Sans"';c.textAlign='center';
  c.fillText('peak 1',P.l+35/100*pw,P.t+12);c.fillText('peak 2',P.l+52/100*pw,P.t+24);c.fillText('peak 3',P.l+68/100*pw,P.t+16);
}
function drawOverrepPlot(id){
  const cv=initCanvas(id);if(!cv)return;const{ctx:c,w,h}=cv;
  const P={t:28,r:12,b:16,l:6},pw=w-P.l-P.r,ph=h-P.t-P.b;
  c.fillStyle='#fff';c.fillRect(0,0,w,h);
  // Header row
  c.fillStyle='#94a3b8';c.font='600 10px "DM Sans"';c.textAlign='left';
  c.fillText('Sequence (first 20 bp)',P.l+4,P.t-16);
  c.fillText('Count',P.l+pw*.52,P.t-16);
  c.fillText('%',P.l+pw*.68,P.t-16);
  c.fillText('Possible source',P.l+pw*.78,P.t-16);
  c.strokeStyle='#e2e8f0';c.lineWidth=1;c.beginPath();c.moveTo(P.l,P.t-8);c.lineTo(P.l+pw,P.t-8);c.stroke();
  const seqs=[
    {seq:'AGATCGGAAGAGCACACG',count:'142,831',pct:3.8,source:'Illumina adapter',color:COLORS.adapter},
    {seq:'AGATCGGAAGAGCGTCGT',count:'98,204',pct:2.6,source:'Illumina adapter',color:COLORS.adapter},
    {seq:'AAAAAAAAAAAAAAAAAAA',count:'51,392',pct:1.4,source:'Poly-A read-through',color:'#94a3b8'},
    {seq:'GTGCCAGCMGCCGCGGTA',count:'28,107',pct:0.7,source:'16S rRNA (515F)',color:COLORS.gb},
    {seq:'GCCTACGGGNGGCWGCAG',count:'12,445',pct:0.3,source:'16S rRNA (341F)',color:COLORS.gb},
    {seq:'TTCGATCCTAAGCCCGTC',count:'5,218',pct:0.1,source:'No hit',color:'#cbd5e1'}
  ];
  const rowH=Math.min(20,(ph-seqs.length*2)/seqs.length);
  seqs.forEach((s,i)=>{
    const y=P.t+i*(rowH+4);
    // Subtle row background
    if(i%2===0){c.fillStyle='#f8fafc';c.fillRect(P.l,y,pw,rowH)}
    // Color indicator bar
    c.fillStyle=s.color;c.globalAlpha=.7;c.fillRect(P.l,y,3,rowH);c.globalAlpha=1;
    // Sequence (monospace)
    c.fillStyle='#334155';c.font='10px "DM Mono"';c.textAlign='left';
    c.fillText(s.seq,P.l+8,y+rowH/2+3);
    // Count
    c.fillStyle='#64748b';c.font='10px "DM Mono"';c.fillText(s.count,P.l+pw*.52,y+rowH/2+3);
    // Pct
    c.fillStyle=s.pct>1?'#b91c1c':'#64748b';c.font=(s.pct>1?'700':'400')+' 10px "DM Mono"';
    c.fillText(s.pct+'%',P.l+pw*.68,y+rowH/2+3);
    // Source
    c.fillStyle=s.color;c.font='10px "DM Sans"';c.fillText(s.source,P.l+pw*.78,y+rowH/2+3);
  });
}

/* === Read Anatomy diagram (slide 3) — progressive reveal === */
let raStep=0;
function drawReadAnatomy(step){
  if(step!==undefined) raStep=step;
  const cv=initCanvas('read-anatomy-canvas');if(!cv)return;
  const{ctx:c,w,h}=cv;
  c.fillStyle='#fff';c.fillRect(0,0,w,h);

  const mx=40,rh=32,S=raStep;
  const parts=[
    {id:'p5',label:"5\u2032 adapter (P5)",sub:'flowcell primer',color:'#94a3b8',w:.10,group:'adapter'},
    {id:'sp1',label:'Seq primer 1',sub:'R1 starts here \u2192',color:'#64748b',w:.08,group:'primer'},
    {id:'idx2',label:'i5 index',sub:'sample barcode',color:'#8b5cf6',w:.06,group:'index'},
    {id:'bio',label:'Biological insert',sub:'your DNA of interest',color:'#3b82f6',w:.30,group:'insert'},
    {id:'idx1',label:'i7 index',sub:'sample barcode',color:'#8b5cf6',w:.06,group:'index'},
    {id:'sp2',label:'Seq primer 2',sub:'\u2190 R2 starts here',color:'#64748b',w:.08,group:'primer'},
    {id:'p7',label:"3\u2032 adapter (P7)",sub:'flowcell primer',color:'#94a3b8',w:.10,group:'adapter'}
  ];
  const totalW=w-mx*2;
  const sumRatio=parts.reduce((s,p)=>s+p.w,0);

  // ── Step 0: Full library construct with bracket annotations ──
  const ty=h*.12;
  let cx=mx;const partRects=[];

  // Section badge helper — small colored circle with number matching sidebar cards
  function _secBadge(num,x,y,col){
    c.save();c.globalAlpha=.85;
    c.beginPath();c.arc(x,y,9,0,Math.PI*2);c.fillStyle=col;c.fill();
    c.font='700 9px "DM Sans"';c.fillStyle='#fff';c.textAlign='center';c.textBaseline='middle';
    c.fillText(num,x,y);
    c.restore();c.textBaseline='alphabetic';
  }
  const _secCols=[COLORS.ga,COLORS.gb,'#dc2626','#16a34a'];

  _secBadge('1',16,ty+rh/2,_secCols[0]);
  c.globalAlpha=.55;c.font='600 11px "DM Sans"';c.textAlign='center';c.fillStyle='#334155';
  c.fillText('Illumina library construct (on flowcell)',w/2,ty-16);

  parts.forEach((p,i)=>{
    const pw=p.w/sumRatio*totalW;
    const isFirst=i===0,isLast=i===parts.length-1;
    const rad=isFirst?[rh/2,0,0,rh/2]:isLast?[0,rh/2,rh/2,0]:0;
    c.globalAlpha=.85;c.fillStyle=p.color;
    c.beginPath();c.roundRect(cx,ty,pw,rh,rad);c.fill();
    c.globalAlpha=.12;c.fillStyle='#fff';c.beginPath();c.roundRect(cx,ty,pw,rh*.35,rad);c.fill();
    // Label inside block
    c.globalAlpha=.95;c.font='600 9.5px "DM Sans"';c.textAlign='center';c.fillStyle='#fff';
    if(pw>50)c.fillText(p.label,cx+pw/2,ty+rh/2+3.5);
    // Sub-label below
    c.globalAlpha=.55;c.font='400 8.5px "DM Sans"';c.fillStyle=p.color;
    c.fillText(p.sub,cx+pw/2,ty+rh+15);
    partRects.push({x:cx,w:pw});
    cx+=pw;
  });

  // Bracket annotations grouping parts
  const bracketY=ty+rh+30;
  const groups=[
    {start:0,end:0,label:'Adapter',color:'#94a3b8'},
    {start:1,end:2,label:'Technical',color:'#64748b'},
    {start:3,end:3,label:'YOUR SAMPLE DNA',color:'#3b82f6'},
    {start:4,end:5,label:'Technical',color:'#64748b'},
    {start:6,end:6,label:'Adapter',color:'#94a3b8'}
  ];
  groups.forEach(g=>{
    const x1=partRects[g.start].x,x2=partRects[g.end].x+partRects[g.end].w;
    const mid=(x1+x2)/2;
    c.strokeStyle=g.color;c.lineWidth=1.2;c.globalAlpha=.45;
    c.beginPath();c.moveTo(x1+4,bracketY);c.lineTo(x1+4,bracketY+6);c.lineTo(x2-4,bracketY+6);c.lineTo(x2-4,bracketY);c.stroke();
    c.beginPath();c.moveTo(mid,bracketY+6);c.lineTo(mid,bracketY+12);c.stroke();
    c.globalAlpha=.6;c.font=(g.start===3?'700':'600')+' '+(g.start===3?'10px':'10px')+' "DM Sans"';
    c.fillStyle=g.color;c.textAlign='center';
    c.fillText(g.label,mid,bracketY+23);
  });

  if(S<1)return;

  // ── Step 1: R1 and R2 read arrows ──
  const arrowY=bracketY+42;
  _secBadge('2',16,arrowY+10,_secCols[1]);
  const r1start=partRects[1].x,r1end=partRects[4].x+partRects[4].w;
  const r1w=Math.min(r1end-r1start,totalW*.52);

  // R1 arrow
  c.globalAlpha=.75;c.fillStyle=COLORS.gb;
  c.beginPath();c.roundRect(r1start,arrowY,r1w,20,[10,0,0,10]);c.fill();
  c.beginPath();c.moveTo(r1start+r1w,arrowY-4);c.lineTo(r1start+r1w+16,arrowY+10);c.lineTo(r1start+r1w,arrowY+24);c.closePath();c.fill();
  c.globalAlpha=1;c.font='600 10.5px "DM Sans"';c.fillStyle='#fff';c.textAlign='center';
  c.fillText('Read 1 (R1)  5\u2032 \u2192 3\u2032',r1start+r1w/2,arrowY+13.5);

  // R2 arrow (reverse)
  const r2y=arrowY+34;
  const r2end2=partRects[5].x+partRects[5].w,r2start2=r2end2-r1w;
  c.globalAlpha=.75;c.fillStyle=COLORS.gc;
  c.beginPath();c.roundRect(r2start2,r2y,r1w,20,[0,10,10,0]);c.fill();
  c.beginPath();c.moveTo(r2start2,r2y-4);c.lineTo(r2start2-16,r2y+10);c.lineTo(r2start2,r2y+24);c.closePath();c.fill();
  c.globalAlpha=1;c.font='600 10.5px "DM Sans"';c.fillStyle='#fff';c.textAlign='center';
  c.fillText('Read 2 (R2)  3\u2032 \u2190 5\u2032  (reverse strand)',r2start2+r1w/2,r2y+13.5);

  // Annotation label
  c.globalAlpha=.45;c.font='italic 9px "DM Sans"';c.fillStyle='#334155';c.textAlign='left';
  c.fillText('Sequencer reads from primer into the insert',r1start,arrowY-8);

  if(S<2)return;

  // ── Step 2: Short insert — PE overlap & adapter read-through ──
  const scY=r2y+38;
  _secBadge('3',16,scY+4,_secCols[2]);
  c.globalAlpha=.8;c.font='700 11px "DM Sans"';c.textAlign='left';c.fillStyle='#b91c1c';
  c.fillText('\u26A0  When the insert is shorter than the read length:',mx,scY);

  const bH=14,bR=bH/2;
  const insW=totalW*.28;
  const adW=totalW*.11;
  const lx=mx+totalW*.15;
  const boxX=mx,boxW=totalW;

  // ── Row 1: Reference construct on flowcell ──
  const r1Y=scY+8;
  c.globalAlpha=.05;c.fillStyle='#475569';c.beginPath();c.roundRect(boxX,r1Y,boxW,bH+18,6);c.fill();
  c.globalAlpha=.45;c.font='600 10px "DM Sans"';c.fillStyle='#475569';c.textAlign='left';
  c.fillText('Construct:',boxX+4,r1Y+bH/2+8);
  const cLx=lx;
  c.globalAlpha=.5;c.fillStyle='#94a3b8';
  c.beginPath();c.roundRect(cLx,r1Y+4,adW*.7,bH,[bR,0,0,bR]);c.fill();
  c.globalAlpha=.7;c.font='600 9px "DM Sans"';c.fillStyle='#fff';c.textAlign='center';
  c.fillText('P5 adapter',cLx+adW*.35,r1Y+4+bH/2+2);
  c.globalAlpha=.75;c.fillStyle=COLORS.gb;
  c.beginPath();c.roundRect(cLx+adW*.7,r1Y+4,insW,bH,0);c.fill();
  c.font='600 10px "DM Sans"';c.fillStyle='#fff';c.textAlign='center';
  c.fillText('short biological insert',cLx+adW*.7+insW/2,r1Y+4+bH/2+2);
  c.globalAlpha=.5;c.fillStyle='#94a3b8';
  c.beginPath();c.roundRect(cLx+adW*.7+insW,r1Y+4,adW*.7,bH,[0,bR,bR,0]);c.fill();
  c.globalAlpha=.7;c.font='600 9px "DM Sans"';c.fillStyle='#fff';c.textAlign='center';
  c.fillText('P7 adapter',cLx+adW*.7+insW+adW*.35,r1Y+4+bH/2+2);
  // Direction arrows under construct
  c.globalAlpha=.45;c.font='600 9px "DM Sans"';c.fillStyle=COLORS.gb;c.textAlign='left';
  c.fillText('R1 reads \u2192',cLx+adW*.7+2,r1Y+bH+14);
  c.fillStyle=COLORS.gc;c.textAlign='right';
  c.fillText('\u2190 R2 reads',cLx+adW*.7+insW-2,r1Y+bH+14);

  // Dashed separator between Row 1 and Row 2
  c.save();c.globalAlpha=.25;c.strokeStyle='#94a3b8';c.lineWidth=1;c.setLineDash([4,4]);
  c.beginPath();c.moveTo(boxX+8,r1Y+bH+20);c.lineTo(boxX+boxW-8,r1Y+bH+20);c.stroke();
  c.setLineDash([]);c.restore();

  // ── Row 2: What the sequencer outputs (raw reads, adapter at 3' end of each) ──
  const r2Y=r1Y+bH+24;
  c.globalAlpha=.05;c.fillStyle='#d97706';c.beginPath();c.roundRect(boxX,r2Y,boxW,bH*2+20,6);c.fill();
  c.globalAlpha=.45;c.font='600 10px "DM Sans"';c.fillStyle='#92400e';c.textAlign='left';
  c.fillText('Raw reads:',boxX+4,r2Y+10);
  // R1 raw: bio then adapter at 3' end
  c.globalAlpha=.8;c.fillStyle=COLORS.gb;
  c.beginPath();c.roundRect(lx,r2Y+4,insW,bH,[bR,0,0,bR]);c.fill();
  c.globalAlpha=.85;c.fillStyle=COLORS.adapter;
  c.beginPath();c.roundRect(lx+insW,r2Y+4,adW,bH,[0,bR,bR,0]);c.fill();
  c.globalAlpha=.9;c.font='600 9px "DM Sans"';c.fillStyle='#fff';c.textAlign='center';
  c.fillText('insert bases',lx+insW/2,r2Y+4+bH/2+2);
  c.font='700 9px "DM Sans"';c.fillStyle='#92400e';
  c.fillText('P7 adapter!',lx+insW+adW/2,r2Y+4+bH/2+2);
  c.globalAlpha=.5;c.font='600 10px "DM Sans"';c.fillStyle=COLORS.gb;c.textAlign='right';
  c.fillText('R1  5\u2032\u21923\u2032',lx-6,r2Y+4+bH/2+2);
  // R2 raw: bio then adapter at 3' end
  const r2rY=r2Y+bH+8;
  c.globalAlpha=.8;c.fillStyle=COLORS.gc;
  c.beginPath();c.roundRect(lx,r2rY,insW,bH,[bR,0,0,bR]);c.fill();
  c.globalAlpha=.85;c.fillStyle=COLORS.adapter;
  c.beginPath();c.roundRect(lx+insW,r2rY,adW,bH,[0,bR,bR,0]);c.fill();
  c.globalAlpha=.9;c.font='600 9px "DM Sans"';c.fillStyle='#fff';c.textAlign='center';
  c.fillText('insert bases',lx+insW/2,r2rY+bH/2+2);
  c.font='700 9px "DM Sans"';c.fillStyle='#92400e';
  c.fillText('P5 adapter!',lx+insW+adW/2,r2rY+bH/2+2);
  c.globalAlpha=.5;c.font='600 10px "DM Sans"';c.fillStyle=COLORS.gc;c.textAlign='right';
  c.fillText('R2  5\u2032\u21923\u2032',lx-6,r2rY+bH/2+2);
  c.globalAlpha=.4;c.font='italic 10px "DM Sans"';c.fillStyle='#92400e';c.textAlign='left';
  c.fillText('Both reads run past the insert into the opposite adapter',lx+insW+adW+8,r2Y+bH+10);

  // Dashed separator between Row 2 and Row 3
  c.save();c.globalAlpha=.25;c.strokeStyle='#94a3b8';c.lineWidth=1;c.setLineDash([4,4]);
  c.beginPath();c.moveTo(boxX+8,r2rY+bH+6);c.lineTo(boxX+boxW-8,r2rY+bH+6);c.stroke();
  c.setLineDash([]);c.restore();

  // ── Row 3: Aligned — R2 rev-comped, showing full overlap ──
  const alY=r2rY+bH+10;
  c.globalAlpha=.06;c.fillStyle='#16a34a';c.beginPath();c.roundRect(boxX,alY,boxW,bH*2+24,6);c.fill();
  c.globalAlpha=.45;c.font='600 10px "DM Sans"';c.fillStyle='#16a34a';c.textAlign='left';
  c.fillText('Aligned (R2 rev-comp):',boxX+4,alY+10);
  // R1 aligned: bio + adapter right
  const a1Y=alY+4;
  c.globalAlpha=.8;c.fillStyle=COLORS.gb;
  c.beginPath();c.roundRect(lx,a1Y,insW,bH,[bR,0,0,bR]);c.fill();
  c.globalAlpha=.75;c.fillStyle=COLORS.adapter;
  c.beginPath();c.roundRect(lx+insW,a1Y,adW,bH,[0,bR,bR,0]);c.fill();
  c.globalAlpha=.5;c.font='600 9px "DM Sans"';c.fillStyle=COLORS.gb;c.textAlign='right';c.fillText('R1',lx-6,a1Y+bH/2+2);
  // R2 aligned (flipped): adapter left + bio
  const a2Y=a1Y+bH+4;
  c.globalAlpha=.75;c.fillStyle=COLORS.adapter;
  c.beginPath();c.roundRect(lx-adW,a2Y,adW,bH,[bR,0,0,bR]);c.fill();
  c.globalAlpha=.8;c.fillStyle=COLORS.gc;
  c.beginPath();c.roundRect(lx,a2Y,insW,bH,[0,bR,bR,0]);c.fill();
  c.globalAlpha=.5;c.font='600 9px "DM Sans"';c.fillStyle=COLORS.gc;c.textAlign='right';c.fillText('R2\u2032',lx-adW-6,a2Y+bH/2+2);
  // Overlap bracket over the insert region
  c.globalAlpha=.12;c.fillStyle='#16a34a';c.fillRect(lx,a1Y-2,insW,a2Y+bH+2-a1Y+2);
  c.globalAlpha=.5;c.strokeStyle='#16a34a';c.lineWidth=1.2;c.setLineDash([3,2]);
  c.beginPath();c.roundRect(lx,a1Y-2,insW,a2Y+bH+2-a1Y+2,4);c.stroke();c.setLineDash([]);
  c.globalAlpha=.7;c.font='700 10px "DM Sans"';c.fillStyle='#16a34a';c.textAlign='center';
  c.fillText('\u2190 overlap = entire insert \u2192',lx+insW/2,(a1Y+a2Y+bH)/2+1);
  // Trim labels
  c.globalAlpha=.75;c.font='700 10px "DM Sans"';c.fillStyle='#b91c1c';c.textAlign='center';
  c.fillText('\u2702 trim',lx+insW+adW/2,a1Y-4);
  c.fillText('\u2702 trim',lx-adW/2,a2Y+bH+10);

  if(S<3)return;

  // ── Step 3: Long insert → clean read ──
  const longLabelY=alY+72;
  _secBadge('4',16,longLabelY-2,_secCols[3]);
  c.globalAlpha=.7;c.font='700 12px "DM Sans"';c.textAlign='left';c.fillStyle='#16a34a';
  c.fillText('\u2714  Long insert \u2192 no adapter read-through (quality trimming may still apply)',mx,longLabelY);

  const longY=longLabelY+14,longInsW=totalW*.44;
  // R1
  c.globalAlpha=.8;c.fillStyle=COLORS.gb;
  c.beginPath();c.roundRect(mx,longY,longInsW,bH,[bH/2,0,0,bH/2]);c.fill();
  c.beginPath();c.moveTo(mx+longInsW,longY-2);c.lineTo(mx+longInsW+10,longY+bH/2);c.lineTo(mx+longInsW,longY+bH+2);c.closePath();c.fill();
  c.globalAlpha=1;c.font='600 10px "DM Sans"';c.fillStyle='#fff';c.textAlign='center';
  c.fillText('R1: all biological \u2192',mx+longInsW/2,longY+bH/2+3);
  // R2
  const longY2=longY+bH+6;
  c.globalAlpha=.8;c.fillStyle=COLORS.gc;
  c.beginPath();c.roundRect(mx+totalW*.15,longY2,longInsW,bH,[0,bH/2,bH/2,0]);c.fill();
  c.beginPath();c.moveTo(mx+totalW*.15,longY2-2);c.lineTo(mx+totalW*.15-10,longY2+bH/2);c.lineTo(mx+totalW*.15,longY2+bH+2);c.closePath();c.fill();
  c.globalAlpha=1;c.font='600 10px "DM Sans"';c.fillStyle='#fff';c.textAlign='center';
  c.fillText('\u2190 R2: all biological',mx+totalW*.15+longInsW/2,longY2+bH/2+3);

  c.globalAlpha=.5;c.font='400 9px "DM Sans"';c.fillStyle='#334155';c.textAlign='left';
  c.fillText('Insert longer than read length \u2192 no adapter read-through; reads may still overlap if insert < 2\u00d7 read length',mx,longY2+bH+16);
}

/* === Trim Animation (slide 7) === */
class TrimTech{
  constructor(id){this.c=document.getElementById(id);if(!this.c)return;this.ctx=this.c.getContext('2d');this.ok=false;this.phase=0;this.animating=false;this.phase0drawn=false;this.stepQueue=[]}
  init(){if(!this.c)return false;const r=this.c.getBoundingClientRect();if(r.width<10||r.height<10)return false;const d=devicePixelRatio||1;this.c.width=r.width*d;this.c.height=r.height*d;this.ctx.setTransform(d,0,0,d,0,0);this.w=r.width;this.h=r.height;this.ok=true;return true}
  gen(){if(!this.ok)return;this.phase=0;this.animating=false;this.stepQueue=[];this.phase0drawn=true;this.highlightStep(-1);this.drawPhase0()}
  anim(dur,fn,cb){this.animating=true;const s=performance.now();const tick=n=>{const p=Math.min((n-s)/dur,1);fn(ease(p));if(p<1)requestAnimationFrame(tick);else{this.animating=false;if(cb)cb();this.drainQueue()}};requestAnimationFrame(tick)}
  drainQueue(){if(this.stepQueue.length>0&&!this.animating){const next=this.stepQueue.shift();this._execStep(next)}}
  setLabel(t,col){const el=document.getElementById('trim-label');if(el){el.textContent=t;el.style.color=col||''}}
  setCounter(t){const el=document.getElementById('trim-counter');if(el)el.textContent=t}
  setStatus(t){const el=document.getElementById('trim-status-box');if(el)el.textContent=t}
  highlightStep(n){
    const cols=['#3b82f6','#d97706','#dc2626'];
    for(let i=0;i<3;i++){const el=document.getElementById('trim-step-'+i);if(!el)continue;
      el.style.opacity=i===n?'1':'0.55';el.style.borderColor=i===n?cols[i]:'#e2e8f0';
      el.style.boxShadow=i===n?'0 2px 12px rgba(0,0,0,.1)':'none'}
  }
  /* Phase 0: show example reads with color-coded problems */
  drawPhase0(){
    const c=this.ctx,w=this.w,h=this.h;c.clearRect(0,0,w,h);
    const R=rng(77),rh=14,gap=6,px=40,py=24;
    const n=9;
    const bases='ACGTACGATCGGAAGAGCACACGTCTGAACTCCAGTCACAGATCGGAAGAGCGTCGTGTAGGGAAAGA';
    for(let i=0;i<n;i++){
      const y=py+i*(rh+gap+4);const bioW=Math.min(180+R()*220,w*.45);const col=GCOLS[Math.floor(R()*4)];
      const prob=R();let tailW=0,adW=0;
      if(prob<.35){tailW=35+R()*55}else if(prob<.65){adW=30+R()*45}else if(prob<.85){tailW=25+R()*30;adW=20+R()*25}
      // bio
      c.globalAlpha=.85;c.fillStyle=col;c.beginPath();c.roundRect(px,y,bioW,rh,tailW>0||adW>0?[rh/2,0,0,rh/2]:rh/2);c.fill();
      // base letters on bio
      c.globalAlpha=.35;c.font='600 10px "DM Mono"';c.textAlign='left';c.fillStyle='#fff';
      const bStart=Math.floor(R()*40);for(let b=0;b<Math.min(Math.floor(bioW/7),30);b++){c.fillText(bases[(bStart+b)%bases.length],px+4+b*7,y+rh/2+3)}
      // tail
      if(tailW>0){const g=c.createLinearGradient(px+bioW,0,px+bioW+tailW,0);g.addColorStop(0,col);g.addColorStop(.3,COLORS.bad);g.addColorStop(1,COLORS.bad);
        c.globalAlpha=.5;c.fillStyle=g;c.beginPath();c.roundRect(px+bioW,y,tailW,rh,adW>0?0:[0,rh/2,rh/2,0]);c.fill()}
      // adapter
      if(adW>0){c.globalAlpha=.7;c.fillStyle=COLORS.adapter;c.beginPath();c.roundRect(px+bioW+tailW,y,adW,rh,[0,rh/2,rh/2,0]);c.fill();
        // adapter letters
        c.globalAlpha=.4;c.font='600 9px "DM Mono"';c.fillStyle='#92400e';for(let b=0;b<Math.min(Math.floor(adW/6),8);b++){c.fillText('AGATCGGA'[b],px+bioW+tailW+3+b*6,y+rh/2+3)}}
      // read number
      c.globalAlpha=.5;c.font='500 9px "DM Mono"';c.textAlign='right';c.fillStyle='#1e293b';
      c.fillText('R'+(i+1),px-6,y+rh/2+3);
      // label
      c.globalAlpha=.7;c.font='500 9px "DM Mono"';c.textAlign='left';c.fillStyle='#1e293b';
      const lx=px+bioW+tailW+adW+10;
      if(tailW>0&&adW>0)c.fillText('low-Q tail + adapter',lx,y+rh/2+3);
      else if(tailW>0)c.fillText('low-Q tail',lx,y+rh/2+3);
      else if(adW>0)c.fillText('adapter contamination',lx,y+rh/2+3);
      else c.fillText('clean read',lx,y+rh/2+3);
    }
    // Legend at bottom
    const ly=h-52,lx2=w*.12;
    c.globalAlpha=.8;c.font='600 10px "DM Sans"';c.textAlign='left';c.fillStyle='#1e293b';c.fillText('Legend:',lx2,ly);
    const items=[{c:COLORS.ga,t:'Biological'},{c:COLORS.bad,t:'Low-quality tail'},{c:COLORS.adapter,t:'Adapter'}];
    let cx=lx2+52;items.forEach(it=>{c.fillStyle=it.c;c.globalAlpha=.85;c.beginPath();c.roundRect(cx,ly-8,18,10,3);c.fill();c.globalAlpha=.7;c.fillStyle='#1e293b';c.font='400 10px "DM Sans"';c.fillText(it.t,cx+22,ly);cx+=it.t.length*5.5+44});
    c.globalAlpha=.55;c.font='500 12px "DM Sans"';c.textAlign='center';c.fillStyle='#334155';
    c.fillText('Raw reads with quality issues. Press \u2192 to see each trimming method',w/2,h-14);
    c.globalAlpha=1;
  }
  /* Phase 1: PE overlap */
  drawPEOverlap(p){
    const c=this.ctx,w=this.w,h=this.h,rh=22;
    const insertW=Math.min(260,w*.32); // short biological insert
    const adW=Math.min(80,w*.10);      // adapter readthrough portion
    const r1x=w*.18;                   // R1 insert starts here
    const cy1=h*.22,cy2=cy1+rh+44;    // R1 and R2 vertical rows (44px gap for labels)
    // R2 slides from off-screen; final: adapter left of insert, bio aligned with R1
    const r2finalX=r1x-adW;
    const r2x=w+50+(r2finalX-w-50)*Math.min(p*1.5,1);
    const r2bioX=r2x+adW;
    const bases='ACGTACGATCGGAAGAGCACACGTCTGAACTCCAGTCAC';
    c.clearRect(0,0,w,h);

    // Insert bracket above R1
    c.globalAlpha=.5;c.strokeStyle='#475569';c.lineWidth=1;c.setLineDash([3,3]);
    const isY=cy1-18;
    c.beginPath();c.moveTo(r1x,isY);c.lineTo(r1x,isY-6);c.lineTo(r1x+insertW,isY-6);c.lineTo(r1x+insertW,isY);c.stroke();c.setLineDash([]);
    c.font='500 9px "DM Sans"';c.textAlign='center';c.fillStyle='#334155';
    c.fillText('short biological insert (~150 bp)',r1x+insertW/2,isY-10);

    // R1: [insert (blue)] + [adapter readthrough (orange)]  5'→3'
    c.globalAlpha=.85;c.fillStyle=COLORS.gb;
    c.beginPath();c.roundRect(r1x,cy1,insertW,rh,[rh/2,0,0,rh/2]);c.fill();
    c.globalAlpha=.7;c.fillStyle=COLORS.adapter;
    c.beginPath();c.roundRect(r1x+insertW,cy1,adW,rh,[0,rh/2,rh/2,0]);c.fill();
    // Base letters on R1
    c.globalAlpha=.3;c.font='600 10px "DM Mono"';c.textAlign='left';c.fillStyle='#fff';
    for(let b=0;b<Math.min(Math.floor(insertW/7.5),38);b++){c.fillText(bases[b%bases.length],r1x+5+b*7.5,cy1+rh/2+3)}
    // R1 label
    c.globalAlpha=.85;c.font='600 11px "DM Sans"';c.textAlign='left';c.fillStyle='#1d4ed8';
    c.fillText('R1  5\u2032 \u2192 3\u2032',r1x,cy1-4);

    // R2 (reverse-complemented): [adapter readthrough (orange)] + [insert (purple)]
    c.globalAlpha=.7;c.fillStyle=COLORS.adapter;
    c.beginPath();c.roundRect(r2x,cy2,adW,rh,[rh/2,0,0,rh/2]);c.fill();
    c.globalAlpha=.85;c.fillStyle=COLORS.gc;
    c.beginPath();c.roundRect(r2bioX,cy2,insertW,rh,[0,rh/2,rh/2,0]);c.fill();
    // Base letters on R2
    c.globalAlpha=.3;c.font='600 10px "DM Mono"';c.textAlign='left';c.fillStyle='#fff';
    for(let b=0;b<Math.min(Math.floor(insertW/7.5),38);b++){c.fillText(bases[(b+12)%bases.length],Math.max(r2bioX,0)+5+b*7.5,cy2+rh/2+3)}
    // R2 label
    c.globalAlpha=.85;c.font='600 11px "DM Sans"';c.fillStyle='#6d28d9';c.textAlign='left';
    c.fillText('R2 (rev-comp)  3\u2032 \u2190 5\u2032',Math.max(r2x,r2bioX),cy2-4);

    // Overlap highlight: the ENTIRE INSERT is the overlap zone
    if(p>.6){
      const op=Math.min((p-.6)/.2,1);
      const olX=r1x,olY=cy1-4,olW=insertW,olH=cy2+rh+4-cy1+4;
      c.globalAlpha=op*.10;c.fillStyle='#16a34a';c.beginPath();c.roundRect(olX,olY,olW,olH,6);c.fill();
      c.globalAlpha=op*.55;c.strokeStyle='#16a34a';c.lineWidth=1.5;c.setLineDash([4,3]);
      c.beginPath();c.roundRect(olX,olY,olW,olH,6);c.stroke();c.setLineDash([]);
      c.globalAlpha=op;c.font='600 11px "DM Sans"';c.textAlign='center';c.fillStyle='#16a34a';
      c.fillText('full overlap: both reads cover the same insert',r1x+insertW/2,(cy1+cy2+rh)/2);
      c.font='400 9px "DM Mono"';c.fillText('~150 bp',r1x+insertW/2,(cy1+cy2+rh)/2+14);
    }
    // Scissors + trim labels at adapter boundaries
    if(p>.8){
      const sp=Math.min((p-.8)/.15,1);
      c.globalAlpha=sp;c.font='18px serif';c.textAlign='center';
      c.fillText('\u2702',r1x+insertW,cy1+rh+14);  // cut R1 adapter (right)
      c.fillText('\u2702',r2bioX,cy2-8);             // cut R2 adapter (left)
      c.globalAlpha=sp*.7;c.font='700 10px "DM Sans"';c.fillStyle='#b91c1c';c.textAlign='center';
      c.fillText('trim!',r1x+insertW+adW/2,cy1-4);
      c.fillText('trim!',r2x+adW/2,cy2+rh+14);
    }
    // Summary
    if(p>=1){
      c.globalAlpha=.7;c.font='500 11px "DM Sans"';c.textAlign='center';c.fillStyle='#0f172a';
      c.fillText('Both reads sequenced the entire insert. Adapter tails beyond the insert are trimmed.',w/2,h-18);
    }
    c.globalAlpha=1;
  }
  /* Phase 2: pattern matching */
  drawPatternMatch(p){
    const c=this.ctx,w=this.w,h=this.h,rh=22,ry=h*.28;
    const readBioW=Math.min(360,w*.44),adW=Math.min(80,w*.1),px=w*.08;
    const tplY=ry+rh+34,tplW=adW+24;
    const readSeq='ATCGATCGAACGTACTGGCATTCGAAGATCGGAAGAGC';
    const adSeq='AGATCGGAAGAGC';
    // slide position: template scans from left to right
    const scanEnd=px+readBioW-4,scanStart=px;
    const tplX=scanStart+(scanEnd-scanStart)*Math.min(p*1.4,1);
    c.clearRect(0,0,w,h);
    // Read: bio + hidden adapter
    c.globalAlpha=.85;c.fillStyle=COLORS.gb;c.beginPath();c.roundRect(px,ry,readBioW,rh,[rh/2,0,0,rh/2]);c.fill();
    c.globalAlpha=.7;c.fillStyle=COLORS.adapter;c.beginPath();c.roundRect(px+readBioW,ry,adW,rh,[0,rh/2,rh/2,0]);c.fill();
    // base letters on read
    c.globalAlpha=.3;c.font='600 10px "DM Mono"';c.textAlign='left';c.fillStyle='#fff';
    for(let b=0;b<Math.min(Math.floor(readBioW/7.5),38);b++){c.fillText(readSeq[b%readSeq.length],px+5+b*7.5,ry+rh/2+3)}
    // adapter letters
    c.globalAlpha=.4;c.font='600 10px "DM Mono"';c.fillStyle='#92400e';
    for(let b=0;b<Math.min(Math.floor(adW/7),12);b++){c.fillText(adSeq[b%adSeq.length],px+readBioW+4+b*7,ry+rh/2+3)}
    // Read label
    c.globalAlpha=.8;c.font='600 12px "DM Sans"';c.textAlign='left';c.fillStyle='#0f172a';c.fillText('Read (unknown content)',px,ry-8);
    // Known adapter template
    c.globalAlpha=.75;c.fillStyle='#d97706';c.beginPath();c.roundRect(tplX,tplY,tplW,rh,rh/2);c.fill();
    // template letters
    c.globalAlpha=.5;c.font='600 10px "DM Mono"';c.textAlign='left';c.fillStyle='#fff';
    for(let b=0;b<Math.min(Math.floor(tplW/7),12);b++){c.fillText(adSeq[b%adSeq.length],tplX+6+b*7,tplY+rh/2+3)}
    c.globalAlpha=.8;c.font='600 10px "DM Sans"';c.textAlign='center';c.fillStyle='#92400e';c.fillText('known adapter template',tplX+tplW/2,tplY-8);
    // Scanning lines between template and read
    const aligned=p>.7;
    if(p>.1){
      c.globalAlpha=.2;c.strokeStyle='#94a3b8';c.lineWidth=.5;c.setLineDash([2,2]);
      c.beginPath();c.moveTo(tplX+4,tplY);c.lineTo(tplX+4,ry+rh);c.stroke();
      c.beginPath();c.moveTo(tplX+tplW-4,tplY);c.lineTo(tplX+tplW-4,ry+rh);c.stroke();
      c.setLineDash([]);
    }
    // Match/mismatch indicators
    if(p>.15&&!aligned){
      const nChecks=Math.min(5,Math.floor((p-.15)/.1));
      for(let i=0;i<nChecks;i++){
        c.globalAlpha=.5;c.font='600 11px "DM Sans"';c.textAlign='center';c.fillStyle=COLORS.bad;
        c.fillText('\u2717',tplX+8+i*14,(ry+rh+tplY)/2+4);
      }
      c.globalAlpha=.35;c.font='400 9px "DM Sans"';c.textAlign='center';c.fillStyle=COLORS.bad;
      c.fillText('no match',tplX+tplW/2,(ry+rh+tplY)/2+18);
    }
    if(aligned){
      const mp=Math.min((p-.7)/.15,1);
      // match checkmarks
      const nMatches=Math.min(6,Math.round(mp*6));
      for(let i=0;i<nMatches;i++){
        c.globalAlpha=mp*.7;c.font='600 11px "DM Sans"';c.textAlign='center';c.fillStyle='#16a34a';
        c.fillText('\u2713',tplX+8+i*13,(ry+rh+tplY)/2+4);
      }
      c.globalAlpha=mp*.4;c.font='500 9px "DM Sans"';c.textAlign='center';c.fillStyle='#16a34a';
      c.fillText('match found!',tplX+tplW/2,(ry+rh+tplY)/2+18);
      // highlight adapter region on read
      c.globalAlpha=mp*.18;c.fillStyle='#16a34a';c.beginPath();c.roundRect(px+readBioW-2,ry-4,adW+6,rh+8,4);c.fill();
      c.globalAlpha=mp*.5;c.strokeStyle='#16a34a';c.lineWidth=1.5;c.setLineDash([3,2]);c.beginPath();c.roundRect(px+readBioW-2,ry-4,adW+6,rh+8,4);c.stroke();c.setLineDash([]);
    }
    // Scissors
    if(p>.85){
      const sp=Math.min((p-.85)/.1,1);
      c.globalAlpha=sp;c.font='18px serif';c.textAlign='center';
      c.fillText('\u2702',px+readBioW,ry+rh+14);
    }
    // Summary line at bottom
    if(p>=1){
      c.globalAlpha=.7;c.font='500 12px "DM Sans"';c.textAlign='center';c.fillStyle='#0f172a';
      c.fillText('Known adapter matched at read tail \u2192 clip it',w/2,h-18);
    }
    c.globalAlpha=1;
  }
  /* Phase 3: sliding window quality */
  drawSlidingWindow(p){
    const c=this.ctx,w=this.w,h=this.h;
    const nBases=32,bw=Math.min(24,(w-100)/nBases),bh=18,px=44,py=h*.18;
    const R=rng(55);
    c.clearRect(0,0,w,h);
    // Title
    c.globalAlpha=.7;c.font='500 10px "DM Sans"';c.textAlign='left';c.fillStyle='#0f172a';
    c.fillText('5\u2032 end (high quality)',px,py-6);c.textAlign='right';c.fillText('3\u2032 end (quality degrades)',px+nBases*bw,py-6);
    // Generate quality values: high left, degrading right
    const quals=[];for(let i=0;i<nBases;i++){const base=37-i*1.1;quals.push(Math.max(4,base+(R()-.5)*5))}
    const qMax=42,barMax=h*.3,threshQ=20,threshY=py+bh+8+(1-threshQ/qMax)*barMax;
    // Draw bases and quality bars
    const baseChars='ACGT';
    for(let i=0;i<nBases;i++){
      const x=px+i*bw,q=quals[i];
      const barH=(q/qMax)*barMax;
      const barY=py+bh+8+barMax-barH;
      const good=q>=threshQ;
      // base block
      c.globalAlpha=good?.85:.4;c.fillStyle=good?COLORS.gb:'#cbd5e1';
      c.beginPath();c.roundRect(x+1,py,bw-2,bh,3);c.fill();
      // base letter
      c.globalAlpha=good?.7:.3;c.font='600 9px "DM Mono"';c.textAlign='center';c.fillStyle='#fff';
      c.fillText(baseChars[Math.floor(R()*4)],x+bw/2,py+bh/2+3);
      // quality bar with gradient
      const barCol=good?'#16a34a':q>=15?'#d97706':'#dc2626';
      c.globalAlpha=good?.6:.35;c.fillStyle=barCol;
      c.beginPath();c.roundRect(x+2,barY,bw-4,barH,[2,2,0,0]);c.fill();
      // Q value label
      c.globalAlpha=.55;c.font='500 9px "DM Mono"';c.fillStyle='#1e293b';c.textAlign='center';
      c.fillText('Q'+Math.round(q),x+bw/2,py+bh+8+barMax+12);
    }
    // Q20 threshold line
    c.globalAlpha=.5;c.strokeStyle=COLORS.bad;c.lineWidth=1;c.setLineDash([4,3]);
    c.beginPath();c.moveTo(px-14,threshY);c.lineTo(px+nBases*bw+10,threshY);c.stroke();c.setLineDash([]);
    c.font='500 9px "DM Sans"';c.textAlign='left';c.fillStyle=COLORS.bad;
    c.fillText('Q20',px-14,threshY-5);
    // Q30 reference line (lighter)
    const q30Y=py+bh+8+(1-30/qMax)*barMax;
    c.globalAlpha=.2;c.strokeStyle='#16a34a';c.setLineDash([2,4]);
    c.beginPath();c.moveTo(px-14,q30Y);c.lineTo(px+nBases*bw+10,q30Y);c.stroke();c.setLineDash([]);
    c.globalAlpha=.25;c.font='500 10px "DM Sans"';c.fillStyle='#16a34a';c.fillText('Q30',px-14,q30Y-4);
    // Y-axis quality scale
    c.globalAlpha=.45;c.font='400 9px "DM Mono"';c.textAlign='right';c.fillStyle='#334155';
    for(let q=0;q<=40;q+=10){const yy=py+bh+8+(1-q/qMax)*barMax;c.fillText(q,px-18,yy+3)}
    // Sliding window bracket (4 bases wide, scanning right to left)
    const winW=4;
    const scanStart=nBases-winW,scanEnd=0;
    // find actual cut point
    let cutIdx=nBases;
    for(let i=nBases-winW;i>=0;i--){let sum=0;for(let j=0;j<winW;j++)sum+=quals[i+j];if(sum/winW>=threshQ){cutIdx=i+winW;break}}
    // window position based on progress
    const winIdx=Math.round(scanStart-(scanStart-scanEnd)*Math.min(p*1.3,1));
    const winX=px+winIdx*bw,winEndX=winX+winW*bw;
    let winMean=0;for(let j=0;j<winW&&winIdx+j<nBases;j++)winMean+=quals[winIdx+j];winMean/=winW;
    const winBad=winMean<threshQ;
    if(p>0&&p<1){
      // draw bracket
      c.globalAlpha=.7;c.strokeStyle=winBad?COLORS.bad:'#16a34a';c.lineWidth=2;c.setLineDash([]);
      c.beginPath();c.roundRect(winX-1,py-6,winW*bw+2,bh+14,4);c.stroke();
      // shaded window area over bars
      c.globalAlpha=.06;c.fillStyle=winBad?'#dc2626':'#16a34a';c.beginPath();c.roundRect(winX-1,py-6,winW*bw+2,bh+8+barMax+8,4);c.fill();
      // mean label with arrow
      c.globalAlpha=.85;c.font='600 11px "DM Sans"';c.textAlign='center';c.fillStyle=winBad?COLORS.bad:'#16a34a';
      c.fillText('\u25bc window mean: Q'+Math.round(winMean),winX+winW*bw/2,py-16);
      // direction arrow
      c.globalAlpha=.6;c.font='500 10px "DM Sans"';c.textAlign='left';c.fillStyle='#334155';
      c.fillText('\u2190 scanning',winX+winW*bw+8,py+bh/2+2);
    }
    // Scissors and dim tail after scan done
    if(p>.8){
      const sp=Math.min((p-.8)/.15,1);
      const cutX=px+cutIdx*bw;
      c.globalAlpha=sp;c.font='20px serif';c.textAlign='center';
      c.fillText('\u2702',cutX,py+bh+8+barMax+28);
      // dim the low-quality region
      c.globalAlpha=sp*.12;c.fillStyle='#dc2626';c.beginPath();c.roundRect(cutX,py-8,px+nBases*bw-cutX+6,bh+8+barMax+16,4);c.fill();
      c.globalAlpha=sp*.5;c.strokeStyle='#dc2626';c.lineWidth=1.5;c.setLineDash([4,3]);c.beginPath();c.roundRect(cutX,py-8,px+nBases*bw-cutX+6,bh+8+barMax+16,4);c.stroke();c.setLineDash([]);
      // "removed" label
      c.globalAlpha=sp*.5;c.font='600 10px "DM Sans"';c.textAlign='center';c.fillStyle=COLORS.bad;
      c.fillText('trimmed',(cutX+px+nBases*bw)/2,py+bh+8+barMax+28);
    }
    // Summary line at bottom
    if(p>=1){
      c.globalAlpha=.7;c.font='500 12px "DM Sans"';c.textAlign='center';c.fillStyle='#0f172a';
      c.fillText('Window mean dropped below Q20 \u2192 trim the low-quality tail',w/2,h-18);
    }
    c.globalAlpha=1;
  }
  goToStep(step){
    if(this.animating){this.stepQueue.push(step);return false}
    return this._execStep(step);
  }
  _execStep(step){
    if(this.animating)return false;
    // Allow jumping: if phase is behind, fast-forward through intermediate steps
    while(this.phase<step-1&&this.phase<3){
      const s=this.phase+1;
      if(s===1){this.phase=1;this.highlightStep(0);this.drawPEOverlap(1)}
      else if(s===2){this.phase=2;this.highlightStep(1);this.drawPatternMatch(1)}
      else if(s===3){this.phase=3;this.highlightStep(2);this.drawSlidingWindow(1)}
    }
    if(step===1&&this.phase===0){
      this.phase=1;this.highlightStep(0);
      this.setLabel('PE overlap — aligning R1 and R2','#3b82f6');this.setCounter('Step 1/3');
      this.setStatus('PE overlap demo');
      this.anim(2500,p=>this.drawPEOverlap(p),()=>{this.setLabel('PE overlap — adapters identified','#16a34a')});
      return true;
    }
    if(step===2&&this.phase===1){
      this.phase=2;this.highlightStep(1);
      this.setLabel('Sequence matching — scanning for known adapters','#d97706');this.setCounter('Step 2/3');
      this.setStatus('Pattern matching demo');
      this.anim(2500,p=>this.drawPatternMatch(p),()=>{this.setLabel('Sequence matching — adapter clipped','#16a34a')});
      return true;
    }
    if(step===3&&this.phase===2){
      this.phase=3;this.highlightStep(2);
      this.setLabel('Quality window — scanning from 3\' end','#dc2626');this.setCounter('Step 3/3');
      this.setStatus('Sliding window demo');
      this.anim(2500,p=>this.drawSlidingWindow(p),()=>{this.setLabel('Quality window — low-quality tail removed','#16a34a')});
      return true;
    }
    return false;
  }
  goBack(step){
    if(step===0){this.phase=0;this.highlightStep(-1);this.setLabel('Raw reads with quality issues');this.setCounter('');this.setStatus('Use \u2192 to step through methods');this.drawPhase0()}
    else if(step===1){this.phase=1;this.highlightStep(0);this.setLabel('PE overlap — adapters identified','#16a34a');this.setCounter('Step 1/3');this.setStatus('PE overlap demo');this.drawPEOverlap(1)}
    else if(step===2){this.phase=2;this.highlightStep(1);this.setLabel('Sequence matching — adapter clipped','#16a34a');this.setCounter('Step 2/3');this.setStatus('Pattern matching demo');this.drawPatternMatch(1)}
  }
}

function animPipe(){
  const ns=document.querySelectorAll('#pipeline-1 .pipe-node'),f=document.getElementById('track-fill');
  if(!ns.length||!f)return;
  ns.forEach((n,i)=>setTimeout(()=>{n.classList.add('visible','active');f.style.width=((i+1)/ns.length*100)+'%'},120+i*220));
}

/* === ASSEMBLY SLIDES — Canvas 2D, matching earlier slides === */

/* Flat color palette */
const _F={
  blue:'#3b82f6',blueBg:'#eff6ff',blueTxt:'#1e40af',
  teal:'#0d9488',tealBg:'#f0fdfa',tealTxt:'#0f766e',
  violet:'#7c3aed',violetBg:'#f5f3ff',violetTxt:'#5b21b6',
  amber:'#d97706',amberBg:'#fffbeb',amberTxt:'#92400e',
  gray:'#64748b',grayBg:'#f8fafc',grayTxt:'#334155',
  red:'#dc2626',redBg:'#fef2f2',
  green:'#16a34a'
};

/* Create a canvas inside a div container, with DPR scaling and 800x440 virtual coords */
function _asmCanvas(id){
  const cv=initCanvas(id);if(!cv)return null;
  const{ctx,w,h}=cv;
  // Apply virtual coordinate scaling (800×440) on top of DPR transform
  const sx=w/800,sy=h/440;
  const s=Math.min(sx,sy);
  const ox=(w-800*s)/2, oy=(h-440*s)/2;
  const d=devicePixelRatio||1;
  ctx.setTransform(s*d,0,0,s*d,ox*d,oy*d);
  return ctx;
}

/* Draw a pill (rounded rect) with optional highlight */
function _pill(ctx,x,y,w,h,fill,stroke,sw){
  const r=h/2;
  ctx.beginPath();ctx.roundRect(x,y,w,h,r);
  if(fill){ctx.fillStyle=fill;ctx.fill();}
  if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=sw||1.5;ctx.stroke();}
  // subtle top highlight
  if(fill && fill!=='none'){
    ctx.globalAlpha=0.12;
    ctx.beginPath();ctx.roundRect(x,y,w,h*0.4,[r,r,0,0]);
    ctx.fillStyle='#fff';ctx.fill();
    ctx.globalAlpha=1;
  }
}

/* Draw an arrow edge with quadratic bezier and filled arrowhead */
function _drawEdge(ctx,x1,y1,x2,y2,r1,r2,col,lw,bend,dash,noArrow){
  lw=lw||2;
  const dx=x2-x1,dy=y2-y1,d=Math.sqrt(dx*dx+dy*dy)||1;
  const ux=dx/d,uy=dy/d,px=-uy,py=ux;
  // clip to node boundaries
  let sx,sy,ex,ey;
  if(typeof r1==='object'){
    const adx=Math.abs(dx),ady=Math.abs(dy);
    let t;if(adx*r1.h>ady*r1.w) t=r1.w/adx; else t=r1.h/ady;
    sx=x1+dx*t+ux*2;sy=y1+dy*t+uy*2;
  } else {sx=x1+ux*r1;sy=y1+uy*r1;}
  if(typeof r2==='object'){
    const adx=Math.abs(dx),ady=Math.abs(dy);
    let t;if(adx*r2.h>ady*r2.w) t=r2.w/adx; else t=r2.h/ady;
    ex=x2-dx*t-ux*2;ey=y2-dy*t-uy*2;
  } else {ex=x2-ux*r2;ey=y2-uy*r2;}
  const b=typeof bend==='number'?bend:d*.12;
  const mx=(sx+ex)/2+px*b,my=(sy+ey)/2+py*b;

  /* Arrow geometry — scales with line width */
  const aLen=Math.max(8,lw*3),aW=Math.max(3.5,lw*1.6);

  /* Pull the curve endpoint back so the stroke stops at the arrow base */
  let drawEx=ex,drawEy=ey;
  if(!noArrow){
    const at=0.98;
    const tanX=2*(1-at)*(mx-sx)+2*at*(ex-mx);
    const tanY=2*(1-at)*(my-sy)+2*at*(ey-my);
    const td=Math.sqrt(tanX*tanX+tanY*tanY)||1;
    drawEx=ex-tanX/td*aLen*0.7;
    drawEy=ey-tanY/td*aLen*0.7;
  }

  ctx.beginPath();
  ctx.moveTo(sx,sy);ctx.quadraticCurveTo(mx,my,drawEx,drawEy);
  ctx.strokeStyle=col;ctx.lineWidth=lw;ctx.lineCap='round';
  if(dash){ctx.setLineDash(dash);}else{ctx.setLineDash([]);}
  ctx.stroke();ctx.setLineDash([]);

  // arrowhead — drawn at full alpha, tangent at endpoint
  if(!noArrow){
    const at=0.98;
    const tanX=2*(1-at)*(mx-sx)+2*at*(ex-mx);
    const tanY=2*(1-at)*(my-sy)+2*at*(ey-my);
    const ang=Math.atan2(tanY,tanX);
    const savedAlpha=ctx.globalAlpha;
    ctx.globalAlpha=Math.min(savedAlpha*2.5,1);
    ctx.beginPath();
    ctx.moveTo(ex,ey);
    ctx.lineTo(ex-aLen*Math.cos(ang-Math.atan2(aW,aLen)),ey-aLen*Math.sin(ang-Math.atan2(aW,aLen)));
    ctx.lineTo(ex-aLen*Math.cos(ang+Math.atan2(aW,aLen)),ey-aLen*Math.sin(ang+Math.atan2(aW,aLen)));
    ctx.closePath();ctx.fillStyle=col;ctx.fill();
    ctx.globalAlpha=savedAlpha;
  }
  return {mx,my,sx,sy,ex,ey};
}

/* Draw a circle node with bg fill + border */
function _circNode(ctx,x,y,r,bg,bc,lw){
  ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);
  ctx.fillStyle=bg;ctx.fill();
  ctx.strokeStyle=bc;ctx.lineWidth=lw||2;ctx.stroke();
}

/* Draw a rounded-rect node with bg fill + border */
function _rectNode(ctx,x,y,w,h,rx,bg,bc,lw){
  ctx.beginPath();ctx.roundRect(x-w/2,y-h/2,w,h,rx);
  ctx.fillStyle=bg;ctx.fill();
  ctx.strokeStyle=bc;ctx.lineWidth=lw||2;ctx.stroke();
  // subtle highlight
  ctx.globalAlpha=0.12;
  ctx.beginPath();ctx.roundRect(x-w/2,y-h/2,w,h*0.4,[rx,rx,0,0]);
  ctx.fillStyle='#fff';ctx.fill();
  ctx.globalAlpha=1;
}

/* Draw a down-arrow (simple line with triangle) */
function _downArrow(ctx,x,y1,y2,col){
  ctx.beginPath();ctx.moveTo(x,y1);ctx.lineTo(x,y2-6);
  ctx.strokeStyle=col;ctx.lineWidth=1.5;ctx.stroke();
  ctx.beginPath();ctx.moveTo(x,y2);ctx.lineTo(x-4,y2-7);ctx.lineTo(x+4,y2-7);ctx.closePath();
  ctx.fillStyle=col;ctx.fill();
}

/* Draw a badge (small rounded-rect with text) */
function _badge(ctx,x,y,text,bg,bc,tc,fontSize){
  ctx.font=(fontSize||10)+'px "DM Sans",sans-serif';
  const tw=ctx.measureText(text).width+16;
  ctx.beginPath();ctx.roundRect(x-tw/2,y-10,tw,20,10);
  ctx.fillStyle=bg;ctx.fill();
  ctx.strokeStyle=bc;ctx.lineWidth=1;ctx.stroke();
  ctx.fillStyle=tc;ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.font='600 '+(fontSize||10)+'px "DM Sans",sans-serif';
  ctx.fillText(text,x,y);
}

/* ================================================================
   Slide 8: Why assemble
   ================================================================ */
function drawWhyAssemble(step){
  const ctx=_asmCanvas('wa-canvas');if(!ctx)return;
  const W=800,H=440;
  const R=rng(42);

  /* ── Contig definitions: each "contig" is a group of overlapping reads ── */
  const contigDefs=[
    {col:_F.teal,  nReads:14,rLen:48,span:180,label:'contig 1 (longest)'},
    {col:_F.blue,  nReads:10,rLen:44,span:130,label:'contig 2'},
    {col:_F.violet,nReads:7, rLen:42,span:90, label:'contig 3'},
    {col:_F.amber, nReads:4, rLen:40,span:55, label:'contig 4 (short)'}
  ];

  /* Generate reads for one contig group */
  function genGroup(def){
    const reads=[];
    for(let i=0;i<def.nReads;i++){
      const start=Math.floor(R()*def.span);
      const len=def.rLen+Math.floor((R()-.5)*18);
      reads.push({start,len:Math.min(len,def.span+def.rLen-start),col:def.col});
    }
    reads.sort((a,b)=>a.start-b.start);
    return reads;
  }

  /* Draw a mini-pileup for a group of reads */
  function drawMiniPileup(reads,ox,oy,scale,rh,gap,maxRows,alpha){
    const rowEnds=[];
    reads.forEach(r=>{
      for(let row=0;row<maxRows;row++){
        if(!rowEnds[row]||rowEnds[row]<=r.start){
          rowEnds[row]=r.start+r.len+2;
          const x=ox+r.start*scale,y=oy+row*(rh+gap),w=r.len*scale;
          ctx.globalAlpha=alpha||0.8;
          ctx.beginPath();ctx.roundRect(x,y,w,rh,rh/2);ctx.fillStyle=r.col;ctx.fill();
          ctx.globalAlpha=0.12;
          ctx.beginPath();ctx.roundRect(x,y,w,rh*0.4,[rh/2,rh/2,0,0]);ctx.fillStyle='#fff';ctx.fill();
          ctx.globalAlpha=1;
          return;
        }
      }
    });
    return rowEnds.length;
  }

  if(step===0){
    /* ── Step 0: Raw reads — jumbled, no order ── */
    const allReads=[];
    contigDefs.forEach(def=>{
      for(let i=0;i<def.nReads;i++){
        const w=def.rLen+Math.floor((R()-.5)*18);
        allReads.push({col:def.col,w});
      }
    });
    // Shuffle
    for(let i=allReads.length-1;i>0;i--){const j=Math.floor(R()*(i+1));[allReads[i],allReads[j]]=[allReads[j],allReads[i]];}

    // Lay out in dense rows, mixed colours
    const rh=6,gap=3,px=30,py=20;
    const rows=[];let curRow=[],curX=px;
    allReads.forEach(r=>{
      if(curX+r.w>W-px){rows.push(curRow);curRow=[];curX=px;}
      curRow.push({...r,x:curX});curX+=r.w+4+R()*5;
    });
    if(curRow.length)rows.push(curRow);

    rows.forEach((row,ri)=>{
      const y=py+ri*(rh+gap);
      row.forEach(r=>{
        ctx.globalAlpha=0.8;
        ctx.beginPath();ctx.roundRect(r.x,y,r.w,rh,rh/2);ctx.fillStyle=r.col;ctx.fill();
        ctx.globalAlpha=0.12;
        ctx.beginPath();ctx.roundRect(r.x,y,r.w,rh*0.4,[rh/2,rh/2,0,0]);ctx.fillStyle='#fff';ctx.fill();
        ctx.globalAlpha=1;
      });
    });

    // Big question
    const qY=rows.length*(rh+gap)+py+30;
    ctx.font='700 36px "DM Sans",sans-serif';ctx.fillStyle=_F.blue;ctx.globalAlpha=0.08;
    ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('?',400,qY+20);ctx.globalAlpha=1;

    ctx.font='500 12px "DM Sans",sans-serif';ctx.fillStyle=_F.gray;ctx.textAlign='center';ctx.textBaseline='alphabetic';
    ctx.fillText('Millions of short reads. How do we reconstruct the original genomes?',W/2,H-12);
  }

  else if(step===1){
    /* ── Step 1: OLC — reads grouped into pileups per contig ── */
    /* 4 contig groups side by side, each with its own mini-pileup.
       Gaps between groups show where coverage was missing. */
    const groups=contigDefs.map(d=>genGroup(d));
    const totalSpan=contigDefs.reduce((s,d)=>s+d.span+d.rLen,0);
    const gapW=20; // gap between contig groups
    const availW=W-60-gapW*(groups.length-1);
    const scale=availW/totalSpan;
    const rh=5,gap=1.5,maxRows=12;

    // Title labels
    ctx.font='600 10px "DM Sans",sans-serif';ctx.textBaseline='alphabetic';

    let ox=30;
    groups.forEach((reads,gi)=>{
      const def=contigDefs[gi];
      const groupW=(def.span+def.rLen)*scale;

      // Light background band
      ctx.globalAlpha=0.06;ctx.fillStyle=def.col;
      ctx.fillRect(ox-4,15,groupW+8,280);
      ctx.globalAlpha=1;

      // Group label
      ctx.font='600 9px "DM Sans",sans-serif';ctx.fillStyle=def.col;ctx.textAlign='center';
      ctx.fillText(def.label,ox+groupW/2,12);

      // Mini pileup
      drawMiniPileup(reads,ox,20,scale,rh,gap,maxRows,0.8);

      // Overlap bracket annotation (on first group only)
      if(gi===0){
        const bY=20+5*(rh+gap);
        ctx.strokeStyle=_F.green;ctx.lineWidth=1.5;ctx.setLineDash([3,2]);
        ctx.beginPath();ctx.moveTo(ox+20*scale,bY);ctx.lineTo(ox+20*scale,bY+12);
        ctx.lineTo(ox+55*scale,bY+12);ctx.lineTo(ox+55*scale,bY);ctx.stroke();
        ctx.setLineDash([]);
        ctx.font='600 9px "DM Sans",sans-serif';ctx.fillStyle=_F.green;ctx.textAlign='center';
        ctx.fillText('overlap',ox+37*scale,bY+20);
      }

      // Arrow down to contig bar
      const pileH=Math.min(maxRows,reads.length)*(rh+gap);
      _downArrow(ctx,ox+groupW/2,20+pileH+8,20+pileH+30,_F.gray);

      // Contig bar
      const cY=20+pileH+36;
      ctx.globalAlpha=0.85;
      ctx.beginPath();ctx.roundRect(ox,cY,groupW,18,9);ctx.fillStyle=def.col;ctx.fill();
      ctx.globalAlpha=0.15;
      ctx.beginPath();ctx.roundRect(ox,cY,groupW,7,[9,9,0,0]);ctx.fillStyle='#fff';ctx.fill();
      ctx.globalAlpha=1;

      // Gene arrows on contig
      if(groupW>60){
        const nGenes=Math.max(1,Math.floor(groupW/30));
        for(let g=0;g<nGenes;g++){
          const gx=ox+8+g*(groupW-16)/nGenes;
          const gw=Math.min(20,(groupW-16)/nGenes-4);
          ctx.globalAlpha=0.3;
          ctx.beginPath();
          ctx.moveTo(gx,cY+10);ctx.lineTo(gx+gw-3,cY+10);ctx.lineTo(gx+gw,cY+12);
          ctx.lineTo(gx+gw-3,cY+14);ctx.lineTo(gx,cY+14);ctx.closePath();
          ctx.fillStyle='#fff';ctx.fill();
          ctx.globalAlpha=1;
        }
      }

      ox+=groupW+gapW;
    });

    // Gap annotations
    ctx.font='700 14px "DM Sans",sans-serif';ctx.fillStyle=_F.red;ctx.textAlign='center';ctx.textBaseline='top';
    // Draw "gap" markers between groups
    ox=30;
    for(let gi=0;gi<groups.length-1;gi++){
      const def=contigDefs[gi];
      const groupW=(def.span+def.rLen)*scale;
      const gapX=ox+groupW+gapW/2;
      ctx.globalAlpha=0.3;
      ctx.setLineDash([4,3]);ctx.strokeStyle=_F.red;ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(gapX,18);ctx.lineTo(gapX,270);ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha=0.5;
      ctx.font='700 10px "DM Sans",sans-serif';ctx.fillStyle=_F.red;
      ctx.fillText('gap',gapX,272);
      ctx.globalAlpha=1;
      ox+=groupW+gapW;
    }

    // OLC label
    ctx.font='600 11px "DM Sans",sans-serif';ctx.fillStyle=_F.grayTxt;ctx.textAlign='center';ctx.textBaseline='alphabetic';
    ctx.fillText('Overlap \u2192 Layout \u2192 Consensus',W/2,H-30);
    ctx.font='500 10px "DM Sans",sans-serif';ctx.fillStyle=_F.gray;
    ctx.fillText('Find reads that overlap \u2192 group them \u2192 build one contig per group. Gaps = contig breaks.',W/2,H-14);
  }

  else {
    /* ── Step 2: Assembly output — sorted contigs (horizontal bar chart) ── */
    const P={t:30,l:120,r:60,b:50};
    const cW=W-P.l-P.r, cH=H-P.t-P.b;

    ctx.font='600 13px "DM Sans",sans-serif';ctx.fillStyle=_F.grayTxt;ctx.textAlign='center';ctx.textBaseline='alphabetic';
    ctx.fillText('Assembly output: contigs sorted by length',W/2,18);

    const cCols=[_F.teal,_F.blue,_F.violet,_F.amber,_F.teal,_F.blue,_F.violet];
    const contigs=[
      {name:'contig_001',kb:142,genes:127},{name:'contig_002',kb:98,genes:84},
      {name:'contig_003',kb:67,genes:52},{name:'contig_004',kb:41,genes:33},
      {name:'contig_005',kb:28,genes:19},{name:'contig_006',kb:15,genes:11},
      {name:'contig_007',kb:8,genes:5}
    ];
    const maxKb=contigs[0].kb;
    const barH=Math.min(32,(cH-contigs.length*6)/contigs.length);
    const barGap=(cH-contigs.length*barH)/(contigs.length);

    contigs.forEach((c,i)=>{
      const y=P.t+i*(barH+barGap);
      const w=cW*(c.kb/maxKb);

      ctx.globalAlpha=0.85;
      ctx.beginPath();ctx.roundRect(P.l,y,w,barH,barH/2);ctx.fillStyle=cCols[i];ctx.fill();
      ctx.globalAlpha=0.15;
      ctx.beginPath();ctx.roundRect(P.l,y,w,barH*0.4,[barH/2,barH/2,0,0]);ctx.fillStyle='#fff';ctx.fill();
      ctx.globalAlpha=1;

      if(w>140){
        ctx.font='700 11px "DM Mono",monospace';ctx.fillStyle='#fff';ctx.textAlign='start';ctx.textBaseline='middle';
        ctx.fillText(c.kb+' kb \u00b7 '+c.genes+' genes',P.l+14,y+barH/2);
      } else {
        ctx.font='700 10px "DM Mono",monospace';ctx.fillStyle=_F.grayTxt;ctx.textAlign='start';ctx.textBaseline='middle';
        ctx.fillText(c.kb+' kb',P.l+w+8,y+barH/2);
      }

      ctx.font='10px "DM Mono",monospace';ctx.fillStyle=_F.gray;ctx.textAlign='end';ctx.textBaseline='middle';
      ctx.fillText(c.name,P.l-10,y+barH/2);
    });

    // N50 bracket
    const n50y1=P.t,n50y2=P.t+2*(barH+barGap)+barH;
    const bx=P.l+cW+12;
    ctx.strokeStyle=_F.amber;ctx.lineWidth=1.5;
    ctx.beginPath();ctx.moveTo(bx,n50y1);ctx.lineTo(bx+10,n50y1);ctx.stroke();
    ctx.beginPath();ctx.moveTo(bx+10,n50y1);ctx.lineTo(bx+10,n50y2);ctx.stroke();
    ctx.beginPath();ctx.moveTo(bx,n50y2);ctx.lineTo(bx+10,n50y2);ctx.stroke();
    ctx.font='700 12px "DM Sans",sans-serif';ctx.fillStyle=_F.amber;ctx.textAlign='start';ctx.textBaseline='middle';
    ctx.fillText('N50',bx+16,(n50y1+n50y2)/2);

    ctx.font='500 11px "DM Sans",sans-serif';ctx.fillStyle=_F.gray;ctx.textAlign='center';ctx.textBaseline='alphabetic';
    ctx.fillText('Contigs carry gene context, operon structure, and coverage depth',W/2,H-12);
  }
}

/* ================================================================
   Slide 9: De Bruijn graph — FULLY MANUAL CONTROL
   Each → reveals ONE element. Total 21 steps (0-20):
     0       : Sequence only
     1–8     : Extract k-mers one by one (+ nodes appear for unique)
     9–13    : Connect edges one by one
     14–20   : Eulerian path walk (7 edges, contig grows each step)
   Everything accumulates. Nothing auto-animates.
   ================================================================ */

let _dbgStep=0;

/* ── Precomputed data ── */
const _D=(function(){
  const seq='ATCGATCGAA',k=3;
  const kmers=[];for(let i=0;i<=seq.length-k;i++)kmers.push(seq.substring(i,i+k));
  const unique=[...new Set(kmers)];
  const dupes=new Set(),seen=new Set();
  kmers.forEach(km=>{if(seen.has(km))dupes.add(km);seen.add(km);});
  const firstSeen={};kmers.forEach((km,i)=>{if(!(km in firstSeen))firstSeen[km]=i;});
  const kmerNodeIdx={};unique.forEach((u,i)=>kmerNodeIdx[u]=i);
  const totalCount={};kmers.forEach(km=>{totalCount[km]=(totalCount[km]||0)+1;});

  const baseCols={A:'#3b82f6',T:'#ef4444',C:'#f59e0b',G:'#22c55e'};
  const baseBg={A:'#eff6ff',T:'#fef2f2',C:'#fffbeb',G:'#f0fdf4'};

  const nodes=[
    {id:'ATC',x:120,y:195,bg:'#eff6ff',bc:'#3b82f6',tc:'#1e40af'},
    {id:'TCG',x:320,y:115,bg:'#f5f3ff',bc:'#7c3aed',tc:'#5b21b6'},
    {id:'CGA',x:520,y:195,bg:'#f0fdfa',bc:'#0d9488',tc:'#0f766e'},
    {id:'GAT',x:320,y:290,bg:'#fffbeb',bc:'#d97706',tc:'#92400e'},
    {id:'GAA',x:680,y:280,bg:'#f8fafc',bc:'#64748b',tc:'#334155'}
  ];
  const nMap={};nodes.forEach(n=>nMap[n.id]=n);
  const nW=64,nH=28,nR=14;
  const nBox={w:nW/2+4,h:nH/2+4};
  const edges=[{s:'ATC',t:'TCG'},{s:'TCG',t:'CGA'},{s:'CGA',t:'GAT'},{s:'GAT',t:'ATC'},{s:'CGA',t:'GAA'}];
  /* Eulerian walk that spells ATCGATCGAA (7 edges, some reused) */
  const pathOrder=[['ATC','TCG'],['TCG','CGA'],['CGA','GAT'],['GAT','ATC'],['ATC','TCG'],['TCG','CGA'],['CGA','GAA']];

  return {seq,k,kmers,unique,dupes,firstSeen,kmerNodeIdx,totalCount,
          baseCols,baseBg,nodes,nMap,nW,nH,nR,nBox,edges,pathOrder};
})();

/* Step ranges: 0 seq, 1-8 kmers, 9-13 edges, 14-20 path walk (7 edges) */
const _KMER_START=1, _KMER_END=8;
const _EDGE_START=9, _EDGE_END=13;
const _PATH_START=14,_PATH_END=20;

/* ── Node drawing helper ── */
function _dbgNode(ctx,n,bg,bc,tc,count){
  const nW=_D.nW,nH=_D.nH,nR=_D.nR;
  bg=bg||n.bg;bc=bc||n.bc;tc=tc||n.tc;
  ctx.globalAlpha=0.06;
  ctx.beginPath();ctx.roundRect(n.x-nW/2+1,n.y-nH/2+2,nW,nH,nR);
  ctx.fillStyle='#000';ctx.fill();ctx.globalAlpha=1;
  _rectNode(ctx,n.x,n.y,nW,nH,nR,bg,bc,2);
  ctx.font='700 11px "DM Mono",monospace';ctx.fillStyle=tc;ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText(n.id,n.x,n.y);
  /* abundance badge */
  if(count!=null&&count>0){
    const bx=n.x+nW/2-2,by=n.y-nH/2-2;
    const label='×'+count,r=8;
    ctx.font='700 10px "DM Sans",sans-serif';
    const tw=ctx.measureText(label).width;
    const pw=Math.max(tw+6,r*2);
    ctx.beginPath();ctx.roundRect(bx-pw/2,by-r,pw,r*2,r);
    ctx.fillStyle=count>1?bc:'#e2e8f0';ctx.fill();
    ctx.fillStyle=count>1?'#fff':'#64748b';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(label,bx,by);
  }
}

/* ── Master draw ── */
function _dbgDraw(){
  const ctx=_asmCanvas('dbg-canvas');if(!ctx)return;
  const W=800,H=440, D=_D, step=_dbgStep;
  const seq=D.seq,k=D.k,kmers=D.kmers;

  const kRevealed=Math.min(Math.max(step-_KMER_START+1,0),kmers.length);
  const edgesRevealed=Math.min(Math.max(step-_EDGE_START+1,0),D.edges.length);
  const pathRevealed=Math.min(Math.max(step-_PATH_START+1,0),D.pathOrder.length);
  const activeKmer=step>=_KMER_START&&step<=_KMER_END?step-_KMER_START:-1;

  /* Running k-mer counts per node (accumulates as k-mers are revealed) */
  const runCount={};
  for(let i=0;i<kRevealed;i++){runCount[kmers[i]]=(runCount[kmers[i]]||0)+1;}

  /* ═══ Sequence bar ═══ */
  const bW=22,bH=24,bG=1,totalSW=seq.length*(bW+bG)-bG;
  const bX0=(W-totalSW)/2, bY=4;

  ctx.beginPath();ctx.moveTo(bX0,bY+bH/2);ctx.lineTo(bX0+totalSW,bY+bH/2);
  ctx.strokeStyle='#e2e8f0';ctx.lineWidth=1;ctx.stroke();

  seq.split('').forEach((b,i)=>{
    const x=bX0+i*(bW+bG),col=D.baseCols[b],bg=D.baseBg[b];
    const inWin=activeKmer>=0&&i>=activeKmer&&i<activeKmer+k;
    ctx.globalAlpha=inWin?1:(step>=_KMER_START&&activeKmer>=0?0.5:1);
    ctx.beginPath();ctx.roundRect(x,bY,bW,bH,4);
    ctx.fillStyle=bg;ctx.fill();
    ctx.strokeStyle=inWin?col:'#cbd5e1';ctx.lineWidth=inWin?2:0.8;ctx.stroke();
    ctx.font='700 13px "DM Mono",monospace';ctx.fillStyle=col;
    ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(b,x+bW/2,bY+bH/2+1);
    ctx.globalAlpha=1;
  });

  if(activeKmer>=0){
    const wx=bX0+activeKmer*(bW+bG)-2,ww=k*(bW+bG)-bG+4;
    ctx.beginPath();ctx.roundRect(wx,bY-2,ww,bH+4,5);
    ctx.strokeStyle=_F.teal;ctx.lineWidth=2;ctx.stroke();
    ctx.globalAlpha=0.05;ctx.fillStyle=_F.teal;ctx.fill();ctx.globalAlpha=1;
  }

  ctx.font='600 10px "DM Sans",sans-serif';ctx.fillStyle=_F.gray;ctx.textAlign='end';ctx.textBaseline='middle';
  ctx.fillText('k='+k,bX0-6,bY+bH/2);

  /* ═══ K-mer pills ═══ */
  const pW=54,pH=18,pG=4;
  const pTotal=kmers.length*(pW+pG)-pG;
  const pX0=(W-pTotal)/2, pY=bY+bH+10;

  if(kRevealed>0){
    ctx.beginPath();ctx.moveTo(W/2,bY+bH+2);ctx.lineTo(W/2,pY-3);
    ctx.strokeStyle='#cbd5e1';ctx.lineWidth=0.8;ctx.stroke();

    kmers.forEach((km,i)=>{
      const x=pX0+i*(pW+pG);
      if(i>=kRevealed){
        ctx.beginPath();ctx.roundRect(x,pY,pW,pH,pH/2);
        ctx.strokeStyle='#e2e8f0';ctx.lineWidth=0.8;ctx.setLineDash([3,2]);ctx.stroke();ctx.setLineDash([]);
        return;
      }
      const isDup=D.dupes.has(km)&&i!==D.firstSeen[km];
      const isActive=i===activeKmer;
      const node=D.nMap[km];
      const nodeCol=node?node.bc:'#94a3b8';

      let pbg='#fff',pbc='#cbd5e1';
      if(isDup){pbg=node?node.bg+'':'#fff8f0';pbc=nodeCol;}
      if(isActive){pbc=nodeCol;}

      ctx.beginPath();ctx.roundRect(x,pY,pW,pH,pH/2);
      ctx.fillStyle=pbg;ctx.fill();
      ctx.strokeStyle=pbc;ctx.lineWidth=isActive?2:(isDup?1.5:0.8);ctx.stroke();

      const chars=km.split(''),cW=11;
      const tx0=x+pW/2-(chars.length*cW)/2;
      ctx.font='700 10px "DM Mono",monospace';ctx.textAlign='center';ctx.textBaseline='middle';
      chars.forEach((ch,ci)=>{
        ctx.fillStyle=D.baseCols[ch]||'#334155';
        ctx.fillText(ch,tx0+ci*cW+cW/2,pY+pH/2);
      });
    });

    /* ── Duplicate connectors: right-angle lines in node color ── */
    [...D.dupes].forEach(km=>{
      const revIdx=[];
      kmers.forEach((k2,i)=>{if(k2===km&&i<kRevealed)revIdx.push(i);});
      if(revIdx.length<2)return;
      const node=D.nMap[km];
      const col=node?node.bc:'#94a3b8';
      const firstX=pX0+revIdx[0]*(pW+pG)+pW/2;
      for(let d=1;d<revIdx.length;d++){
        const dupX=pX0+revIdx[d]*(pW+pG)+pW/2;
        const cornerY=pY+pH+4+d*5;
        ctx.beginPath();
        ctx.moveTo(firstX,pY+pH);ctx.lineTo(firstX,cornerY);
        ctx.lineTo(dupX,cornerY);ctx.lineTo(dupX,pY+pH);
        ctx.strokeStyle=col;ctx.lineWidth=1.2;ctx.globalAlpha=0.35;ctx.stroke();
        ctx.globalAlpha=1;
        const mx=(firstX+dupX)/2;
        ctx.font='600 9px "DM Sans",sans-serif';ctx.fillStyle=col;
        ctx.textAlign='center';ctx.textBaseline='middle';ctx.globalAlpha=0.5;
        ctx.fillText('=',mx,cornerY);ctx.globalAlpha=1;
      }
    });

    /* ── Connector: active k-mer pill → its graph node ── */
    if(activeKmer>=0){
      const km=kmers[activeKmer];
      const node=D.nMap[km];
      if(node){
        const pillCx=pX0+activeKmer*(pW+pG)+pW/2;
        const pillBot=pY+pH;
        const midY=Math.min(pillBot+28,node.y-D.nH/2-10);
        ctx.beginPath();
        ctx.moveTo(pillCx,pillBot+1);ctx.lineTo(pillCx,midY);
        ctx.lineTo(node.x,midY);ctx.lineTo(node.x,node.y-D.nH/2-2);
        ctx.strokeStyle=node.bc;ctx.lineWidth=1.5;ctx.globalAlpha=0.25;
        ctx.setLineDash([4,3]);ctx.stroke();ctx.setLineDash([]);ctx.globalAlpha=1;
      }
    }

    if(kRevealed>=kmers.length){
      const sY=pY+pH+22;
      ctx.font='500 10px "DM Sans",sans-serif';ctx.fillStyle=_F.gray;ctx.textAlign='center';ctx.textBaseline='alphabetic';
      ctx.fillText(kmers.length+' k-mers \u2192 '+D.unique.length+' unique edges, '+(kmers.length-D.unique.length)+' duplicates',W/2,sY);
    }
  }

  /* ═══ Graph nodes ═══ */
  const visibleNodes=[];
  D.unique.forEach((u,ni)=>{
    if(D.firstSeen[u]<kRevealed) visibleNodes.push(ni);
  });

  visibleNodes.forEach(ni=>{
    const n=D.nodes[ni];
    const isNew=activeKmer>=0&&D.unique[ni]===kmers[activeKmer]&&D.firstSeen[D.unique[ni]]===activeKmer;
    if(isNew){
      ctx.globalAlpha=0.12;ctx.beginPath();ctx.arc(n.x,n.y,D.nW/2+6,0,Math.PI*2);
      ctx.fillStyle=n.bc;ctx.fill();ctx.globalAlpha=1;
    }
    _dbgNode(ctx,n,null,null,null,runCount[n.id]||0);
  });

  /* ═══ Edges (only during edge-building phase, not path phase) ═══ */
  if(edgesRevealed>0&&pathRevealed===0){
    const nBox=D.nBox;
    D.edges.forEach((e,i)=>{
      if(i>=edgesRevealed)return;
      const s=D.nMap[e.s],tgt=D.nMap[e.t];
      const isActive=i===edgesRevealed-1&&step>=_EDGE_START&&step<=_EDGE_END;
      const ep=_drawEdge(ctx,s.x,s.y,tgt.x,tgt.y,nBox,nBox,s.bc,isActive?2.5:1.5);

      if(isActive){
        const ov=e.s.substring(1);
        const lx=0.25*ep.sx+0.5*ep.mx+0.25*ep.ex;
        const ly=0.25*ep.sy+0.5*ep.my+0.25*ep.ey;
        ctx.font='700 10px "DM Mono",monospace';
        const bw=ctx.measureText(ov).width+14,bh=13;
        ctx.beginPath();ctx.roundRect(lx-bw/2,ly-bh/2-1,bw,bh,bh/2);
        ctx.fillStyle='#fff';ctx.fill();ctx.strokeStyle=s.bc;ctx.lineWidth=1;ctx.stroke();
        ctx.fillStyle=s.tc||_F.grayTxt;ctx.textAlign='center';ctx.textBaseline='middle';
        ctx.fillText(ov,lx,ly-1);
      }
    });

    visibleNodes.forEach(ni=>_dbgNode(ctx,D.nodes[ni],null,null,null,runCount[D.nodes[ni].id]||0));

    if(edgesRevealed>=D.edges.length){
      _badge(ctx,180,268,'cycle',_F.amberBg,_F.amber,_F.amberTxt,8);
      _badge(ctx,660,310,'branch',_F.grayBg,_F.gray,_F.grayTxt,8);
    }
  }

  /* ═══ Eulerian path traversal + growing contig ═══ */
  if(pathRevealed>0){
    const nBox=D.nBox;
    const activePi=pathRevealed-1;

    /* Collect walked edges */
    const walkedSet=new Set();
    for(let pi=0;pi<pathRevealed;pi++){
      const ps=D.pathOrder[pi];
      walkedSet.add(ps[0]+'>'+ps[1]);
    }

    /* Draw ALL edges: unwalked faint gray (no arrow), walked teal solid */
    D.edges.forEach(e=>{
      const s=D.nMap[e.s],tgt=D.nMap[e.t];
      if(walkedSet.has(e.s+'>'+e.t)){
        _drawEdge(ctx,s.x,s.y,tgt.x,tgt.y,nBox,nBox,_F.teal,2);
      } else {
        ctx.globalAlpha=0.2;
        _drawEdge(ctx,s.x,s.y,tgt.x,tgt.y,nBox,nBox,'#94a3b8',1,undefined,undefined,true);
        ctx.globalAlpha=1;
      }
    });

    /* Highlight current Eulerian step — thicker on top */
    const cur=D.pathOrder[activePi];
    const cs=D.nMap[cur[0]],ct_=D.nMap[cur[1]];
    const ep=_drawEdge(ctx,cs.x,cs.y,ct_.x,ct_.y,nBox,nBox,_F.teal,3);
    const lx=0.25*ep.sx+0.5*ep.mx+0.25*ep.ex;
    const ly=0.25*ep.sy+0.5*ep.my+0.25*ep.ey;
    ctx.beginPath();ctx.arc(lx,ly,9,0,Math.PI*2);
    ctx.fillStyle='#fff';ctx.fill();ctx.strokeStyle=_F.teal;ctx.lineWidth=1.5;ctx.stroke();
    ctx.font='700 10px "DM Sans",sans-serif';ctx.fillStyle=_F.teal;ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(''+(activePi+1),lx,ly);

    D.nodes.forEach(n=>_dbgNode(ctx,n,_F.tealBg,_F.teal,_F.tealTxt,runCount[n.id]||0));

    /* ── Growing contig bar ── */
    const contigLen=D.k+pathRevealed;
    const contigStr=D.seq.substring(0,contigLen);
    const isComplete=pathRevealed>=D.pathOrder.length;
    const cY=348,cH=22;
    const maxBarW=600,barW=maxBarW*(contigLen/D.seq.length);
    const barX=(W-maxBarW)/2;
    /* ghost outline for full length */
    ctx.beginPath();ctx.roundRect(barX,cY,maxBarW,cH,cH/2);
    ctx.strokeStyle='#e2e8f0';ctx.lineWidth=1;ctx.setLineDash([4,3]);ctx.stroke();ctx.setLineDash([]);
    /* filled portion */
    ctx.globalAlpha=0.05;
    ctx.beginPath();ctx.roundRect(barX+1,cY+2,barW,cH,cH/2);ctx.fillStyle='#000';ctx.fill();ctx.globalAlpha=1;
    ctx.beginPath();ctx.rect(barX,cY,barW,cH);ctx.fillStyle=_F.teal;ctx.fill();
    const cW=maxBarW/D.seq.length;
    ctx.font='700 11px "DM Mono",monospace';ctx.textAlign='center';ctx.textBaseline='middle';
    contigStr.split('').forEach((ch,ci)=>{
      ctx.fillStyle=ci>=contigLen-1?'#fff':'rgba(255,255,255,0.85)';
      ctx.fillText(ch,barX+cW*(ci+0.5),cY+cH/2);
    });
    ctx.font='600 10px "DM Sans",sans-serif';ctx.fillStyle=_F.teal;ctx.textAlign='center';ctx.textBaseline='alphabetic';
    const label=isComplete
      ?'Eulerian path complete: '+D.seq.length+' bp contig'
      :'Eulerian walk: '+contigLen+' / '+D.seq.length+' bp';
    ctx.fillText(label,W/2,cY+cH+12);
  }
}

function drawDeBruijn(step){
  _dbgStep=step;
  _dbgDraw();
}

/* ── Strain collapsing drawing (used by asm-challenges step 3) ── */
/* sub: 0=reality (two strains), 1=merged graph with bubbles, 2=+result bar, 3=+takeaway */
function _drawStrainCollapse(ctx,sub){
  const nR=14,nCount=8,xStart=100,xStep=75;
  const alphaY0=100,betaY0=155,collY=200;
  const ease=sub>=1?1:0;
  const alphaY=ease?collY:alphaY0;
  const betaY=ease?collY:betaY0;
  const bubbleOff=ease?22:0;

  ctx.font='700 15px "DM Sans",sans-serif';ctx.fillStyle=_F.grayTxt;ctx.textAlign='center';ctx.textBaseline='alphabetic';
  ctx.fillText('Close strains collapse into one path',400,30);
  ctx.font='11px "DM Sans",sans-serif';ctx.fillStyle=_F.gray;
  ctx.fillText('>95% ANI \u2192 most k-mers identical \u2192 shared paths in the de Bruijn graph',400,50);

  /* Section label */
  ctx.font='600 11px "DM Sans",sans-serif';ctx.fillStyle=_F.grayTxt;ctx.textAlign='start';ctx.textBaseline='alphabetic';
  ctx.fillText(sub===0?'Reality:':'De Bruijn graph:',30,82);

  if(sub===0){
    /* ── Two separate strains ── */
    for(let i=0;i<nCount-1;i++){_drawEdge(ctx,xStart+i*xStep,alphaY0,xStart+(i+1)*xStep,alphaY0,nR+2,nR+2,_F.teal,2,0);}
    for(let i=0;i<nCount-1;i++){_drawEdge(ctx,xStart+i*xStep,betaY0,xStart+(i+1)*xStep,betaY0,nR+2,nR+2,_F.violet,2,0);}
    for(let i=0;i<nCount;i++){
      const x=xStart+i*xStep,isDiff=i===3||i===5;
      _circNode(ctx,x,alphaY0,nR,_F.tealBg,_F.teal,isDiff?2.5:1.5);
      if(isDiff){ctx.font='700 10px "DM Mono",monospace';ctx.fillStyle=_F.teal;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('\u03b1',x,alphaY0);}
      _circNode(ctx,x,betaY0,nR,_F.violetBg,_F.violet,isDiff?2.5:1.5);
      if(isDiff){ctx.font='700 10px "DM Mono",monospace';ctx.fillStyle=_F.violet;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('\u03b2',x,betaY0);}
    }
    _badge(ctx,48,alphaY0,'Strain \u03b1',_F.tealBg,_F.teal,_F.tealTxt,9);
    _badge(ctx,48,betaY0,'Strain \u03b2',_F.violetBg,_F.violet,_F.violetTxt,9);
    [3,5].forEach(i=>{
      const x=xStart+i*xStep;
      ctx.beginPath();ctx.moveTo(x,alphaY0+nR+4);ctx.lineTo(x,betaY0-nR-4);
      ctx.strokeStyle=_F.amber;ctx.lineWidth=1.5;ctx.setLineDash([4,3]);ctx.stroke();ctx.setLineDash([]);
    });
    ctx.font='600 9px "DM Sans",sans-serif';ctx.fillStyle=_F.amber;ctx.textAlign='center';ctx.textBaseline='alphabetic';
    ctx.fillText('SNPs',xStart+3*xStep,betaY0+nR+14);ctx.fillText('SNPs',xStart+5*xStep,betaY0+nR+14);
    ctx.font='10px "DM Sans",sans-serif';ctx.fillStyle=_F.gray;ctx.textAlign='end';ctx.textBaseline='alphabetic';
    ctx.fillText('>95% identical',770,100);
    /* Hint */
    ctx.font='italic 10px "DM Sans",sans-serif';ctx.fillStyle=_F.gray;ctx.textAlign='center';
    ctx.fillText('\u2192 to see what the assembler does',400,260);
  } else {
    /* ── Collapsed graph with bubbles (sub >= 1) ── */
    /* Shared edges */
    for(let i=0;i<nCount-1;i++){
      const isDivS=i===2||i===4,isDivE=i===3||i===5;
      if(!isDivS&&!isDivE) _drawEdge(ctx,xStart+i*xStep,collY,xStart+(i+1)*xStep,collY,nR+2,nR+2,_F.blue,2.5,0);
    }
    /* Bubble fork edges */
    [3,5].forEach(di=>{
      const cx=xStart+di*xStep,prevX=xStart+(di-1)*xStep,nextX=xStart+(di+1)*xStep;
      _drawEdge(ctx,prevX,collY,cx,collY-22,nR+2,nR-2,_F.teal,1.5);
      _drawEdge(ctx,cx,collY-22,nextX,collY,nR-2,nR+2,_F.teal,1.5);
      _drawEdge(ctx,prevX,collY,cx,collY+22,nR+2,nR-2,_F.violet,1.5);
      _drawEdge(ctx,cx,collY+22,nextX,collY,nR-2,nR+2,_F.violet,1.5);
    });
    /* Nodes */
    for(let i=0;i<nCount;i++){
      const x=xStart+i*xStep,isDiff=i===3||i===5;
      if(isDiff){
        _circNode(ctx,x,collY-22,10,_F.tealBg,_F.teal,1.5);
        ctx.font='700 9px "DM Mono",monospace';ctx.fillStyle=_F.teal;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('\u03b1',x,collY-22);
        _circNode(ctx,x,collY+22,10,_F.violetBg,_F.violet,1.5);
        ctx.font='700 9px "DM Mono",monospace';ctx.fillStyle=_F.violet;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('\u03b2',x,collY+22);
      } else {
        _circNode(ctx,x,collY,nR,_F.blueBg,_F.blue,2);
        ctx.font='700 10px "DM Mono",monospace';ctx.fillStyle=_F.blue;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('\u03b1\u03b2',x,collY);
      }
    }
    /* Dashed collapse box */
    ctx.beginPath();ctx.roundRect(xStart-nR-8,collY-42,nCount*xStep-xStep+nR*2+16,84,10);
    ctx.strokeStyle=_F.amber;ctx.lineWidth=1.5;ctx.setLineDash([6,4]);ctx.stroke();ctx.setLineDash([]);
    _badge(ctx,400,collY+55,'collapsed',_F.amberBg,_F.amber,_F.amberTxt,10);
    ctx.font='10px "DM Sans",sans-serif';ctx.fillStyle=_F.gray;ctx.textAlign='end';ctx.textBaseline='alphabetic';
    ctx.fillText('>95% identical',770,collY-20);
  }

  /* Result bar (sub >= 2) */
  if(sub>=2){
    ctx.font='600 11px "DM Sans",sans-serif';ctx.fillStyle=_F.grayTxt;ctx.textAlign='center';ctx.textBaseline='alphabetic';
    ctx.fillText('Result: one consensus contig instead of two',400,310);
    ctx.beginPath();ctx.roundRect(150,322,500,18,3);ctx.fillStyle=_F.blue;ctx.fill();
    ctx.font='600 10px "DM Sans",sans-serif';ctx.fillStyle='#fff';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText('consensus (\u03b1 + \u03b2 merged)',400,331);
  }
  /* Takeaway (sub >= 3) */
  if(sub>=3){
    ctx.beginPath();ctx.roundRect(60,358,680,44,10);ctx.fillStyle='#fffbeb';ctx.fill();ctx.strokeStyle=_F.amber;ctx.lineWidth=1;ctx.stroke();
    ctx.font='600 11px "DM Sans",sans-serif';ctx.fillStyle=_F.amber;ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText('\u26a0 Assembly loses strain resolution. Recoverable by read mapping (DESMAN, InStrain)',400,380);
  }
}

/* ================================================================
   Slide 10: Assembly challenges — 6 manual steps (0-5)
   0  Coverage bar chart (the root problem)
   1  Metagenome: two species, clean parallel graphs
   2  Cross-links appear → fragments
   3  Strain collapsing (4 manual sub-steps: 0-3)
   4  Wrong branch → chimeric contig
   5  Summary
   ================================================================ */
function drawAsmChallenges(step){
  const ctx=_asmCanvas('ac-canvas');if(!ctx)return;
  const W=800,H=440;

  /* ── Step 0: Coverage disparity + assembly effect ── */
  if(step===0){
    ctx.font='700 15px "DM Sans",sans-serif';ctx.fillStyle=_F.grayTxt;ctx.textAlign='center';ctx.textBaseline='alphabetic';
    ctx.fillText('Coverage varies by orders of magnitude',400,30);

    const species=[{n:'E. coli',c:850,col:_F.teal},{n:'B. fragilis',c:180,col:_F.blue},{n:'C. difficile',c:42,col:_F.violet},
                   {n:'M. smithii',c:9,col:_F.amber},{n:'Rare sp.',c:2,col:_F.gray}];
    /* Compact bar chart — top portion */
    const margin={top:46,right:40,bottom:12,left:50};
    const cW=W-margin.left-margin.right,chartH=145;
    const logMin=Math.log10(1),logMax=Math.log10(1200);
    function yScale(v){const lv=Math.log10(Math.max(v,1));return chartH-(lv-logMin)/(logMax-logMin)*chartH;}
    const bandPad=0.3,nBands=species.length,bandStep=cW/nBands,bandW=bandStep*(1-bandPad),bandOff=bandStep*bandPad/2;

    ctx.save();ctx.translate(margin.left,margin.top);
    [1,10,100,1000].forEach(v=>{
      const yy=yScale(v);
      ctx.beginPath();ctx.moveTo(0,yy);ctx.lineTo(cW,yy);ctx.strokeStyle='#e2e8f0';ctx.lineWidth=1;ctx.stroke();
      ctx.font='10px "DM Mono",monospace';ctx.fillStyle=_F.gray;ctx.textAlign='end';ctx.textBaseline='middle';
      ctx.fillText(v+'\u00d7',-8,yy);
    });
    species.forEach((s,i)=>{
      const bx=i*bandStep+bandOff,bw=bandW;
      const by=yScale(Math.max(s.c,1.1)),bh=chartH-by;
      ctx.beginPath();ctx.roundRect(bx,by,bw,bh,6);ctx.fillStyle=s.col;ctx.fill();
      ctx.globalAlpha=0.12;ctx.beginPath();ctx.roundRect(bx,by,bw,bh*0.3,[6,6,0,0]);ctx.fillStyle='#fff';ctx.fill();ctx.globalAlpha=1;
      ctx.font='700 11px "DM Mono",monospace';ctx.fillStyle=_F.grayTxt;ctx.textAlign='center';ctx.textBaseline='alphabetic';
      ctx.fillText(s.c+'\u00d7',bx+bw/2,by-6);
      ctx.font='italic 500 9px "DM Sans",sans-serif';ctx.fillStyle=_F.grayTxt;ctx.fillText(s.n,bx+bw/2,chartH+14);
    });
    /* Low-coverage zone shading */
    const zoneY=yScale(10);
    ctx.globalAlpha=0.06;ctx.beginPath();ctx.rect(0,zoneY,cW,chartH-zoneY);ctx.fillStyle=_F.red;ctx.fill();ctx.globalAlpha=1;
    ctx.beginPath();ctx.moveTo(0,zoneY);ctx.lineTo(cW,zoneY);ctx.strokeStyle=_F.red;ctx.lineWidth=1;ctx.setLineDash([6,4]);ctx.stroke();ctx.setLineDash([]);
    ctx.font='600 10px "DM Sans",sans-serif';ctx.fillStyle=_F.red;ctx.textAlign='start';ctx.textBaseline='middle';
    ctx.fillText('low coverage zone',cW+6,zoneY);
    ctx.restore();

    /* ── Assembly effect: contig bars below ── */
    ctx.font='600 11px "DM Sans",sans-serif';ctx.fillStyle=_F.grayTxt;ctx.textAlign='start';ctx.textBaseline='alphabetic';
    ctx.fillText('Effect on assembly:',margin.left,240);
    const contigY=256;
    const contigData=[
      {n:'E. coli',col:_F.teal,bars:[{x:0,w:0.95}]},                          /* one long contig */
      {n:'B. fragilis',col:_F.blue,bars:[{x:0,w:0.85},{x:0.88,w:0.12}]},      /* nearly complete */
      {n:'C. difficile',col:_F.violet,bars:[{x:0,w:0.35},{x:0.40,w:0.25},{x:0.70,w:0.18}]}, /* fragmented */
      {n:'M. smithii',col:_F.amber,bars:[{x:0,w:0.12},{x:0.18,w:0.08},{x:0.30,w:0.06},{x:0.40,w:0.05}]}, /* very fragmented */
      {n:'Rare sp.',col:_F.gray,bars:[]}                                        /* nothing assembled */
    ];
    const rowH=22,barZoneX=margin.left+80,barZoneW=cW-80;
    contigData.forEach((sp,i)=>{
      const ry=contigY+i*rowH;
      ctx.font='italic 500 9px "DM Sans",sans-serif';ctx.fillStyle=_F.grayTxt;ctx.textAlign='end';ctx.textBaseline='middle';
      ctx.fillText(sp.n,barZoneX-8,ry+7);
      if(sp.bars.length===0){
        ctx.font='italic 500 9px "DM Sans",sans-serif';ctx.fillStyle=_F.red;ctx.textAlign='start';
        ctx.fillText('no assembly',barZoneX+4,ry+7);
      }
      sp.bars.forEach(b=>{
        ctx.beginPath();ctx.roundRect(barZoneX+b.x*barZoneW,ry,b.w*barZoneW,14,2);ctx.fillStyle=sp.col;ctx.fill();
      });
      /* Gap markers for fragmented species */
      if(sp.bars.length>1){
        for(let g=0;g<sp.bars.length-1;g++){
          const gapX=barZoneX+(sp.bars[g].x+sp.bars[g].w)*barZoneW+2;
          ctx.font='700 10px "DM Sans",sans-serif';ctx.fillStyle=_F.red;ctx.textAlign='center';ctx.textBaseline='middle';
          ctx.fillText('?',gapX+4,ry+7);
        }
      }
    });
    ctx.font='10px "DM Sans",sans-serif';ctx.fillStyle=_F.gray;ctx.textAlign='center';ctx.textBaseline='alphabetic';
    ctx.fillText('Low coverage \u2192 gaps in k-mer graph \u2192 fragmented or missing contigs',400,contigY+contigData.length*rowH+12);
    ctx.font='10px "DM Sans",sans-serif';ctx.fillStyle=_F.gray;
    ctx.fillText('MAG reconstruction needs >10 Gb depth (Treichel et al. 2026)',400,contigY+contigData.length*rowH+28);
  }

  /* ── Step 1: Metagenome — two species, parallel (no cross-links yet) ── */
  else if(step===1){
    ctx.font='700 15px "DM Sans",sans-serif';ctx.fillStyle=_F.grayTxt;ctx.textAlign='center';ctx.textBaseline='alphabetic';
    ctx.fillText('Metagenome: two species in one graph',400,30);
    ctx.font='11px "DM Sans",sans-serif';ctx.fillStyle=_F.gray;
    ctx.fillText('Reads from both organisms enter the same de Bruijn graph',400,50);
    const cR=16;
    const spA=[90,200,310,420,530,640].map((x,i)=>({x,y:115+Math.sin(i*0.8)*15}));
    const spB=[90,200,310,420,530,640].map((x,i)=>({x,y:240+Math.sin(i*0.8)*15}));
    for(let i=0;i<spA.length-1;i++) _drawEdge(ctx,spA[i].x,spA[i].y,spA[i+1].x,spA[i+1].y,cR+2,cR+2,_F.teal,2,0);
    for(let i=0;i<spB.length-1;i++) _drawEdge(ctx,spB[i].x,spB[i].y,spB[i+1].x,spB[i+1].y,cR+2,cR+2,_F.blue,2,0);
    spA.forEach(p=>_circNode(ctx,p.x,p.y,cR,_F.tealBg,_F.teal,2));
    spB.forEach(p=>_circNode(ctx,p.x,p.y,cR,_F.blueBg,_F.blue,2));
    _badge(ctx,42,spA[0].y,'Sp. A',_F.tealBg,_F.teal,_F.tealTxt,10);
    _badge(ctx,42,spB[0].y,'Sp. B',_F.blueBg,_F.blue,_F.blueTxt,10);
    ctx.font='11px "DM Sans",sans-serif';ctx.fillStyle=_F.gray;ctx.textAlign='center';
    ctx.fillText('So far so good: species stay separate if k-mers are unique',400,310);
  }

  /* ── Step 2: Cross-links appear → fragments ── */
  else if(step===2){
    ctx.font='700 15px "DM Sans",sans-serif';ctx.fillStyle=_F.grayTxt;ctx.textAlign='center';ctx.textBaseline='alphabetic';
    ctx.fillText('Shared k-mers create inter-species edges',400,30);
    ctx.font='11px "DM Sans",sans-serif';ctx.fillStyle=_F.gray;
    ctx.fillText('Conserved genes (16S, housekeeping) are identical across species',400,50);
    const cR=14;
    const spA=[110,210,310,410,510,610].map((x,i)=>({x,y:95+Math.sin(i*0.8)*12}));
    const spB=[110,210,310,410,510,610].map((x,i)=>({x,y:195+Math.sin(i*0.8)*12}));
    for(let i=0;i<spA.length-1;i++) _drawEdge(ctx,spA[i].x,spA[i].y,spA[i+1].x,spA[i+1].y,cR+2,cR+2,_F.teal,2,0);
    for(let i=0;i<spB.length-1;i++) _drawEdge(ctx,spB[i].x,spB[i].y,spB[i+1].x,spB[i+1].y,cR+2,cR+2,_F.blue,2,0);
    [{s:spA[2],t:spB[3]},{s:spB[1],t:spA[3]},{s:spA[4],t:spB[4]}].forEach(e=>{
      _drawEdge(ctx,e.s.x,e.s.y,e.t.x,e.t.y,cR+2,cR+2,_F.red,1.5,0,[6,4]);
    });
    spA.forEach(p=>_circNode(ctx,p.x,p.y,cR,_F.tealBg,_F.teal,2));
    spB.forEach(p=>_circNode(ctx,p.x,p.y,cR,_F.blueBg,_F.blue,2));
    _badge(ctx,50,spA[0].y,'Sp. A',_F.tealBg,_F.teal,_F.tealTxt,10);
    _badge(ctx,50,spB[0].y,'Sp. B',_F.blueBg,_F.blue,_F.blueTxt,10);
    _badge(ctx,340,148,'shared k-mer',_F.redBg,_F.red,_F.red,9);

    // Separator + arrow into fragment zone
    ctx.save();ctx.globalAlpha=.2;ctx.strokeStyle='#94a3b8';ctx.lineWidth=1;ctx.setLineDash([4,4]);
    ctx.beginPath();ctx.moveTo(60,245);ctx.lineTo(740,245);ctx.stroke();ctx.setLineDash([]);ctx.restore();
    _downArrow(ctx,400,252,278,_F.gray);

    // Result: fragmented contigs
    ctx.font='600 10px "DM Sans",sans-serif';ctx.fillStyle=_F.grayTxt;ctx.textAlign='left';ctx.textBaseline='alphabetic';
    ctx.fillText('Result:',60,296);
    [{x:105,w:130,c:_F.teal},{x:250,w:90,c:_F.blue},{x:355,w:75,c:_F.teal},{x:445,w:60,c:_F.blue},{x:520,w:50,c:_F.teal},{x:585,w:40,c:_F.gray}].forEach(f=>{
      ctx.beginPath();ctx.roundRect(f.x,286,f.w,16,3);ctx.fillStyle=f.c;ctx.fill();
    });

    // Takeaway box
    ctx.beginPath();ctx.roundRect(80,320,640,44,10);ctx.fillStyle='#fef2f2';ctx.fill();ctx.strokeStyle=_F.red;ctx.lineWidth=1;ctx.stroke();
    ctx.font='600 12px "DM Sans",sans-serif';ctx.fillStyle=_F.grayTxt;ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText('Cross-species edges force contig breaks \u2192 many short fragments',400,336);
    ctx.font='400 10px "DM Sans",sans-serif';ctx.fillStyle=_F.gray;
    ctx.fillText('Especially in conserved regions like 16S rRNA or housekeeping genes',400,352);
  }

  /* ── Step 3: Strain collapsing (manual sub-steps) ── */
  else if(step===3){
    /* Sub-step state: 0=reality, 1=merged graph, 2=result bar, 3=takeaway */
    if(window._scSub==null) window._scSub=0;
    const sub=window._scSub;
    _drawStrainCollapse(ctx,sub);
  }

  /* ── Step 4: Chimeric contig (from inter-species cross-links) ── */
  else if(step===4){
    ctx.font='700 15px "DM Sans",sans-serif';ctx.fillStyle=_F.grayTxt;ctx.textAlign='center';ctx.textBaseline='alphabetic';
    ctx.fillText('Cross-link traversal \u2192 chimeric contig',400,30);
    ctx.font='11px "DM Sans",sans-serif';ctx.fillStyle=_F.gray;
    ctx.fillText('Assembler follows a shared k-mer edge into the wrong species',400,50);
    const cR=16;
    /* Two species — same layout as step 2 */
    const spA=[90,200,310,420,530,640].map((x,i)=>({x,y:100+Math.sin(i*0.8)*15}));
    const spB=[90,200,310,420,530,640].map((x,i)=>({x,y:220+Math.sin(i*0.8)*15}));
    /* Faded full graph */
    ctx.globalAlpha=0.15;
    for(let i=0;i<spA.length-1;i++) _drawEdge(ctx,spA[i].x,spA[i].y,spA[i+1].x,spA[i+1].y,cR+2,cR+2,'#94a3b8',1.5,0,undefined,true);
    for(let i=0;i<spB.length-1;i++) _drawEdge(ctx,spB[i].x,spB[i].y,spB[i+1].x,spB[i+1].y,cR+2,cR+2,'#94a3b8',1.5,0,undefined,true);
    [{s:spA[2],t:spB[3]},{s:spB[1],t:spA[3]},{s:spA[4],t:spB[4]}].forEach(e=>{
      _drawEdge(ctx,e.s.x,e.s.y,e.t.x,e.t.y,cR+2,cR+2,'#94a3b8',1,0,[6,4],true);
    });
    ctx.globalAlpha=1;
    /* Highlighted wrong path: A0→A1→A2 → cross to B3→B4→B5 */
    _drawEdge(ctx,spA[0].x,spA[0].y,spA[1].x,spA[1].y,cR+2,cR+2,_F.teal,2.5,0);
    _drawEdge(ctx,spA[1].x,spA[1].y,spA[2].x,spA[2].y,cR+2,cR+2,_F.teal,2.5,0);
    /* Cross-link jump! */
    _drawEdge(ctx,spA[2].x,spA[2].y,spB[3].x,spB[3].y,cR+2,cR+2,_F.red,2.5);
    /* Continue on species B */
    _drawEdge(ctx,spB[3].x,spB[3].y,spB[4].x,spB[4].y,cR+2,cR+2,_F.blue,2.5,0);
    _drawEdge(ctx,spB[4].x,spB[4].y,spB[5].x,spB[5].y,cR+2,cR+2,_F.blue,2.5,0);
    /* Draw all nodes */
    spA.forEach(p=>_circNode(ctx,p.x,p.y,cR,_F.tealBg,_F.teal,2));
    spB.forEach(p=>_circNode(ctx,p.x,p.y,cR,_F.blueBg,_F.blue,2));
    _badge(ctx,42,spA[0].y,'Sp. A',_F.tealBg,_F.teal,_F.tealTxt,10);
    _badge(ctx,42,spB[0].y,'Sp. B',_F.blueBg,_F.blue,_F.blueTxt,10);
    /* Path step numbers */
    const pathSegs=[
      {a:spA[0],b:spA[1],c:_F.teal},{a:spA[1],b:spA[2],c:_F.teal},
      {a:spA[2],b:spB[3],c:_F.red},{a:spB[3],b:spB[4],c:_F.blue},{a:spB[4],b:spB[5],c:_F.blue}
    ];
    pathSegs.forEach((seg,pi)=>{
      let mx=(seg.a.x+seg.b.x)/2,my=(seg.a.y+seg.b.y)/2-(seg.a.y===seg.b.y?12:0);
      if(pi===2){mx+=6;my-=2;} /* offset cross-link number away from edge */
      ctx.beginPath();ctx.arc(mx,my,9,0,Math.PI*2);ctx.fillStyle='#fff';ctx.fill();
      ctx.strokeStyle=seg.c;ctx.lineWidth=1.5;ctx.stroke();
      ctx.font='700 10px "DM Sans",sans-serif';ctx.fillStyle=seg.c;ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText(''+(pi+1),mx,my);
      if(pi===2) _badge(ctx,mx+50,my,'shared k-mer!',_F.redBg,_F.red,_F.red,9);
    });
    /* Chimeric contig bar */
    ctx.font='600 11px "DM Sans",sans-serif';ctx.fillStyle=_F.grayTxt;ctx.textAlign='center';ctx.textBaseline='alphabetic';
    ctx.fillText('Resulting chimeric contig:',400,288);
    ctx.beginPath();ctx.roundRect(120,300,200,22,3);ctx.fillStyle=_F.teal;ctx.fill();
    ctx.beginPath();ctx.roundRect(320,300,30,22,0);ctx.fillStyle=_F.red;ctx.fill();
    ctx.beginPath();ctx.roundRect(350,300,230,22,3);ctx.fillStyle=_F.blue;ctx.fill();
    ctx.beginPath();ctx.moveTo(320,296);ctx.lineTo(320,326);ctx.strokeStyle=_F.red;ctx.lineWidth=2;ctx.stroke();
    ctx.beginPath();ctx.moveTo(350,296);ctx.lineTo(350,326);ctx.strokeStyle=_F.red;ctx.lineWidth=2;ctx.stroke();
    ctx.globalAlpha=0.4;ctx.beginPath();ctx.roundRect(114,296,472,30,8);
    ctx.strokeStyle=_F.red;ctx.lineWidth=1.5;ctx.setLineDash([5,4]);ctx.stroke();ctx.setLineDash([]);ctx.globalAlpha=1;
    ctx.font='700 11px "DM Sans",sans-serif';ctx.fillStyle=_F.red;ctx.textAlign='center';
    ctx.fillText('\u26a0 Chimera: part Sp. A, part Sp. B. Poisons binning & annotation.',400,350);
  }

  /* ── Step 5: Summary ── */
  else {
    ctx.font='700 15px "DM Sans",sans-serif';ctx.fillStyle=_F.grayTxt;ctx.textAlign='center';ctx.textBaseline='alphabetic';
    ctx.fillText('Every assumption breaks in metagenomes',400,30);
    const problems=[
      {icon:'\u2193\u2191',title:'Uneven coverage',desc:'1000\u00d7 for dominant, 2\u00d7 for rare',col:_F.teal,bg:_F.tealBg},
      {icon:'\u2194',title:'Inter-species repeats',desc:'Shared k-mers create cross-links \u2192 chimeric contigs',col:_F.blue,bg:_F.blueBg},
      {icon:'\u2442',title:'Strain collapsing',desc:'>95% ANI \u2192 strains merge into consensus; recoverable via read mapping',col:_F.violet,bg:_F.violetBg},
      {icon:'\u26a0',title:'Chimeric contigs',desc:'Mixed-genome contigs from cross-links poison binning & annotation',col:_F.red,bg:_F.redBg}
    ];
    problems.forEach((p,i)=>{
      const y=70+i*90,x=100;
      ctx.beginPath();ctx.roundRect(x,y,600,72,12);ctx.fillStyle=p.bg;ctx.fill();
      ctx.strokeStyle=p.col;ctx.lineWidth=1.5;ctx.stroke();
      ctx.font='700 28px "DM Sans",sans-serif';ctx.fillStyle=p.col;ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText(p.icon,x+40,y+36);
      ctx.font='700 13px "DM Sans",sans-serif';ctx.fillStyle=_F.grayTxt;ctx.textAlign='start';ctx.textBaseline='alphabetic';
      ctx.fillText(p.title,x+75,y+28);
      ctx.font='11px "DM Sans",sans-serif';ctx.fillStyle=_F.gray;
      ctx.fillText(p.desc,x+75,y+50);
    });
  }
}

/* ================================================================
   Slide 11 – MEGAHIT: succinct de Bruijn graphs
   13 steps (0-12):
   PHASE 0: Memory problem
     0  Standard dBG does not scale
   PHASE 1: Encode — graph → sort → W+F
     1  Show example dBG (6 nodes, 6 edges)
     2  Edge table (unsorted)
     3  Sort by source
     4  Extract W (labels)
     5  Extract F (boundaries) — encoded!
   PHASE 2: Decode — reconstruct from W+F
     6  Start at AT
     7  AT→TC
     8  TC→CG
     9  AT→TG
    10  TG→GC + CG→GC — done!
   PHASE 3: Why MEGAHIT
    11  Multi-k strategy
    12  Summary cards
   ================================================================ */
function drawMegahit(step){
  const ctx=_asmCanvas('mh-canvas');if(!ctx)return;
  const W=800,H=440;

  /* ── Shared data ─�� */
  const _N=[
    {id:'AT',x:80,y:120,col:'#0d9488'},{id:'TC',x:220,y:55,col:'#3b82f6'},
    {id:'TG',x:220,y:185,col:'#7c3aed'},{id:'CG',x:370,y:55,col:'#d97706'},
    {id:'GC',x:370,y:185,col:'#0d9488'},{id:'GA',x:510,y:120,col:'#10b981'}
  ];
  const _E=[
    {src:'AT',dst:'TC',lbl:'C',col:'#3b82f6'},
    {src:'AT',dst:'TG',lbl:'G',col:'#7c3aed'},
    {src:'TC',dst:'CG',lbl:'G',col:'#d97706'},
    {src:'CG',dst:'GC',lbl:'C',col:'#0d9488'},
    {src:'CG',dst:'GA',lbl:'A',col:'#10b981'},
    {src:'TG',dst:'GC',lbl:'C',col:'#0d9488'}
  ];
  /* Sorted by source alphabetically, then label */
  const _S=[
    {src:'AT',lbl:'C',dst:'TC',col:'#3b82f6',newSrc:true},
    {src:'AT',lbl:'G',dst:'TG',col:'#7c3aed',newSrc:false},
    {src:'CG',lbl:'A',dst:'GA',col:'#10b981',newSrc:true},
    {src:'CG',lbl:'C',dst:'GC',col:'#0d9488',newSrc:false},
    {src:'TC',lbl:'G',dst:'CG',col:'#d97706',newSrc:true},
    {src:'TG',lbl:'C',dst:'GC',col:'#0d9488',newSrc:true}
  ];
  const _Wc=['C','G','A','C','G','C'];
  const _Wcol=['#3b82f6','#7c3aed','#10b981','#0d9488','#d97706','#0d9488'];
  const _Fb=[1,0,1,0,1,1];
  const _srcLbl=['AT','AT','CG','CG','TC','TG'];
  const nR=20;
  function nd(id){return _N.find(n=>n.id===id);}

  /* helper: draw graph in a region */
  function gph(ox,oy,sc,edgeSet,nodeSet,faded){
    const a=faded?0.15:1;
    ctx.globalAlpha=a;
    (edgeSet||[]).forEach(e=>{
      const s=nd(e.src),t=nd(e.dst);
      _drawEdge(ctx,ox+s.x*sc,oy+s.y*sc,ox+t.x*sc,oy+t.y*sc,nR*sc+2,nR*sc+2,e.col,2*sc,0);
    });
    ctx.globalAlpha=1;
    (nodeSet||_N).forEach(n=>{
      const x=ox+n.x*sc,y=oy+n.y*sc,r=nR*sc;
      if(faded)ctx.globalAlpha=0.2;
      _circNode(ctx,x,y,r,_F.tealBg,n.col,2);
      ctx.font='700 '+Math.round(11*sc)+'px "DM Mono",monospace';ctx.fillStyle=n.col;
      ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(n.id,x,y);
      ctx.globalAlpha=1;
    });
  }

  /* helper: draw W+F arrays at (ax,ay) */
  function drawWF(ax,ay,cw,ch,hlW,hlF){
    /* W row */
    ctx.font='700 10px "DM Sans",sans-serif';ctx.fillStyle=_F.tealTxt;ctx.textAlign='end';ctx.textBaseline='middle';
    ctx.fillText('W',ax-8,ay+ch/2);
    _Wc.forEach(function(c,i){
      var bx=ax+i*cw;
      var hl=hlW&&hlW.indexOf(i)>=0;
      ctx.beginPath();ctx.roundRect(bx,ay,cw-4,ch,4);
      ctx.fillStyle=hl?'#ccfbf1':'#f0fdfa';ctx.fill();
      ctx.strokeStyle=hl?'#0d9488':'#99f6e4';ctx.lineWidth=hl?2:1;ctx.stroke();
      ctx.font='700 '+Math.round(ch*0.55)+'px "DM Mono",monospace';
      ctx.fillStyle=_Wcol[i];ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText(c,bx+cw/2-2,ay+ch/2);
    });
    /* F row — skip if hlF===false */
    if(hlF!==false){
    var fy=ay+ch+6;
    ctx.font='700 10px "DM Sans",sans-serif';ctx.fillStyle=_F.blueTxt;ctx.textAlign='end';ctx.textBaseline='middle';
    ctx.fillText('F',ax-8,fy+ch/2);
    _Fb.forEach(function(b,i){
      var bx=ax+i*cw,isOne=b===1;
      var hl=hlF&&hlF.indexOf(i)>=0;
      ctx.beginPath();ctx.roundRect(bx,fy,cw-4,ch,4);
      ctx.fillStyle=hl?(isOne?'#dbeafe':'#e0e7ff'):(isOne?'#eff6ff':'#f8fafc');ctx.fill();
      ctx.strokeStyle=hl?'#3b82f6':(isOne?'#93c5fd':'#e2e8f0');ctx.lineWidth=hl?2:1;ctx.stroke();
      ctx.font='700 '+Math.round(ch*0.55)+'px "DM Mono",monospace';
      ctx.fillStyle=isOne?'#3b82f6':'#94a3b8';ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText(''+b,bx+cw/2-2,fy+ch/2);
    });
    }
    /* Position labels */
    ctx.font='600 9px "DM Mono",monospace';ctx.fillStyle='#94a3b8';ctx.textAlign='center';ctx.textBaseline='alphabetic';
    for(var i=0;i<_Wc.length;i++) ctx.fillText(i,ax+i*cw+cw/2-2,ay-3);
  }

  /* helper: draw edge labels on the graph with pill background */
  /* offsets are perpendicular displacements from edge midpoint (pre-computed for the 6 edges) */
  var _lblOff=[{dx:-12,dy:-14},{dx:-12,dy:13},{dx:0,dy:-14},{dx:14,dy:0},{dx:0,dy:-14},{dx:0,dy:-13}];
  function edgeLbls(ox,oy,sc,faded){
    var fs=Math.max(8,Math.round(11*sc)),pw=Math.round(14*sc),ph=Math.round(14*sc);
    _E.forEach(function(e,i){
      var s=nd(e.src),t=nd(e.dst);
      var mx=ox+(s.x+t.x)/2*sc,my=oy+(s.y+t.y)/2*sc;
      var lx=mx+_lblOff[i].dx*sc,ly=my+_lblOff[i].dy*sc;
      if(faded)ctx.globalAlpha=0.25;
      ctx.beginPath();ctx.roundRect(lx-pw/2,ly-ph/2,pw,ph,3);
      ctx.fillStyle='rgba(255,255,255,0.9)';ctx.fill();
      ctx.strokeStyle=e.col;ctx.lineWidth=Math.max(1,1.5*sc);ctx.stroke();
      ctx.font='700 '+fs+'px "DM Mono",monospace';ctx.fillStyle=e.col;
      ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(e.lbl,lx,ly);
      ctx.globalAlpha=1;
    });
  }

  /* helper: edge table */
  function tbl(tx,ty,rows,showLblHL,showSrcHL,sorted){
    var rh=24,cw=55;
    ctx.font='700 9px "DM Sans",sans-serif';ctx.fillStyle=_F.grayTxt;ctx.textAlign='center';ctx.textBaseline='alphabetic';
    ['Src','Lbl','Dst'].forEach(function(h,i){ctx.fillText(h,tx+i*cw+cw/2,ty+10);});
    ctx.beginPath();ctx.moveTo(tx,ty+14);ctx.lineTo(tx+cw*3,ty+14);ctx.strokeStyle='#e2e8f0';ctx.lineWidth=1;ctx.stroke();
    rows.forEach(function(r,i){
      var ry=ty+22+i*rh;
      if(i%2===0){ctx.globalAlpha=0.04;ctx.beginPath();ctx.roundRect(tx-2,ry-10,cw*3+4,rh,3);ctx.fillStyle=_F.teal;ctx.fill();ctx.globalAlpha=1;}
      ctx.font='600 10px "DM Mono",monospace';ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillStyle=showSrcHL&&r.newSrc===false?'#94a3b8':_F.grayTxt;ctx.fillText(r.src,tx+cw*0.5,ry);
      ctx.fillStyle=showLblHL?r.col:_F.grayTxt;ctx.fillText(r.lbl,tx+cw*1.5,ry);
      ctx.fillStyle='#94a3b8';ctx.fillText(r.dst,tx+cw*2.5,ry);
      /* Highlight label cell */
      if(showLblHL){ctx.beginPath();ctx.roundRect(tx+cw+4,ry-10,cw-8,rh-2,3);ctx.strokeStyle=r.col;ctx.lineWidth=1.5;ctx.stroke();}
    });
    /* Source group brackets — shown on step 5 (Extract F) */
    if(sorted&&showSrcHL){
      /* AT pair: rows 0-1 */
      var y0=ty+22,y1=ty+22+rh;
      ctx.beginPath();ctx.moveTo(tx-4,y0-8);ctx.lineTo(tx-10,y0-8);ctx.lineTo(tx-10,y1+2);ctx.lineTo(tx-4,y1+2);
      ctx.strokeStyle='#d97706';ctx.lineWidth=1.5;ctx.stroke();
      ctx.font='italic 10px "DM Sans",sans-serif';ctx.fillStyle='#d97706';ctx.textAlign='end';ctx.textBaseline='middle';
      ctx.fillText('same',tx-14,(y0+y1)/2-4);ctx.fillText('src',tx-14,(y0+y1)/2+6);
      /* CG pair: rows 2-3 */
      var y2=ty+22+2*rh,y3=ty+22+3*rh;
      ctx.beginPath();ctx.moveTo(tx-4,y2-8);ctx.lineTo(tx-10,y2-8);ctx.lineTo(tx-10,y3+2);ctx.lineTo(tx-4,y3+2);
      ctx.strokeStyle='#d97706';ctx.lineWidth=1.5;ctx.stroke();
      ctx.fillText('same',tx-14,(y2+y3)/2-4);ctx.fillText('src',tx-14,(y2+y3)/2+6);
    }
  }

  /* ════════════════════════════════════════════════════════════ */

  /* ── Step 0: Memory problem ── */
  if(step===0){
    ctx.font='700 15px "DM Sans",sans-serif';ctx.fillStyle=_F.grayTxt;ctx.textAlign='center';ctx.textBaseline='alphabetic';
    ctx.fillText('Standard de Bruijn graph',400,28);
    ctx.font='11px "DM Sans",sans-serif';ctx.fillStyle=_F.gray;
    ctx.fillText('Every unique k-mer stored in a hash table \u2192 huge memory',400,48);
    var cols=['#0d9488','#3b82f6','#7c3aed','#d97706','#0d9488','#3b82f6','#7c3aed','#d97706','#0d9488','#3b82f6','#7c3aed','#94a3b8'];
    var pos=[{x:120,y:115},{x:220,y:90},{x:320,y:105},{x:420,y:88},{x:520,y:110},{x:620,y:95},
      {x:170,y:175},{x:270,y:165},{x:370,y:180},{x:470,y:160},{x:570,y:172},{x:670,y:168}];
    for(var i=0;i<pos.length-1;i++){if(i===5)continue;_drawEdge(ctx,pos[i].x,pos[i].y,pos[i+1].x,pos[i+1].y,16,16,cols[i],1.5,0);}
    [[0,6],[1,7],[3,9],[4,10],[5,11]].forEach(function(p){_drawEdge(ctx,pos[p[0]].x,pos[p[0]].y,pos[p[1]].x,pos[p[1]].y,16,16,'#cbd5e1',1,0,[4,3]);});
    pos.forEach(function(p,i){_circNode(ctx,p.x,p.y,14,_F.tealBg,cols[i%cols.length],1.5);
      ctx.font='700 9px "DM Mono",monospace';ctx.fillStyle=cols[i%cols.length];ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('k'+i,p.x,p.y);});
    ctx.font='700 18px "DM Sans",sans-serif';ctx.fillStyle=_F.gray;ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText('\u2026',720,130);ctx.fillText('\u2026',720,175);
    ctx.beginPath();ctx.roundRect(100,220,600,50,10);ctx.fillStyle=_F.redBg;ctx.fill();ctx.strokeStyle=_F.red;ctx.lineWidth=1.5;ctx.stroke();
    ctx.font='700 13px "DM Sans",sans-serif';ctx.fillStyle=_F.red;ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText('Hash table: one entry per unique k-mer',400,236);
    ctx.font='11px "DM Sans",sans-serif';ctx.fillStyle=_F.red;ctx.fillText('Human gut: ~10\u2079 k-mers \u2192 hundreds of GB RAM',400,258);
    ctx.font='600 10px "DM Sans",sans-serif';ctx.fillStyle=_F.grayTxt;ctx.textAlign='start';ctx.textBaseline='alphabetic';ctx.fillText('Memory usage:',100,305);
    [{n:'Single genome',v:0.08,c:_F.teal},{n:'Simple community',v:0.25,c:_F.blue},{n:'Complex metagenome',v:0.95,c:_F.red}].forEach(function(m,i){
      var y=320+i*32;ctx.font='italic 9px "DM Sans",sans-serif';ctx.fillStyle=_F.grayTxt;ctx.textAlign='end';ctx.textBaseline='middle';ctx.fillText(m.n,185,y+9);
      ctx.beginPath();ctx.roundRect(195,y,m.v*520,18,3);ctx.fillStyle=m.c;ctx.fill();ctx.font='700 9px "DM Mono",monospace';ctx.fillStyle=m.c;ctx.textAlign='start';ctx.textBaseline='middle';
      ctx.fillText(m.v<0.5?(m.v*100|0)+' GB':(m.v*500|0)+' GB',200+m.v*520+8,y+9);});
    ctx.font='700 11px "DM Sans",sans-serif';ctx.fillStyle=_F.red;ctx.textAlign='center';ctx.textBaseline='alphabetic';
    ctx.fillText('\u26a0 Standard dBG doesn\u2019t scale to metagenomes',400,425);
  }

  /* ── Step 1: Show example graph ── */
  else if(step===1){
    ctx.font='700 15px "DM Sans",sans-serif';ctx.fillStyle=_F.grayTxt;ctx.textAlign='center';ctx.textBaseline='alphabetic';
    ctx.fillText('A small example de Bruijn graph (k=3)',400,28);
    ctx.font='11px "DM Sans",sans-serif';ctx.fillStyle=_F.gray;
    ctx.fillText('6 nodes ((k\u22121)-mers), 6 edges (k-mers). AT and CG each have two outgoing edges.',400,48);
    gph(110,55,0.9,_E,_N,false);
    edgeLbls(110,55,0.9,false);
    /* Callout for branches — below graph, above motivation box */
    ctx.font='italic 10px "DM Sans",sans-serif';ctx.fillStyle='#d97706';ctx.textBaseline='alphabetic';
    /* AT screen x≈182, CG screen x≈443 */
    ctx.textAlign='start';
    ctx.fillText('\u2191 AT has two outgoing edges (to TC, TG)',190,268);
    ctx.fillText('\u2191 CG also branches (to GC, GA)',460,268);
    /* Motivation */
    ctx.beginPath();ctx.roundRect(80,300,640,50,10);ctx.fillStyle=_F.tealBg;ctx.fill();ctx.strokeStyle=_F.teal;ctx.lineWidth=1;ctx.stroke();
    ctx.font='11px "DM Sans",sans-serif';ctx.fillStyle=_F.tealTxt;ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText('Standard approach stores full (k\u22121)-mer strings at every node.',400,316);
    ctx.font='700 11px "DM Sans",sans-serif';ctx.fillText('Can we encode the same topology with just a few bits per edge?',400,336);
  }

  /* ── Step 2: Edge table (unsorted) ── */
  else if(step===2){
    ctx.font='700 15px "DM Sans",sans-serif';ctx.fillStyle=_F.grayTxt;ctx.textAlign='center';ctx.textBaseline='alphabetic';
    ctx.fillText('Step 1: List all edges',400,28);
    ctx.font='11px "DM Sans",sans-serif';ctx.fillStyle=_F.gray;
    ctx.fillText('Each edge records source node, label (last character of k-mer), and target node.',400,48);
    gph(20,40,0.65,_E,_N,false);
    edgeLbls(20,40,0.65,false);
    /* Unsorted table */
    ctx.font='600 10px "DM Sans",sans-serif';ctx.fillStyle=_F.grayTxt;ctx.textAlign='center';ctx.textBaseline='alphabetic';
    ctx.fillText('Edge table (unsorted)',560,78);
    tbl(440,85,_E.map(function(e){return{src:e.src,lbl:e.lbl,dst:e.dst,col:e.col,newSrc:true};}),false,false,false);
    ctx.font='11px "DM Sans",sans-serif';ctx.fillStyle=_F.gray;ctx.textAlign='center';ctx.textBaseline='alphabetic';
    ctx.fillText('6 edges. Each stores 3 strings; that\u2019s a lot of text for billions of edges!',400,340);
  }

  /* ── Step 3: Sort by source ── */
  else if(step===3){
    ctx.font='700 15px "DM Sans",sans-serif';ctx.fillStyle=_F.grayTxt;ctx.textAlign='center';ctx.textBaseline='alphabetic';
    ctx.fillText('Step 2: Sort edges by source node',400,28);
    ctx.font='11px "DM Sans",sans-serif';ctx.fillStyle=_F.gray;
    ctx.fillText('Alphabetical order by source node. Edges from the same node sit together.',400,48);
    gph(20,40,0.65,_E,_N,false);
    edgeLbls(20,40,0.65,false);
    ctx.font='600 10px "DM Sans",sans-serif';ctx.fillStyle=_F.grayTxt;ctx.textAlign='center';ctx.textBaseline='alphabetic';
    ctx.fillText('Sorted by source',560,78);
    tbl(440,85,_S,false,false,false);
    ctx.font='700 11px "DM Sans",sans-serif';ctx.fillStyle='#d97706';ctx.textAlign='center';ctx.textBaseline='alphabetic';
    ctx.fillText('Now we can compress: next we extract just two tiny arrays\u2026',400,340);
  }

  /* ── Step 4: Extract W (labels) ── */
  else if(step===4){
    ctx.font='700 15px "DM Sans",sans-serif';ctx.fillStyle=_F.grayTxt;ctx.textAlign='center';ctx.textBaseline='alphabetic';
    ctx.fillText('Step 3: Extract W (the edge labels)',400,28);
    ctx.font='11px "DM Sans",sans-serif';ctx.fillStyle=_F.gray;
    ctx.fillText('Keep only the label column: the last character of each edge\u2019s destination node.',400,48);
    gph(20,40,0.65,_E,_N,true);
    edgeLbls(20,40,0.65,true);
    ctx.font='600 10px "DM Sans",sans-serif';ctx.fillStyle=_F.grayTxt;ctx.textAlign='center';ctx.textBaseline='alphabetic';
    ctx.fillText('Sorted edges',560,78);
    tbl(440,85,_S,true,false,false);
    /* W description */
    ctx.font='700 12px "DM Sans",sans-serif';ctx.fillStyle=_F.tealTxt;ctx.textAlign='center';ctx.textBaseline='alphabetic';
    ctx.fillText('W array (edge labels)',400,300);
    ctx.font='10px "DM Sans",sans-serif';ctx.fillStyle=_F.gray;
    ctx.fillText('Each entry = last char of the target node. DNA has 4 letters \u2192 2 bits per entry.',400,316);
    drawWF(150,330,65,32,[0,1,2,3,4,5],false);
    /* Bit cost callout */
    ctx.beginPath();ctx.roundRect(200,400,400,28,6);ctx.fillStyle=_F.tealBg;ctx.fill();ctx.strokeStyle=_F.teal;ctx.lineWidth=1;ctx.stroke();
    ctx.font='700 10px "DM Sans",sans-serif';ctx.fillStyle=_F.tealTxt;ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText('6 edges \u00d7 2 bits = 12 bits total',400,414);
  }

  /* ── Step 5: Extract F (boundaries) ── */
  else if(step===5){
    ctx.font='700 15px "DM Sans",sans-serif';ctx.fillStyle=_F.grayTxt;ctx.textAlign='center';ctx.textBaseline='alphabetic';
    ctx.fillText('Step 4: Extract F (boundary flags)',400,28);
    ctx.font='11px "DM Sans",sans-serif';ctx.fillStyle=_F.gray;
    ctx.fillText('F tells us which source node each edge comes from. 1 bit per edge.',400,48);
    gph(20,40,0.65,_E,_N,true);
    edgeLbls(20,40,0.65,true);
    tbl(440,85,_S,true,true,true);

    /* Legend: what 1 and 0 mean */
    var lgX=60,lgY=265;
    /* 1 = new source */
    ctx.beginPath();ctx.roundRect(lgX,lgY,18,18,4);ctx.fillStyle=_F.blueBg;ctx.fill();ctx.strokeStyle=_F.blue;ctx.lineWidth=1.5;ctx.stroke();
    ctx.font='700 12px "DM Mono",monospace';ctx.fillStyle=_F.blue;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('1',lgX+9,lgY+9);
    ctx.font='700 11px "DM Sans",sans-serif';ctx.fillStyle=_F.grayTxt;ctx.textAlign='start';ctx.textBaseline='middle';
    ctx.fillText('= new source node starts here',lgX+26,lgY+9);
    /* 0 = same source */
    ctx.beginPath();ctx.roundRect(lgX,lgY+28,18,18,4);ctx.fillStyle='#f8fafc';ctx.fill();ctx.strokeStyle='#cbd5e1';ctx.lineWidth=1;ctx.stroke();
    ctx.font='700 12px "DM Mono",monospace';ctx.fillStyle='#94a3b8';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('0',lgX+9,lgY+37);
    ctx.font='700 11px "DM Sans",sans-serif';ctx.fillStyle=_F.grayTxt;ctx.textAlign='start';ctx.textBaseline='middle';
    ctx.fillText('= same source as previous edge',lgX+26,lgY+37);

    /* Both arrays */
    drawWF(140,340,60,24,[0,1,2,3,4,5],[0,1,2,3,4,5]);

    /* Annotated F values with source names */
    var fAnnY=340+24+6+24+6;
    var fSrc=['AT','AT','CG','CG','TC','TG'];
    var fNew=[true,false,true,false,true,true];
    ctx.font='600 9px "DM Mono",monospace';ctx.textAlign='center';ctx.textBaseline='alphabetic';
    for(var i=0;i<6;i++){
      var cx=140+i*60+28;
      ctx.fillStyle=fNew[i]?_F.blue:'#d97706';
      ctx.fillText(fNew[i]?'\u2714 new: '+fSrc[i]:'\u2190 still '+fSrc[i],cx,fAnnY);
    }

    /* Summary */
    ctx.beginPath();ctx.roundRect(100,414,600,24,8);ctx.fillStyle=_F.tealBg;ctx.fill();ctx.strokeStyle=_F.teal;ctx.lineWidth=1;ctx.stroke();
    ctx.font='700 11px "DM Sans",sans-serif';ctx.fillStyle=_F.tealTxt;ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText('Encoded! W (12 bits) + F (6 bits) = 18 bits for 6 edges \u2192 3 bits/edge',400,426);
  }

  /* ── Steps 6-10: Reconstruct the graph edge by edge ── */
  else if(step>=6&&step<=10){
    var rStep=step-6; /* 0-4 */
    ctx.font='700 15px "DM Sans",sans-serif';ctx.fillStyle=_F.grayTxt;ctx.textAlign='center';ctx.textBaseline='alphabetic';
    ctx.fillText('Reconstructing the graph from W + F',400,28);
    var subtitles=[
      'Start at node AT. F[0]=1, F[1]=0 \u2192 AT owns positions 0 and 1',
      'W[0] = C \u2192 AT + C \u2192 drop A \u2192 target is TC',
      'AT\u2019s 2nd edge: W[1] = G \u2192 AT + G \u2192 drop A \u2192 target is TG',
      'CG: F[2]=1, F[3]=0 \u2192 two edges. W[2]=A \u2192 GA, W[3]=C \u2192 GC',
      'TC: W[4]=G \u2192 CG. TG: W[5]=C \u2192 GC. All 6 edges recovered!'
    ];
    ctx.font='11px "DM Sans",sans-serif';ctx.fillStyle=_F.gray;
    ctx.fillText(subtitles[rStep],400,48);

    /* W+F arrays at top — highlight active positions */
    var hlW=[],hlF=[];
    if(rStep===0){hlF=[0,1];}
    else if(rStep===1){hlW=[0];hlF=[0];}
    else if(rStep===2){hlW=[1];hlF=[0,1];}
    else if(rStep===3){hlW=[2,3];hlF=[2,3];}
    else{hlW=[4,5];hlF=[4,5];}
    /* Source labels above position indices */
    ctx.font='600 10px "DM Mono",monospace';ctx.fillStyle='#64748b';ctx.textAlign='center';ctx.textBaseline='alphabetic';
    for(var i=0;i<6;i++) ctx.fillText(_srcLbl[i],110+i*75+35,68);
    /* Position indices drawn by drawWF at ay-3 */
    drawWF(110,85,75,28,hlW,hlF);
    /* Inline W/F descriptions to the right of the arrays */
    ctx.font='italic 9px "DM Sans",sans-serif';ctx.textAlign='start';ctx.textBaseline='middle';
    ctx.fillStyle=_F.teal;ctx.fillText('edge labels (2 bits)',110+6*75+8,85+14);
    ctx.fillStyle=_F.blue;ctx.fillText('boundary flags (1 bit)',110+6*75+8,85+28+6+14);

    /* Reconstructed graph — progressively add edges */
    var visEdges=[];
    if(rStep>=1) visEdges.push(_E[0]); /* AT→TC */
    if(rStep>=2){visEdges.push(_E[0]);visEdges.push(_E[1]);} /* AT→TG */
    if(rStep>=3){visEdges.push(_E[4]);visEdges.push(_E[3]);} /* CG→GA, CG→GC */
    if(rStep>=4){visEdges.push(_E[2]);visEdges.push(_E[5]);} /* TC→CG, TG→GC */
    /* deduplicate */
    var seen={},uniq=[];visEdges.forEach(function(e){var k=e.src+e.dst;if(!seen[k]){seen[k]=true;uniq.push(e);}});visEdges=uniq;

    /* Draw faded nodes first, then edges, then highlight active nodes */
    var gx=160,gy=170,gs=1.0;
    gph(gx,gy,gs,[],_N,true); /* all nodes faded */
    /* Draw recovered edges with labels */
    visEdges.forEach(function(e){
      var s=nd(e.src),t=nd(e.dst);
      _drawEdge(ctx,gx+s.x*gs,gy+s.y*gs,gx+t.x*gs,gy+t.y*gs,nR*gs+2,nR*gs+2,e.col,2.5*gs,0);
    });
    /* Edge labels on recovered edges only */
    if(visEdges.length>0){
      var visIdx=[];
      visEdges.forEach(function(e){visIdx.push(_E.indexOf(e));});
      var fs=Math.max(8,Math.round(11*gs)),pw=Math.round(14*gs),ph=Math.round(14*gs);
      visIdx.forEach(function(ei){
        var e=_E[ei],s=nd(e.src),t=nd(e.dst);
        var mx=gx+(s.x+t.x)/2*gs,my=gy+(s.y+t.y)/2*gs;
        var lx=mx+_lblOff[ei].dx*gs,ly=my+_lblOff[ei].dy*gs;
        ctx.beginPath();ctx.roundRect(lx-pw/2,ly-ph/2,pw,ph,3);
        ctx.fillStyle='rgba(255,255,255,0.9)';ctx.fill();
        ctx.strokeStyle=e.col;ctx.lineWidth=Math.max(1,1.5*gs);ctx.stroke();
        ctx.font='700 '+fs+'px "DM Mono",monospace';ctx.fillStyle=e.col;
        ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(e.lbl,lx,ly);
      });
    }
    /* Active nodes (ones that have at least one edge) */
    var activeIds={};
    visEdges.forEach(function(e){activeIds[e.src]=true;activeIds[e.dst]=true;});
    /* Always show AT as active from step 0 */
    activeIds['AT']=true;
    _N.forEach(function(n){
      var x=gx+n.x*gs,y=gy+n.y*gs,r=nR*gs;
      var active=activeIds[n.id];
      if(!active)ctx.globalAlpha=0.2;
      _circNode(ctx,x,y,r,_F.tealBg,n.col,active?2.5:1.5);
      ctx.font='700 '+Math.round(12*gs)+'px "DM Mono",monospace';ctx.fillStyle=n.col;
      ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(n.id,x,y);
      ctx.globalAlpha=1;
    });
    /* Current node indicator */
    var curNode=rStep<=2?'AT':rStep===3?'CG':null;
    if(curNode){
      var cn=nd(curNode);
      ctx.beginPath();ctx.arc(gx+cn.x*gs,gy+cn.y*gs,nR*gs+6,0,Math.PI*2);
      ctx.strokeStyle='#d97706';ctx.lineWidth=2;ctx.setLineDash([5,3]);ctx.stroke();ctx.setLineDash([]);
    }
    /* Edge count */
    if(rStep<4){
      ctx.font='600 10px "DM Sans",sans-serif';ctx.fillStyle=_F.gray;ctx.textAlign='center';ctx.textBaseline='alphabetic';
      ctx.fillText('Edges recovered: '+visEdges.length+' / 6',400,420);
    } else {
      ctx.beginPath();ctx.roundRect(150,400,500,32,8);ctx.fillStyle=_F.tealBg;ctx.fill();ctx.strokeStyle=_F.teal;ctx.lineWidth=1.5;ctx.stroke();
      ctx.font='700 12px "DM Sans",sans-serif';ctx.fillStyle=_F.teal;ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText('\u2714 Full graph recovered from just 18 bits!',400,416);
    }
  }

  /* ── Step 11: Memory — standard vs succinct ── */
  else if(step===11){
    ctx.font='700 15px "DM Sans",sans-serif';ctx.fillStyle=_F.grayTxt;ctx.textAlign='center';ctx.textBaseline='alphabetic';
    ctx.fillText('What are we actually storing?',400,28);
    ctx.font='11px "DM Sans",sans-serif';ctx.fillStyle=_F.gray;
    ctx.fillText('Same graph, same assembly, radically different storage',400,48);
    /* LEFT: Standard hash table — show dense entries */
    ctx.font='600 12px "DM Sans",sans-serif';ctx.fillStyle=_F.red;ctx.textAlign='center';ctx.textBaseline='alphabetic';
    ctx.fillText('Standard dBG (hash table)',200,78);
    /* Hash table visual: grid of cells with full k-mer strings */
    var htY=92,htH=22,htW=120,htGap=4;
    var htEntries=[
      {k:'ATCG',v:'\u2192 ptr',occ:true},{k:'',v:'',occ:false},{k:'TCGA',v:'\u2192 ptr',occ:true},
      {k:'GCTA',v:'\u2192 ptr',occ:true},{k:'',v:'',occ:false},{k:'CGTA',v:'\u2192 ptr',occ:true},
      {k:'TAGC',v:'\u2192 ptr',occ:true},{k:'ATGC',v:'\u2192 ptr',occ:true},{k:'',v:'',occ:false},
      {k:'TGCA',v:'\u2192 ptr',occ:true},{k:'',v:'',occ:false},{k:'GCAT',v:'\u2192 ptr',occ:true}
    ];
    htEntries.forEach(function(e,i){
      var col=i%2,row=Math.floor(i/2);
      var x=60+col*(htW+htGap),y=htY+row*(htH+htGap);
      ctx.beginPath();ctx.roundRect(x,y,htW,htH,3);
      ctx.fillStyle=e.occ?_F.redBg:'#f8fafc';ctx.fill();
      ctx.strokeStyle=e.occ?_F.red:'#e2e8f0';ctx.lineWidth=e.occ?1:0.5;ctx.stroke();
      if(e.occ){
        ctx.font='700 9px "DM Mono",monospace';ctx.fillStyle=_F.red;ctx.textAlign='start';ctx.textBaseline='middle';
        ctx.fillText(e.k,x+6,y+htH/2);
        ctx.font='600 10px "DM Mono",monospace';ctx.fillStyle='#94a3b8';ctx.textAlign='end';
        ctx.fillText(e.v,x+htW-6,y+htH/2);
      }
    });
    /* Collision chain arrows */
    ctx.font='italic 10px "DM Sans",sans-serif';ctx.fillStyle='#94a3b8';ctx.textAlign='start';ctx.textBaseline='alphabetic';
    ctx.fillText('empty slots',62,htY+6*(htH+htGap)+16);ctx.fillText('collision chains',62,htY+6*(htH+htGap)+28);
    ctx.fillText('full k-mer strings',62,htY+6*(htH+htGap)+40);
    /* Per-entry cost */
    ctx.beginPath();ctx.roundRect(50,268,210,36,6);ctx.fillStyle=_F.redBg;ctx.fill();ctx.strokeStyle=_F.red;ctx.lineWidth=1;ctx.stroke();
    ctx.font='700 10px "DM Sans",sans-serif';ctx.fillStyle=_F.red;ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText('~50\u201380 bytes per k-mer',155,280);
    ctx.font='9px "DM Sans",sans-serif';ctx.fillStyle=_F.red;ctx.fillText('string + hash + pointer + overhead',155,296);

    /* RIGHT: Succinct W + F — show compact arrays */
    ctx.font='600 12px "DM Sans",sans-serif';ctx.fillStyle=_F.teal;ctx.textAlign='center';ctx.textBaseline='alphabetic';
    ctx.fillText('Succinct dBG (W + F arrays)',600,78);
    drawWF(430,95,55,32,null,null);
    /* Source labels */
    ctx.font='600 9px "DM Mono",monospace';ctx.fillStyle='#94a3b8';ctx.textAlign='center';ctx.textBaseline='alphabetic';
    for(var i=0;i<6;i++) ctx.fillText(_srcLbl[i],430+i*55+25,95-4);
    /* Bit breakdown */
    ctx.font='italic 9px "DM Sans",sans-serif';ctx.fillStyle=_F.gray;ctx.textAlign='center';ctx.textBaseline='alphabetic';
    ctx.fillText('W: 2 bits per edge (DNA = 4 letters)',600,200);
    ctx.fillText('F: 1 bit per edge (boundary marker)',600,215);
    ctx.beginPath();ctx.roundRect(490,230,220,36,6);ctx.fillStyle=_F.tealBg;ctx.fill();ctx.strokeStyle=_F.teal;ctx.lineWidth=1;ctx.stroke();
    ctx.font='700 10px "DM Sans",sans-serif';ctx.fillStyle=_F.tealTxt;ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText('~3 bits per edge',600,242);
    ctx.font='9px "DM Sans",sans-serif';ctx.fillStyle=_F.tealTxt;ctx.fillText('no strings, no pointers, no waste',600,258);

    /* Divider */
    ctx.beginPath();ctx.moveTo(400,70);ctx.lineTo(400,310);ctx.strokeStyle='#e2e8f0';ctx.lineWidth=1;ctx.setLineDash([6,4]);ctx.stroke();ctx.setLineDash([]);
    ctx.font='700 14px "DM Sans",sans-serif';ctx.fillStyle='#94a3b8';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('vs',400,170);

    /* Bottom: memory bars for real scale */
    ctx.font='600 11px "DM Sans",sans-serif';ctx.fillStyle=_F.grayTxt;ctx.textAlign='center';ctx.textBaseline='alphabetic';
    ctx.fillText('At metagenome scale (~10\u2079 k-mers):',400,340);
    ctx.font='italic 10px "DM Sans",sans-serif';ctx.fillStyle=_F.grayTxt;ctx.textAlign='end';ctx.textBaseline='middle';
    ctx.fillText('Standard',155,370);ctx.beginPath();ctx.roundRect(165,360,520,20,3);ctx.fillStyle=_F.red;ctx.fill();
    ctx.font='700 10px "DM Sans",sans-serif';ctx.fillStyle='#fff';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('~500 GB',425,370);
    ctx.font='italic 10px "DM Sans",sans-serif';ctx.fillStyle=_F.grayTxt;ctx.textAlign='end';ctx.textBaseline='middle';
    ctx.fillText('Succinct',155,400);ctx.beginPath();ctx.roundRect(165,390,62,20,3);ctx.fillStyle=_F.teal;ctx.fill();
    ctx.font='700 10px "DM Sans",sans-serif';ctx.fillStyle=_F.teal;ctx.textAlign='start';ctx.textBaseline='middle';ctx.fillText('~10 GB',238,400);
    _badge(ctx,500,400,'~50\u00d7 less memory',_F.tealBg,_F.teal,_F.tealTxt,11);
    ctx.font='10px "DM Sans",sans-serif';ctx.fillStyle=_F.gray;ctx.textAlign='center';ctx.textBaseline='alphabetic';
    ctx.fillText('Bowe et al. 2012; Li et al. 2015, Bioinformatics',400,430);
  }

  /* ── Step 12: Multi-k strategy ── */
  else if(step===12){
    ctx.font='700 15px "DM Sans",sans-serif';ctx.fillStyle=_F.grayTxt;ctx.textAlign='center';ctx.textBaseline='alphabetic';
    ctx.fillText('Multi-k-mer strategy',400,28);
    ctx.font='11px "DM Sans",sans-serif';ctx.fillStyle=_F.gray;
    ctx.fillText('MEGAHIT iterates over increasing k-mer sizes, merging assemblies at each round',400,48);
    var kSizes=[21,41,61,81,99,141],kY=90,kRowH=52,kBarX=220,kBarMaxW=450;
    kSizes.forEach(function(k,i){
      var y=kY+i*kRowH;
      ctx.font='700 12px "DM Mono",monospace';ctx.fillStyle=_F.grayTxt;ctx.textAlign='end';ctx.textBaseline='middle';ctx.fillText('k = '+k,kBarX-15,y+14);
      var isSmall=i<2,isMed=i>=2&&i<4;
      var col=isSmall?_F.amber:isMed?_F.teal:_F.blue;
      var nBars=isSmall?6:isMed?4:2,barW=isSmall?kBarMaxW*0.12:isMed?kBarMaxW*0.22:kBarMaxW*0.42;
      for(var b=0;b<nBars;b++){var bx=kBarX+b*(barW+8);if(bx+barW>kBarX+kBarMaxW)break;ctx.beginPath();ctx.roundRect(bx,y,barW,20,3);ctx.fillStyle=col;ctx.fill();}
      var desc=isSmall?'Catches low-coverage regions':isMed?'Balanced coverage + resolution':'Resolves repeats, longer contigs';
      ctx.font='italic 9px "DM Sans",sans-serif';ctx.fillStyle=_F.gray;ctx.textAlign='start';ctx.textBaseline='middle';ctx.fillText(desc,kBarX+2,y+34);
    });
    ctx.beginPath();ctx.moveTo(kBarX+kBarMaxW+30,kY+10);ctx.lineTo(kBarX+kBarMaxW+30,kY+kSizes.length*kRowH-20);
    ctx.strokeStyle=_F.gray;ctx.lineWidth=1.5;ctx.setLineDash([5,3]);ctx.stroke();ctx.setLineDash([]);
    ctx.font='600 9px "DM Sans",sans-serif';ctx.fillStyle=_F.gray;ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.save();ctx.translate(kBarX+kBarMaxW+45,kY+kSizes.length*kRowH/2);ctx.rotate(-Math.PI/2);ctx.fillText('merge contigs at each iteration',0,0);ctx.restore();
    ctx.font='11px "DM Sans",sans-serif';ctx.fillStyle=_F.gray;ctx.textAlign='center';ctx.textBaseline='alphabetic';
    ctx.fillText('Small k \u2192 sensitivity for rare species | Large k \u2192 specificity for repeat resolution',400,420);
  }

  /* ── Step 13: Summary ── */
  else {
    ctx.font='700 15px "DM Sans",sans-serif';ctx.fillStyle=_F.grayTxt;ctx.textAlign='center';ctx.textBaseline='alphabetic';
    ctx.fillText('Why MEGAHIT works for metagenomes',400,28);
    var cards=[
      {icon:'\u25a3',title:'Succinct de Bruijn graph',desc:'W + F arrays: ~3 bits per edge, 50\u00d7 less RAM than standard dBG',col:_F.teal,bg:_F.tealBg},
      {icon:'\u21bb',title:'Multi-k iteration',desc:'Small k catches rare species, large k resolves repeats. Best of both worlds',col:_F.blue,bg:_F.blueBg},
      {icon:'\u26a1',title:'Mercy-k step',desc:'Rescues low-coverage contigs that would be lost with a single high k',col:_F.violet,bg:_F.violetBg},
      {icon:'\u2746',title:'Designed for metagenomes',desc:'Handles uneven coverage, strain mixtures, and massive datasets on a single node',col:_F.amber,bg:_F.amberBg}
    ];
    cards.forEach(function(c,i){
      var y=58+i*90,x=100;
      ctx.beginPath();ctx.roundRect(x,y,600,72,12);ctx.fillStyle=c.bg;ctx.fill();
      ctx.strokeStyle=c.col;ctx.lineWidth=1.5;ctx.stroke();
      ctx.font='700 24px "DM Sans",sans-serif';ctx.fillStyle=c.col;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(c.icon,x+40,y+36);
      ctx.font='700 13px "DM Sans",sans-serif';ctx.fillStyle=_F.grayTxt;ctx.textAlign='start';ctx.textBaseline='alphabetic';ctx.fillText(c.title,x+75,y+28);
      ctx.font='11px "DM Sans",sans-serif';ctx.fillStyle=_F.gray;ctx.fillText(c.desc,x+75,y+50);
    });
    ctx.font='10px "DM Sans",sans-serif';ctx.fillStyle=_F.gray;ctx.textAlign='center';ctx.textBaseline='alphabetic';
    ctx.fillText('Li et al. 2015, Bioinformatics; Li et al. 2016, Methods',400,425);
  }
}


/* ================================================================
   Slide 12 – Assembly metrics: N50, L50, quality evaluation
   3 steps (0-2):
   0  Contigs sorted by length + N50 line
   1  Full metrics table: N50, L50, total length, # contigs, largest
   2  Good vs bad assembly comparison
   ================================================================ */
function drawAsmMetrics(step){
  const ctx=_asmCanvas('am-canvas');if(!ctx)return;
  const W=800,H=440;

  /* ── Step 0: Visual N50 explanation ── */
  if(step===0){
    ctx.font='700 15px "DM Sans",sans-serif';ctx.fillStyle=_F.grayTxt;ctx.textAlign='center';ctx.textBaseline='alphabetic';
    ctx.fillText('What is N50?',400,28);
    ctx.font='11px "DM Sans",sans-serif';ctx.fillStyle=_F.gray;
    ctx.fillText('Sort contigs by length (descending). N50 = length where cumulative sum reaches 50% of total.',400,48);

    /* Sorted contig bars */
    const contigs=[320,250,180,140,100,75,55,40,30,20,15,10];
    const total=contigs.reduce((a,b)=>a+b,0);
    const barX=100,barY=62,barH=24,gap=3;
    const scale=550/contigs[0];
    let cum=0;let n50idx=-1;
    contigs.forEach((c,i)=>{
      cum+=c;
      const y=barY+i*(barH+gap);
      const w=c*scale;
      const past50=cum>=total/2&&n50idx<0;
      if(past50) n50idx=i;
      const col=i<=n50idx||n50idx<0?_F.teal:_F.blue;
      ctx.beginPath();ctx.roundRect(barX,y,w,barH,3);ctx.fillStyle=col;ctx.fill();
      /* Length label */
      ctx.font='700 9px "DM Mono",monospace';ctx.fillStyle='#fff';ctx.textAlign='start';ctx.textBaseline='middle';
      if(w>40) ctx.fillText(c+' kb',barX+8,y+barH/2);
      else { ctx.fillStyle=_F.grayTxt; ctx.fillText(c+'',barX+w+6,y+barH/2); }
    });
    /* N50 line and label */
    const n50y=barY+n50idx*(barH+gap)+barH+2;
    ctx.beginPath();ctx.moveTo(barX-10,n50y);ctx.lineTo(barX+580,n50y);
    ctx.strokeStyle=_F.amber;ctx.lineWidth=2;ctx.setLineDash([8,4]);ctx.stroke();ctx.setLineDash([]);
    _badge(ctx,barX+590,n50y,'N50 = '+contigs[n50idx]+' kb',_F.amberBg,_F.amber,_F.amberTxt,10);

    /* Cumulative percentage annotations */
    cum=0;
    [0,n50idx].forEach(idx=>{
      let s=0;for(let j=0;j<=idx;j++)s+=contigs[j];
      const pct=Math.round(s/total*100);
      const y=barY+idx*(barH+gap)+barH/2;
      ctx.font='600 9px "DM Sans",sans-serif';ctx.fillStyle=_F.gray;ctx.textAlign='end';ctx.textBaseline='middle';
      ctx.fillText(pct+'%',barX-14,y);
    });

    /* Explanation */
    ctx.font='11px "DM Sans",sans-serif';ctx.fillStyle=_F.gray;ctx.textAlign='center';ctx.textBaseline='alphabetic';
    ctx.fillText('Teal contigs = top 50% of total assembly length. N50 = length of the shortest contig in that set.',400,425);
  }

  /* ── Step 1: Metrics table ── */
  else if(step===1){
    ctx.font='700 15px "DM Sans",sans-serif';ctx.fillStyle=_F.grayTxt;ctx.textAlign='center';ctx.textBaseline='alphabetic';
    ctx.fillText('Key assembly statistics',400,28);
    ctx.font='11px "DM Sans",sans-serif';ctx.fillStyle=_F.gray;
    ctx.fillText('These metrics tell you how contiguous and complete your assembly is',400,48);

    const metrics=[
      {name:'N50',val:'180 kb',desc:'Contig length at 50% of total assembly',icon:'\u2796',col:_F.teal},
      {name:'L50',val:'3',desc:'Number of contigs needed to reach 50% of total',icon:'\u0023',col:_F.blue},
      {name:'Total length',val:'1.24 Mb',desc:'Sum of all contig lengths',icon:'\u03a3',col:_F.violet},
      {name:'# Contigs',val:'12',desc:'Total number of contigs in assembly',icon:'\u25a6',col:_F.amber},
      {name:'Largest contig',val:'320 kb',desc:'Length of the longest single contig',icon:'\u2b06',col:_F.teal},
      {name:'GC content',val:'48.2%',desc:'Nucleotide composition; sanity check for contamination',icon:'\u25cb',col:_F.blue}
    ];
    metrics.forEach((m,i)=>{
      const y=72+i*58,x=80;
      ctx.beginPath();ctx.roundRect(x,y,640,48,10);ctx.fillStyle=i%2===0?'#f8fafc':'#fff';ctx.fill();
      ctx.strokeStyle='#e2e8f0';ctx.lineWidth=0.5;ctx.stroke();
      /* Icon */
      ctx.font='700 18px "DM Sans",sans-serif';ctx.fillStyle=m.col;ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText(m.icon,x+28,y+24);
      /* Name */
      ctx.font='700 13px "DM Sans",sans-serif';ctx.fillStyle=_F.grayTxt;ctx.textAlign='start';ctx.textBaseline='middle';
      ctx.fillText(m.name,x+55,y+17);
      /* Description */
      ctx.font='10px "DM Sans",sans-serif';ctx.fillStyle=_F.gray;
      ctx.fillText(m.desc,x+55,y+35);
      /* Value */
      ctx.font='700 14px "DM Mono",monospace';ctx.fillStyle=m.col;ctx.textAlign='end';ctx.textBaseline='middle';
      ctx.fillText(m.val,x+625,y+24);
    });
    ctx.font='10px "DM Sans",sans-serif';ctx.fillStyle=_F.gray;ctx.textAlign='center';ctx.textBaseline='alphabetic';
    ctx.fillText('Higher N50 and lower L50 indicate a more contiguous assembly',400,430);
  }

  /* ── Step 2: Good vs bad assembly ── */
  else {
    ctx.font='700 15px "DM Sans",sans-serif';ctx.fillStyle=_F.grayTxt;ctx.textAlign='center';ctx.textBaseline='alphabetic';
    ctx.fillText('Same data, different assemblies',400,28);
    ctx.font='11px "DM Sans",sans-serif';ctx.fillStyle=_F.gray;
    ctx.fillText('N50 alone is not enough. Always check multiple metrics together',400,48);

    /* Good assembly — left */
    ctx.font='600 12px "DM Sans",sans-serif';ctx.fillStyle=_F.teal;ctx.textAlign='center';ctx.textBaseline='alphabetic';
    ctx.fillText('\u2714 Good assembly',200,78);
    const goodBars=[{w:0.85},{w:0.65},{w:0.50},{w:0.35},{w:0.20},{w:0.10}];
    goodBars.forEach((b,i)=>{
      ctx.beginPath();ctx.roundRect(50,90+i*30,b.w*300,22,3);ctx.fillStyle=_F.teal;ctx.fill();
    });
    const goodStats=[['N50','180 kb'],['L50','3'],['# Contigs','12'],['Total','1.24 Mb']];
    goodStats.forEach((s,i)=>{
      const y=108+i*24;
      ctx.font='600 9px "DM Sans",sans-serif';ctx.fillStyle=_F.tealTxt;ctx.textAlign='start';ctx.textBaseline='middle';
      ctx.fillText(s[0]+': '+s[1],55,290+i*20);
    });

    /* Divider */
    ctx.beginPath();ctx.moveTo(400,70);ctx.lineTo(400,380);ctx.strokeStyle='#e2e8f0';ctx.lineWidth=1;ctx.stroke();
    ctx.font='700 11px "DM Sans",sans-serif';ctx.fillStyle=_F.gray;ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText('vs',400,230);

    /* Bad assembly — right */
    ctx.font='600 12px "DM Sans",sans-serif';ctx.fillStyle=_F.red;ctx.textAlign='center';ctx.textBaseline='alphabetic';
    ctx.fillText('\u2718 Fragmented assembly',600,78);
    const badBars=[{w:0.30},{w:0.25},{w:0.22},{w:0.18},{w:0.15},{w:0.12},{w:0.10},{w:0.08},{w:0.06},{w:0.05}];
    badBars.forEach((b,i)=>{
      ctx.beginPath();ctx.roundRect(450,90+i*20,b.w*300,14,2);ctx.fillStyle=i<3?_F.amber:_F.gray;ctx.fill();
    });
    const badStats=[['N50','22 kb'],['L50','18'],['# Contigs','156'],['Total','0.98 Mb']];
    const badStatsY=90+badBars.length*20+16;
    badStats.forEach((s,i)=>{
      ctx.font='600 9px "DM Sans",sans-serif';ctx.fillStyle=_F.red;ctx.textAlign='start';ctx.textBaseline='middle';
      ctx.fillText(s[0]+': '+s[1],455,badStatsY+i*18);
    });

    /* Bottom takeaway */
    ctx.beginPath();ctx.roundRect(80,380,640,42,10);ctx.fillStyle=_F.amberBg;ctx.fill();ctx.strokeStyle=_F.amber;ctx.lineWidth=1;ctx.stroke();
    ctx.font='11px "DM Sans",sans-serif';ctx.fillStyle=_F.amberTxt;ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText('A high N50 with massive total length may indicate chimeric contigs. Always cross-check!',400,401);
  }
}

class Particles{
  constructor(id,dir){this.c=document.getElementById(id);if(!this.c)return;this.ctx=this.c.getContext('2d');this.dir=dir;this.ps=[];this.on=false}
  init(){const r=this.c.getBoundingClientRect(),d=devicePixelRatio||1;this.c.width=r.width*d;this.c.height=r.height*d;this.ctx.setTransform(d,0,0,d,0,0);this.w=r.width;this.h=r.height}
  start(){if(this.on)return;this.init();this.on=true;this.tick()}
  stop(){this.on=false}
  tick(){if(!this.on)return;
    if(Math.random()<.3){this.ps.push({x:0,y:this.h/2+(Math.random()-.5)*8,vx:1.5+Math.random()*2,vy:0,color:GCOLS[Math.floor(Math.random()*4)],sz:2+Math.random()*2,life:1})}
    this.ctx.clearRect(0,0,this.w,this.h);
    this.ps=this.ps.filter(p=>{p.x+=p.vx;p.y+=p.vy;p.life=1-p.x/this.w;
      if(p.life<=0)return false;this.ctx.globalAlpha=p.life*.5;this.ctx.beginPath();this.ctx.arc(p.x,p.y,p.sz,0,Math.PI*2);this.ctx.fillStyle=p.color;this.ctx.fill();return true});
    this.ctx.globalAlpha=1;requestAnimationFrame(()=>this.tick())}
}

let ra,qc,pp,qpG,qpP,trimD,trimPending=null;
function regenerateReads(){if(ra){ra.gen()}}

/* Ensure canvases are created and have generated content; retries until canvas has dimensions */
function ensureQC(){
  if(!qc) qc=new QCCanvas('qc-canvas');
  if(!qc.ok||qc.reads.length===0){
    if(qc.init()){qc.gen(42)}
    else{setTimeout(ensureQC,150)} // retry until transition finishes and canvas has size
  }
}
function ensureTrimD(){
  if(!trimD) trimD=new TrimTech('trim-canvas');
  if(!trimD.ok||!trimD.phase0drawn){
    if(trimD.init()){trimD.gen();if(trimPending!==null){const s=trimPending;trimPending=null;trimD.goToStep(s)}}
    else{setTimeout(ensureTrimD,150)}
  }
}

Reveal.initialize({
  hash:true,slideNumber:'c/t',progress:true,controls:true,
  controlsTutorial:false,controlsLayout:'edges',
  transition:'fade',transitionSpeed:'default',
  width:1440,height:810,
  margin:0.02,center:false,showNotes:false,
  keyboard:{78:()=>Reveal.configure({showNotes:!Reveal.getConfig().showNotes}),77:()=>{if(typeof toggleNav==='function')toggleNav()}}
}).then(()=>{
  // pipeline-particles canvas removed from title slide
  pp=null;

  function go(){
    const i=Reveal.getState().indexh;
    // Title slide is now pure HTML, no canvas animation needed
    if(i===SID('mixed-reads')){
      if(!ra){ra=new Reads('reads-canvas');setTimeout(()=>ra.gen(42),400)}
      else ra.gen();
    }
    if(i===SID('read-anatomy')){
      setTimeout(()=>drawReadAnatomy(0),300);
    }
    if(i===SID('qc-pipeline')){
      ensureQC();
    }
    if(i===SID('per-base-quality')){
      setTimeout(()=>{
        if(!qpG){qpG=new QPlot('qplot-good','good');qpG.animate()}
        if(!qpP){qpP=new QPlot('qplot-poor','poor');qpP.animate()}
      },300);
    }
    if(i===SID('diagnostic-plots')){
      setTimeout(()=>drawDiagPlots(),300);
    }
    if(i===SID('trim-demo')){
      trimPending=null;
      ensureTrimD();
    }
    if(i===SID('why-assemble')){setTimeout(()=>drawWhyAssemble(0),300)}
    if(i===SID('debruijn')){setTimeout(()=>drawDeBruijn(0),300)}
    if(i===SID('asm-challenges')){setTimeout(()=>drawAsmChallenges(0),300)}
    if(i===SID('megahit')){setTimeout(()=>{drawMegahit(0);mhHighlight(0);},300)}
    if(i===SID('asm-metrics')){setTimeout(()=>drawAsmMetrics(0),300)}
    if(i===SID('why-bin')){setTimeout(()=>{drawWhyBin(0);wbHighlight(0);},300)}
    if(i===SID('two-signals')){setTimeout(()=>{drawTwoSignals(0);tsHighlight(0);},300)}
    if(i===SID('metabat2')){setTimeout(()=>{drawMetabat2(0);mbHighlight(0);},300)}
    if(i===SID('next-gen-binners')){setTimeout(()=>{drawNextGen(0);ngHighlight(0);},300)}
    if(i===SID('quality-mimag')){setTimeout(()=>{drawQualityMimag(0);qmHighlight(0);},300)}
  }
  Reveal.on('slidechanged',go);
  go(); // render whichever slide is active on load

  // Highlight sidebar card for read-anatomy progressive reveal
  const raHeaders=['Library construct: use \u2192 to build up','Paired-end reads','Short insert \u2192 adapter read-through','Long insert \u2192 no adapter contamination'];
  function raHighlight(step){
    for(let i=0;i<4;i++){
      const el=document.getElementById('ra-card-'+i);if(!el)continue;
      el.style.opacity=i<=step?'1':'.4';
      el.style.transform=i===step?'scale(1.02)':'scale(1)';
      el.style.boxShadow=i===step?'var(--shadow-md)':'var(--shadow-sm)';
    }
    const hdr=document.getElementById('ra-header');
    if(hdr)hdr.textContent=raHeaders[step]||raHeaders[0];
  }

  // Slide 8: why-assemble highlight
  const waHeaders=['Short reads: use \u2192 to see assembly','Overlapping reads \u2192 consensus','Assembly output: contigs with gene context'];
  function waHighlight(step){
    for(let i=0;i<3;i++){
      const el=document.getElementById('wa-card-'+i);if(!el)continue;
      el.style.opacity=i<=step?'1':'.4';
      el.style.transform=i===step?'scale(1.02)':'scale(1)';
      el.style.boxShadow=i===step?'var(--shadow-md)':'var(--shadow-sm)';
    }
    const hdr=document.getElementById('wa-header');
    if(hdr)hdr.textContent=waHeaders[step]||waHeaders[0];
  }

  // Slide 9: de Bruijn highlight (21 steps: 0=seq, 1-8=kmers+nodes, 9-13=edges, 14-20=Eulerian path)
  const dbgCardCols=['#3b82f6','#0d9488','#16a34a'];
  function dbgHighlight(step){
    const activeCard=step===0?-1:step<=8?0:step<=13?1:2;
    for(let i=0;i<3;i++){
      const el=document.getElementById('dbg-step-'+i);if(!el)continue;
      el.style.opacity=i<=activeCard?'1':'0.45';
      el.style.borderColor=i===activeCard?dbgCardCols[i]:'#e2e8f0';
      el.style.boxShadow=i===activeCard?'0 2px 12px rgba(0,0,0,.1)':'none';
    }
    const headers=['DNA sequence','Extracting k-mers \u2192 edges','Building the graph','Eulerian path traversal'];
    const phase=step===0?0:step<=8?1:step<=13?2:3;
    const lbl=document.getElementById('dbg-label');if(lbl)lbl.textContent=headers[phase];
    const cnt=document.getElementById('dbg-counter');if(cnt)cnt.textContent=step>0?'Step '+step+'/20':'';
    const pEdge=step-13;
    const statTexts=['Use \u2192 to step through','K-mer '+(step)+' of 8','Edge '+(step-8)+' of 5',
      pEdge<7?'Eulerian step '+pEdge+' of 7, contig growing':'Eulerian path complete!'];
    const st=document.getElementById('dbg-status-box');if(st)st.textContent=statTexts[phase]||'';
  }

  // Slide 10: assembly challenges highlight (6 steps → 4 sidebar cards)
  // step→card: 0=0(coverage), 1=1(two species), 2=1(cross-links), 3=2(strain), 4=3(chimera), 5=3(summary)
  const acCardMap=[0,1,1,2,3,3];
  const acHeaders=['Coverage disparity','Two species in one graph',
    'Shared k-mers \u2192 cross-links','Strain collapsing','Chimeric contigs','Summary: all problems'];
  function acHighlight(step){
    const activeCard=acCardMap[step]!=null?acCardMap[step]:0;
    for(let i=0;i<4;i++){
      const el=document.getElementById('ac-card-'+i);if(!el)continue;
      el.style.opacity=i<=activeCard?'1':'.4';
      el.style.transform=i===activeCard?'scale(1.02)':'scale(1)';
      el.style.boxShadow=i===activeCard?'var(--shadow-md)':'var(--shadow-sm)';
    }
    const hdr=document.getElementById('ac-header');
    if(hdr)hdr.textContent=acHeaders[step]||acHeaders[0];
  }

  // Slide 11: MEGAHIT highlight (14 steps → 4 sidebar cards)
  // 0=memory → card 0, 1-5=encode → card 1, 6-10=decode → card 2, 11-13=compare/multi-k/summary → card 3
  const mhCardMap=[0,1,1,1,1,1,2,2,2,2,2,3,3,3];
  const mhHeaders=['Memory problem','Example de Bruijn graph','Step 1: List all edges',
    'Step 2: Sort by source','Step 3: Extract W (labels)','Step 4: Extract F (encoded!)',
    'Decode: start at AT','W[0]=C \u2192 AT\u2192TC',
    'W[1]=G \u2192 AT\u2192TG','CG: W[2]=A \u2192 GA, W[3]=C \u2192 GC','All 6 edges recovered!',
    'Standard vs succinct storage','Multi-k strategy','Summary: why MEGAHIT'];
  function mhHighlight(step){
    const activeCard=mhCardMap[step]!=null?mhCardMap[step]:0;
    for(let i=0;i<4;i++){
      const el=document.getElementById('mh-card-'+i);if(!el)continue;
      el.style.opacity=i<=activeCard?'1':'.4';
      el.style.transform=i===activeCard?'scale(1.02)':'scale(1)';
      el.style.boxShadow=i===activeCard?'var(--shadow-md)':'var(--shadow-sm)';
    }
    const hdr=document.getElementById('mh-header');
    if(hdr)hdr.textContent=mhHeaders[step]||mhHeaders[0];
  }

  // Slide 12: Assembly metrics highlight (3 steps → 3 sidebar cards)
  const amHeaders=['N50 explained','Key assembly statistics','Good vs fragmented assembly'];
  function amHighlight(step){
    for(let i=0;i<3;i++){
      const el=document.getElementById('am-card-'+i);if(!el)continue;
      el.style.opacity=i<=step?'1':'.4';
      el.style.transform=i===step?'scale(1.02)':'scale(1)';
      el.style.boxShadow=i===step?'var(--shadow-md)':'var(--shadow-sm)';
    }
    const hdr=document.getElementById('am-header');
    if(hdr)hdr.textContent=amHeaders[step]||amHeaders[0];
  }

  // ═══════════════════ ACT 3 — BINNING DRAWING FUNCTIONS ═══════════════════

  /* Shared seeded random for reproducible scatter dots */
  function binRng(s){return function(){s=(s*16807+0)%2147483647;return(s-1)/2147483646;};}

  // ---- helper: draw a small arrow head at (x,y) pointing in direction angle ----
  function _arrowHead(ctx,x,y,angle,size,col){
    ctx.save();ctx.translate(x,y);ctx.rotate(angle);
    ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(-size,-size*0.5);ctx.lineTo(-size,size*0.5);ctx.closePath();
    ctx.fillStyle=col;ctx.fill();ctx.restore();
  }

  // ---- helper: draw a connecting arrow between two points ----
  function _arrLine(ctx,x1,y1,x2,y2,col,lw){
    ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);
    ctx.strokeStyle=col;ctx.lineWidth=lw||1.5;ctx.stroke();
    const a=Math.atan2(y2-y1,x2-x1);
    _arrowHead(ctx,x2,y2,a,7,col);
  }

  /* ═══════════════════════════════════════════════════════════════════════
     Slide 1: WHY BIN — from mixed contigs to MAGs (4 steps, 0-3)
     ═══════════════════════════════════════════════════════════════════════ */
  function drawWhyBin(step){
    const ctx=_asmCanvas('wb-canvas');if(!ctx)return;
    ctx.clearRect(-50,-50,900,540);

    // Organism palette
    const cols=[_F.teal,_F.blue,_F.violet];
    const bgCols=[_F.tealBg,_F.blueBg,_F.violetBg];
    const names=['Species A','Species B','Species C'];
    const R=binRng(42);

    // Pre-generate 24 contigs (8 per species) with random scatter positions
    const nContigs=24;
    const contigs=[];
    for(let i=0;i<nContigs;i++){
      const sp=i%3;
      const w=35+R()*55, h=8+R()*5;
      const x=60+R()*670, y=55+R()*280;
      contigs.push({x,y,w,h,sp,angle:(R()-0.5)*0.3});
    }

    // ---- Step 0: chaotic mix of gray contigs + big question mark ----
    if(step===0){
      ctx.font='bold 14px "DM Sans",sans-serif';
      ctx.fillStyle=_F.grayTxt;ctx.textAlign='center';
      ctx.fillText('Assembly output: thousands of mixed contigs',400,22);
      ctx.font='11px "DM Sans",sans-serif';ctx.fillStyle=_F.gray;
      ctx.fillText('Which organism does each contig belong to?',400,40);

      for(const c of contigs){
        ctx.save();
        ctx.translate(c.x+c.w/2,c.y+c.h/2);
        ctx.rotate(c.angle);
        ctx.beginPath();ctx.rect(-c.w/2,-c.h/2,c.w,c.h);
        ctx.fillStyle='#e2e8f0';ctx.fill();
        ctx.strokeStyle='#cbd5e1';ctx.lineWidth=1;ctx.stroke();
        ctx.restore();
      }
      // Giant translucent question mark
      ctx.font='bold 80px "DM Sans",sans-serif';
      ctx.fillStyle='rgba(100,116,139,0.12)';
      ctx.textAlign='center';
      ctx.fillText('?',400,240);

      ctx.font='10px "DM Sans",sans-serif';ctx.fillStyle=_F.gray;ctx.textAlign='center';
      ctx.fillText('Contigs have no species labels. We need computational binning',400,420);
    }

    // ---- Step 1: faint color hints emerge ("hidden signals") ----
    if(step===1){
      ctx.font='bold 14px "DM Sans",sans-serif';
      ctx.fillStyle=_F.grayTxt;ctx.textAlign='center';
      ctx.fillText('Hidden signals in the data',400,22);
      ctx.font='11px "DM Sans",sans-serif';ctx.fillStyle=_F.gray;
      ctx.fillText('Coverage depth and sequence composition betray each contig\'s origin',400,40);

      for(const c of contigs){
        ctx.save();
        ctx.translate(c.x+c.w/2,c.y+c.h/2);
        ctx.rotate(c.angle);
        ctx.beginPath();ctx.rect(-c.w/2,-c.h/2,c.w,c.h);
        ctx.fillStyle='#e2e8f0';ctx.fill();
        ctx.fillStyle=cols[c.sp];ctx.globalAlpha=0.25;ctx.fill();ctx.globalAlpha=1;
        ctx.strokeStyle=cols[c.sp];ctx.globalAlpha=0.4;ctx.lineWidth=1;ctx.stroke();ctx.globalAlpha=1;
        ctx.restore();
      }

      // Small legend showing the three faint colors
      for(let s=0;s<3;s++){
        const lx=220+s*140;
        ctx.beginPath();ctx.roundRect(lx,380,12,12,2);
        ctx.fillStyle=cols[s];ctx.globalAlpha=0.35;ctx.fill();ctx.globalAlpha=1;
        ctx.strokeStyle=cols[s];ctx.lineWidth=1;ctx.stroke();
        ctx.font='10px "DM Sans",sans-serif';ctx.fillStyle=cols[s];ctx.textAlign='left';
        ctx.fillText(names[s],lx+18,391);
      }
      ctx.font='10px "DM Sans",sans-serif';ctx.fillStyle=_F.gray;ctx.textAlign='center';
      ctx.fillText('Binning algorithms detect these hidden patterns automatically',400,420);
    }

    // ---- Step 2: contigs sorted into 3 labeled MAG bins ----
    if(step===2||step===3){
      ctx.font='bold 14px "DM Sans",sans-serif';
      ctx.fillStyle=_F.grayTxt;ctx.textAlign='center';
      ctx.fillText(step===2?'Binning groups contigs into MAGs':'What MAGs unlock',400,22);

      // 3 bin boxes
      const binW=215, gap=22, startX=60;
      const binTop=48, binH=260;
      for(let sp=0;sp<3;sp++){
        const bx=startX+sp*(binW+gap);
        ctx.beginPath();ctx.roundRect(bx,binTop,binW,binH,12);
        ctx.fillStyle=bgCols[sp];ctx.fill();
        ctx.strokeStyle=cols[sp];ctx.lineWidth=2;ctx.setLineDash([5,3]);ctx.stroke();ctx.setLineDash([]);

        ctx.font='bold 12px "DM Sans",sans-serif';
        ctx.fillStyle=cols[sp];ctx.textAlign='center';
        ctx.fillText('MAG '+(sp+1)+': '+names[sp],bx+binW/2,binTop+20);

        // Sorted contigs inside the bin — clamp to box
        const myContigs=contigs.filter(c=>c.sp===sp);
        const cR=binRng(sp*10+7);
        for(let j=0;j<myContigs.length;j++){
          const cx=bx+12+cR()*(binW-80), cy=binTop+35+j*26;
          if(cy+10>binTop+binH-10) continue;
          const cw=40+cR()*50;
          const clamped=Math.min(cw,binW-24);
          ctx.beginPath();ctx.roundRect(cx,cy,clamped,10,2);
          ctx.fillStyle=cols[sp];ctx.globalAlpha=0.7;ctx.fill();ctx.globalAlpha=1;
          ctx.strokeStyle=cols[sp];ctx.lineWidth=1;ctx.stroke();
        }
      }

      // ---- Step 3 addition: downstream uses ----
      if(step===3){
        const arrowY=binTop+binH+8;
        const pillY=arrowY+22;
        const icons=['Metabolism','Phylogeny','Discovery'];
        for(let sp=0;sp<3;sp++){
          const cx=startX+sp*(binW+gap)+binW/2;
          _arrLine(ctx,cx,arrowY-8,cx,arrowY+8,cols[sp],1.5);
          _pill(ctx,cx-48,pillY,96,28,bgCols[sp],cols[sp],1.5);
          ctx.font='bold 10px "DM Sans",sans-serif';
          ctx.fillStyle=cols[sp];ctx.textAlign='center';
          ctx.fillText(icons[sp],cx,pillY+18);
        }
        ctx.font='10px "DM Sans",sans-serif';ctx.fillStyle=_F.gray;ctx.textAlign='center';
        ctx.fillText('MAGs enable organism-resolved analysis of complex communities',400,Math.min(pillY+52,428));
      }
    }
  }

  /* ═══════════════════════════════════════════════════════════════════════
     Slide 2: TWO SIGNALS — coverage + composition (5 steps, 0-4)
     ═══════════════════════════════════════════════════════════════════════ */
  function drawTwoSignals(step){
    const ctx=_asmCanvas('ts-canvas');if(!ctx)return;
    ctx.clearRect(-50,-50,900,540);

    const spCols=[_F.teal,_F.blue,_F.violet];
    const spNames=['Species A','Species B','Species C'];

    // ---- Step 0: "What is coverage depth?" ----
    if(step===0){
      ctx.font='bold 14px "DM Sans",sans-serif';
      ctx.fillStyle=_F.grayTxt;ctx.textAlign='center';
      ctx.fillText('What is coverage depth?',400,22);

      // Contig bar at top
      const contigX=80,contigY=50,contigW=640,contigH=18;
      ctx.beginPath();ctx.roundRect(contigX,contigY,contigW,contigH,4);
      ctx.fillStyle='#e2e8f0';ctx.fill();ctx.strokeStyle='#94a3b8';ctx.lineWidth=1.5;ctx.stroke();
      ctx.font='bold 10px "DM Sans",sans-serif';ctx.fillStyle=_F.gray;ctx.textAlign='left';
      ctx.fillText('Contig (reference)',contigX,contigY-6);

      // Position ticks along contig
      ctx.font='10px "DM Sans",sans-serif';ctx.fillStyle='#94a3b8';ctx.textAlign='center';
      for(let t=0;t<=10;t++){
        const tx=contigX+t*(contigW/10);
        ctx.beginPath();ctx.moveTo(tx,contigY+contigH);ctx.lineTo(tx,contigY+contigH+4);
        ctx.strokeStyle='#cbd5e1';ctx.lineWidth=0.8;ctx.stroke();
      }

      // Reads stacked below the contig (pileup)
      const R=binRng(77);
      const readData=[
        {start:0.05,len:0.18},{start:0.08,len:0.16},{start:0.10,len:0.15},
        {start:0.22,len:0.20},{start:0.25,len:0.18},{start:0.28,len:0.17},{start:0.30,len:0.19},
        {start:0.42,len:0.16},{start:0.45,len:0.18},{start:0.48,len:0.15},{start:0.50,len:0.17},{start:0.44,len:0.19},
        {start:0.65,len:0.18},{start:0.68,len:0.16},{start:0.70,len:0.17},
        {start:0.80,len:0.15},{start:0.82,len:0.18}
      ];

      // Assign reads to rows (simple pileup)
      const rowEnds=[];
      const readRows=[];
      for(const rd of readData){
        let placed=false;
        for(let r=0;r<rowEnds.length;r++){
          if(rd.start>rowEnds[r]+0.01){rowEnds[r]=rd.start+rd.len;readRows.push(r);placed=true;break;}
        }
        if(!placed){rowEnds.push(rd.start+rd.len);readRows.push(rowEnds.length-1);}
      }

      const readTop=contigY+contigH+12, readH=8, readGap=3;
      for(let i=0;i<readData.length;i++){
        const rd=readData[i];
        const rx=contigX+rd.start*contigW;
        const rw=rd.len*contigW;
        const ry=readTop+readRows[i]*(readH+readGap);
        ctx.beginPath();ctx.roundRect(rx,ry,rw,readH,3);
        ctx.fillStyle=_F.teal;ctx.globalAlpha=0.55;ctx.fill();ctx.globalAlpha=1;
        ctx.strokeStyle=_F.teal;ctx.lineWidth=0.6;ctx.stroke();
        // Small arrowhead to show read direction
        const aDir=R()>0.5?1:-1;
        const ax=aDir>0?rx+rw-2:rx+2;
        _arrowHead(ctx,ax,ry+readH/2,aDir>0?0:Math.PI,4,_F.teal);
      }

      ctx.font='bold 10px "DM Sans",sans-serif';ctx.fillStyle=_F.gray;ctx.textAlign='left';
      ctx.fillText('Mapped reads (pileup)',contigX,readTop-4);

      // Coverage depth profile below
      const profileTop=230,profileH=120;
      ctx.font='bold 10px "DM Sans",sans-serif';ctx.fillStyle=_F.gray;ctx.textAlign='left';
      ctx.fillText('Coverage depth profile',contigX,profileTop-6);

      // Compute approximate coverage per bin
      const nBins=20;
      const covBins=new Array(nBins).fill(0);
      for(const rd of readData){
        const s=Math.floor(rd.start*nBins);
        const e=Math.min(nBins-1,Math.floor((rd.start+rd.len)*nBins));
        for(let b=s;b<=e;b++) covBins[b]++;
      }
      const maxCov=Math.max(...covBins);

      // Draw area chart
      const binW=contigW/nBins;
      ctx.beginPath();
      ctx.moveTo(contigX,profileTop+profileH);
      for(let b=0;b<nBins;b++){
        const h=(covBins[b]/maxCov)*profileH*0.85;
        ctx.lineTo(contigX+b*binW,profileTop+profileH-h);
        ctx.lineTo(contigX+(b+1)*binW,profileTop+profileH-h);
      }
      ctx.lineTo(contigX+contigW,profileTop+profileH);
      ctx.closePath();
      ctx.fillStyle=_F.teal+'25';ctx.fill();
      ctx.strokeStyle=_F.teal;ctx.lineWidth=1.5;ctx.stroke();

      // Y-axis labels
      ctx.font='10px "DM Sans",sans-serif';ctx.fillStyle='#94a3b8';ctx.textAlign='right';
      ctx.fillText(maxCov+'x',contigX-5,profileTop+10);
      ctx.fillText('0x',contigX-5,profileTop+profileH+3);

      // Key insight
      ctx.beginPath();ctx.roundRect(130,380,540,40,8);
      ctx.fillStyle=_F.tealBg;ctx.fill();ctx.strokeStyle=_F.teal;ctx.lineWidth=1;ctx.stroke();
      ctx.font='bold 10px "DM Sans",sans-serif';ctx.fillStyle=_F.teal;ctx.textAlign='center';
      ctx.fillText('Coverage depth = how many reads map to each position',400,395);
      ctx.font='10px "DM Sans",sans-serif';ctx.fillStyle=_F.gray;
      ctx.fillText('Higher coverage \u2192 organism was more abundant in the sample',400,412);
    }

    // ---- Step 1: "Coverage covariance across samples" ----
    if(step===1){
      ctx.font='bold 14px "DM Sans",sans-serif';
      ctx.fillStyle=_F.grayTxt;ctx.textAlign='center';
      ctx.fillText('Coverage covariance across samples',400,22);

      const covData=[
        [80,60,75,55],  // Species A
        [30,90,40,85],  // Species B
        [50,50,45,48]   // Species C
      ];
      const chartW=200, chartH=110, chartGap=30;
      const startX=65, startY=50;

      for(let sp=0;sp<3;sp++){
        const cx=startX+sp*(chartW+chartGap);
        const cy=startY;
        ctx.beginPath();ctx.roundRect(cx,cy,chartW,chartH+35,8);
        ctx.fillStyle=spCols[sp]+'08';ctx.fill();
        ctx.strokeStyle=spCols[sp]+'40';ctx.lineWidth=1;ctx.stroke();
        ctx.font='bold 11px "DM Sans",sans-serif';
        ctx.fillStyle=spCols[sp];ctx.textAlign='center';
        ctx.fillText(spNames[sp],cx+chartW/2,cy+16);
        const barW=30, barGap=14, barStart=cx+22;
        for(let s=0;s<4;s++){
          const bx=barStart+s*(barW+barGap);
          const h=covData[sp][s]*0.9;
          ctx.beginPath();ctx.roundRect(bx,cy+chartH+20-h,barW,h,2);
          ctx.fillStyle=spCols[sp];ctx.globalAlpha=0.6;ctx.fill();ctx.globalAlpha=1;
          ctx.strokeStyle=spCols[sp];ctx.lineWidth=0.8;ctx.stroke();
          ctx.font='9px "DM Sans",sans-serif';ctx.fillStyle=_F.gray;ctx.textAlign='center';
          ctx.fillText('S'+(s+1),bx+barW/2,cy+chartH+33);
        }
      }

      ctx.font='10px "DM Sans",sans-serif';ctx.fillStyle=_F.gray;ctx.textAlign='center';
      ctx.fillText('Contigs from the same organism show the same abundance pattern across samples',400,210);
      ctx.font='bold 10px "DM Sans",sans-serif';ctx.fillStyle=_F.teal;
      ctx.fillText('A: high in S1, S3',180,228);
      ctx.fillStyle=_F.blue;
      ctx.fillText('B: high in S2, S4',400,228);
      ctx.fillStyle=_F.violet;
      ctx.fillText('C: uniform',620,228);

      ctx.beginPath();ctx.roundRect(160,250,480,35,8);
      ctx.fillStyle=_F.tealBg;ctx.fill();ctx.strokeStyle=_F.teal;ctx.lineWidth=1;ctx.stroke();
      ctx.font='bold 10px "DM Sans",sans-serif';ctx.fillStyle=_F.teal;ctx.textAlign='center';
      ctx.fillText('Same organism \u2192 same abundance pattern across samples',400,272);
    }

    // ---- Step 2: "What is tetranucleotide frequency (TNF)?" ----
    if(step===2){
      ctx.font='bold 14px "DM Sans",sans-serif';
      ctx.fillStyle=_F.grayTxt;ctx.textAlign='center';
      ctx.fillText('What is tetranucleotide frequency (TNF)?',400,22);

      // DNA sequence string
      const seq='ATCGATCGTAGCATCGGATCGTAACGATCGATCGATCAGTCGATCGATCGATCG';
      const seqX=80,seqY=60;
      ctx.font='bold 13px "Courier New",monospace';
      ctx.textAlign='left';

      // Draw sequence characters, highlight a sliding window of 4
      const windowStart=8; // highlight positions 8-11
      for(let i=0;i<50;i++){
        const cx=seqX+i*14;
        if(cx>750) break;
        const inWindow=(i>=windowStart&&i<windowStart+4);
        if(inWindow){
          ctx.beginPath();ctx.roundRect(cx-1,seqY-12,12,18,2);
          ctx.fillStyle=_F.amber+'30';ctx.fill();
          ctx.strokeStyle=_F.amber;ctx.lineWidth=1.5;ctx.stroke();
        }
        const baseCol={A:_F.teal,T:_F.blue,C:_F.violet,G:_F.amber};
        ctx.fillStyle=inWindow?_F.amber:(baseCol[seq[i]]||_F.gray);
        ctx.fillText(seq[i],cx,seqY);
      }

      // Arrow pointing to the window
      ctx.font='bold 10px "DM Sans",sans-serif';ctx.fillStyle=_F.amber;ctx.textAlign='center';
      const winCx=seqX+windowStart*14+28;
      ctx.fillText('4-mer window',winCx,seqY+28);
      ctx.beginPath();ctx.moveTo(winCx,seqY+18);ctx.lineTo(winCx,seqY+6);
      ctx.strokeStyle=_F.amber;ctx.lineWidth=1.2;ctx.stroke();

      // Explanation
      ctx.font='11px "DM Sans",sans-serif';ctx.fillStyle=_F.gray;ctx.textAlign='center';
      ctx.fillText('Slide a window of 4 bases along the sequence and count each 4-mer pattern',400,115);

      // Small bar chart showing representative 4-mer counts
      const kmers=['ATCG','TCGA','CGAT','GATC','TAGC','GCTA','CATG','AGTC','TGCA','GCAT'];
      const counts=[12,9,11,8,6,5,10,7,4,8];
      const maxC=Math.max(...counts);
      const chartX=100,chartY=145,chartW=600,barW=42,barGap=18,chartH=160;

      ctx.beginPath();ctx.roundRect(chartX-10,chartY-10,chartW+20,chartH+55,8);
      ctx.fillStyle='#f8fafc';ctx.fill();ctx.strokeStyle='#e2e8f0';ctx.lineWidth=1;ctx.stroke();

      ctx.font='bold 11px "DM Sans",sans-serif';ctx.fillStyle=_F.grayTxt;ctx.textAlign='center';
      ctx.fillText('Frequency of representative 4-mers',400,chartY+5);

      for(let i=0;i<kmers.length;i++){
        const bx=chartX+10+i*(barW+barGap);
        const h=(counts[i]/maxC)*chartH*0.7;
        ctx.beginPath();ctx.roundRect(bx,chartY+chartH-h+15,barW,h,2);
        ctx.fillStyle=_F.violet;ctx.globalAlpha=0.5;ctx.fill();ctx.globalAlpha=1;
        ctx.strokeStyle=_F.violet;ctx.lineWidth=0.8;ctx.stroke();
        // Count on top
        ctx.font='bold 10px "DM Sans",sans-serif';ctx.fillStyle=_F.violet;ctx.textAlign='center';
        ctx.fillText(counts[i],bx+barW/2,chartY+chartH-h+10);
        // Kmer label below
        ctx.font='bold 10px "Courier New",monospace';ctx.fillStyle=_F.gray;ctx.textAlign='center';
        ctx.fillText(kmers[i],bx+barW/2,chartY+chartH+28);
      }

      // Key insight
      ctx.beginPath();ctx.roundRect(120,375,560,48,8);
      ctx.fillStyle=_F.violetBg;ctx.fill();ctx.strokeStyle=_F.violet;ctx.lineWidth=1;ctx.stroke();
      ctx.font='bold 10px "DM Sans",sans-serif';ctx.fillStyle=_F.violet;ctx.textAlign='center';
      ctx.fillText('Every genome has a characteristic 4-mer pattern, like a fingerprint',400,392);
      ctx.font='10px "DM Sans",sans-serif';ctx.fillStyle=_F.gray;
      ctx.fillText('256 possible 4-mers total (4\u2074). The pattern is intrinsic to the genome.',400,410);
    }

    // ---- Step 3: "Each species has a distinct TNF pattern" ----
    if(step===3){
      ctx.font='bold 14px "DM Sans",sans-serif';
      ctx.fillStyle=_F.grayTxt;ctx.textAlign='center';
      ctx.fillText('Each species has a distinct TNF pattern',400,22);

      const sps=[
        {col:_F.teal,name:'Species A',seed:12},
        {col:_F.blue,name:'Species B',seed:34},
        {col:_F.violet,name:'Species C',seed:56}
      ];

      const panelW=220,panelH=120,panelGap=25;
      const startX=55;

      for(let s=0;s<3;s++){
        const px=startX+s*(panelW+panelGap);
        const py=50;
        const sR=binRng(sps[s].seed);

        // Panel background
        ctx.beginPath();ctx.roundRect(px,py,panelW,panelH,8);
        ctx.fillStyle=sps[s].col+'08';ctx.fill();
        ctx.strokeStyle=sps[s].col+'30';ctx.lineWidth=1;ctx.stroke();

        // Label
        ctx.font='bold 11px "DM Sans",sans-serif';
        ctx.fillStyle=sps[s].col;ctx.textAlign='center';
        ctx.fillText(sps[s].name,px+panelW/2,py+16);

        // 10 compact TNF bars
        const nBars=10,barW=14,barGap=6;
        const barStartX=px+(panelW-nBars*(barW+barGap)+barGap)/2;
        for(let j=0;j<nBars;j++){
          const bx=barStartX+j*(barW+barGap);
          const h=15+sR()*75;
          ctx.beginPath();ctx.roundRect(bx,py+panelH-h-5,barW,h,2);
          ctx.fillStyle=sps[s].col;ctx.globalAlpha=0.5;ctx.fill();ctx.globalAlpha=1;
          ctx.strokeStyle=sps[s].col;ctx.lineWidth=0.5;ctx.stroke();
        }
      }

      // Annotation arrows showing they differ
      ctx.font='10px "DM Sans",sans-serif';ctx.fillStyle=_F.gray;ctx.textAlign='center';
      ctx.fillText('Different species \u2192 different bar patterns',400,200);

      // Comparison highlight: bracket
      ctx.beginPath();ctx.roundRect(120,218,560,50,8);
      ctx.fillStyle='#f8fafc';ctx.fill();ctx.strokeStyle='#e2e8f0';ctx.lineWidth=1;ctx.stroke();
      ctx.font='bold 10px "DM Sans",sans-serif';ctx.fillStyle=_F.grayTxt;ctx.textAlign='center';
      ctx.fillText('Contigs from the same genome share similar TNF patterns',400,238);
      ctx.font='10px "DM Sans",sans-serif';ctx.fillStyle=_F.gray;
      ctx.fillText('Even short contigs (~2.5 kb) carry enough signal to detect the fingerprint',400,255);
    }

    // ---- Step 4: combined 2D scatter with ellipses ----
    if(step===4){
      ctx.font='bold 14px "DM Sans",sans-serif';
      ctx.fillStyle=_F.grayTxt;ctx.textAlign='center';
      ctx.fillText('Coverage + composition \u2192 3 distinct clusters',400,22);

      // Axes
      ctx.strokeStyle='#cbd5e1';ctx.lineWidth=1.5;
      ctx.beginPath();ctx.moveTo(100,380);ctx.lineTo(740,380);ctx.stroke();
      ctx.beginPath();ctx.moveTo(100,380);ctx.lineTo(100,50);ctx.stroke();
      ctx.font='11px "DM Sans",sans-serif';ctx.fillStyle=_F.gray;ctx.textAlign='center';
      ctx.fillText('Coverage signal (abundance)',420,408);
      ctx.save();ctx.translate(55,215);ctx.rotate(-Math.PI/2);
      ctx.fillText('Composition signal (TNF)',0,0);ctx.restore();

      // 3 clusters with better spacing
      const clusters=[
        {cx:240,cy:280,rx:60,ry:45,col:_F.teal,name:'Species A'},
        {cx:550,cy:130,rx:55,ry:40,col:_F.blue,name:'Species B'},
        {cx:480,cy:300,rx:50,ry:38,col:_F.violet,name:'Species C'}
      ];
      const R2=binRng(101);

      // Ellipses (background)
      for(const cl of clusters){
        ctx.beginPath();ctx.ellipse(cl.cx,cl.cy,cl.rx,cl.ry,0,0,Math.PI*2);
        ctx.fillStyle=cl.col;ctx.globalAlpha=0.08;ctx.fill();ctx.globalAlpha=1;
        ctx.strokeStyle=cl.col;ctx.lineWidth=1.5;ctx.setLineDash([4,3]);ctx.stroke();ctx.setLineDash([]);
      }
      // Points
      for(const cl of clusters){
        for(let i=0;i<18;i++){
          const px=cl.cx+(R2()-0.5)*cl.rx*1.5;
          const py=cl.cy+(R2()-0.5)*cl.ry*1.5;
          ctx.beginPath();ctx.arc(px,py,4.5,0,Math.PI*2);
          ctx.fillStyle=cl.col;ctx.globalAlpha=0.65;ctx.fill();ctx.globalAlpha=1;
          ctx.strokeStyle=cl.col;ctx.lineWidth=0.8;ctx.stroke();
        }
      }
      // Labels
      for(const cl of clusters){
        _badge(ctx,cl.cx,cl.cy-cl.ry-14,cl.name,cl.col+'18',cl.col,cl.col,10);
      }

      ctx.font='10px "DM Sans",sans-serif';ctx.fillStyle=_F.gray;ctx.textAlign='center';
      ctx.fillText('Both signals together resolve cases that either signal alone cannot',400,428);
    }
  }

  /* ═══════════════════════════════════════════════════════════════════════
     Slide 3: MetaBAT2 — classic distance-based binner (4 steps, 0-3)
     ═══════════════════════════════════════════════════════════════════════ */
  function drawMetabat2(step){
    const ctx=_asmCanvas('mb-canvas');if(!ctx)return;
    ctx.clearRect(-50,-50,900,540);

    // Spread-out cluster centers for all steps
    const centers=[{x:180,y:160},{x:520,y:110},{x:370,y:320},{x:660,y:240},{x:200,y:340}];

    // ---- Step 0: gray dots in 2D space, no structure ----
    if(step===0){
      ctx.font='bold 14px "DM Sans",sans-serif';
      ctx.fillStyle=_F.grayTxt;ctx.textAlign='center';
      ctx.fillText('Each contig is a point in signal space',400,22);

      ctx.strokeStyle='#cbd5e1';ctx.lineWidth=1.2;
      ctx.beginPath();ctx.moveTo(70,390);ctx.lineTo(750,390);ctx.stroke();
      ctx.beginPath();ctx.moveTo(70,390);ctx.lineTo(70,40);ctx.stroke();
      ctx.font='10px "DM Sans",sans-serif';ctx.fillStyle=_F.gray;ctx.textAlign='center';
      ctx.fillText('TNF + coverage features',410,408);

      const R=binRng(88);
      for(const cn of centers){
        for(let p=0;p<10;p++){
          const px=cn.x+(R()-0.5)*90;
          const py=cn.y+(R()-0.5)*70;
          ctx.beginPath();ctx.arc(px,py,4.5,0,Math.PI*2);
          ctx.fillStyle='#cbd5e1';ctx.fill();
          ctx.strokeStyle='#94a3b8';ctx.lineWidth=0.5;ctx.stroke();
        }
      }

      ctx.font='10px "DM Sans",sans-serif';ctx.fillStyle=_F.gray;ctx.textAlign='center';
      ctx.fillText('50 contigs plotted by their TNF and coverage profiles. Structure is hidden',400,430);
    }

    // ---- Step 1: distance lines within each cluster only ----
    if(step===1){
      ctx.font='bold 14px "DM Sans",sans-serif';
      ctx.fillStyle=_F.grayTxt;ctx.textAlign='center';
      ctx.fillText('Measuring pairwise distances between contigs',400,22);

      ctx.strokeStyle='#cbd5e1';ctx.lineWidth=1.2;
      ctx.beginPath();ctx.moveTo(70,400);ctx.lineTo(750,400);ctx.stroke();
      ctx.beginPath();ctx.moveTo(70,400);ctx.lineTo(70,40);ctx.stroke();

      const R=binRng(88);
      // Generate points per cluster so we can draw intra-cluster lines only
      const clusterPts=[];
      for(let c=0;c<5;c++){
        const pts=[];
        for(let p=0;p<10;p++){
          pts.push({x:centers[c].x+(R()-0.5)*90,y:centers[c].y+(R()-0.5)*70});
        }
        clusterPts.push(pts);
      }

      // Draw intra-cluster distance lines only (much cleaner)
      ctx.strokeStyle=_F.amber;ctx.globalAlpha=0.12;ctx.lineWidth=0.6;
      for(const pts of clusterPts){
        // Only draw a subset of lines within each cluster (closest 3 per point)
        for(let i=0;i<pts.length;i++){
          const dists=[];
          for(let j=0;j<pts.length;j++){
            if(i===j) continue;
            const dx=pts[i].x-pts[j].x,dy=pts[i].y-pts[j].y;
            dists.push({j,d:Math.sqrt(dx*dx+dy*dy)});
          }
          dists.sort((a,b)=>a.d-b.d);
          for(let k=0;k<Math.min(2,dists.length);k++){
            const j=dists[k].j;
            if(j>i){ // avoid drawing twice
              ctx.beginPath();ctx.moveTo(pts[i].x,pts[i].y);ctx.lineTo(pts[j].x,pts[j].y);ctx.stroke();
            }
          }
        }
      }
      ctx.globalAlpha=1;

      // All dots on top
      for(const pts of clusterPts){
        for(const pt of pts){
          ctx.beginPath();ctx.arc(pt.x,pt.y,4.5,0,Math.PI*2);
          ctx.fillStyle='#cbd5e1';ctx.fill();
          ctx.strokeStyle='#94a3b8';ctx.lineWidth=0.5;ctx.stroke();
        }
      }

      // Callout on first cluster
      ctx.strokeStyle=_F.amber;ctx.lineWidth=2;ctx.setLineDash([3,3]);
      ctx.beginPath();ctx.arc(centers[0].x,centers[0].y,55,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
      _badge(ctx,centers[0].x,centers[0].y-80,'Nearby = likely same species',_F.amberBg,_F.amber,_F.amber,9);

      ctx.font='10px "DM Sans",sans-serif';ctx.fillStyle=_F.gray;ctx.textAlign='center';
      ctx.fillText('MetaBAT2 combines TNF distance + coverage distance (adaptive weighting)',400,425);
    }

    // ---- Step 2: clusters emerge, colored ----
    if(step===2){
      ctx.font='bold 14px "DM Sans",sans-serif';
      ctx.fillStyle=_F.grayTxt;ctx.textAlign='center';
      ctx.fillText('Clusters emerge from the distance matrix',400,22);

      ctx.strokeStyle='#cbd5e1';ctx.lineWidth=1.2;
      ctx.beginPath();ctx.moveTo(70,400);ctx.lineTo(750,400);ctx.stroke();
      ctx.beginPath();ctx.moveTo(70,400);ctx.lineTo(70,40);ctx.stroke();

      const R=binRng(88);
      const binCols=[_F.teal,_F.blue,_F.violet,'#16a34a',_F.amber];
      const binNames=['Bin 1','Bin 2','Bin 3','Bin 4','Bin 5'];

      for(let b=0;b<5;b++){
        const pts=[];
        for(let p=0;p<10;p++){
          pts.push({x:centers[b].x+(R()-0.5)*90,y:centers[b].y+(R()-0.5)*70});
        }
        ctx.beginPath();ctx.ellipse(centers[b].x,centers[b].y,55,42,0,0,Math.PI*2);
        ctx.fillStyle=binCols[b]+'10';ctx.fill();
        ctx.strokeStyle=binCols[b];ctx.lineWidth=1.5;ctx.setLineDash([4,3]);ctx.stroke();ctx.setLineDash([]);
        for(const pt of pts){
          ctx.beginPath();ctx.arc(pt.x,pt.y,4.5,0,Math.PI*2);
          ctx.fillStyle=binCols[b];ctx.globalAlpha=0.65;ctx.fill();ctx.globalAlpha=1;
          ctx.strokeStyle=binCols[b];ctx.lineWidth=0.8;ctx.stroke();
        }
        _badge(ctx,centers[b].x,centers[b].y-50,binNames[b],binCols[b]+'18',binCols[b],binCols[b],9);
      }

      ctx.font='10px "DM Sans",sans-serif';ctx.fillStyle=_F.gray;ctx.textAlign='center';
      ctx.fillText('k-medoids clustering groups contigs into bins, no need to specify k',400,428);
    }

    // ---- Step 3: simplified output bins + unbinned + note ----
    if(step===3){
      ctx.font='bold 14px "DM Sans",sans-serif';
      ctx.fillStyle=_F.grayTxt;ctx.textAlign='center';
      ctx.fillText('Output: MAG bins + unbinned contigs',400,22);

      const binCols=[_F.teal,_F.blue,_F.violet,'#16a34a',_F.amber];

      // 5 MAG boxes in a row
      const boxW=130,boxH=110,boxGap=12,startX=35,startY=50;
      for(let b=0;b<5;b++){
        const bx=startX+b*(boxW+boxGap);
        ctx.beginPath();ctx.roundRect(bx,startY,boxW,boxH,10);
        ctx.fillStyle=binCols[b]+'12';ctx.fill();
        ctx.strokeStyle=binCols[b];ctx.lineWidth=2;ctx.stroke();
        ctx.font='bold 11px "DM Sans",sans-serif';ctx.fillStyle=binCols[b];ctx.textAlign='center';
        ctx.fillText('MAG '+(b+1),bx+boxW/2,startY+20);

        // Mini contig bars inside
        const cR=binRng(b*13+5);
        for(let j=0;j<5;j++){
          const cw=25+cR()*70;
          const clamped=Math.min(cw,boxW-20);
          ctx.beginPath();ctx.roundRect(bx+10,startY+30+j*15,clamped,8,2);
          ctx.fillStyle=binCols[b];ctx.globalAlpha=0.5;ctx.fill();ctx.globalAlpha=1;
        }
      }

      // Unbinned contigs row
      ctx.font='bold 11px "DM Sans",sans-serif';ctx.fillStyle=_F.gray;ctx.textAlign='left';
      ctx.fillText('Unbinned:',60,200);
      const uR=binRng(999);
      for(let i=0;i<8;i++){
        const ux=140+i*75, uy=190+uR()*12;
        const uw=25+uR()*35;
        ctx.beginPath();ctx.roundRect(ux,uy,uw,8,2);
        ctx.fillStyle='#e2e8f0';ctx.fill();ctx.strokeStyle='#cbd5e1';ctx.lineWidth=0.8;ctx.stroke();
      }
      ctx.font='9px "DM Sans",sans-serif';ctx.fillStyle='#94a3b8';ctx.textAlign='left';
      ctx.fillText('(short contigs, ambiguous signal)',140,222);

      // "More samples = better" note box
      ctx.beginPath();ctx.roundRect(100,248,600,65,10);
      ctx.fillStyle=_F.amberBg;ctx.fill();ctx.strokeStyle=_F.amber;ctx.lineWidth=1;ctx.stroke();
      ctx.font='bold 11px "DM Sans",sans-serif';ctx.fillStyle=_F.amber;ctx.textAlign='center';
      ctx.fillText('More samples \u2192 better separation',400,270);
      ctx.font='10px "DM Sans",sans-serif';ctx.fillStyle=_F.gray;
      ctx.fillText('Each additional sample provides another dimension for the coverage signal',400,290);
      ctx.fillText('MetaBAT2 benefits from \u22653 samples mapped to the same assembly (more coverage signal)',400,305);
    }
  }

  /* ═══════════════════════════════════════════════════════════════════════
     Slide 4: NEXT-GEN BINNERS — classic vs deep learning (3 steps, 0-2)
     ═══════════════════════════════════════════════════════════════════════ */
  function drawNextGen(step){
    const ctx=_asmCanvas('ng-canvas');if(!ctx)return;
    ctx.clearRect(-50,-50,900,540);

    // Helper: draw a pipeline box
    function _pipeBox(x,y,w,h,label,col,dashed){
      ctx.beginPath();ctx.roundRect(x,y,w,h,8);
      ctx.fillStyle=col+'15';ctx.fill();
      if(dashed) ctx.setLineDash([4,3]);
      ctx.strokeStyle=col;ctx.lineWidth=1.8;ctx.stroke();
      ctx.setLineDash([]);
      ctx.font='bold 10px "DM Sans",sans-serif';ctx.fillStyle=col;ctx.textAlign='center';
      const lines=label.split('\n');
      for(let l=0;l<lines.length;l++){
        ctx.fillText(lines[l],x+w/2,y+h/2-((lines.length-1)*6)+l*13);
      }
    }

    // Helper: mini scatter plot with bigger dots
    function _miniScatter(cx,cy,w,h,tight,colored){
      ctx.beginPath();ctx.roundRect(cx-w/2,cy-h/2,w,h,6);
      ctx.fillStyle='#f8fafc';ctx.fill();ctx.strokeStyle='#e2e8f0';ctx.lineWidth=0.8;ctx.stroke();
      const R=binRng(cx+cy+(tight?100:0));
      const cCols=colored?[_F.teal,_F.blue,_F.violet]:['#cbd5e1','#cbd5e1','#cbd5e1'];
      const spread=tight?0.6:1.4;
      const offs=[{dx:-25,dy:-15},{dx:20,dy:-20},{dx:5,dy:22}];
      for(let c=0;c<3;c++){
        if(colored&&tight){
          ctx.beginPath();ctx.ellipse(cx+offs[c].dx,cy+offs[c].dy,22,16,0,0,Math.PI*2);
          ctx.fillStyle=cCols[c];ctx.globalAlpha=0.08;ctx.fill();ctx.globalAlpha=1;
          ctx.strokeStyle=cCols[c];ctx.lineWidth=1;ctx.setLineDash([3,2]);ctx.stroke();ctx.setLineDash([]);
        }
        for(let p=0;p<8;p++){
          const px=cx+offs[c].dx+(R()-0.5)*35*spread;
          const py=cy+offs[c].dy+(R()-0.5)*28*spread;
          ctx.beginPath();ctx.arc(px,py,3.5,0,Math.PI*2);
          ctx.fillStyle=cCols[c];ctx.globalAlpha=0.7;ctx.fill();ctx.globalAlpha=1;
          ctx.strokeStyle=cCols[c];ctx.lineWidth=0.6;ctx.stroke();
        }
      }
    }

    // ---- Step 0: Classic approach ----
    if(step===0){
      ctx.font='bold 14px "DM Sans",sans-serif';ctx.fillStyle=_F.grayTxt;ctx.textAlign='center';
      ctx.fillText('Classic approach: hand-crafted distance formula',400,22);

      _pipeBox(40,55,130,55,'TNF +\nCoverage',_F.gray,false);
      _arrLine(ctx,175,82,210,82,_F.gray,1.5);
      _pipeBox(215,50,170,65,'Hand-crafted\ndistance formula',_F.amber,false);
      _arrLine(ctx,390,82,420,82,_F.amber,1.5);
      _pipeBox(425,55,120,55,'Clustering',_F.violet,false);
      _arrLine(ctx,550,82,580,82,_F.violet,1.5);
      _pipeBox(585,55,130,55,'MAG\nbins',_F.green,false);

      ctx.beginPath();ctx.roundRect(140,135,520,40,8);
      ctx.fillStyle=_F.amberBg;ctx.fill();ctx.strokeStyle=_F.amber;ctx.lineWidth=1;ctx.stroke();
      ctx.font='10px "DM Sans",sans-serif';ctx.fillStyle=_F.amber;ctx.textAlign='center';
      ctx.fillText('Human experts decide HOW to combine TNF and coverage',400,150);
      ctx.fillText('(e.g. MetaBAT2: weighted Euclidean with adaptive weights)',400,164);

      ctx.font='bold 11px "DM Sans",sans-serif';ctx.fillStyle=_F.gray;ctx.textAlign='center';
      ctx.fillText('Result: loosely separated clusters',400,205);
      _miniScatter(400,310,280,180,false,false);

      ctx.font='10px "DM Sans",sans-serif';ctx.fillStyle=_F.gray;ctx.textAlign='center';
      ctx.fillText('Works well but the distance metric is fixed; it cannot adapt to data complexity',400,428);
    }

    // ---- Step 1: Deep learning approach ----
    if(step===1){
      ctx.font='bold 14px "DM Sans",sans-serif';ctx.fillStyle=_F.grayTxt;ctx.textAlign='center';
      ctx.fillText('Deep learning approach: the network LEARNS what to measure',400,22);

      _pipeBox(15,50,110,55,'TNF +\nCoverage',_F.gray,false);
      _arrLine(ctx,130,77,155,77,_F.gray,1.5);
      _pipeBox(160,42,145,70,'Neural\nnetwork',_F.violet,false);
      _arrLine(ctx,310,77,335,77,_F.violet,1.5);
      _pipeBox(340,50,120,55,'Learned\nspace',_F.blue,false);
      _arrLine(ctx,465,77,490,77,_F.blue,1.5);
      _pipeBox(495,50,110,55,'Clustering',_F.teal,false);
      _arrLine(ctx,610,77,635,77,_F.teal,1.5);
      _pipeBox(640,50,110,55,'MAG\nbins',_F.green,false);

      ctx.beginPath();ctx.roundRect(160,42,145,70,8);
      ctx.strokeStyle=_F.violet;ctx.lineWidth=3;ctx.stroke();

      ctx.beginPath();ctx.roundRect(100,130,600,45,8);
      ctx.fillStyle=_F.violetBg;ctx.fill();ctx.strokeStyle=_F.violet;ctx.lineWidth=1;ctx.stroke();
      ctx.font='bold 10px "DM Sans",sans-serif';ctx.fillStyle=_F.violet;ctx.textAlign='center';
      ctx.fillText('The network learns which features matter for grouping contigs',400,148);
      ctx.font='10px "DM Sans",sans-serif';ctx.fillStyle=_F.gray;
      ctx.fillText('It discovers a new representation space where similar contigs are close together',400,163);

      ctx.font='bold 11px "DM Sans",sans-serif';ctx.fillStyle=_F.violet;ctx.textAlign='center';
      ctx.fillText('Result: tightly separated clusters in learned space',400,200);
      _miniScatter(400,305,280,180,true,true);

      ctx.font='10px "DM Sans",sans-serif';ctx.fillStyle=_F.gray;ctx.textAlign='center';
      ctx.fillText('The learned space adapts to each dataset \u2192 better separation than hand-crafted formulas',400,428);
    }

    // ---- Step 2: Evolution timeline ----
    if(step===2){
      ctx.font='bold 14px "DM Sans",sans-serif';ctx.fillStyle=_F.grayTxt;ctx.textAlign='center';
      ctx.fillText('The evolving landscape of metagenomic binners',400,22);

      // Early binning context: faint pre-history region
      const tlY=95;
      ctx.beginPath();ctx.roundRect(28,tlY-30,115,60,8);
      ctx.fillStyle='#f1f5f9';ctx.fill();ctx.strokeStyle='#e2e8f0';ctx.lineWidth=1;ctx.stroke();
      ctx.font='9px "DM Sans",sans-serif';ctx.fillStyle='#94a3b8';ctx.textAlign='center';
      ctx.fillText('~2004\u20132010',85,tlY-12);
      ctx.fillText('Manual GC-cov plots',85,tlY+2);
      ctx.fillText('(visual binning)',85,tlY+14);

      // Main timeline line
      ctx.strokeStyle='#e2e8f0';ctx.lineWidth=3;
      ctx.beginPath();ctx.moveTo(145,tlY);ctx.lineTo(755,tlY);ctx.stroke();
      _arrowHead(ctx,755,tlY,0,10,'#cbd5e1');

      const tools=[
        {x:195,y:tlY,label:'CONCOCT',year:'2014',col:'#64748b',desc:'First modern binner\ncov + comp combined'},
        {x:340,y:tlY,label:'MetaBAT2',year:'2019',col:_F.amber,desc:'Adaptive distance\nweighting'},
        {x:480,y:tlY,label:'VAMB',year:'2021',col:_F.violet,desc:'Variational\nautoencoder'},
        {x:610,y:tlY,label:'SemiBin',year:'2022',col:_F.blue,desc:'Self-supervised +\ntransfer learning'},
        {x:725,y:tlY,label:'COMEBin',year:'2024',col:_F.teal,desc:'Contrastive +\naugmentation'}
      ];

      for(const t of tools){
        ctx.beginPath();ctx.arc(t.x,t.y,7,0,Math.PI*2);
        ctx.fillStyle=t.col;ctx.fill();
        ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.stroke();
        ctx.font='bold 9px "DM Sans",sans-serif';ctx.fillStyle=t.col;ctx.textAlign='center';
        ctx.fillText(t.year,t.x,t.y-18);
        _pill(ctx,t.x-48,t.y+16,96,24,t.col+'18',t.col,1.5);
        ctx.font='bold 9px "DM Sans",sans-serif';ctx.fillStyle=t.col;ctx.textAlign='center';
        ctx.fillText(t.label,t.x,t.y+32);
        ctx.font='10px "DM Sans",sans-serif';ctx.fillStyle=_F.gray;ctx.textAlign='center';
        const dLines=t.desc.split('\n');
        for(let l=0;l<dLines.length;l++){
          ctx.fillText(dLines[l],t.x,t.y+50+l*11);
        }
      }

      // Era annotations
      const eraY=178;
      ctx.beginPath();ctx.roundRect(155,eraY,220,22,4);
      ctx.fillStyle=_F.amber+'12';ctx.fill();ctx.strokeStyle=_F.amber+'40';ctx.lineWidth=1;ctx.stroke();
      ctx.font='bold 10px "DM Sans",sans-serif';ctx.fillStyle=_F.amber;ctx.textAlign='center';
      ctx.fillText('HAND-CRAFTED DISTANCES',265,eraY+14);

      ctx.beginPath();ctx.roundRect(420,eraY,340,22,4);
      ctx.fillStyle=_F.violet+'12';ctx.fill();ctx.strokeStyle=_F.violet+'40';ctx.lineWidth=1;ctx.stroke();
      ctx.font='bold 10px "DM Sans",sans-serif';ctx.fillStyle=_F.violet;ctx.textAlign='center';
      ctx.fillText('DEEP LEARNING ERA',590,eraY+14);

      // Progress arrow
      const arrY=218;
      ctx.strokeStyle=_F.green;ctx.lineWidth=2;
      ctx.beginPath();ctx.moveTo(195,arrY);ctx.lineTo(725,arrY);ctx.stroke();
      _arrowHead(ctx,725,arrY,0,8,_F.green);
      ctx.font='bold 9px "DM Sans",sans-serif';ctx.fillStyle=_F.green;ctx.textAlign='center';
      ctx.fillText('Better separation, fewer parameters to tune',460,arrY-8);

      // Comparison: mini scatter plots with bigger dots
      const scatterY=320;
      const scatters=[
        {x:140,label:'CONCOCT',tight:false,colored:false},
        {x:320,label:'MetaBAT2',tight:false,colored:false},
        {x:510,label:'VAMB/SemiBin',tight:true,colored:true},
        {x:680,label:'COMEBin',tight:true,colored:true}
      ];
      for(const sc of scatters){
        ctx.font='bold 10px "DM Sans",sans-serif';ctx.fillStyle=_F.grayTxt;ctx.textAlign='center';
        ctx.fillText(sc.label,sc.x,scatterY-52);
        _miniScatter(sc.x,scatterY,125,85,sc.tight,sc.colored);
      }
      _arrLine(ctx,215,scatterY,265,scatterY,_F.gray,1.2);
      _arrLine(ctx,395,scatterY,450,scatterY,_F.gray,1.2);
      _arrLine(ctx,585,scatterY,625,scatterY,_F.gray,1.2);

      ctx.beginPath();ctx.roundRect(100,378,600,45,8);
      ctx.fillStyle='#f8fafc';ctx.fill();ctx.strokeStyle='#e2e8f0';ctx.lineWidth=1;ctx.stroke();
      ctx.font='bold 10px "DM Sans",sans-serif';ctx.fillStyle=_F.grayTxt;ctx.textAlign='center';
      ctx.fillText('Binning is barely a decade old. The field is evolving fast',400,396);
      ctx.font='9px "DM Sans",sans-serif';ctx.fillStyle=_F.gray;
      ctx.fillText('Choose based on your data: single-sample vs multi-sample, available compute, community benchmarks',400,412);
    }
  }

  /* ═══════════════════════════════════════════════════════════════════════
     Slide 5: QUALITY + MIMAG — marker genes and quality tiers (4 steps, 0-3)
     ═══════════════════════════════════════════════════════════════════════ */
  function drawQualityMimag(step){
    const ctx=_asmCanvas('qm-canvas');if(!ctx)return;
    ctx.clearRect(-50,-50,900,540);

    // Marker gene colors for the 10-slot illustration
    const mCols=[_F.teal,_F.blue,_F.violet,_F.amber,_F.green,
                 _F.teal,_F.blue,_F.violet,_F.amber,_F.green];
    const mLabels=['rpoB','gyrA','recA','infB','rpsC','secY','tsf','pgk','pyrG','nusA'];

    // ---- Step 0: genome bar with 10 marker gene slots ----
    if(step===0){
      ctx.font='bold 14px "DM Sans",sans-serif';
      ctx.fillStyle=_F.grayTxt;ctx.textAlign='center';
      ctx.fillText('Every genome has ~100 single-copy marker genes',400,25);

      ctx.font='11px "DM Sans",sans-serif';ctx.fillStyle=_F.gray;ctx.textAlign='center';
      ctx.fillText('These genes are essential, conserved across bacteria and archaea, and typically occur once per genome',400,48);

      const barX=80,barY=90,barW=640,barH=40;
      ctx.beginPath();ctx.roundRect(barX,barY,barW,barH,8);
      ctx.fillStyle='#e2e8f0';ctx.fill();ctx.strokeStyle='#cbd5e1';ctx.lineWidth=1.5;ctx.stroke();
      ctx.font='bold 11px "DM Sans",sans-serif';ctx.fillStyle=_F.gray;ctx.textAlign='left';
      ctx.fillText('Complete genome',barX,barY-8);

      const slotW=48, slotH=28, slotGap=(barW-20-10*slotW)/9;
      for(let m=0;m<10;m++){
        const sx=barX+10+m*(slotW+slotGap);
        const sy=barY+6;
        ctx.beginPath();ctx.roundRect(sx,sy,slotW,slotH,4);
        ctx.fillStyle=mCols[m];ctx.globalAlpha=0.65;ctx.fill();ctx.globalAlpha=1;
        ctx.strokeStyle=mCols[m];ctx.lineWidth=1;ctx.stroke();
        ctx.font='bold 9px "DM Sans",sans-serif';ctx.fillStyle='#fff';ctx.textAlign='center';
        ctx.fillText(mLabels[m],sx+slotW/2,sy+slotH/2+3);
      }

      ctx.font='10px "DM Sans",sans-serif';ctx.fillStyle=_F.gray;ctx.textAlign='center';
      ctx.fillText('10 of ~100 markers shown. Each should appear exactly once in a complete genome.',400,155);

      ctx.beginPath();ctx.roundRect(200,180,400,210,10);
      ctx.fillStyle='#f8fafc';ctx.fill();ctx.strokeStyle='#e2e8f0';ctx.lineWidth=1;ctx.stroke();
      ctx.font='bold 11px "DM Sans",sans-serif';ctx.fillStyle=_F.grayTxt;ctx.textAlign='center';
      ctx.fillText('Marker gene checklist',400,200);

      for(let m=0;m<10;m++){
        const row=m%5, col=Math.floor(m/5);
        const rx=230+col*200, ry=215+row*33;
        ctx.font='bold 14px "DM Sans",sans-serif';ctx.fillStyle=_F.green;ctx.textAlign='center';
        ctx.fillText('\u2713',rx,ry+12);
        ctx.font='10px "DM Sans",sans-serif';ctx.fillStyle=mCols[m];ctx.textAlign='left';
        ctx.fillText(mLabels[m]+': found once',rx+14,ry+12);
      }

      ctx.font='bold 10px "DM Sans",sans-serif';ctx.fillStyle=_F.green;ctx.textAlign='center';
      ctx.fillText('10/10 found, 0 duplicates \u2192 100% complete, 0% contaminated',400,405);
    }

    // ---- Step 1: Completeness — 8 out of 10 found ----
    if(step===1){
      ctx.font='bold 14px "DM Sans",sans-serif';
      ctx.fillStyle=_F.grayTxt;ctx.textAlign='center';
      ctx.fillText('Completeness: what fraction of markers are present?',400,25);

      const barX=80,barY=80,barW=640,barH=40;
      ctx.beginPath();ctx.roundRect(barX,barY,barW,barH,8);
      ctx.fillStyle='#e2e8f0';ctx.fill();ctx.strokeStyle='#cbd5e1';ctx.lineWidth=1.5;ctx.stroke();
      ctx.font='bold 11px "DM Sans",sans-serif';ctx.fillStyle=_F.gray;ctx.textAlign='left';
      ctx.fillText('Your MAG bin',barX,barY-8);

      const missing=[3,7];
      const slotW=48, slotH=28, slotGap=(barW-20-10*slotW)/9;
      for(let m=0;m<10;m++){
        const sx=barX+10+m*(slotW+slotGap);
        const sy=barY+6;
        if(missing.includes(m)){
          ctx.beginPath();ctx.roundRect(sx,sy,slotW,slotH,4);
          ctx.fillStyle='#fff';ctx.fill();
          ctx.strokeStyle='#cbd5e1';ctx.lineWidth=1;ctx.setLineDash([3,2]);ctx.stroke();ctx.setLineDash([]);
          ctx.font='bold 10px "DM Sans",sans-serif';ctx.fillStyle='#cbd5e1';ctx.textAlign='center';
          ctx.fillText('?',sx+slotW/2,sy+slotH/2+4);
        } else {
          ctx.beginPath();ctx.roundRect(sx,sy,slotW,slotH,4);
          ctx.fillStyle=mCols[m];ctx.globalAlpha=0.65;ctx.fill();ctx.globalAlpha=1;
          ctx.strokeStyle=mCols[m];ctx.lineWidth=1;ctx.stroke();
          ctx.font='bold 9px "DM Sans",sans-serif';ctx.fillStyle='#fff';ctx.textAlign='center';
          ctx.fillText(mLabels[m],sx+slotW/2,sy+slotH/2+3);
        }
      }

      for(const mi of missing){
        const sx=barX+10+mi*(slotW+slotGap)+slotW/2;
        ctx.beginPath();ctx.moveTo(sx,barY+barH+5);ctx.lineTo(sx,barY+barH+25);
        ctx.strokeStyle=_F.red;ctx.lineWidth=1.5;ctx.stroke();
        ctx.font='bold 9px "DM Sans",sans-serif';ctx.fillStyle=_F.red;ctx.textAlign='center';
        ctx.fillText('missing',sx,barY+barH+38);
      }

      ctx.beginPath();ctx.roundRect(200,180,400,70,10);
      ctx.fillStyle=_F.tealBg;ctx.fill();ctx.strokeStyle=_F.teal;ctx.lineWidth=1.5;ctx.stroke();
      ctx.font='bold 16px "DM Sans",sans-serif';ctx.fillStyle=_F.teal;ctx.textAlign='center';
      ctx.fillText('Completeness = 8/10 = 80%',400,210);
      ctx.font='11px "DM Sans",sans-serif';ctx.fillStyle=_F.gray;
      ctx.fillText('Fraction of expected marker genes that are present in the bin',400,236);

      const pbX=150,pbY=280,pbW=500,pbH=30;
      ctx.beginPath();ctx.roundRect(pbX,pbY,pbW,pbH,5);
      ctx.fillStyle='#e2e8f0';ctx.fill();
      ctx.beginPath();ctx.roundRect(pbX,pbY,pbW*0.8,pbH,5);
      ctx.fillStyle=_F.teal;ctx.globalAlpha=0.5;ctx.fill();ctx.globalAlpha=1;
      ctx.font='bold 11px "DM Sans",sans-serif';ctx.fillStyle='#fff';ctx.textAlign='center';
      ctx.fillText('80% complete',pbX+pbW*0.4,pbY+pbH/2+4);

      ctx.font='10px "DM Sans",sans-serif';ctx.fillStyle=_F.gray;ctx.textAlign='center';
      ctx.fillText('Higher completeness = more of the organism\'s genome was recovered',400,340);
      ctx.fillText('A MAG with <50% completeness is barely useful for analysis',400,358);
    }

    // ---- Step 2: Contamination — duplicated markers ----
    if(step===2){
      ctx.font='bold 14px "DM Sans",sans-serif';
      ctx.fillStyle=_F.grayTxt;ctx.textAlign='center';
      ctx.fillText('Contamination: are there duplicate markers?',400,20);

      // Genome bar — pushed down to make room for duplicate boxes above
      const barX=80,barY=115,barW=640,barH=40;
      ctx.font='bold 11px "DM Sans",sans-serif';ctx.fillStyle=_F.gray;ctx.textAlign='left';
      ctx.fillText('Your MAG bin',barX,barY-8);

      ctx.beginPath();ctx.roundRect(barX,barY,barW,barH,8);
      ctx.fillStyle='#e2e8f0';ctx.fill();ctx.strokeStyle='#cbd5e1';ctx.lineWidth=1.5;ctx.stroke();

      const slotW=48, slotH=28, slotGap=(barW-20-10*slotW)/9;
      for(let m=0;m<10;m++){
        const sx=barX+10+m*(slotW+slotGap);
        const sy=barY+6;
        ctx.beginPath();ctx.roundRect(sx,sy,slotW,slotH,4);
        ctx.fillStyle=mCols[m];ctx.globalAlpha=0.65;ctx.fill();ctx.globalAlpha=1;
        ctx.strokeStyle=mCols[m];ctx.lineWidth=1;ctx.stroke();
        ctx.font='bold 9px "DM Sans",sans-serif';ctx.fillStyle='#fff';ctx.textAlign='center';
        ctx.fillText(mLabels[m],sx+slotW/2,sy+slotH/2+3);
      }

      // 2 EXTRA duplicated markers above genome bar
      const dupes=[1,5];
      for(const di of dupes){
        const sx=barX+10+di*(slotW+slotGap);
        const sy=barY-38;
        ctx.beginPath();ctx.roundRect(sx,sy,slotW,slotH,4);
        ctx.fillStyle=_F.red;ctx.globalAlpha=0.6;ctx.fill();ctx.globalAlpha=1;
        ctx.strokeStyle=_F.red;ctx.lineWidth=2;ctx.stroke();
        ctx.font='bold 9px "DM Sans",sans-serif';ctx.fillStyle='#fff';ctx.textAlign='center';
        ctx.fillText(mLabels[di],sx+slotW/2,sy+slotH/2+3);
        ctx.font='bold 10px "DM Sans",sans-serif';ctx.fillStyle=_F.red;ctx.textAlign='center';
        ctx.fillText('DUPLICATE',sx+slotW/2,sy-7);
        ctx.beginPath();ctx.moveTo(sx+slotW/2,sy+slotH);ctx.lineTo(sx+slotW/2,barY+6);
        ctx.strokeStyle=_F.red;ctx.lineWidth=1;ctx.setLineDash([2,2]);ctx.stroke();ctx.setLineDash([]);
      }

      // Calculation box
      ctx.beginPath();ctx.roundRect(180,178,440,54,10);
      ctx.fillStyle=_F.red+'12';ctx.fill();ctx.strokeStyle=_F.red;ctx.lineWidth=1.5;ctx.stroke();
      ctx.font='bold 15px "DM Sans",sans-serif';ctx.fillStyle=_F.red;ctx.textAlign='center';
      ctx.fillText('Contamination = 2/10 = 20%',400,202);
      ctx.font='10px "DM Sans",sans-serif';ctx.fillStyle=_F.gray;
      ctx.fillText('Fraction of markers that appear more than once (from foreign DNA)',400,222);

      // Visual explanation
      ctx.beginPath();ctx.roundRect(100,248,600,110,10);
      ctx.fillStyle='#f8fafc';ctx.fill();ctx.strokeStyle='#e2e8f0';ctx.lineWidth=1;ctx.stroke();
      ctx.font='bold 11px "DM Sans",sans-serif';ctx.fillStyle=_F.grayTxt;ctx.textAlign='center';
      ctx.fillText('Why does contamination happen?',400,266);

      ctx.beginPath();ctx.roundRect(130,276,200,62,8);
      ctx.fillStyle=_F.tealBg;ctx.fill();ctx.strokeStyle=_F.teal;ctx.lineWidth=1;ctx.stroke();
      ctx.font='bold 10px "DM Sans",sans-serif';ctx.fillStyle=_F.teal;ctx.textAlign='center';
      ctx.fillText('Organism A contigs',230,292);
      ctx.font='9px "DM Sans",sans-serif';ctx.fillStyle=_F.gray;
      ctx.fillText('(correct)',230,306);
      ctx.fillText('gyrA, secY, ...',230,320);

      ctx.font='bold 14px "DM Sans",sans-serif';ctx.fillStyle=_F.gray;ctx.textAlign='center';
      ctx.fillText('+',400,308);

      ctx.beginPath();ctx.roundRect(470,276,200,62,8);
      ctx.fillStyle=_F.red+'10';ctx.fill();ctx.strokeStyle=_F.red;ctx.lineWidth=1;ctx.stroke();
      ctx.font='bold 10px "DM Sans",sans-serif';ctx.fillStyle=_F.red;ctx.textAlign='center';
      ctx.fillText('Organism B contigs',570,292);
      ctx.font='9px "DM Sans",sans-serif';ctx.fillStyle=_F.gray;
      ctx.fillText('(wrongly binned here)',570,306);
      ctx.fillText('gyrA, secY, ...',570,320);

      // Takeaway
      ctx.beginPath();ctx.roundRect(100,378,600,42,8);
      ctx.fillStyle=_F.red+'08';ctx.fill();ctx.strokeStyle=_F.red+'40';ctx.lineWidth=1;ctx.stroke();
      ctx.font='bold 10px "DM Sans",sans-serif';ctx.fillStyle=_F.red;ctx.textAlign='center';
      ctx.fillText('High contamination = the binner mixed contigs from different organisms into one bin',400,404);
    }

    // ---- Step 3: MIMAG quality tiers + bar chart ----
    if(step===3){
      ctx.font='bold 14px "DM Sans",sans-serif';
      ctx.fillStyle=_F.grayTxt;ctx.textAlign='center';
      ctx.fillText('MIMAG quality tiers (Bowers et al. 2017)',400,18);
      ctx.font='italic 10px "DM Sans",sans-serif';ctx.fillStyle='#64748b';
      ctx.fillText('Minimum Information about a Metagenome-Assembled Genome',400,34);

      const tx=100,ty=48,tw=600,rh=36;
      const colNames=['Tier','Completeness','Contamination','Extra'];
      const rows=[
        ['High quality','\u226590%','\u22645%','+ rRNA & \u226518 tRNA'],
        ['Medium quality','\u226550%','<10%',''],
        ['Low quality','<50%','<10%','']
      ];
      const tierCols=[_F.green,_F.amber,'#94a3b8'];
      const cw=[160,150,150,140];

      ctx.beginPath();ctx.roundRect(tx,ty,tw,28,{upperLeft:8,upperRight:8,lowerLeft:0,lowerRight:0});
      ctx.fillStyle='#f1f5f9';ctx.fill();ctx.strokeStyle='#e2e8f0';ctx.lineWidth=1;ctx.stroke();
      ctx.font='bold 10px "DM Sans",sans-serif';ctx.fillStyle=_F.grayTxt;ctx.textAlign='center';
      let cx=tx;
      for(let c=0;c<4;c++){ctx.fillText(colNames[c],cx+cw[c]/2,ty+18);cx+=cw[c];}

      for(let r=0;r<3;r++){
        const ry=ty+28+r*rh;
        ctx.beginPath();ctx.rect(tx,ry,tw,rh);
        ctx.fillStyle=r%2===0?'#fff':'#f8fafc';ctx.fill();
        ctx.strokeStyle='#e2e8f0';ctx.lineWidth=0.5;ctx.stroke();
        _pill(ctx,tx+20,ry+rh/2-11,120,22,tierCols[r]+'18',tierCols[r],1.5);
        ctx.font='bold 10px "DM Sans",sans-serif';ctx.fillStyle=tierCols[r];ctx.textAlign='center';
        ctx.fillText(rows[r][0],tx+80,ry+rh/2+3);
        cx=tx+160;
        for(let c=1;c<4;c++){
          ctx.font='11px "DM Sans",sans-serif';ctx.fillStyle=c===3&&rows[r][c]?_F.green:_F.grayTxt;ctx.textAlign='center';
          ctx.fillText(rows[r][c],cx+cw[c]/2,ry+rh/2+4);
          cx+=cw[c];
        }
      }

      ctx.font='bold 12px "DM Sans",sans-serif';ctx.fillStyle=_F.grayTxt;ctx.textAlign='center';
      ctx.fillText('Example: 12 bins classified by quality',400,200);

      const binData=[
        {comp:97,tier:'H'},{comp:93,tier:'H'},{comp:88,tier:'M'},
        {comp:78,tier:'M'},{comp:72,tier:'M'},{comp:65,tier:'M'},
        {comp:55,tier:'M'},{comp:48,tier:'L'},{comp:40,tier:'L'},
        {comp:35,tier:'L'},{comp:25,tier:'X'},{comp:15,tier:'X'}
      ];
      const tierColorMap={H:_F.green,M:_F.amber,L:'#94a3b8',X:_F.red};

      const bx=90,by=218,bw=48,bgap=7,bh=150;
      ctx.strokeStyle='#e2e8f0';ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(bx-5,by+bh);ctx.lineTo(bx+12*(bw+bgap),by+bh);ctx.stroke();
      ctx.beginPath();ctx.moveTo(bx-5,by);ctx.lineTo(bx-5,by+bh);ctx.stroke();
      ctx.font='9px "DM Sans",sans-serif';ctx.fillStyle=_F.gray;ctx.textAlign='right';
      ctx.fillText('100%',bx-8,by+5);ctx.fillText('50%',bx-8,by+bh/2+3);ctx.fillText('0%',bx-8,by+bh+5);

      ctx.setLineDash([4,3]);
      ctx.strokeStyle=_F.green+'80';ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(bx,by+bh*(1-0.9));ctx.lineTo(bx+12*(bw+bgap)-bgap,by+bh*(1-0.9));ctx.stroke();
      ctx.strokeStyle=_F.amber+'80';
      ctx.beginPath();ctx.moveTo(bx,by+bh*(1-0.5));ctx.lineTo(bx+12*(bw+bgap)-bgap,by+bh*(1-0.5));ctx.stroke();
      ctx.setLineDash([]);
      ctx.font='10px "DM Sans",sans-serif';ctx.textAlign='left';
      ctx.fillStyle=_F.green;ctx.fillText('90%',bx+12*(bw+bgap)+2,by+bh*(1-0.9)+3);
      ctx.fillStyle=_F.amber;ctx.fillText('50%',bx+12*(bw+bgap)+2,by+bh*(1-0.5)+3);

      for(let i=0;i<binData.length;i++){
        const x=bx+i*(bw+bgap);
        const compH=bh*(binData[i].comp/100);
        const tc=tierColorMap[binData[i].tier];
        ctx.beginPath();ctx.roundRect(x,by+bh-compH,bw,compH,[2,2,0,0]);
        ctx.fillStyle=tc;ctx.globalAlpha=0.5;ctx.fill();ctx.globalAlpha=1;
        ctx.strokeStyle=tc;ctx.lineWidth=1;ctx.stroke();
        ctx.font='10px "DM Sans",sans-serif';ctx.fillStyle=_F.gray;ctx.textAlign='center';
        ctx.fillText('B'+(i+1),x+bw/2,by+bh+12);
      }

      // Legend with tighter spacing to fit within canvas
      ctx.font='9px "DM Sans",sans-serif';ctx.textAlign='left';
      const legItems=[
        {col:_F.green,label:'High (\u226590%, \u22645% + rRNA/tRNA)'},
        {col:_F.amber,label:'Medium (\u226550%, <10%)'},
        {col:'#94a3b8',label:'Low (<50%, <10%)'},
        {col:_F.red,label:'Discard (>10% contam.)'}
      ];
      for(let l=0;l<legItems.length;l++){
        const lx=95+l*170,ly=400;
        ctx.beginPath();ctx.roundRect(lx,ly,10,10,2);
        ctx.fillStyle=legItems[l].col;ctx.globalAlpha=0.6;ctx.fill();ctx.globalAlpha=1;
        ctx.fillStyle=_F.gray;
        ctx.fillText(legItems[l].label,lx+14,ly+9);
      }
    }
  }

  // === Binning slide highlights ===

  // why-bin: 4 steps (0-3), cards 0-2, card map [0,0,1,2]
  const wbHeaders=['Mixed contigs','Hidden signals','Binning \u2192 MAGs','What MAGs unlock'];
  const wbCardMap=[0,0,1,2];
  function wbHighlight(step){
    const active=wbCardMap[step]!=null?wbCardMap[step]:0;
    for(let i=0;i<3;i++){
      const el=document.getElementById('wb-card-'+i);if(!el)continue;
      el.style.opacity=i<=active?'1':'.4';
      el.style.transform=i===active?'scale(1.02)':'scale(1)';
      el.style.boxShadow=i===active?'var(--shadow-md)':'var(--shadow-sm)';
    }
    const hdr=document.getElementById('wb-header');
    if(hdr)hdr.textContent=wbHeaders[step]||wbHeaders[0];
  }

  // two-signals: 5 steps (0-4), cards 0-3, card map [0,1,2,2,3]
  const tsHeaders=['What is coverage depth?','Coverage covariance','What is TNF?','Each species has a distinct TNF','Both signals combined'];
  const tsCardMap=[0,1,2,2,3];
  function tsHighlight(step){
    const active=tsCardMap[step]!=null?tsCardMap[step]:0;
    for(let i=0;i<4;i++){
      const el=document.getElementById('ts-card-'+i);if(!el)continue;
      el.style.opacity=i<=active?'1':'.4';
      el.style.transform=i===active?'scale(1.02)':'scale(1)';
      el.style.boxShadow=i===active?'var(--shadow-md)':'var(--shadow-sm)';
    }
    const hdr=document.getElementById('ts-header');
    if(hdr)hdr.textContent=tsHeaders[step]||tsHeaders[0];
  }

  // metabat2: 4 steps (0-3), cards 0-3, card map [0,1,2,3]
  const mbHeaders=['Step 1: measure signals','Step 2: compute distances','Step 3: cluster','Step 4: output MAGs'];
  const mbCardMap=[0,1,2,3];
  function mbHighlight(step){
    const active=mbCardMap[step]!=null?mbCardMap[step]:0;
    for(let i=0;i<4;i++){
      const el=document.getElementById('mb-card-'+i);if(!el)continue;
      el.style.opacity=i<=active?'1':'.4';
      el.style.transform=i===active?'scale(1.02)':'scale(1)';
      el.style.boxShadow=i===active?'var(--shadow-md)':'var(--shadow-sm)';
    }
    const hdr=document.getElementById('mb-header');
    if(hdr)hdr.textContent=mbHeaders[step]||mbHeaders[0];
  }

  // next-gen: 3 steps (0-2), cards 0-2, card map [0,1,2]
  const ngHeaders=['Classic binning','Deep learning approach','The evolving landscape'];
  const ngCardMap=[0,1,2];
  function ngHighlight(step){
    const active=ngCardMap[step]!=null?ngCardMap[step]:0;
    for(let i=0;i<3;i++){
      const el=document.getElementById('ng-card-'+i);if(!el)continue;
      el.style.opacity=i<=active?'1':'.4';
      el.style.transform=i===active?'scale(1.02)':'scale(1)';
      el.style.boxShadow=i===active?'var(--shadow-md)':'var(--shadow-sm)';
    }
    const hdr=document.getElementById('ng-header');
    if(hdr)hdr.textContent=ngHeaders[step]||ngHeaders[0];
  }

  // quality-mimag: 4 steps (0-3), cards 0-3, card map [0,1,2,3]
  const qmHeaders=['Marker genes','Completeness','Contamination','MIMAG quality tiers'];
  const qmCardMap=[0,1,2,3];
  function qmHighlight(step){
    const active=qmCardMap[step]!=null?qmCardMap[step]:0;
    for(let i=0;i<4;i++){
      const el=document.getElementById('qm-card-'+i);if(!el)continue;
      el.style.opacity=i<=active?'1':'.4';
      el.style.transform=i===active?'scale(1.02)':'scale(1)';
      el.style.boxShadow=i===active?'var(--shadow-md)':'var(--shadow-sm)';
    }
    const hdr=document.getElementById('qm-header');
    if(hdr)hdr.textContent=qmHeaders[step]||qmHeaders[0];
  }

  // Wire fragment events to animation steps
  Reveal.on('fragmentshown',e=>{
    const si=Reveal.getState().indexh;
    if(si===SID('read-anatomy')){
      const idx=parseInt(e.fragment.getAttribute('data-fragment-index'));
      drawReadAnatomy(idx+1);raHighlight(idx+1);
    }
    if(si===SID('qc-pipeline')){
      ensureQC();if(!qc||!qc.ok)return;
      const idx=e.fragment.getAttribute('data-fragment-index');
      qc.goToStep(parseInt(idx)+1);
    }
    if(si===SID('trim-demo')){
      const step=parseInt(e.fragment.getAttribute('data-fragment-index'))+1;
      ensureTrimD();
      if(trimD&&trimD.ok){trimD.goToStep(step)}
      else{trimPending=step}
    }
    if(si===SID('why-assemble')){
      const idx=parseInt(e.fragment.getAttribute('data-fragment-index'));
      drawWhyAssemble(idx+1);waHighlight(idx+1);
    }
    if(si===SID('debruijn')){
      const idx=parseInt(e.fragment.getAttribute('data-fragment-index'));
      drawDeBruijn(idx+1);dbgHighlight(idx+1);
    }
    if(si===SID('asm-challenges')){
      const idx=parseInt(e.fragment.getAttribute('data-fragment-index'));
      /* Entering step 3: reset sub-steps */
      if(idx+1===3) window._scSub=0;
      /* Leaving step 3 (going to 4): only allow if sub-steps done */
      if(idx+1===4&&window._scSub!=null&&window._scSub<3){
        window._scSub++;
        drawAsmChallenges(3);acHighlight(3);
        /* Re-hide the fragment we just consumed so reveal doesn't advance */
        e.fragment.classList.remove('visible');e.fragment.classList.add('fragment');
        Reveal.getState(); /* sync */
        return;
      }
      if(idx+1===4) window._scSub=null; /* leaving step 3 */
      drawAsmChallenges(idx+1);acHighlight(idx+1);
    }
    if(si===SID('megahit')){
      const idx=parseInt(e.fragment.getAttribute('data-fragment-index'));
      drawMegahit(idx+1);mhHighlight(idx+1);
    }
    if(si===SID('asm-metrics')){
      const idx=parseInt(e.fragment.getAttribute('data-fragment-index'));
      drawAsmMetrics(idx+1);amHighlight(idx+1);
    }
    if(si===SID('why-bin')){const idx=parseInt(e.fragment.getAttribute('data-fragment-index'));drawWhyBin(idx+1);wbHighlight(idx+1);}
    if(si===SID('two-signals')){const idx=parseInt(e.fragment.getAttribute('data-fragment-index'));drawTwoSignals(idx+1);tsHighlight(idx+1);}
    if(si===SID('metabat2')){const idx=parseInt(e.fragment.getAttribute('data-fragment-index'));drawMetabat2(idx+1);mbHighlight(idx+1);}
    if(si===SID('next-gen-binners')){const idx=parseInt(e.fragment.getAttribute('data-fragment-index'));drawNextGen(idx+1);ngHighlight(idx+1);}
    if(si===SID('quality-mimag')){const idx=parseInt(e.fragment.getAttribute('data-fragment-index'));drawQualityMimag(idx+1);qmHighlight(idx+1);}
  });
  Reveal.on('fragmenthidden',e=>{
    const si=Reveal.getState().indexh;
    if(si===SID('read-anatomy')){
      const idx=parseInt(e.fragment.getAttribute('data-fragment-index'));
      drawReadAnatomy(idx);raHighlight(idx);
    }
    if(si===SID('qc-pipeline')&&qc){const idx=parseInt(e.fragment.getAttribute('data-fragment-index'));qc.goBack(idx)}
    if(si===SID('trim-demo')&&trimD){const idx=parseInt(e.fragment.getAttribute('data-fragment-index'));trimD.goBack(idx)}
    if(si===SID('why-assemble')){const idx=parseInt(e.fragment.getAttribute('data-fragment-index'));drawWhyAssemble(idx);waHighlight(idx)}
    if(si===SID('debruijn')){const idx=parseInt(e.fragment.getAttribute('data-fragment-index'));drawDeBruijn(idx);dbgHighlight(idx)}
    if(si===SID('asm-challenges')){
      const idx=parseInt(e.fragment.getAttribute('data-fragment-index'));
      /* Going back from step 4 into step 3: show final sub-step */
      if(idx===3){window._scSub=3;drawAsmChallenges(3);acHighlight(3);return;}
      /* Going back within step 3: decrement sub-step */
      if(idx===2&&window._scSub!=null&&window._scSub>0){
        window._scSub--;
        drawAsmChallenges(3);acHighlight(3);
        /* Re-show the fragment so reveal doesn't retreat */
        e.fragment.classList.add('visible');e.fragment.classList.remove('fragment');
        return;
      }
      if(idx===2) window._scSub=null; /* fully leaving step 3 */
      drawAsmChallenges(idx);acHighlight(idx);
    }
    if(si===SID('megahit')){const idx=parseInt(e.fragment.getAttribute('data-fragment-index'));drawMegahit(idx);mhHighlight(idx)}
    if(si===SID('asm-metrics')){const idx=parseInt(e.fragment.getAttribute('data-fragment-index'));drawAsmMetrics(idx);amHighlight(idx)}
    if(si===SID('why-bin')){const idx=parseInt(e.fragment.getAttribute('data-fragment-index'));drawWhyBin(idx);wbHighlight(idx);}
    if(si===SID('two-signals')){const idx=parseInt(e.fragment.getAttribute('data-fragment-index'));drawTwoSignals(idx);tsHighlight(idx);}
    if(si===SID('metabat2')){const idx=parseInt(e.fragment.getAttribute('data-fragment-index'));drawMetabat2(idx);mbHighlight(idx);}
    if(si===SID('next-gen-binners')){const idx=parseInt(e.fragment.getAttribute('data-fragment-index'));drawNextGen(idx);ngHighlight(idx);}
    if(si===SID('quality-mimag')){const idx=parseInt(e.fragment.getAttribute('data-fragment-index'));drawQualityMimag(idx);qmHighlight(idx);}
  });

  setTimeout(go,100);
});
