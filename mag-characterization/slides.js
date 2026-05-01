
const COLORS={ga:'#0d9488',gb:'#3b82f6',gc:'#8b5cf6',gd:'#d97706',host:'#94a3b8',bad:'#dc2626',warn:'#ea580c',ok:'#16a34a',ink:'#0f172a',ink2:'#334155',ink3:'#64748b',ink4:'#94a3b8',border:'#e2e8f0'};

// Slide ID resolver
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

function rng(s){return()=>{s=(s*16807+1)%2147483647;return(s-1)/2147483646}}

/* ── Canvas helpers ─────────────────────────────────────── */

function initCanvas(id){
  const cv=document.getElementById(id);if(!cv)return null;
  const r=cv.getBoundingClientRect();
  if(r.width<10||r.height<10)return null;
  const d=devicePixelRatio||1;
  cv.width=r.width*d;cv.height=r.height*d;
  const ctx=cv.getContext('2d');
  ctx.setTransform(d,0,0,d,0,0);
  return{ctx,w:r.width,h:r.height};
}

function _c(id){
  const cv=initCanvas(id);if(!cv)return null;
  const{ctx,w,h}=cv;
  const sx=w/800,sy=h/440;
  const s=Math.min(sx,sy);
  const ox=(w-800*s)/2,oy=(h-440*s)/2;
  const d=devicePixelRatio||1;
  ctx.setTransform(s*d,0,0,s*d,ox*d,oy*d);
  return ctx;
}

function _pill(ctx,x,y,w,h,fill,stroke,sw){
  const r=h/2;
  ctx.beginPath();ctx.roundRect(x,y,w,h,r);
  if(fill){ctx.fillStyle=fill;ctx.fill()}
  if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=sw||1.5;ctx.stroke()}
}

function _roundRect(ctx,x,y,w,h,r,fill,stroke,sw){
  ctx.beginPath();ctx.roundRect(x,y,w,h,r);
  if(fill){ctx.fillStyle=fill;ctx.fill()}
  if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=sw||1.5;ctx.stroke()}
}

function _arrow(ctx,x1,y1,x2,y2,color,lw){
  const a=Math.atan2(y2-y1,x2-x1),hs=8;
  ctx.strokeStyle=color;ctx.lineWidth=lw||1.5;ctx.lineCap='round';
  ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();
  ctx.fillStyle=color;ctx.beginPath();
  ctx.moveTo(x2,y2);
  ctx.lineTo(x2-hs*Math.cos(a-Math.PI/6),y2-hs*Math.sin(a-Math.PI/6));
  ctx.lineTo(x2-hs*Math.cos(a+Math.PI/6),y2-hs*Math.sin(a+Math.PI/6));
  ctx.closePath();ctx.fill();
}

function _label(ctx,text,x,y,size,color,align,weight){
  ctx.font=(weight||'600')+' '+size+'px "DM Sans",system-ui,sans-serif';
  ctx.fillStyle=color;ctx.textAlign=align||'center';ctx.textBaseline='middle';
  ctx.fillText(text,x,y);
}

function _monoLabel(ctx,text,x,y,size,color,align){
  ctx.font='500 '+size+'px "DM Mono",Consolas,monospace';
  ctx.fillStyle=color;ctx.textAlign=align||'center';ctx.textBaseline='middle';
  ctx.fillText(text,x,y);
}

/* ═══════════════════════════════════════════════════════════
   1. TAX-CANVAS — Genome-based vs single-gene taxonomy
   Shows a simplified tree: marker gene approach vs 16S approach
   ═══════════════════════════════════════════════════════════ */

function drawTaxCanvas(){
  const ctx=_c('tax-canvas');if(!ctx)return;
  ctx.clearRect(0,0,800,440);

  // Draw a simplified phylogenetic tree with marker genes highlighted
  const treeX=120,treeY=60,treeW=560,treeH=320;
  const R=rng(77);

  // Tree trunk
  ctx.strokeStyle=COLORS.ink4;ctx.lineWidth=2;ctx.lineCap='round';
  ctx.beginPath();ctx.moveTo(treeX,treeY+treeH/2);ctx.lineTo(treeX+100,treeY+treeH/2);ctx.stroke();

  // Branch structure: 6 tips
  const tips=[
    {x:treeX+treeW-80,y:treeY+30,label:'MAG A',col:COLORS.gd,has16s:true},
    {x:treeX+treeW-80,y:treeY+95,label:'MAG B',col:COLORS.gb,has16s:false},
    {x:treeX+treeW-80,y:treeY+160,label:'Ref 1',col:COLORS.ink4,has16s:true},
    {x:treeX+treeW-80,y:treeY+225,label:'MAG C',col:COLORS.gc,has16s:false},
    {x:treeX+treeW-80,y:treeY+280,label:'Ref 2',col:COLORS.ink4,has16s:true},
    {x:treeX+treeW-80,y:treeY+330,label:'Ref 3',col:COLORS.ink4,has16s:true}
  ];

  // Internal nodes
  const n1x=treeX+100,n1y=treeY+treeH/2;
  const n2x=treeX+200,n2y=treeY+95;
  const n3x=treeX+200,n3y=treeY+270;
  const n4x=treeX+310,n4y=treeY+55;
  const n5x=treeX+310,n5y=treeY+140;
  const n6x=treeX+310,n6y=treeY+250;
  const n7x=treeX+310,n7y=treeY+305;

  // Draw branches
  ctx.strokeStyle=COLORS.border;ctx.lineWidth=2;
  const lines=[
    [n1x,n1y,n2x,n2y],[n1x,n1y,n3x,n3y],
    [n2x,n2y,n4x,n4y],[n2x,n2y,n5x,n5y],
    [n3x,n3y,n6x,n6y],[n3x,n3y,n7x,n7y],
    [n4x,n4y,tips[0].x,tips[0].y],[n4x,n4y,tips[1].x,tips[1].y],
    [n5x,n5y,tips[2].x,tips[2].y],[n5x,n5y,tips[3].x,tips[3].y],
    [n6x,n6y,tips[4].x,tips[4].y],[n7x,n7y,tips[5].x,tips[5].y]
  ];
  for(const[x1,y1,x2,y2] of lines){
    ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();
  }

  // Draw tips
  for(const t of tips){
    const isMag=t.label.startsWith('MAG');
    ctx.beginPath();ctx.arc(t.x,t.y,isMag?10:7,0,Math.PI*2);
    ctx.fillStyle=t.col+(isMag?'':'66');ctx.fill();
    if(isMag){ctx.strokeStyle=t.col;ctx.lineWidth=2;ctx.stroke();}

    _label(ctx,t.label,t.x+22,t.y,isMag?13:11,t.col,'left',isMag?'700':'500');

    // 16S indicator
    if(t.has16s){
      const bx=t.x+85,by=t.y-8;
      _roundRect(ctx,bx,by,38,16,4,'#dcfce7',COLORS.ok,1);
      _label(ctx,'16S',bx+19,by+8,8,COLORS.ok,'center','700');
    } else if(isMag){
      const bx=t.x+85,by=t.y-8;
      _roundRect(ctx,bx,by,38,16,4,'#fef2f2',COLORS.bad,1);
      _label(ctx,'no 16S',bx+19,by+8,7,COLORS.bad,'center','600');
    }
  }

  // Marker gene dots along branches for MAGs
  const markerPositions=[
    {x:n4x+30,y:tips[0].y-6},{x:n4x+60,y:tips[0].y+3},{x:n4x+90,y:tips[0].y-4},
    {x:n4x+30,y:tips[1].y+4},{x:n4x+60,y:tips[1].y-3},{x:n4x+90,y:tips[1].y+2},
    {x:n6x+50,y:tips[3].y-4},{x:n6x+80,y:tips[3].y+3}
  ];
  for(const m of markerPositions){
    ctx.beginPath();ctx.arc(m.x,m.y,3,0,Math.PI*2);
    ctx.fillStyle=COLORS.gd+'55';ctx.fill();
  }

  // Legend at bottom
  _roundRect(ctx,treeX,treeY+treeH+10,treeW,30,6,'#f8fafc',COLORS.border,1);
  ctx.beginPath();ctx.arc(treeX+20,treeY+treeH+25,3,0,Math.PI*2);ctx.fillStyle=COLORS.gd+'55';ctx.fill();
  _label(ctx,'Marker genes (120+)',treeX+30,treeY+treeH+25,10,COLORS.ink3,'left','500');
  _roundRect(ctx,treeX+200,treeY+treeH+17,30,14,4,'#dcfce7',COLORS.ok,1);
  _label(ctx,'16S',treeX+215,treeY+treeH+24,7,COLORS.ok,'center','700');
  _label(ctx,'= 16S present',treeX+240,treeY+treeH+25,10,COLORS.ink3,'left','500');
  _label(ctx,'Genome-based placement works even without 16S',treeX+420,treeY+treeH+25,10,COLORS.gd,'left','600');
}

/* ═══════════════════════════════════════════════════════════
   2. GTDB-CANVAS — GTDB tree with standardized ranks
   ═══════════════════════════════════════════════════════════ */

function drawGtdbCanvas(){
  const ctx=_c('gtdb-canvas');if(!ctx)return;
  ctx.clearRect(0,0,800,440);

  const ranks=['d__','p__','c__','o__','f__','g__','s__'];
  const rankNames=['Domain','Phylum','Class','Order','Family','Genus','Species'];
  const rankCols=[COLORS.ink3,COLORS.bad,COLORS.warn,COLORS.gd,COLORS.gb,COLORS.gc,COLORS.ga];
  const exNames=['Bacteria','Bacteroidota','Bacteroidia','Bacteroidales','Bacteroidaceae','Bacteroides','B. fragilis'];

  // Draw a dendrogram from left to right with rank boundaries
  const mx=40,my=30,bw=(800-mx*2)/7;

  // Rank columns
  for(let i=0;i<7;i++){
    const x=mx+i*bw;
    // Column shading
    ctx.fillStyle=i%2===0?'#f8fafc':'#ffffff';
    ctx.fillRect(x,my,bw,380);
    // Border
    ctx.strokeStyle=COLORS.border;ctx.lineWidth=0.5;
    ctx.beginPath();ctx.moveTo(x,my);ctx.lineTo(x,my+380);ctx.stroke();

    // Rank label at top
    _label(ctx,rankNames[i],x+bw/2,my+14,10,rankCols[i],'center','700');
    // Prefix
    _monoLabel(ctx,ranks[i],x+bw/2,my+30,11,rankCols[i],'center');
  }

  // Example lineage path (highlighted)
  const pathY=my+100;
  for(let i=0;i<7;i++){
    const x=mx+i*bw+bw/2;
    // Node
    ctx.beginPath();ctx.arc(x,pathY,12,0,Math.PI*2);
    ctx.fillStyle=rankCols[i]+'22';ctx.fill();
    ctx.strokeStyle=rankCols[i];ctx.lineWidth=2;ctx.stroke();
    _label(ctx,ranks[i].replace('__',''),x,pathY,9,rankCols[i],'center','700');

    // Connecting line
    if(i<6){
      const nx=mx+(i+1)*bw+bw/2;
      ctx.strokeStyle=COLORS.border;ctx.lineWidth=1.5;
      ctx.beginPath();ctx.moveTo(x+12,pathY);ctx.lineTo(nx-12,pathY);ctx.stroke();
    }

    // Example name below
    _label(ctx,exNames[i],x,pathY+28,i===6?10:11,COLORS.ink2,'center','500');
  }

  // Second example: unknown lineage (placeholder)
  const pathY2=my+200;
  const exNames2=['Bacteria','Firmicutes_B','Clostridia','Oscillospirales','UBA1242','UBA1242','sp003512345'];
  for(let i=0;i<7;i++){
    const x=mx+i*bw+bw/2;
    const isPlaceholder=exNames2[i].startsWith('UBA')||exNames2[i].startsWith('sp0');
    ctx.beginPath();ctx.arc(x,pathY2,10,0,Math.PI*2);
    ctx.fillStyle=isPlaceholder?COLORS.gd+'22':rankCols[i]+'15';ctx.fill();
    ctx.strokeStyle=isPlaceholder?COLORS.gd:rankCols[i]+'88';ctx.lineWidth=1.5;
    if(isPlaceholder){ctx.setLineDash([3,2])}
    ctx.stroke();ctx.setLineDash([]);

    if(i<6){
      const nx=mx+(i+1)*bw+bw/2;
      ctx.strokeStyle=COLORS.border;ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(x+10,pathY2);ctx.lineTo(nx-10,pathY2);ctx.stroke();
    }

    _label(ctx,exNames2[i],x,pathY2+24,isPlaceholder?9:10,isPlaceholder?COLORS.gd:COLORS.ink3,'center','500');
  }

  // Labels
  _label(ctx,'Known lineage',mx+15,pathY-30,11,COLORS.ga,'left','700');
  _label(ctx,'Novel lineage (placeholders)',mx+15,pathY2-28,11,COLORS.gd,'left','700');

  // Bottom note
  _roundRect(ctx,mx,my+330,720,40,8,'#fffbeb',COLORS.gd+'66',1);
  _label(ctx,'GTDB standardizes names by genome phylogeny — not all names match NCBI taxonomy',mx+360,my+350,11,COLORS.gd,'center','600');
}

/* ═══════════════════════════════════════════════════════════
   3. TK-CANVAS — GTDB-Tk 3-step process (fragment-driven)
   Step 0: find markers, Step 1: place on tree, Step 2: assign lineage
   ═══════════════════════════════════════════════════════════ */

let tkStep=0;

function drawTkCanvas(step){
  tkStep=step;
  const ctx=_c('tk-canvas');if(!ctx)return;
  ctx.clearRect(0,0,800,440);

  if(step===0) drawTkStep0(ctx);
  else if(step===1) drawTkStep1(ctx);
  else drawTkStep2(ctx);
}

function drawTkStep0(ctx){
  // Step 1: Find marker genes in MAG
  // Show a MAG as a set of contigs with highlighted marker genes
  _label(ctx,'MAG contigs',400,25,14,COLORS.ink2,'center','700');

  const contigs=[
    {y:60,w:680,genes:[50,120,200,340,450,580]},
    {y:110,w:520,genes:[40,160,280,400]},
    {y:160,w:600,genes:[70,190,310,440,530]},
    {y:210,w:400,genes:[60,150,250,340]},
    {y:260,w:560,genes:[80,200,350,480]}
  ];

  const markerSet=new Set([0,2,5,7,9,11,13,16,18,20]);
  let geneIdx=0;

  for(const c of contigs){
    const cx=400-c.w/2;
    // Contig backbone
    _roundRect(ctx,cx,c.y,c.w,32,6,'#f1f5f9',COLORS.border,1);

    // Genes as arrows
    for(const gx of c.genes){
      const isMarker=markerSet.has(geneIdx);
      const gw=40+Math.random()*20;
      const ax=cx+gx,ay=c.y+6,ah=20;
      ctx.beginPath();
      ctx.moveTo(ax,ay+ah/2);ctx.lineTo(ax+gw-8,ay);ctx.lineTo(ax+gw,ay+ah/2);
      ctx.lineTo(ax+gw-8,ay+ah);ctx.closePath();
      ctx.fillStyle=isMarker?COLORS.gd+'cc':'#cbd5e1';ctx.fill();
      if(isMarker){ctx.strokeStyle=COLORS.gd;ctx.lineWidth=1.5;ctx.stroke()}
      geneIdx++;
    }
  }

  // Legend
  _roundRect(ctx,160,320,480,50,8,'#fffbeb',COLORS.gd+'44',1);
  ctx.beginPath();ctx.moveTo(185,340);ctx.lineTo(210,335);ctx.lineTo(215,340);ctx.lineTo(210,345);ctx.closePath();
  ctx.fillStyle=COLORS.gd+'cc';ctx.fill();
  _label(ctx,'= Marker gene (120 bacterial / 53 archaeal)',220,340,11,COLORS.gd,'left','600');
  _label(ctx,'HMM profiles identify conserved single-copy markers',400,360,10,COLORS.ink3,'center','500');
}

function drawTkStep1(ctx){
  // Step 2: Place MAG on reference tree
  _label(ctx,'GTDB reference tree',400,25,14,COLORS.ink2,'center','700');

  // Simplified tree with MAG insertion point
  const tx=80,ty=60;
  ctx.strokeStyle=COLORS.ink4;ctx.lineWidth=2;ctx.lineCap='round';

  // Tree backbone
  const branches=[
    [tx,ty+180,tx+80,ty+180],
    [tx+80,ty+80,tx+80,ty+280],
    [tx+80,ty+80,tx+200,ty+50],[tx+80,ty+140,tx+200,ty+110],
    [tx+80,ty+220,tx+200,ty+190],[tx+80,ty+280,tx+200,ty+310],
    [tx+200,ty+50,tx+350,ty+30],[tx+200,ty+50,tx+350,ty+70],
    [tx+200,ty+110,tx+350,ty+110],
    [tx+200,ty+190,tx+350,ty+170],[tx+200,ty+190,tx+350,ty+210],
    [tx+200,ty+310,tx+350,ty+290],[tx+200,ty+310,tx+350,ty+330]
  ];
  for(const[x1,y1,x2,y2] of branches){
    ctx.strokeStyle=COLORS.border;ctx.lineWidth=1.5;
    ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();
  }

  // Reference tips
  const refTips=[
    {x:350,y:ty+30},{x:350,y:ty+70},{x:350,y:ty+110},
    {x:350,y:ty+170},{x:350,y:ty+210},
    {x:350,y:ty+290},{x:350,y:ty+330}
  ];
  for(const t of refTips){
    ctx.beginPath();ctx.arc(t.x,t.y,5,0,Math.PI*2);
    ctx.fillStyle=COLORS.ink4+'88';ctx.fill();
  }

  // MAG insertion (highlighted, with dashed line and glow)
  const magX=350,magY=ty+145;
  // Insertion branch
  ctx.strokeStyle=COLORS.gd;ctx.lineWidth=2;ctx.setLineDash([4,3]);
  ctx.beginPath();ctx.moveTo(tx+200,ty+110);ctx.lineTo(magX,magY);ctx.stroke();
  ctx.setLineDash([]);

  // MAG node with glow
  ctx.shadowColor=COLORS.gd;ctx.shadowBlur=12;
  ctx.beginPath();ctx.arc(magX,magY,12,0,Math.PI*2);
  ctx.fillStyle=COLORS.gd+'33';ctx.fill();
  ctx.strokeStyle=COLORS.gd;ctx.lineWidth=2;ctx.stroke();
  ctx.shadowBlur=0;
  _label(ctx,'MAG',magX,magY,9,COLORS.gd,'center','700');

  // pplacer / EPA-ng label
  _roundRect(ctx,440,magY-18,220,36,8,COLORS.gb+'11',COLORS.gb+'88',1);
  _label(ctx,'pplacer / EPA-ng placement',550,magY,11,COLORS.gb,'center','600');

  // Arrow from MAG to placement
  _arrow(ctx,magX+14,magY,438,magY,COLORS.gb,1.5);

  // Legend
  _roundRect(ctx,100,ty+310,520,40,8,'#eff6ff',COLORS.gb+'44',1);
  _label(ctx,'MAG is inserted into the reference tree based on concatenated marker alignment',360,ty+330,11,COLORS.gb,'center','600');

  // Ref label
  _label(ctx,'Reference genomes',350,ty+360,10,COLORS.ink4,'center','500');
}

function drawTkStep2(ctx){
  // Step 3: Assign lineage + ANI
  _label(ctx,'Taxonomic assignment',400,25,14,COLORS.ink2,'center','700');

  // Show MAG with assigned lineage
  const lx=60,ly=60;

  // MAG box
  _roundRect(ctx,lx,ly,160,60,10,COLORS.gd+'11',COLORS.gd,2);
  _label(ctx,'Your MAG',lx+80,ly+20,13,COLORS.gd,'center','700');
  _label(ctx,'92% complete, 2% cont.',lx+80,ly+42,9,COLORS.ink3,'center','500');

  // Arrow down
  _arrow(ctx,lx+80,ly+62,lx+80,ly+100,COLORS.gd,2);

  // Lineage box
  _roundRect(ctx,lx-20,ly+105,730,55,10,'#fff',COLORS.border,1.5);
  const lineage='d__Bacteria; p__Bacteroidota; c__Bacteroidia; o__Bacteroidales; f__Bacteroidaceae; g__Bacteroides; s__Bacteroides_A sp003456789';
  _monoLabel(ctx,lineage,lx+345,ly+132,10.5,COLORS.ink2,'center');

  // Rank color underlines
  const rankParts=[
    {text:'d__Bacteria',col:COLORS.ink3,x:58},
    {text:'p__Bacteroidota',col:COLORS.bad,x:175},
    {text:'g__Bacteroides',col:COLORS.gc,x:530},
    {text:'s__Bacteroides_A',col:COLORS.ga,x:660}
  ];
  for(const rp of rankParts){
    ctx.fillStyle=rp.col;ctx.fillRect(rp.x,ly+148,60,2);
  }

  // ANI box
  _roundRect(ctx,lx+250,ly+185,260,50,10,'#ecfdf5',COLORS.ok,1.5);
  _label(ctx,'ANI to closest reference: 97.8%',lx+380,ly+200,12,COLORS.ok,'center','700');
  _label(ctx,'Above 95% threshold → species-level call',lx+380,ly+220,10,COLORS.ink3,'center','500');

  // Confidence indicators
  const confY=ly+270;
  _label(ctx,'Confidence depends on:',400,confY,12,COLORS.ink2,'center','700');

  const factors=[
    {label:'Marker recovery',sub:'118/120 found',col:COLORS.ok,x:120},
    {label:'ANI to reference',sub:'97.8% → strong',col:COLORS.ok,x:310},
    {label:'MAG quality',sub:'92% / 2%',col:COLORS.ok,x:500},
    {label:'Novelty',sub:'Known lineage',col:COLORS.ok,x:680}
  ];
  for(const f of factors){
    _roundRect(ctx,f.x-70,confY+20,140,55,8,'#fff',COLORS.border,1);
    _label(ctx,f.label,f.x,confY+38,11,f.col,'center','700');
    _label(ctx,f.sub,f.x,confY+56,9,COLORS.ink3,'center','500');
  }

  // Bottom note
  _roundRect(ctx,100,confY+95,600,30,6,'#fffbeb',COLORS.gd+'44',1);
  _label(ctx,'Always report GTDB version, ANI, and number of markers recovered',400,confY+110,10,COLORS.gd,'center','600');
}

/* ═══════════════════════════════════════════════════════════
   4. GP-CANVAS — Gene prediction (ORFs in reading frames)
   ═══════════════════════════════════════════════════════════ */

function drawGpCanvas(){
  const ctx=_c('gp-canvas');if(!ctx)return;
  ctx.clearRect(0,0,800,440);

  const R=rng(42);
  const contigX=40,contigY=30,contigW=720,contigH=16;

  // Contig backbone
  _roundRect(ctx,contigX,contigY,contigW,contigH,4,'#e2e8f0','#cbd5e1',1);
  _label(ctx,'Contig sequence (5\' → 3\')',contigX+contigW/2,contigY+8,9,COLORS.ink3,'center','600');

  // Sequence ruler
  for(let i=0;i<=10;i++){
    const x=contigX+i*(contigW/10);
    ctx.strokeStyle=COLORS.border;ctx.lineWidth=0.5;
    ctx.beginPath();ctx.moveTo(x,contigY+contigH);ctx.lineTo(x,contigY+contigH+5);ctx.stroke();
    if(i%2===0)_monoLabel(ctx,(i*500)+'',x,contigY+contigH+12,7,COLORS.ink4,'center');
  }

  // 6 reading frames (3 forward, 3 reverse)
  const frameLabels=['+1','+2','+3','-1','-2','-3'];
  const frameY=contigY+contigH+30;
  const frameH=28,frameGap=6;

  // Predicted ORFs (some real genes, some random)
  const genes=[
    // Frame +1
    {frame:0,start:0.05,end:0.22,real:true,label:'geneA'},
    {frame:0,start:0.30,end:0.52,real:true,label:'geneB'},
    {frame:0,start:0.60,end:0.78,real:true,label:'geneC'},
    {frame:0,start:0.84,end:0.97,real:true,label:'geneD (partial)'},
    // Frame +2
    {frame:1,start:0.08,end:0.15,real:false,label:''},
    {frame:1,start:0.42,end:0.58,real:true,label:'geneE'},
    // Frame +3
    {frame:2,start:0.02,end:0.10,real:false,label:''},
    {frame:2,start:0.65,end:0.82,real:true,label:'geneF'},
    // Frame -1
    {frame:3,start:0.12,end:0.35,real:true,label:'geneG'},
    {frame:3,start:0.55,end:0.70,real:false,label:''},
    // Frame -2
    {frame:4,start:0.25,end:0.48,real:true,label:'geneH'},
    // Frame -3
    {frame:5,start:0.40,end:0.55,real:false,label:''},
    {frame:5,start:0.75,end:0.92,real:true,label:'geneI'}
  ];

  const frameCols=[COLORS.gb,COLORS.gb+'cc',COLORS.gb+'99',COLORS.gc,COLORS.gc+'cc',COLORS.gc+'99'];

  for(let f=0;f<6;f++){
    const fy=frameY+f*(frameH+frameGap);

    // Frame label
    _monoLabel(ctx,frameLabels[f],contigX-10,fy+frameH/2,10,f<3?COLORS.gb:COLORS.gc,'right');

    // Frame track
    ctx.fillStyle='#f8fafc';ctx.fillRect(contigX,fy,contigW,frameH);
    ctx.strokeStyle=COLORS.border;ctx.lineWidth=0.5;ctx.strokeRect(contigX,fy,contigW,frameH);

    // Stop codons as small red ticks
    const stopCount=8+Math.floor(R()*6);
    for(let s=0;s<stopCount;s++){
      const sx=contigX+R()*contigW;
      ctx.strokeStyle=COLORS.bad+'44';ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(sx,fy);ctx.lineTo(sx,fy+frameH);ctx.stroke();
    }
  }

  // Draw genes as directional arrows
  for(const g of genes){
    const fy=frameY+g.frame*(frameH+frameGap);
    const gx=contigX+g.start*contigW;
    const gw=(g.end-g.start)*contigW;
    const isForward=g.frame<3;
    const isPartial=g.label.includes('partial');

    if(g.real){
      ctx.fillStyle=frameCols[g.frame];
      ctx.beginPath();
      if(isForward){
        ctx.moveTo(gx,fy+2);
        ctx.lineTo(gx+gw-10,fy+2);ctx.lineTo(gx+gw,fy+frameH/2);
        ctx.lineTo(gx+gw-10,fy+frameH-2);ctx.lineTo(gx,fy+frameH-2);
      } else {
        ctx.moveTo(gx+gw,fy+2);
        ctx.lineTo(gx+10,fy+2);ctx.lineTo(gx,fy+frameH/2);
        ctx.lineTo(gx+10,fy+frameH-2);ctx.lineTo(gx+gw,fy+frameH-2);
      }
      ctx.closePath();ctx.fill();

      // Partial gene: dashed right edge
      if(isPartial){
        ctx.setLineDash([3,2]);ctx.strokeStyle=COLORS.warn;ctx.lineWidth=1.5;
        ctx.beginPath();ctx.moveTo(gx+gw,fy+2);ctx.lineTo(gx+gw,fy+frameH-2);ctx.stroke();
        ctx.setLineDash([]);
      }

      // Label
      if(g.label){
        _label(ctx,g.label,gx+gw/2,fy+frameH/2,8,'#fff','center','600');
      }

      // Start codon mark
      const startX=isForward?gx:gx+gw;
      ctx.fillStyle=COLORS.ok;
      ctx.beginPath();ctx.arc(startX,fy+frameH/2,3,0,Math.PI*2);ctx.fill();
    } else {
      // Random short ORF (gray, thin)
      ctx.fillStyle='#e2e8f0';
      ctx.fillRect(gx,fy+6,gw,frameH-12);
    }
  }

  // Legend at bottom
  const ly=frameY+6*(frameH+frameGap)+10;
  ctx.beginPath();ctx.moveTo(contigX+10,ly+6);ctx.lineTo(contigX+30,ly+2);
  ctx.lineTo(contigX+35,ly+6);ctx.lineTo(contigX+30,ly+10);ctx.closePath();
  ctx.fillStyle=COLORS.gb;ctx.fill();
  _label(ctx,'Predicted gene',contigX+42,ly+6,10,COLORS.ink3,'left','500');

  ctx.fillStyle='#e2e8f0';ctx.fillRect(contigX+160,ly+2,20,8);
  _label(ctx,'Random ORF (rejected)',contigX+185,ly+6,10,COLORS.ink3,'left','500');

  ctx.beginPath();ctx.arc(contigX+330,ly+6,3,0,Math.PI*2);ctx.fillStyle=COLORS.ok;ctx.fill();
  _label(ctx,'Start codon',contigX+340,ly+6,10,COLORS.ink3,'left','500');

  ctx.strokeStyle=COLORS.bad+'44';ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(contigX+430,ly);ctx.lineTo(contigX+430,ly+12);ctx.stroke();
  _label(ctx,'Stop codon',contigX+438,ly+6,10,COLORS.ink3,'left','500');
}

/* ═══════════════════════════════════════════════════════════
   5. KEGG-CANVAS — Simplified pathway with present/missing
   ═══════════════════════════════════════════════════════════ */

function drawKeggCanvas(){
  const ctx=_c('kegg-canvas');if(!ctx)return;
  ctx.clearRect(0,0,800,440);

  _label(ctx,'Simplified metabolic pathway',400,25,13,COLORS.ink2,'center','700');

  // Pathway: A → B → C → D → E (linear), with branch F → G
  const enzymes=[
    {id:'K00001',name:'Enzyme A',x:80,y:180,present:true},
    {id:'K00002',name:'Enzyme B',x:220,y:180,present:true},
    {id:'K00003',name:'Enzyme C',x:360,y:180,present:false},
    {id:'K00004',name:'Enzyme D',x:500,y:180,present:true},
    {id:'K00005',name:'Enzyme E',x:640,y:180,present:true},
    // Branch
    {id:'K00006',name:'Enzyme F',x:360,y:300,present:true},
    {id:'K00007',name:'Enzyme G',x:500,y:300,present:false}
  ];

  // Metabolites
  const metabolites=[
    {name:'Substrate',x:20,y:180},
    {name:'M1',x:150,y:180},
    {name:'M2',x:290,y:180},
    {name:'M3',x:430,y:180},
    {name:'M4',x:570,y:180},
    {name:'Product',x:720,y:180},
    {name:'M5',x:430,y:300},
    {name:'Side product',x:590,y:300}
  ];

  // Draw metabolite nodes
  for(const m of metabolites){
    const isBig=m.name==='Substrate'||m.name==='Product'||m.name==='Side product';
    const r=isBig?14:10;
    ctx.beginPath();ctx.arc(m.x,m.y,r,0,Math.PI*2);
    ctx.fillStyle=isBig?'#f0fdf4':'#f1f5f9';ctx.fill();
    ctx.strokeStyle=isBig?COLORS.ok:COLORS.border;ctx.lineWidth=isBig?2:1;ctx.stroke();
    _label(ctx,m.name,m.x,m.y+(isBig?22:18),isBig?10:8,COLORS.ink3,'center','500');
  }

  // Arrows between metabolites
  const arrows=[
    [0,1],[1,2],[2,3],[3,4],[4,5],
    [2,6],[6,7] // branch
  ];
  for(const[a,b] of arrows){
    const ma=metabolites[a],mb=metabolites[b];
    const dx=mb.x-ma.x,dy=mb.y-ma.y,d=Math.sqrt(dx*dx+dy*dy);
    const r1=(ma.name==='Substrate'||ma.name==='Product'||ma.name==='Side product')?16:12;
    const r2=(mb.name==='Substrate'||mb.name==='Product'||mb.name==='Side product')?16:12;
    _arrow(ctx,ma.x+dx/d*r1,ma.y+dy/d*r1,mb.x-dx/d*r2,mb.y-dy/d*r2,COLORS.border,1.5);
  }

  // Draw enzyme boxes on arrows
  for(const e of enzymes){
    const col=e.present?COLORS.ok:COLORS.ink4;
    const bg=e.present?'#dcfce7':'#f1f5f9';
    _roundRect(ctx,e.x-38,e.y-50,76,32,8,bg,col,1.5);
    _monoLabel(ctx,e.id,e.x,e.y-40,9,col,'center');
    _label(ctx,e.name,e.x,e.y-28,8,col,'center','600');

    if(!e.present){
      // Question mark
      _label(ctx,'?',e.x+30,e.y-44,14,COLORS.warn,'center','800');
    }
  }

  // Decision box for missing enzyme
  _roundRect(ctx,180,350,440,70,10,'#fffbeb',COLORS.gd+'88',1);
  _label(ctx,'Missing annotation could mean:',400,368,11,COLORS.gd,'center','700');
  const reasons=['Truly absent','Too divergent','Missing contig','Broken gene','Alternative enzyme'];
  for(let i=0;i<5;i++){
    const rx=210+i*88;
    _label(ctx,(i+1)+'. '+reasons[i],rx,390,8,COLORS.ink2,'center','500');
  }
}

/* ═══════════════════════════════════════════════════════════
   6. PFAM-CANVAS — Protein domain architectures
   ═══════════════════════════════════════════════════════════ */

function drawPfamCanvas(){
  const ctx=_c('pfam-canvas');if(!ctx)return;
  ctx.clearRect(0,0,800,440);

  _label(ctx,'Domain architectures of three proteins',400,25,13,COLORS.ink2,'center','700');

  const proteins=[
    {
      name:'ABC transporter',length:600,y:80,
      domains:[
        {start:20,end:180,label:'ABC_tran',col:COLORS.gb},
        {start:220,end:380,label:'ABC_membrane',col:COLORS.ga},
        {start:420,end:560,label:'ABC_tran_2',col:COLORS.gb}
      ]
    },
    {
      name:'Two-component sensor',length:550,y:190,
      domains:[
        {start:10,end:200,label:'HAMP',col:COLORS.gc},
        {start:230,end:370,label:'HisKA',col:COLORS.gd},
        {start:400,end:520,label:'HATPase_c',col:COLORS.bad}
      ]
    },
    {
      name:'Modular CAZyme',length:650,y:300,
      domains:[
        {start:10,end:120,label:'CBM3',col:COLORS.ink3},
        {start:150,end:310,label:'GH5',col:COLORS.ga},
        {start:340,end:420,label:'CBM3',col:COLORS.ink3},
        {start:450,end:620,label:'GH9',col:COLORS.ok}
      ]
    }
  ];

  for(const p of proteins){
    const px=400-p.length/2;
    // Protein backbone (thin line)
    ctx.strokeStyle=COLORS.border;ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(px,p.y+18);ctx.lineTo(px+p.length,p.y+18);ctx.stroke();

    // N and C termini
    _label(ctx,'N',px-12,p.y+18,9,COLORS.ink4,'center','600');
    _label(ctx,'C',px+p.length+12,p.y+18,9,COLORS.ink4,'center','600');

    // Protein name
    _label(ctx,p.name,px,p.y-8,12,COLORS.ink,'left','700');

    // Length
    _monoLabel(ctx,Math.round(p.length*0.8)+'aa',px+p.length+30,p.y+18,9,COLORS.ink4,'left');

    // Domains
    for(const d of p.domains){
      const dx=px+d.start,dw=d.end-d.start;
      _roundRect(ctx,dx,p.y+4,dw,28,6,d.col+'22',d.col,2);
      _label(ctx,d.label,dx+dw/2,p.y+18,10,'#fff','center','700');

      // Fill for visibility
      ctx.globalAlpha=0.7;
      _roundRect(ctx,dx,p.y+4,dw,28,6,d.col,null,0);
      ctx.globalAlpha=1;
      _label(ctx,d.label,dx+dw/2,p.y+18,10,'#fff','center','700');
    }
  }

  // Legend
  _roundRect(ctx,120,390,560,35,8,'#f1f5f9',COLORS.border,1);
  _label(ctx,'Same domain can appear in different proteins (e.g. ABC_tran, CBM3). One protein can have multiple domains.',400,407,10,COLORS.ink3,'center','500');
}

/* ═══════════════════════════════════════════════════════════
   7. CAZY-CANVAS — Polysaccharide degradation
   ═══════════════════════════════════════════════════════════ */

function drawCazyCanvas(){
  const ctx=_c('cazy-canvas');if(!ctx)return;
  ctx.clearRect(0,0,800,440);

  // Polysaccharide chain at the top
  _label(ctx,'Polysaccharide chain',400,22,12,COLORS.ink2,'center','700');

  const chainY=55,chainH=26,unitW=36,chainStart=100;
  const nUnits=16;

  // Draw sugar units
  for(let i=0;i<nUnits;i++){
    const ux=chainStart+i*(unitW+4);
    const col=i%3===0?'#a7f3d0':i%3===1?'#bae6fd':'#fde68a';
    _roundRect(ctx,ux,chainY,unitW,chainH,6,col,COLORS.border,1);

    // Glycosidic bond
    if(i<nUnits-1){
      const bx=ux+unitW;
      ctx.strokeStyle=COLORS.ink4;ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(bx,chainY+chainH/2);ctx.lineTo(bx+4,chainY+chainH/2);ctx.stroke();
    }
  }

  // Enzymes acting on the chain
  const enzymes=[
    {x:180,label:'GH',sub:'Hydrolase',col:COLORS.ga,action:'Cuts bond'},
    {x:360,label:'PL',sub:'Lyase',col:COLORS.gc,action:'Cleaves via elimination'},
    {x:540,label:'CE',sub:'Esterase',col:COLORS.gd,action:'Removes ester'}
  ];

  for(const e of enzymes){
    // Arrow from enzyme to chain
    ctx.strokeStyle=e.col;ctx.lineWidth=1.5;ctx.setLineDash([3,2]);
    ctx.beginPath();ctx.moveTo(e.x,chainY+chainH+10);ctx.lineTo(e.x,chainY+chainH+40);ctx.stroke();
    ctx.setLineDash([]);

    // Enzyme scissors icon
    _label(ctx,'✂',e.x,chainY+chainH+18,16,e.col,'center','400');

    // Enzyme box
    _roundRect(ctx,e.x-55,chainY+chainH+45,110,50,8,e.col+'11',e.col,1.5);
    _label(ctx,e.label,e.x,chainY+chainH+62,14,e.col,'center','800');
    _label(ctx,e.sub,e.x,chainY+chainH+80,9,e.col,'center','500');
  }

  // Other CAZyme categories below
  const catY=220;
  _label(ctx,'CAZyme families',400,catY,12,COLORS.ink2,'center','700');

  const categories=[
    {label:'GH',name:'Glycoside\nHydrolases',col:COLORS.ga,desc:'Break glycosidic bonds',count:'~180 families'},
    {label:'GT',name:'Glycosyl\nTransferases',col:COLORS.gb,desc:'Form glycosidic bonds',count:'~120 families'},
    {label:'PL',name:'Polysaccharide\nLyases',col:COLORS.gc,desc:'Cleave via elimination',count:'~40 families'},
    {label:'CE',name:'Carbohydrate\nEsterases',col:COLORS.gd,desc:'Remove ester groups',count:'~20 families'},
    {label:'CBM',name:'Carbohydrate\nBinding Modules',col:COLORS.ink3,desc:'Target substrates',count:'~90 families'},
    {label:'AA',name:'Auxiliary\nActivities',col:COLORS.bad,desc:'Redox enzymes',count:'~18 families'}
  ];

  const catW=110,catH=95,catGap=12;
  const totalW=categories.length*catW+(categories.length-1)*catGap;
  const catStartX=400-totalW/2;

  for(let i=0;i<categories.length;i++){
    const c=categories[i];
    const cx=catStartX+i*(catW+catGap);

    _roundRect(ctx,cx,catY+20,catW,catH,8,c.col+'0a',c.col+'66',1.5);

    // Big label
    _label(ctx,c.label,cx+catW/2,catY+45,18,c.col,'center','800');

    // Description
    const lines=c.desc.split('\n');
    _label(ctx,c.desc,cx+catW/2,catY+68,8,COLORS.ink3,'center','500');
    _monoLabel(ctx,c.count,cx+catW/2,catY+85,7,COLORS.ink4,'center');
  }

  // Substrate arrow
  _roundRect(ctx,160,catY+130,480,30,6,'#ecfdf5',COLORS.ga+'66',1);
  _label(ctx,'CAZyme profiles reveal carbohydrate metabolism potential — substrate specificity varies by family',400,catY+145,10,COLORS.ga,'center','600');
}

/* ═══════════════════════════════════════════════════════════
   8. BGC-CANVAS — Biosynthetic gene cluster
   ═══════════════════════════════════════════════════════════ */

function drawBgcCanvas(){
  const ctx=_c('bgc-canvas');if(!ctx)return;
  ctx.clearRect(0,0,800,440);

  _label(ctx,'Biosynthetic gene cluster (BGC) on a contig',400,22,12,COLORS.ink2,'center','700');

  // Contig backbone
  const cx=40,cy=60,cw=720,ch=8;
  _roundRect(ctx,cx,cy,cw,ch,3,'#e2e8f0','#cbd5e1',1);

  // Scale bar
  _monoLabel(ctx,'0 kb',cx,cy+20,8,COLORS.ink4,'left');
  _monoLabel(ctx,'45 kb',cx+cw,cy+20,8,COLORS.ink4,'right');
  for(let i=0;i<=9;i++){
    const x=cx+i*(cw/9);
    ctx.strokeStyle=COLORS.border;ctx.lineWidth=0.5;
    ctx.beginPath();ctx.moveTo(x,cy+ch);ctx.lineTo(x,cy+ch+4);ctx.stroke();
  }

  // BGC region bracket
  const bgcStart=cx+80,bgcEnd=cx+640,bgcY=cy+35;
  ctx.strokeStyle=COLORS.gc;ctx.lineWidth=2;
  ctx.beginPath();
  ctx.moveTo(bgcStart,bgcY);ctx.lineTo(bgcStart,bgcY-10);ctx.lineTo(bgcEnd,bgcY-10);ctx.lineTo(bgcEnd,bgcY);
  ctx.stroke();
  _label(ctx,'BGC region (~35 kb)',cx+360,bgcY-18,10,COLORS.gc,'center','700');

  // Genes as directional arrows on the contig
  const genes=[
    {x:90,w:55,label:'reg',type:'regulatory',col:'#94a3b8',dir:1},
    {x:155,w:85,label:'NRPS core',type:'biosynthetic',col:COLORS.gc,dir:1},
    {x:250,w:65,label:'tailoring',type:'tailoring',col:COLORS.gb,dir:1},
    {x:325,w:95,label:'NRPS core 2',type:'biosynthetic',col:COLORS.gc,dir:1},
    {x:430,w:50,label:'mod',type:'tailoring',col:COLORS.gb,dir:-1},
    {x:490,w:60,label:'transport',type:'transport',col:COLORS.gd,dir:1},
    {x:560,w:45,label:'resist',type:'resistance',col:COLORS.bad,dir:-1},
    {x:615,w:30,label:'hyp',type:'unknown',col:'#cbd5e1',dir:1}
  ];

  const geneY=bgcY+10,geneH=34;

  for(const g of genes){
    const gx=cx+g.x,gw=g.w;
    ctx.fillStyle=g.col+'cc';
    ctx.beginPath();
    if(g.dir===1){
      ctx.moveTo(gx,geneY);ctx.lineTo(gx+gw-10,geneY);ctx.lineTo(gx+gw,geneY+geneH/2);
      ctx.lineTo(gx+gw-10,geneY+geneH);ctx.lineTo(gx,geneY+geneH);
    } else {
      ctx.moveTo(gx+gw,geneY);ctx.lineTo(gx+10,geneY);ctx.lineTo(gx,geneY+geneH/2);
      ctx.lineTo(gx+10,geneY+geneH);ctx.lineTo(gx+gw,geneY+geneH);
    }
    ctx.closePath();ctx.fill();
    ctx.strokeStyle=g.col;ctx.lineWidth=1;ctx.stroke();

    _label(ctx,g.label,gx+gw/2,geneY+geneH/2,g.label.length>8?7:8,'#fff','center','700');
  }

  // Legend for gene types
  const legY=geneY+geneH+20;
  const legItems=[
    {label:'Core biosynthetic',col:COLORS.gc},
    {label:'Tailoring',col:COLORS.gb},
    {label:'Transport',col:COLORS.gd},
    {label:'Regulatory',col:'#94a3b8'},
    {label:'Resistance',col:COLORS.bad},
    {label:'Hypothetical',col:'#cbd5e1'}
  ];
  for(let i=0;i<legItems.length;i++){
    const lx=70+i*120;
    ctx.fillStyle=legItems[i].col+'cc';ctx.fillRect(lx,legY,12,12);
    _label(ctx,legItems[i].label,lx+18,legY+6,9,COLORS.ink3,'left','500');
  }

  // antiSMASH workflow below
  const wfY=legY+40;
  _label(ctx,'antiSMASH workflow',400,wfY,12,COLORS.ink2,'center','700');

  const steps=[
    {label:'Predicted\nproteins',x:100,col:COLORS.ink3},
    {label:'Biosynthetic\ndomains/rules',x:270,col:COLORS.gc},
    {label:'Cluster\ntype',x:440,col:COLORS.gb},
    {label:'Similarity to\nknown BGCs',x:610,col:COLORS.gd}
  ];

  for(let i=0;i<steps.length;i++){
    const s=steps[i];
    _roundRect(ctx,s.x-60,wfY+18,120,48,8,s.col+'11',s.col+'88',1.5);
    const lines=s.label.split('\n');
    _label(ctx,lines[0],s.x,wfY+35,10,s.col,'center','600');
    if(lines[1])_label(ctx,lines[1],s.x,wfY+50,10,s.col,'center','600');

    if(i<steps.length-1){
      _arrow(ctx,s.x+62,wfY+42,steps[i+1].x-62,wfY+42,COLORS.border,1.5);
    }
  }

  // Bottom caveat
  _roundRect(ctx,160,wfY+80,480,28,6,'#f5f3ff',COLORS.gc+'66',1);
  _label(ctx,'antiSMASH predicts biosynthetic potential — not proof of compound production',400,wfY+94,10,COLORS.gc,'center','600');
}

/* ═══════════════════════════════════════════════════════════
   9. SYNTH-CANVAS — Three pillars of MAG interpretation
   ═══════════════════════════════════════════════════════════ */

function drawSynthCanvas(){
  const ctx=_c('synth-canvas');if(!ctx)return;
  ctx.clearRect(0,0,800,440);

  // Triangle with three corners: Taxonomy, Function, Quality
  const cx=400,cy=200;
  const triR=160;
  const pts=[
    {x:cx,y:cy-triR,label:'Taxonomy',sub:'Who is it?',col:COLORS.gd},
    {x:cx-triR*0.87,y:cy+triR*0.5,label:'Function',sub:'What can it do?',col:COLORS.ga},
    {x:cx+triR*0.87,y:cy+triR*0.5,label:'Quality',sub:'How much do we trust it?',col:COLORS.gc}
  ];

  // Triangle fill
  ctx.beginPath();
  ctx.moveTo(pts[0].x,pts[0].y);ctx.lineTo(pts[1].x,pts[1].y);ctx.lineTo(pts[2].x,pts[2].y);ctx.closePath();
  ctx.fillStyle='#f8fafc';ctx.fill();

  // Triangle edges with gradient-like coloring
  for(let i=0;i<3;i++){
    const a=pts[i],b=pts[(i+1)%3];
    ctx.strokeStyle=a.col+'88';ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
  }

  // Corner nodes
  for(const p of pts){
    ctx.shadowColor=p.col;ctx.shadowBlur=16;
    ctx.beginPath();ctx.arc(p.x,p.y,28,0,Math.PI*2);
    ctx.fillStyle=p.col+'22';ctx.fill();
    ctx.strokeStyle=p.col;ctx.lineWidth=2.5;ctx.stroke();
    ctx.shadowBlur=0;

    // Icon text
    _label(ctx,p.label,p.x,p.y-1,11,p.col,'center','700');
  }

  // Sub-labels outside triangle
  _label(ctx,pts[0].sub,pts[0].x,pts[0].y-40,11,COLORS.ink3,'center','500');
  _label(ctx,pts[1].sub,pts[1].x-10,pts[1].y+40,11,COLORS.ink3,'center','500');
  _label(ctx,pts[2].sub,pts[2].x+10,pts[2].y+40,11,COLORS.ink3,'center','500');

  // Center label
  _roundRect(ctx,cx-70,cy-16,140,32,8,COLORS.gb+'11',COLORS.gb+'66',1.5);
  _label(ctx,'Biological',cx,cy-4,11,COLORS.gb,'center','700');
  _label(ctx,'interpretation',cx,cy+10,11,COLORS.gb,'center','700');

  // Dashed lines from center to corners
  ctx.setLineDash([4,3]);ctx.lineWidth=1;
  for(const p of pts){
    ctx.strokeStyle=p.col+'44';
    ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(p.x,p.y);ctx.stroke();
  }
  ctx.setLineDash([]);

  // Bottom message
  _roundRect(ctx,140,395,520,30,8,'#eff6ff',COLORS.gb+'44',1);
  _label(ctx,'A strong interpretation integrates all three dimensions together',400,410,11,COLORS.gb,'center','600');
}


/* ═══════════════════════════════════════════════════════════
   REVEAL INITIALIZATION
   ═══════════════════════════════════════════════════════════ */

Reveal.initialize({
  hash:true,slideNumber:'c/t',progress:true,controls:true,
  controlsTutorial:false,controlsLayout:'edges',
  transition:'fade',transitionSpeed:'default',
  width:1440,height:810,
  margin:0.02,center:false,showNotes:false,
  keyboard:{
    78:()=>Reveal.configure({showNotes:!Reveal.getConfig().showNotes}),
    77:()=>{if(typeof toggleNav==='function')toggleNav()}
  }
}).then(()=>{

  /* ── GTDB-Tk sidebar card + header highlight ── */
  const tkHeaders=['Step 1: Find marker genes','Step 2: Place on reference tree','Step 3: Assign lineage'];

  function tkHighlight(step){
    for(let i=0;i<3;i++){
      const el=document.getElementById('tk-card-'+i);if(!el)continue;
      el.style.opacity=i<=step?'1':'.4';
      el.style.transform=i===step?'scale(1.02)':'scale(1)';
      el.style.boxShadow=i===step?'0 4px 6px rgba(15,23,42,.04),0 2px 12px rgba(15,23,42,.06)':'0 1px 2px rgba(15,23,42,.04),0 1px 3px rgba(15,23,42,.06)';
    }
    const hdr=document.getElementById('tk-header');
    if(hdr)hdr.textContent=tkHeaders[step]||tkHeaders[0];
  }

  /* ── Slide change handler ── */
  function go(){
    const i=Reveal.getState().indexh;

    if(i===SID('why-not-16s')){setTimeout(()=>drawTaxCanvas(),300)}
    if(i===SID('gtdb')){setTimeout(()=>drawGtdbCanvas(),300)}
    if(i===SID('gtdb-tk')){setTimeout(()=>{drawTkCanvas(0);tkHighlight(0)},300)}
    if(i===SID('gene-prediction')){setTimeout(()=>drawGpCanvas(),300)}
    if(i===SID('kegg')){setTimeout(()=>drawKeggCanvas(),300)}
    if(i===SID('pfam')){setTimeout(()=>drawPfamCanvas(),300)}
    if(i===SID('cazymes')){setTimeout(()=>drawCazyCanvas(),300)}
    if(i===SID('bgcs')){setTimeout(()=>drawBgcCanvas(),300)}
    if(i===SID('synthesis')){setTimeout(()=>drawSynthCanvas(),300)}
  }

  Reveal.on('slidechanged',go);
  go();

  /* ── Fragment events for GTDB-Tk stepping ── */
  Reveal.on('fragmentshown',e=>{
    const si=Reveal.getState().indexh;
    if(si===SID('gtdb-tk')){
      const idx=parseInt(e.fragment.getAttribute('data-fragment-index'));
      drawTkCanvas(idx+1);tkHighlight(idx+1);
    }
  });

  Reveal.on('fragmenthidden',e=>{
    const si=Reveal.getState().indexh;
    if(si===SID('gtdb-tk')){
      const idx=parseInt(e.fragment.getAttribute('data-fragment-index'));
      drawTkCanvas(idx);tkHighlight(idx);
    }
  });

  setTimeout(go,100);
});
