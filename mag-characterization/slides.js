
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
  const treeX=120,treeY=40,treeW=560,treeH=280;
  const R=rng(77);

  // Tree trunk
  ctx.strokeStyle=COLORS.ink4;ctx.lineWidth=2;ctx.lineCap='round';
  ctx.beginPath();ctx.moveTo(treeX,treeY+treeH/2);ctx.lineTo(treeX+100,treeY+treeH/2);ctx.stroke();

  // Branch structure: 5 tips (3 MAGs + 2 references)
  const tips=[
    {x:treeX+treeW-80,y:treeY+20,label:'MAG A',col:COLORS.gd,has16s:true},
    {x:treeX+treeW-80,y:treeY+90,label:'MAG B',col:COLORS.gb,has16s:false},
    {x:treeX+treeW-80,y:treeY+160,label:'Ref 1',col:COLORS.ink4,has16s:true},
    {x:treeX+treeW-80,y:treeY+210,label:'MAG C',col:COLORS.gc,has16s:false},
    {x:treeX+treeW-80,y:treeY+270,label:'Ref 2',col:COLORS.ink4,has16s:true}
  ];

  // Internal nodes
  const n1x=treeX+100,n1y=treeY+treeH/2;
  const n2x=treeX+200,n2y=treeY+55;
  const n3x=treeX+200,n3y=treeY+210;
  const n4x=treeX+310,n4y=treeY+55;
  const n5x=treeX+310,n5y=treeY+160;

  // Draw branches
  ctx.strokeStyle=COLORS.border;ctx.lineWidth=2;
  const lines=[
    [n1x,n1y,n2x,n2y],[n1x,n1y,n3x,n3y],
    [n2x,n2y,tips[0].x,tips[0].y],[n2x,n2y,tips[1].x,tips[1].y],
    [n4x,n4y,tips[2].x,tips[2].y],
    [n3x,n3y,tips[3].x,tips[3].y],[n3x,n3y,tips[4].x,tips[4].y]
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
    {x:n2x+40,y:tips[0].y-5},{x:n2x+80,y:tips[0].y+3},{x:n2x+120,y:tips[0].y-3},
    {x:n2x+40,y:tips[1].y+4},{x:n2x+80,y:tips[1].y-3},{x:n2x+120,y:tips[1].y+2},
    {x:n3x+40,y:tips[3].y-4},{x:n3x+80,y:tips[3].y+3}
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
   10. SBS-CANVAS — How Illumina sequencing works (3 steps)
   ═══════════════════════════════════════════════════════════ */

let sbsStep=0;

function drawSbsCanvas(step){
  sbsStep=step;
  const ctx=_c('sbs-canvas');if(!ctx)return;
  ctx.clearRect(0,0,800,440);

  if(step===0) drawSbs0(ctx);
  else if(step===1) drawSbs1(ctx);
  else drawSbs2(ctx);
}

/* ── Shared DNA/SBS drawing helpers ── */
function _dnaStrand(ctx,x,y,w,bases,color,dir){
  // Draw a single DNA strand as connected backbone + base letters
  const bw=w/bases.length;
  const baseCols={A:COLORS.ok,T:'#dc2626',G:COLORS.gd,C:COLORS.gb};
  // Backbone
  ctx.strokeStyle=color;ctx.lineWidth=2;ctx.lineCap='round';
  ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+w,y);ctx.stroke();
  // Bases as colored ticks with letters
  for(let i=0;i<bases.length;i++){
    const bx=x+i*bw+bw/2;
    const bc=baseCols[bases[i]]||COLORS.ink4;
    const by2=dir>0?y+10:y-10;
    ctx.strokeStyle=bc+'aa';ctx.lineWidth=1.5;
    ctx.beginPath();ctx.moveTo(bx,y);ctx.lineTo(bx,by2);ctx.stroke();
    ctx.beginPath();ctx.arc(bx,by2,4,0,Math.PI*2);
    ctx.fillStyle=bc;ctx.fill();
    _monoLabel(ctx,bases[i],bx,by2,5,'#fff','center');
  }
}

function _flowSurface(ctx,x,y,w,h){
  // Glass flow cell surface with gradient
  const g=ctx.createLinearGradient(x,y,x,y+h);
  g.addColorStop(0,'#e2e8f0');g.addColorStop(0.3,'#f1f5f9');g.addColorStop(1,'#cbd5e1');
  ctx.fillStyle=g;
  ctx.beginPath();ctx.roundRect(x,y,w,h,3);ctx.fill();
  ctx.strokeStyle='#94a3b8';ctx.lineWidth=1;ctx.stroke();
}

function _oligo(ctx,x,yBase,len,color){
  // Draw a short surface oligo (vertical wiggly line)
  ctx.strokeStyle=color;ctx.lineWidth=1.5;ctx.lineCap='round';
  ctx.beginPath();ctx.moveTo(x,yBase);
  for(let i=1;i<=len;i++){
    ctx.lineTo(x+(i%2?2:-2),yBase-i*3);
  }
  ctx.stroke();
  // Small anchor dot at surface
  ctx.beginPath();ctx.arc(x,yBase,2,0,Math.PI*2);
  ctx.fillStyle=color;ctx.fill();
}

function drawSbs0(ctx){
  _label(ctx,'Library preparation and cluster generation',400,18,14,COLORS.ink,'center','700');

  /* ── Panel 1: Fragment + adapters ── */
  const p1y=38;
  _label(ctx,'1',42,p1y+12,11,'#fff','center','700');
  ctx.beginPath();ctx.arc(42,p1y+12,9,0,Math.PI*2);ctx.fillStyle=COLORS.gd;ctx.fill();
  _label(ctx,'Fragment genomic DNA and ligate adapters',80,p1y+12,11,COLORS.gd,'left','600');

  // Genomic DNA (double helix simplified)
  const seq='ATGCTAGCATGC';
  const comp='TACGATCGTACG';
  _dnaStrand(ctx,55,p1y+34,200,seq.split(''),COLORS.gb,1);
  _dnaStrand(ctx,55,p1y+56,200,comp.split(''),COLORS.gb,-1);
  // Adapters on ends
  _roundRect(ctx,27,p1y+30,30,30,4,COLORS.gd+'22',COLORS.gd,1.5);
  _label(ctx,'P5',42,p1y+45,8,COLORS.gd,'center','700');
  _roundRect(ctx,253,p1y+30,30,30,4,COLORS.gc+'22',COLORS.gc,1.5);
  _label(ctx,'P7',268,p1y+45,8,COLORS.gc,'center','700');

  _arrow(ctx,295,p1y+45,330,p1y+45,COLORS.ink4,1.5);

  /* ── Panel 2: Bind to flow cell ── */
  _label(ctx,'2',345,p1y+12,11,'#fff','center','700');
  ctx.beginPath();ctx.arc(345,p1y+12,9,0,Math.PI*2);ctx.fillStyle=COLORS.gd;ctx.fill();
  _label(ctx,'Bind to flow cell surface',365,p1y+12,11,COLORS.gd,'left','600');

  // Flow cell surface with oligo lawn
  _flowSurface(ctx,335,p1y+55,200,10);
  const oligoCols=[COLORS.gd+'aa',COLORS.gc+'aa'];
  for(let i=0;i<14;i++){
    _oligo(ctx,345+i*14,p1y+55,4,oligoCols[i%2]);
  }
  // Bound fragment dangling from one oligo
  const bfx=385;
  ctx.strokeStyle=COLORS.gb;ctx.lineWidth=2;ctx.lineCap='round';
  ctx.beginPath();ctx.moveTo(bfx,p1y+40);ctx.lineTo(bfx+80,p1y+40);ctx.stroke();
  // P5 connects to surface
  ctx.strokeStyle=COLORS.gd;ctx.lineWidth=1.5;ctx.setLineDash([2,2]);
  ctx.beginPath();ctx.moveTo(bfx,p1y+40);ctx.lineTo(bfx-4,p1y+55);ctx.stroke();
  ctx.setLineDash([]);
  _label(ctx,'P5 hybridizes\nto surface oligo',bfx-8,p1y+32,7,COLORS.ink3,'right','500');

  _arrow(ctx,545,p1y+45,575,p1y+45,COLORS.ink4,1.5);

  /* ── Panel 3: Denature + wash ── */
  _label(ctx,'3',590,p1y+12,11,'#fff','center','700');
  ctx.beginPath();ctx.arc(590,p1y+12,9,0,Math.PI*2);ctx.fillStyle=COLORS.gd;ctx.fill();
  _label(ctx,'Denature: keep one strand',615,p1y+12,11,COLORS.gd,'left','600');

  _flowSurface(ctx,585,p1y+55,180,10);
  for(let i=0;i<12;i++){
    _oligo(ctx,595+i*14,p1y+55,4,oligoCols[i%2]);
  }
  // Single strand tethered
  ctx.strokeStyle=COLORS.gb;ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(635,p1y+40);ctx.lineTo(720,p1y+40);ctx.stroke();
  // Free end dangles up
  ctx.strokeStyle=COLORS.gb+'88';ctx.lineWidth=1.5;
  ctx.beginPath();ctx.moveTo(720,p1y+40);ctx.quadraticCurveTo(730,p1y+28,720,p1y+22);ctx.stroke();

  /* ── Panel 4: Bridge amplification ── */
  const p2y=p1y+80;
  _label(ctx,'4',42,p2y+8,11,'#fff','center','700');
  ctx.beginPath();ctx.arc(42,p2y+8,9,0,Math.PI*2);ctx.fillStyle=COLORS.gd;ctx.fill();
  _label(ctx,'Bridge amplification',62,p2y+8,11,COLORS.gd,'left','600');

  const bridgeSteps=[
    {x:65,label:'Single strand'},
    {x:220,label:'Bridge forms'},
    {x:375,label:'Polymerase extends'},
    {x:530,label:'Denature → 2 strands'},
    {x:685,label:'Repeat → cluster'}
  ];

  const surfY=p2y+80;
  for(let i=0;i<5;i++){
    const bx=bridgeSteps[i].x;
    // Surface
    _flowSurface(ctx,bx-50,surfY,100,8);
    // Oligos
    for(let j=0;j<4;j++){
      _oligo(ctx,bx-35+j*24,surfY,3,COLORS.ink4+'66');
    }

    if(i===0){
      // Single strand attached at left end, free at right
      ctx.strokeStyle=COLORS.gb;ctx.lineWidth=2.5;ctx.lineCap='round';
      ctx.beginPath();ctx.moveTo(bx-22,surfY);ctx.lineTo(bx-22,surfY-25);
      ctx.lineTo(bx+25,surfY-25);ctx.stroke();
      // Wavy free end
      ctx.strokeStyle=COLORS.gb+'88';ctx.lineWidth=1.5;
      ctx.beginPath();ctx.moveTo(bx+25,surfY-25);
      ctx.quadraticCurveTo(bx+35,surfY-18,bx+30,surfY-12);ctx.stroke();
    } else if(i===1){
      // Bridge: both ends attached, arc in middle
      ctx.strokeStyle=COLORS.gb;ctx.lineWidth=2.5;
      ctx.beginPath();ctx.moveTo(bx-25,surfY);
      ctx.quadraticCurveTo(bx-25,surfY-40,bx,surfY-42);
      ctx.quadraticCurveTo(bx+25,surfY-40,bx+25,surfY);ctx.stroke();
      // Dashed complement being synthesized
      ctx.strokeStyle=COLORS.bad+'88';ctx.lineWidth=1.5;ctx.setLineDash([3,2]);
      ctx.beginPath();ctx.moveTo(bx-22,surfY-2);
      ctx.quadraticCurveTo(bx-22,surfY-35,bx,surfY-37);
      ctx.quadraticCurveTo(bx+22,surfY-35,bx+22,surfY-2);ctx.stroke();
      ctx.setLineDash([]);
    } else if(i===2){
      // Polymerase extending: bridge with complement growing
      ctx.strokeStyle=COLORS.gb;ctx.lineWidth=2.5;
      ctx.beginPath();ctx.moveTo(bx-25,surfY);
      ctx.quadraticCurveTo(bx-25,surfY-40,bx,surfY-42);
      ctx.quadraticCurveTo(bx+25,surfY-40,bx+25,surfY);ctx.stroke();
      // Full complement
      ctx.strokeStyle=COLORS.bad;ctx.lineWidth=2;
      ctx.beginPath();ctx.moveTo(bx-22,surfY-2);
      ctx.quadraticCurveTo(bx-22,surfY-35,bx,surfY-37);
      ctx.quadraticCurveTo(bx+22,surfY-35,bx+22,surfY-2);ctx.stroke();
      // Polymerase dot
      ctx.beginPath();ctx.arc(bx+15,surfY-20,5,0,Math.PI*2);
      ctx.fillStyle=COLORS.ok;ctx.fill();
      _label(ctx,'pol',bx+15,surfY-20,5,'#fff','center','700');
    } else if(i===3){
      // Two separate strands after denaturation
      ctx.strokeStyle=COLORS.gb;ctx.lineWidth=2.5;
      ctx.beginPath();ctx.moveTo(bx-25,surfY);ctx.lineTo(bx-25,surfY-30);
      ctx.lineTo(bx-8,surfY-30);ctx.stroke();
      ctx.strokeStyle=COLORS.bad;ctx.lineWidth=2.5;
      ctx.beginPath();ctx.moveTo(bx+25,surfY);ctx.lineTo(bx+25,surfY-30);
      ctx.lineTo(bx+8,surfY-30);ctx.stroke();
    } else {
      // Cluster: many strands radiating from surface
      const Rc=rng(77);
      for(let j=0;j<16;j++){
        const ang=-Math.PI/2+Rc()*Math.PI-Math.PI/2;
        const len=15+Rc()*20;
        const col=j%2===0?COLORS.gb:COLORS.bad;
        ctx.strokeStyle=col+(Rc()>0.3?'88':'cc');ctx.lineWidth=1.2;
        ctx.beginPath();ctx.moveTo(bx+Rc()*30-15,surfY);
        ctx.lineTo(bx+Rc()*30-15+Math.cos(ang)*len,surfY+Math.sin(ang)*len);ctx.stroke();
      }
      // Glow circle
      const cg=ctx.createRadialGradient(bx,surfY-10,2,bx,surfY-10,22);
      cg.addColorStop(0,COLORS.gb+'33');cg.addColorStop(1,COLORS.gb+'00');
      ctx.fillStyle=cg;ctx.beginPath();ctx.arc(bx,surfY-10,22,0,Math.PI*2);ctx.fill();
    }

    _label(ctx,bridgeSteps[i].label,bx,surfY+18,8,COLORS.ink3,'center','500');
    if(i<4)_arrow(ctx,bx+52,surfY-15,bridgeSteps[i+1].x-52,surfY-15,COLORS.ink4+'88',1);
  }

  /* ── Panel 5: Flow cell with clusters ── */
  const p3y=surfY+35;
  _label(ctx,'5',42,p3y+8,11,'#fff','center','700');
  ctx.beginPath();ctx.arc(42,p3y+8,9,0,Math.PI*2);ctx.fillStyle=COLORS.gd;ctx.fill();
  _label(ctx,'Result: millions of clonal clusters, each from one original fragment',62,p3y+8,11,COLORS.gd,'left','600');

  // Flow cell rectangle
  _roundRect(ctx,55,p3y+22,690,105,8,'#0f172a11',COLORS.border,1);
  // Lane dividers
  for(let i=1;i<4;i++){
    ctx.strokeStyle=COLORS.border;ctx.lineWidth=0.5;ctx.setLineDash([4,4]);
    ctx.beginPath();ctx.moveTo(55+i*172.5,p3y+22);ctx.lineTo(55+i*172.5,p3y+127);ctx.stroke();
    ctx.setLineDash([]);
  }
  _label(ctx,'Lane 1',55+86,p3y+132,7,COLORS.ink4,'center','500');
  _label(ctx,'Lane 2',55+259,p3y+132,7,COLORS.ink4,'center','500');
  _label(ctx,'Lane 3',55+432,p3y+132,7,COLORS.ink4,'center','500');
  _label(ctx,'Lane 4',55+604,p3y+132,7,COLORS.ink4,'center','500');

  // Clusters as colored dots
  const Rf=rng(42);
  const clColors=[COLORS.gb,COLORS.gc,COLORS.gd,COLORS.ga,'#dc2626','#8b5cf6'];
  for(let i=0;i<200;i++){
    const cx=65+Rf()*670,cy=p3y+28+Rf()*92;
    const r=1.5+Rf()*2.5;
    const col=clColors[Math.floor(Rf()*clColors.length)];
    ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);
    ctx.fillStyle=col+'66';ctx.fill();
  }
  _label(ctx,'Each cluster ≈ 1,000 identical copies of one fragment',400,p3y+150,10,COLORS.ink3,'center','500');
}

function drawSbs1(ctx){
  _label(ctx,'Sequencing by synthesis: one base per cycle',400,18,14,COLORS.ink,'center','700');

  const bases=['A','T','G','C'];
  const baseCols=[COLORS.ok,'#dc2626',COLORS.gd,COLORS.gb];

  /* ── Main diagram: zoom into one cluster, one cycle ── */
  const zoomY=36;
  _label(ctx,'Zoomed view: one cycle on one cluster',170,zoomY,11,COLORS.gb,'left','600');

  // Template strand (top, 5'→3')
  const tx=50,ty=zoomY+28,tw=440;
  const tSeq='ATGCTAGCATGCTA'.split('');
  _dnaStrand(ctx,tx,ty,tw,tSeq,COLORS.ink4+'88',1);
  _label(ctx,"3'",tx-12,ty,9,COLORS.ink4,'right','600');
  _label(ctx,"5'",tx+tw+12,ty,9,COLORS.ink4,'left','600');
  _label(ctx,'Template',tx+tw/2,ty-12,9,COLORS.ink4,'center','500');

  // Growing complementary strand (bottom, read so far)
  const compBases='TACGATCG'.split('');
  const cw=tw*(compBases.length/tSeq.length);
  _dnaStrand(ctx,tx,ty+24,cw,compBases,COLORS.gb,-1);
  _label(ctx,"5'",tx-12,ty+24,9,COLORS.gb,'right','600');
  _label(ctx,'New strand (read)',tx+cw/2,ty+42,9,COLORS.gb,'center','500');

  // Incoming nucleotide at position 9 (next to add)
  const nextX=tx+cw+tw/tSeq.length*0.5;
  const nextBase='A';// complement of T
  const nextCol=baseCols[0];

  // Fluorescent nucleotide floating in
  for(let i=0;i<4;i++){
    const fx=nextX+12+i*28,fy=ty+18;
    const isMatch=i===0;
    ctx.globalAlpha=isMatch?1:0.3;
    ctx.beginPath();ctx.arc(fx,fy,8,0,Math.PI*2);
    ctx.fillStyle=baseCols[i]+'33';ctx.fill();
    ctx.strokeStyle=baseCols[i];ctx.lineWidth=isMatch?2:1;ctx.stroke();
    _monoLabel(ctx,bases[i],fx,fy,7,baseCols[i],'center');
    if(isMatch){
      // Glow effect
      const g=ctx.createRadialGradient(fx,fy,3,fx,fy,14);
      g.addColorStop(0,nextCol+'44');g.addColorStop(1,nextCol+'00');
      ctx.fillStyle=g;ctx.beginPath();ctx.arc(fx,fy,14,0,Math.PI*2);ctx.fill();
      // Arrow pointing down to template
      _arrow(ctx,fx,fy-14,fx,fy-22,nextCol,1.5);
      _label(ctx,'incorporates!',fx,fy+16,7,nextCol,'center','600');
    }
    ctx.globalAlpha=1;
  }
  // Blocker + fluorophore labels
  _label(ctx,'Each nucleotide carries:',nextX+120,ty+3,8,COLORS.ink3,'left','500');
  _label(ctx,'• reversible 3\' blocker (stops after 1 base)',nextX+120,ty+14,8,COLORS.ink3,'left','400');
  _label(ctx,'• fluorescent tag (unique color per base)',nextX+120,ty+25,8,COLORS.ink3,'left','400');

  /* ── 4-step cycle diagram ── */
  const cyY=ty+58;
  _label(ctx,'The SBS cycle (repeated 150-300 times):',170,cyY,11,COLORS.gd,'left','700');

  const cycleSteps=[
    {icon:'💧',title:'Flood with nucleotides',desc:'All 4 modified dNTPs\nadded simultaneously',col:COLORS.gb,x:100},
    {icon:'🔗',title:'One incorporates',desc:'Complementary base\nbinds; blocker stops\nfurther extension',col:COLORS.ok,x:280},
    {icon:'📸',title:'Image the clusters',desc:'Laser excites fluorophore;\ncamera captures color\nof every cluster',col:COLORS.gd,x:460},
    {icon:'✂',title:'Cleave & wash',desc:'Remove blocker +\nfluorophore; ready for\nnext cycle',col:COLORS.gc,x:640}
  ];

  for(let i=0;i<4;i++){
    const s=cycleSteps[i];
    // Step number circle
    ctx.beginPath();ctx.arc(s.x-52,cyY+28,10,0,Math.PI*2);
    ctx.fillStyle=s.col+'22';ctx.fill();ctx.strokeStyle=s.col;ctx.lineWidth=1.5;ctx.stroke();
    _label(ctx,(i+1)+'',s.x-52,cyY+28,10,s.col,'center','700');
    // Title
    _label(ctx,s.title,s.x+8,cyY+22,10,s.col,'center','700');
    // Description
    const lines=s.desc.split('\n');
    for(let l=0;l<lines.length;l++){
      _label(ctx,lines[l],s.x+8,cyY+38+l*13,8,COLORS.ink3,'center','400');
    }
    if(i<3)_arrow(ctx,s.x+72,cyY+28,cycleSteps[i+1].x-72,cyY+28,COLORS.ink4+'88',1);
  }
  // Cycle loop
  ctx.strokeStyle=COLORS.gd+'66';ctx.lineWidth=1.5;ctx.setLineDash([4,3]);
  ctx.beginPath();ctx.moveTo(710,cyY+40);ctx.lineTo(740,cyY+40);
  ctx.lineTo(740,cyY+75);ctx.lineTo(30,cyY+75);ctx.lineTo(30,cyY+28);ctx.lineTo(48,cyY+28);ctx.stroke();
  ctx.setLineDash([]);
  _label(ctx,'repeat',385,cyY+82,8,COLORS.gd,'center','600');

  /* ── Bottom: growing read + imaging ── */
  const rdY=cyY+95;
  _label(ctx,'Building a read, one base per cycle:',170,rdY,10,COLORS.gb,'left','600');

  const readSeq='ATGCTAGCATGCTAGCATGCTAGCATGCTA'.split('');
  const cellW=20,cellH=20;
  for(let i=0;i<30;i++){
    const x=55+i*cellW,y=rdY+14;
    const bIdx=bases.indexOf(readSeq[i]);
    const col=bIdx>=0?baseCols[bIdx]:COLORS.ink4;
    const alpha=i<22?1:0.3;
    ctx.globalAlpha=alpha;
    _roundRect(ctx,x,y,cellW-1,cellH,2,col,null);
    _monoLabel(ctx,readSeq[i],x+cellW/2,y+cellH/2,8,'#fff','center');
    ctx.globalAlpha=1;
    if(i<5||(i===14)||i===29)_monoLabel(ctx,(i+1)+'',x+cellW/2,y+cellH+8,6,COLORS.ink4,'center');
  }
  _label(ctx,'cycle',55+cellW/2,rdY+cellH+22,6,COLORS.ink4,'center','500');
  _label(ctx,'...',55+22*cellW+5,rdY+24,12,COLORS.ink4,'left','400');

  // Cluster imaging
  const imY=rdY+48;
  _label(ctx,'What the camera captures each cycle:',170,imY,10,COLORS.gb,'left','600');

  const R=rng(88);
  for(let cyc=0;cyc<5;cyc++){
    const ix=55+cyc*145,iy=imY+14;
    _roundRect(ctx,ix,iy,130,72,5,'#0f172a',COLORS.ink3+'88',1);
    _label(ctx,'Cycle '+(cyc+1),ix+65,iy-5,8,COLORS.ink3,'center','500');
    for(let d=0;d<30;d++){
      const dx=ix+8+R()*114,dy=iy+6+R()*60;
      const bi=Math.floor(R()*4);
      ctx.beginPath();ctx.arc(dx,dy,2.5,0,Math.PI*2);
      // Add glow for fluorescence effect
      const g=ctx.createRadialGradient(dx,dy,0,dx,dy,4);
      g.addColorStop(0,baseCols[bi]);g.addColorStop(1,baseCols[bi]+'00');
      ctx.fillStyle=g;ctx.fill();
      ctx.beginPath();ctx.arc(dx,dy,1.5,0,Math.PI*2);
      ctx.fillStyle=baseCols[bi];ctx.fill();
    }
  }
  _label(ctx,'Each dot = one cluster fluorescing one color → one base call',400,imY+100,9,COLORS.ink3,'center','500');
}

function drawSbs2(ctx){
  _label(ctx,'Paired-end sequencing and output files',400,18,14,COLORS.ink,'center','700');

  /* ── Top: Fragment on flow cell with R1 and R2 ── */
  const fy=40;
  _label(ctx,'Library fragment on flow cell',120,fy,11,COLORS.gb,'left','600');

  const fx=65,fw=670,fh=20;

  // Flow cell surface hint
  _flowSurface(ctx,fx-10,fy+fh+26,fw+20,8);

  // P5 adapter
  _roundRect(ctx,fx,fy+12,50,fh,4,COLORS.gd+'dd',COLORS.gd,1.5);
  _label(ctx,'P5',fx+25,fy+12+fh/2,9,'#fff','center','700');
  // Insert
  const g=ctx.createLinearGradient(fx+50,0,fx+fw-50,0);
  g.addColorStop(0,'#dbeafe');g.addColorStop(0.5,'#eff6ff');g.addColorStop(1,'#dbeafe');
  ctx.fillStyle=g;ctx.beginPath();ctx.rect(fx+50,fy+12,fw-100,fh);ctx.fill();
  ctx.strokeStyle=COLORS.gb;ctx.lineWidth=1;ctx.stroke();
  _label(ctx,'Insert DNA (~300-500 bp)',fx+fw/2,fy+12+fh/2,10,COLORS.gb,'center','600');
  // P7 adapter
  _roundRect(ctx,fx+fw-50,fy+12,50,fh,4,COLORS.gc+'dd',COLORS.gc,1.5);
  _label(ctx,'P7',fx+fw-25,fy+12+fh/2,9,'#fff','center','700');

  // R1 and R2 arrows with sequencing direction
  const ry=fy+fh+40;
  // R1
  const r1Start=fx+52,r1End=r1Start+220;
  _arrow(ctx,r1Start,ry,r1End,ry,COLORS.gb,2.5);
  _label(ctx,'Read 1 (R1)',r1Start+110,ry-12,11,COLORS.gb,'center','700');
  _label(ctx,'150 bp, sequenced first',r1Start+110,ry+14,8,COLORS.ink3,'center','500');
  // Primer site
  ctx.strokeStyle=COLORS.gd+'88';ctx.lineWidth=1;ctx.setLineDash([2,2]);
  ctx.beginPath();ctx.moveTo(r1Start,ry-6);ctx.lineTo(r1Start,fy+12+fh);ctx.stroke();
  ctx.setLineDash([]);

  // R2
  const r2End=fx+fw-52,r2Start=r2End-220;
  _arrow(ctx,r2End,ry,r2Start,ry,COLORS.gc,2.5);
  _label(ctx,'Read 2 (R2)',r2Start+110,ry-12,11,COLORS.gc,'center','700');
  _label(ctx,'150 bp, opposite direction',r2Start+110,ry+14,8,COLORS.ink3,'center','500');
  ctx.strokeStyle=COLORS.gc+'88';ctx.lineWidth=1;ctx.setLineDash([2,2]);
  ctx.beginPath();ctx.moveTo(r2End,ry-6);ctx.lineTo(r2End,fy+12+fh);ctx.stroke();
  ctx.setLineDash([]);

  // Insert size bracket
  const bry=ry+28;
  ctx.strokeStyle=COLORS.ink4;ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(fx+52,bry);ctx.lineTo(fx+52,bry+6);ctx.lineTo(fx+fw-52,bry+6);ctx.lineTo(fx+fw-52,bry);ctx.stroke();
  _label(ctx,'Insert size (known from library prep)',fx+fw/2,bry+16,9,COLORS.ink4,'center','500');

  /* ── Middle: How paired-end works mechanistically ── */
  const my=bry+34;
  _label(ctx,'How it works:',80,my,11,COLORS.gd,'left','700');

  const peSteps=[
    {x:100,title:'1. Sequence R1',desc:'Read from P5 primer\ninto the insert',col:COLORS.gb},
    {x:280,title:'2. Block + wash',desc:'Remove R1 primer;\ncluster stays intact',col:COLORS.ink3},
    {x:460,title:'3. Index read (opt.)',desc:'Read barcode for\nsample demultiplexing',col:COLORS.gd},
    {x:640,title:'4. Sequence R2',desc:'Read from P7 primer\ninto the insert\n(opposite direction)',col:COLORS.gc}
  ];

  for(let i=0;i<4;i++){
    const s=peSteps[i];
    _roundRect(ctx,s.x-60,my+16,120,62,6,s.col+'0a',s.col+'44',1);
    _label(ctx,s.title,s.x,my+28,9,s.col,'center','700');
    const lines=s.desc.split('\n');
    for(let l=0;l<lines.length;l++){
      _label(ctx,lines[l],s.x,my+42+l*12,8,COLORS.ink3,'center','400');
    }
    if(i<3)_arrow(ctx,s.x+62,my+47,peSteps[i+1].x-62,my+47,COLORS.ink4+'88',1);
  }

  /* ── Bottom left: Why R2 quality is lower ── */
  const wy=my+90;
  _label(ctx,'Why R2 quality is always lower:',150,wy,11,COLORS.bad,'left','700');

  const reasons=[
    {num:'1',text:'Reagent depletion:\nclusters have already\nbeen through R1 cycling',col:COLORS.ok,x:120},
    {num:'2',text:'Phasing accumulates:\nstrands fall out of sync\nover 300+ total cycles',col:COLORS.warn,x:310},
    {num:'3',text:'Cluster decay:\nsome copies are lost;\nsignal-to-noise drops',col:COLORS.bad,x:500}
  ];

  for(const r of reasons){
    ctx.beginPath();ctx.arc(r.x-52,wy+24,9,0,Math.PI*2);
    ctx.fillStyle=r.col+'22';ctx.fill();ctx.strokeStyle=r.col;ctx.lineWidth=1.5;ctx.stroke();
    _label(ctx,r.num,r.x-52,wy+24,9,r.col,'center','700');
    const lines=r.text.split('\n');
    for(let l=0;l<lines.length;l++){
      _label(ctx,lines[l],r.x+8,wy+18+l*13,8,COLORS.ink2,'center','400');
    }
  }

  /* ── Bottom right: Adapter read-through ── */
  _label(ctx,'Short-insert artifact:',655,wy,10,COLORS.gd,'center','700');

  // Mini short fragment
  const ax=610,ay=wy+16;
  _roundRect(ctx,ax,ay,16,14,3,COLORS.gd+'cc',COLORS.gd,1);
  _label(ctx,'P5',ax+8,ay+7,5,'#fff','center','700');
  _roundRect(ctx,ax+16,ay,58,14,0,'#dbeafe',COLORS.gb,1);
  _label(ctx,'short',ax+45,ay+7,6,COLORS.gb,'center','500');
  _roundRect(ctx,ax+74,ay,16,14,3,COLORS.gc+'cc',COLORS.gc,1);
  _label(ctx,'P7',ax+82,ay+7,5,'#fff','center','700');

  // R1 arrow overshooting into P7
  _arrow(ctx,ax+18,ay+20,ax+95,ay+20,COLORS.bad,1.5);
  _label(ctx,'R1 reads into adapter!',ax+45,ay+32,7,COLORS.bad,'center','600');
  _roundRect(ctx,ax-5,ay+40,100,22,5,'#ecfdf5',COLORS.ok,1);
  _label(ctx,'→ Trim with fastp',ax+45,ay+51,7,COLORS.ok,'center','600');

  /* ── Output files ── */
  _label(ctx,'Output:',655,wy+80,10,COLORS.ink2,'center','700');
  const files=[
    {name:'sample_R1.fastq.gz',col:COLORS.gb},
    {name:'sample_R2.fastq.gz',col:COLORS.gc}
  ];
  for(let i=0;i<2;i++){
    const fy2=wy+92+i*18;
    _roundRect(ctx,610,fy2,92,15,3,files[i].col+'11',files[i].col+'66',1);
    _monoLabel(ctx,files[i].name,656,fy2+7.5,6,files[i].col,'center');
  }
}

/* ═══════════════════════════════════════════════════════════
   11. ILLU-CANVAS — Illumina per-base quality (R1 vs R2)
   ═══════════════════════════════════════════════════════════ */

function drawIlluCanvas(){
  const ctx=_c('illu-canvas');if(!ctx)return;
  ctx.clearRect(0,0,800,440);

  const R=rng(99);
  const px=60,py=30,pw=700,ph=340;

  // Axes
  ctx.strokeStyle=COLORS.border;ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(px,py+ph);ctx.lineTo(px+pw,py+ph);ctx.stroke();

  // Y axis labels (Phred quality)
  _label(ctx,'Phred Q',px-30,py+ph/2,10,COLORS.ink3,'center','600');
  const qTicks=[0,10,20,30,40];
  for(const q of qTicks){
    const y=py+ph-q*(ph/42);
    ctx.strokeStyle=COLORS.border;ctx.lineWidth=0.5;
    ctx.beginPath();ctx.moveTo(px-4,y);ctx.lineTo(px+pw,y);ctx.stroke();
    _monoLabel(ctx,'Q'+q,px-10,y,8,COLORS.ink4,'right');
  }

  // Q20 threshold line
  const q20y=py+ph-20*(ph/42);
  ctx.strokeStyle=COLORS.warn+'88';ctx.lineWidth=1.5;ctx.setLineDash([6,4]);
  ctx.beginPath();ctx.moveTo(px,q20y);ctx.lineTo(px+pw,q20y);ctx.stroke();
  ctx.setLineDash([]);
  _label(ctx,'Q20 threshold',px+pw-60,q20y-8,9,COLORS.warn,'center','600');

  // X axis (position in read)
  const nPos=150;
  const bw=pw/nPos;
  for(let i=0;i<=nPos;i+=25){
    const x=px+i*bw;
    _monoLabel(ctx,i+'',x,py+ph+14,8,COLORS.ink4,'center');
  }
  _label(ctx,'Position in read (bp)',px+pw/2,py+ph+30,10,COLORS.ink3,'center','600');

  // Generate quality distributions — R1 (good, gentle decline) and R2 (worse, steeper decline)
  function drawQualityTrack(label,col,baseQ,decayStart,decayRate,yJitter){
    ctx.strokeStyle=col;ctx.lineWidth=2;ctx.beginPath();
    const medianPts=[];
    for(let i=0;i<nPos;i++){
      const decay=i>decayStart?(i-decayStart)*decayRate:0;
      const median=Math.max(2,baseQ-decay+R()*yJitter-yJitter/2);
      const q25=Math.max(1,median-3-R()*2);
      const q75=Math.min(41,median+3+R()*2);
      const x=px+i*bw+bw/2;
      const yMed=py+ph-median*(ph/42);
      const yQ25=py+ph-q25*(ph/42);
      const yQ75=py+ph-q75*(ph/42);
      medianPts.push({x,yMed,yQ25,yQ75});

      // IQR box
      ctx.globalAlpha=0.12;
      ctx.fillStyle=col;ctx.fillRect(x-bw/2+0.5,yQ75,bw-1,yQ25-yQ75);
      ctx.globalAlpha=1;
    }

    // Median line
    ctx.beginPath();ctx.moveTo(medianPts[0].x,medianPts[0].yMed);
    for(let i=1;i<medianPts.length;i++){ctx.lineTo(medianPts[i].x,medianPts[i].yMed)}
    ctx.strokeStyle=col;ctx.lineWidth=2;ctx.stroke();

    // Label
    const lx=px+pw-40,ly=medianPts[nPos-1].yMed;
    _label(ctx,label,lx,ly-10,11,col,'center','700');
  }

  drawQualityTrack('R1',COLORS.gb,36,40,0.10,3);
  drawQualityTrack('R2',COLORS.bad,34,20,0.18,4);

  // Adapter region indicator
  const adapterStart=120;
  ctx.fillStyle=COLORS.gd+'15';
  ctx.fillRect(px+adapterStart*bw,py,pw-adapterStart*bw,ph);
  ctx.strokeStyle=COLORS.gd;ctx.lineWidth=1;ctx.setLineDash([4,3]);
  ctx.beginPath();ctx.moveTo(px+adapterStart*bw,py);ctx.lineTo(px+adapterStart*bw,py+ph);ctx.stroke();
  ctx.setLineDash([]);
  _label(ctx,'Adapter read-through zone',px+(adapterStart+nPos)/2*bw*0.5+px*0.5+200,py+14,10,COLORS.gd,'center','600');
  _label(ctx,'(short inserts)',px+(adapterStart+nPos)/2*bw*0.5+px*0.5+200,py+28,9,COLORS.ink4,'center','500');

  // Legend
  _roundRect(ctx,px+140,py+ph-50,420,40,8,'#fff',COLORS.border,1);
  ctx.fillStyle=COLORS.gb;ctx.fillRect(px+160,py+ph-40,20,3);
  _label(ctx,'R1 (forward)',px+195,py+ph-38,10,COLORS.gb,'left','600');
  ctx.fillStyle=COLORS.bad;ctx.fillRect(px+310,py+ph-40,20,3);
  _label(ctx,'R2 (reverse, noisier)',px+345,py+ph-38,10,COLORS.bad,'left','600');
}

/* ═══════════════════════════════════════════════════════════
   11. HMMER-CANVAS — Multiple alignment → profile HMM → query
   ═══════════════════════════════════════════════════════════ */

function drawHmmerCanvas(){
  const ctx=_c('hmmer-canvas');if(!ctx)return;
  ctx.clearRect(0,0,800,440);

  const mx=30,my=20;

  // --- Part 1: Multiple alignment (top) ---
  _label(ctx,'1. Multiple alignment of family members',mx+200,my+10,12,COLORS.gc,'left','700');

  const seqs=[
    {name:'Prot A',seq:['M','K','T','-','-','V','V','I','G','A','G','F','L','A','S','S']},
    {name:'Prot B',seq:['M','K','T','A','A','V','V','V','G','A','G','F','L','A','S','S']},
    {name:'Prot C',seq:['M','R','T','-','-','V','I','I','G','A','G','F','L','A','S','S']},
    {name:'Prot D',seq:['M','K','S','-','-','V','V','I','G','A','G','Y','L','A','S','T']}
  ];
  const nCols=seqs[0].seq.length;
  const cellW=34,cellH=22,seqX=mx+70,seqY=my+25;

  // Conservation score per column
  const conservation=[];
  for(let c=0;c<nCols;c++){
    const aas=seqs.map(s=>s.seq[c]).filter(a=>a!=='-');
    const unique=new Set(aas);
    conservation.push(unique.size===1?1:unique.size===2?0.7:0.3);
  }

  for(let r=0;r<seqs.length;r++){
    _monoLabel(ctx,seqs[r].name,mx+40,seqY+r*cellH+cellH/2,9,COLORS.ink3,'right');
    for(let c=0;c<nCols;c++){
      const x=seqX+c*cellW,y=seqY+r*cellH;
      const aa=seqs[r].seq[c];
      const isGap=aa==='-';
      const cons=conservation[c];

      // Cell background
      const bg=isGap?'#f1f5f9':cons>=1?COLORS.gc+'33':cons>=0.7?COLORS.gc+'18':'#f8fafc';
      ctx.fillStyle=bg;ctx.fillRect(x,y,cellW-1,cellH-1);
      ctx.strokeStyle=COLORS.border;ctx.lineWidth=0.5;ctx.strokeRect(x,y,cellW-1,cellH-1);

      // Amino acid
      const col=isGap?COLORS.ink4:cons>=1?COLORS.gc:cons>=0.7?COLORS.gb:COLORS.ink3;
      _monoLabel(ctx,aa,x+cellW/2,y+cellH/2,11,col,'center');
    }
  }

  // Conservation bar below alignment
  const barY=seqY+seqs.length*cellH+6;
  for(let c=0;c<nCols;c++){
    const x=seqX+c*cellW,h=conservation[c]*18;
    const col=conservation[c]>=1?COLORS.gc:conservation[c]>=0.7?COLORS.gb:'#cbd5e1';
    ctx.fillStyle=col+'88';ctx.fillRect(x,barY+18-h,cellW-1,h);
  }
  _label(ctx,'Conservation',mx+40,barY+9,8,COLORS.ink4,'right','500');

  // Arrow down
  const arrowX=seqX+nCols*cellW/2,arrowY=barY+30;
  _arrow(ctx,arrowX,arrowY,arrowX,arrowY+30,COLORS.gc,2);
  _label(ctx,'Build model',arrowX+35,arrowY+15,10,COLORS.gc,'left','600');

  // --- Part 2: Profile HMM model ---
  const hmmY=arrowY+40;
  _label(ctx,'2. Profile HMM (position-specific probabilities)',mx+200,hmmY,12,COLORS.gc,'left','700');

  const modelY=hmmY+16;
  // Show model states as rounded boxes with probability info
  for(let c=0;c<nCols;c++){
    const x=seqX+c*cellW,y=modelY;
    const cons=conservation[c];
    const isInsert=seqs[0].seq[c]==='-'&&seqs[1].seq[c]!=='-'; // insert columns

    // Model state box
    const bg=cons>=1?COLORS.gc+'44':cons>=0.7?COLORS.gb+'33':'#f1f5f9';
    _roundRect(ctx,x,y,cellW-1,cellH+8,4,bg,cons>=0.7?COLORS.gc+'88':COLORS.border,1);

    // Most likely amino acid
    const aas=seqs.map(s=>s.seq[c]).filter(a=>a!=='-');
    const counts={};aas.forEach(a=>{counts[a]=(counts[a]||0)+1});
    const best=Object.entries(counts).sort((a,b)=>b[1]-a[1])[0];
    if(best){
      _monoLabel(ctx,best[0],x+cellW/2,y+10,12,cons>=1?COLORS.gc:COLORS.ink2,'center');
      const prob=Math.round(best[1]/aas.length*100);
      _monoLabel(ctx,prob+'%',x+cellW/2,y+24,7,COLORS.ink4,'center');
    }
  }

  // Arrow down to query
  const arrowY2=modelY+cellH+20;
  _arrow(ctx,arrowX,arrowY2,arrowX,arrowY2+30,COLORS.gb,2);
  _label(ctx,'Score query',arrowX+35,arrowY2+15,10,COLORS.gb,'left','600');

  // --- Part 3: Query matching ---
  const queryY=arrowY2+40;
  _label(ctx,'3. Query protein scored against model',mx+200,queryY,12,COLORS.gb,'left','700');

  const query=['M','K','R','L','I','V','A','A','F','L','A','G','F','L','A','S'];
  const qY=queryY+16;
  for(let c=0;c<nCols;c++){
    const x=seqX+c*cellW;
    const aa=query[c]||'?';
    const cons=conservation[c];

    // Check if query matches consensus
    const aas=seqs.map(s=>s.seq[c]).filter(a=>a!=='-');
    const isMatch=aas.includes(aa);

    const bg=isMatch?(cons>=1?'#dcfce7':'#ecfdf5'):'#fef2f2';
    const col=isMatch?COLORS.ok:COLORS.bad;
    ctx.fillStyle=bg;ctx.fillRect(x,qY,cellW-1,cellH-1);
    ctx.strokeStyle=col+'66';ctx.lineWidth=1;ctx.strokeRect(x,qY,cellW-1,cellH-1);
    _monoLabel(ctx,aa,x+cellW/2,qY+cellH/2,11,col,'center');
  }

  _label(ctx,'Query',mx+40,qY+cellH/2,9,COLORS.gb,'right','600');

  // Result box
  _roundRect(ctx,seqX+nCols*cellW+15,qY-8,175,36,8,'#dcfce7',COLORS.ok,1.5);
  _label(ctx,'E-value: 2.3e-45',seqX+nCols*cellW+102,qY+2,11,COLORS.ok,'center','700');
  _label(ctx,'Strong family match!',seqX+nCols*cellW+102,qY+18,9,COLORS.ok,'center','500');
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

  /* ── Illumina SBS sidebar card + header highlight ── */
  const sbsHeaders=['Step 1: Library prep & clustering','Step 2: Sequencing by synthesis','Step 3: Paired-end reads & output'];

  function sbsHighlight(step){
    for(let i=0;i<3;i++){
      const el=document.getElementById('sbs-card-'+i);if(!el)continue;
      el.style.opacity=i<=step?'1':'.4';
      el.style.transform=i===step?'scale(1.02)':'scale(1)';
      el.style.boxShadow=i===step?'0 4px 6px rgba(15,23,42,.04),0 2px 12px rgba(15,23,42,.06)':'0 1px 2px rgba(15,23,42,.04),0 1px 3px rgba(15,23,42,.06)';
    }
    const hdr=document.getElementById('sbs-header');
    if(hdr)hdr.textContent=sbsHeaders[step]||sbsHeaders[0];
  }

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

    if(i===SID('illumina-sbs')){setTimeout(()=>{drawSbsCanvas(0);sbsHighlight(0)},300)}
    if(i===SID('illumina-quality')){setTimeout(()=>drawIlluCanvas(),300)}
    if(i===SID('why-not-16s')){setTimeout(()=>drawTaxCanvas(),300)}
    if(i===SID('gtdb')){setTimeout(()=>drawGtdbCanvas(),300)}
    if(i===SID('gtdb-tk')){setTimeout(()=>{drawTkCanvas(0);tkHighlight(0)},300)}
    if(i===SID('gene-prediction')){setTimeout(()=>drawGpCanvas(),300)}
    if(i===SID('hmmer-concept')){setTimeout(()=>drawHmmerCanvas(),300)}
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
    if(si===SID('illumina-sbs')){
      const idx=parseInt(e.fragment.getAttribute('data-fragment-index'));
      drawSbsCanvas(idx+1);sbsHighlight(idx+1);
    }
  });

  Reveal.on('fragmenthidden',e=>{
    const si=Reveal.getState().indexh;
    if(si===SID('gtdb-tk')){
      const idx=parseInt(e.fragment.getAttribute('data-fragment-index'));
      drawTkCanvas(idx);tkHighlight(idx);
    }
    if(si===SID('illumina-sbs')){
      const idx=parseInt(e.fragment.getAttribute('data-fragment-index'));
      drawSbsCanvas(idx);sbsHighlight(idx);
    }
  });

  setTimeout(go,100);
});
