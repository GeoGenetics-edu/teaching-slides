
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

let taxStep=0;
function drawTaxCanvas(step){
  if(step!==undefined) taxStep=step;
  const ctx=_c('tax-canvas');if(!ctx)return;
  ctx.clearRect(0,0,800,440);

  /* ── Two-panel comparison: 16S vs genome-based ── */
  const pw=370,ph=280,py=10,gapX=16;
  const p1x=20,p2x=p1x+pw+gapX;

  /* ── Panel headers ── */
  _roundRect(ctx,p1x,py,pw,ph,10,'#fef2f2'+'44',COLORS.bad+'33',1);
  _label(ctx,'16S rRNA approach',p1x+pw/2,py+18,13,COLORS.bad,'center','700');
  _label(ctx,'Single gene, often missing from MAGs',p1x+pw/2,py+34,9,COLORS.ink4,'center','400');

  if(taxStep>=1){
  _roundRect(ctx,p2x,py,pw,ph,10,'#f0fdf4'+'44',COLORS.ok+'33',1);
  _label(ctx,'Genome-based approach',p2x+pw/2,py+18,13,COLORS.ok,'center','700');
  _label(ctx,'120+ universal marker genes',p2x+pw/2,py+34,9,COLORS.ink4,'center','400');
  }

  /* ── Shared tree structure (rectangular cladogram) ── */
  // Tips: 8 taxa with spacing
  const taxa=[
    {label:'MAG-01',isMag:true,col:COLORS.gd,has16s:true,markers:118},
    {label:'MAG-02',isMag:true,col:COLORS.gb,has16s:false,markers:115},
    {label:'Ref genome 1',isMag:false,col:COLORS.ink4,has16s:true,markers:120},
    {label:'MAG-03',isMag:true,col:COLORS.gc,has16s:false,markers:112},
    {label:'Ref genome 2',isMag:false,col:COLORS.ink4,has16s:true,markers:120},
    {label:'MAG-04',isMag:true,col:COLORS.warn,has16s:false,markers:108},
    {label:'Ref genome 3',isMag:false,col:COLORS.ink4,has16s:true,markers:120},
    {label:'MAG-05',isMag:true,col:'#6366f1',has16s:true,markers:119}
  ];
  const tipCount=taxa.length;

  function drawTree(ox,oy,w,h,showAll){
    const tipSpacing=h/(tipCount+1);
    const tipX=ox+w-4;
    const rootX=ox+10;

    // Compute tip Y positions
    const tipYs=[];
    for(let i=0;i<tipCount;i++) tipYs.push(oy+tipSpacing*(i+1));

    // Internal node structure (rectangular cladogram)
    // Clades: ((0,1),(2,(3,4))),((5,6),7)
    ctx.strokeStyle=COLORS.ink4+'66';ctx.lineWidth=1.5;ctx.lineCap='round';

    function hLine(x1,x2,y){ctx.beginPath();ctx.moveTo(x1,y);ctx.lineTo(x2,y);ctx.stroke()}
    function vLine(x,y1,y2){ctx.beginPath();ctx.moveTo(x,y1);ctx.lineTo(x,y2);ctx.stroke()}

    // Depths (x positions for internal nodes)
    const d1=rootX, d2=rootX+w*0.2, d3=rootX+w*0.4, d4=rootX+w*0.55, d5=rootX+w*0.7;

    // Clade A: taxa 0,1
    const cAy=(tipYs[0]+tipYs[1])/2;
    hLine(d5,tipX,tipYs[0]); hLine(d5,tipX,tipYs[1]);
    vLine(d5,tipYs[0],tipYs[1]);

    // Clade B: taxa 3,4
    const cBy=(tipYs[3]+tipYs[4])/2;
    hLine(d5,tipX,tipYs[3]); hLine(d5,tipX,tipYs[4]);
    vLine(d5,tipYs[3],tipYs[4]);

    // Clade C: taxa 2 + clade B
    const cCy=(tipYs[2]+cBy)/2;
    hLine(d4,tipX,tipYs[2]); hLine(d4,d5,cBy);
    vLine(d4,tipYs[2],cBy);

    // Clade D: clade A + clade C
    const cDy=(cAy+cCy)/2;
    hLine(d3,d5,cAy); hLine(d3,d4,cCy);
    vLine(d3,cAy,cCy);

    // Clade E: taxa 5,6
    const cEy=(tipYs[5]+tipYs[6])/2;
    hLine(d5,tipX,tipYs[5]); hLine(d5,tipX,tipYs[6]);
    vLine(d5,tipYs[5],tipYs[6]);

    // Clade F: clade E + taxon 7
    const cFy=(cEy+tipYs[7])/2;
    hLine(d4,d5,cEy); hLine(d4,tipX,tipYs[7]);
    vLine(d4,cEy,tipYs[7]);

    // Root: clade D + clade F
    const rootY=(cDy+cFy)/2;
    hLine(d1,d3,cDy); hLine(d1,d4,cFy);
    vLine(d1,cDy,cFy);

    // Draw tips
    for(let i=0;i<tipCount;i++){
      const t=taxa[i];
      const ty=tipYs[i];
      const canPlace=showAll||t.has16s;

      // Tip dot
      const r=t.isMag?5:3.5;
      ctx.beginPath();ctx.arc(tipX,ty,r,0,Math.PI*2);
      ctx.fillStyle=canPlace?t.col:(COLORS.ink4+'33');ctx.fill();
      if(t.isMag&&canPlace){ctx.strokeStyle=t.col;ctx.lineWidth=1.5;ctx.stroke()}

      // Label
      const labelCol=canPlace?(t.isMag?t.col:COLORS.ink4):(COLORS.ink4+'55');
      _label(ctx,t.label,tipX+10,ty,t.isMag?9:8,labelCol,'left',t.isMag?'700':'400');

      // Faded branch for missing taxa in 16S panel
      if(!showAll&&!t.has16s){
        // Draw X or question mark
        _label(ctx,'?',tipX-15,ty,11,COLORS.bad+'88','center','700');
      }

      // In genome panel: show marker count bar
      if(showAll&&t.isMag){
        const barX=tipX+70,barW=Math.round(t.markers/120*50),barH=6;
        _roundRect(ctx,barX,ty-barH/2,barW,barH,2,t.col+'44',t.col,0.5);
        _label(ctx,t.markers+'/120',barX+barW+4,ty,7,t.col,'left','600');
      }
    }

    // 16S panel: show which have 16S
    if(!showAll){
      for(let i=0;i<tipCount;i++){
        const t=taxa[i];
        if(!t.isMag) continue;
        const ty=tipYs[i];
        if(t.has16s){
          _roundRect(ctx,tipX+70,ty-7,28,14,3,'#dcfce7',COLORS.ok,1);
          _label(ctx,'16S',tipX+84,ty,7,COLORS.ok,'center','700');
        } else {
          _roundRect(ctx,tipX+70,ty-7,28,14,3,'#fef2f2',COLORS.bad,1);
          _label(ctx,'✗',tipX+84,ty,8,COLORS.bad,'center','700');
        }
      }
    }
  }

  /* ── Draw trees ── */
  drawTree(p1x+8,py+44,pw*0.5,ph-56,false);
  _label(ctx,'3 of 5 MAGs cannot be placed',p1x+pw/2,py+ph-12,11,COLORS.bad,'center','700');

  if(taxStep>=1){
    drawTree(p2x+8,py+44,pw*0.5,ph-56,true);
    _label(ctx,'All 5 MAGs placed with confidence',p2x+pw/2,py+ph-12,11,COLORS.ok,'center','700');
  }

  /* ── Bottom comparison summary ── */
  const by=py+ph+14;
  _roundRect(ctx,40,by,340,80,8,'#fef2f2'+'44',COLORS.bad+'33',1);
  _label(ctx,'16S rRNA',58,by+20,11,COLORS.bad,'left','700');
  _label(ctx,'Only ~40% of MAGs have 16S assembled',58,by+38,9,COLORS.ink3,'left','400');
  _label(ctx,'Limited resolution below family level',58,by+54,9,COLORS.ink3,'left','400');
  _label(ctx,'1 gene',58,by+72,8,COLORS.bad,'left','600');

  if(taxStep>=1){
  _roundRect(ctx,420,by,340,80,8,'#f0fdf4'+'44',COLORS.ok+'33',1);
  _label(ctx,'Genome-based (e.g. GTDB-Tk)',438,by+20,11,COLORS.ok,'left','700');
  _label(ctx,'Works for every MAG with enough completeness',438,by+38,9,COLORS.ink3,'left','400');
  _label(ctx,'Species-level resolution using 120 markers',438,by+54,9,COLORS.ink3,'left','400');
  _label(ctx,'120 genes',438,by+72,8,COLORS.ok,'left','600');
  }
}

/* ═══════════════════════════════════════════════════════════
   2. GTDB-CANVAS — GTDB tree with standardized ranks
   ═══════════════════════════════════════════════════════════ */

function drawGtdbCanvas(step){
  step=Math.min(step||0,2);
  const ctx=_c('gtdb-canvas');if(!ctx)return;
  ctx.clearRect(0,0,800,440);

  /* ── Horizontal dendrogram with RED scale ──
     X-axis = RED (0 at left, 1 at right)
     Colored vertical bands mark each rank boundary
     Tree drawn left→right so students read RED as distance from root */

  const L=60, R=750, T=55, B=390;           // tree area
  const treeW=R-L;
  const redX=r=>L+r*treeW;                  // RED→pixel

  // Rank definitions: name, RED median, colour
  const ranks=[
    {n:'Phylum',   abbr:'p__', red:0.18, col:COLORS.bad},
    {n:'Class',    abbr:'c__', red:0.32, col:COLORS.warn},
    {n:'Order',    abbr:'o__', red:0.43, col:COLORS.gd},
    {n:'Family',   abbr:'f__', red:0.56, col:COLORS.gb},
    {n:'Genus',    abbr:'g__', red:0.72, col:COLORS.gc},
  ];

  // ── 1. Draw rank bands (±0.1 around median) — only from step 1 ──
  if(step>=1) for(const rk of ranks){
    const x0=redX(rk.red-0.1), x1=redX(rk.red+0.1);
    ctx.fillStyle=rk.col+'10';
    ctx.fillRect(x0,T-10,x1-x0,B-T+20);
    // Centre line (median)
    ctx.strokeStyle=rk.col+'55';ctx.lineWidth=1;
    ctx.setLineDash([6,4]);
    ctx.beginPath();ctx.moveTo(redX(rk.red),T-10);ctx.lineTo(redX(rk.red),B+10);ctx.stroke();
    ctx.setLineDash([]);
    // Rank label at top
    _label(ctx,rk.n,redX(rk.red),T-22,10,rk.col,'center','700');
  }

  // ── 2. RED scale axis at bottom ──
  ctx.strokeStyle=COLORS.ink3;ctx.lineWidth=1.5;
  ctx.beginPath();ctx.moveTo(L,B+14);ctx.lineTo(R,B+14);ctx.stroke();
  // Arrow head
  ctx.beginPath();ctx.moveTo(R,B+14);ctx.lineTo(R-6,B+10);ctx.lineTo(R-6,B+18);ctx.closePath();
  ctx.fillStyle=COLORS.ink3;ctx.fill();
  for(let v=0;v<=10;v++){
    const x=redX(v/10);
    ctx.strokeStyle=COLORS.ink4;ctx.lineWidth=0.8;
    ctx.beginPath();ctx.moveTo(x,B+10);ctx.lineTo(x,B+18);ctx.stroke();
    if(v%2===0) _label(ctx,(v/10).toFixed(1),x,B+30,9,COLORS.ink3,'center','500');
  }
  _label(ctx,'RED = 0  (root)',L,B+42,9,COLORS.ink3,'left','600');
  _label(ctx,'RED = 1  (tips)',R,B+42,9,COLORS.ink3,'right','600');
  // Axis title: spell out the acronym prominently
  _label(ctx,'Relative Evolutionary Divergence (RED)',L+treeW/2,B+42,10,COLORS.ink2,'center','700');

  // ── 3. Tree (asymmetric rectangular dendrogram) ──
  // Declarative tree: each node = {red, ch:[...]} or leaf {red, lbl}
  // Asymmetric: Phylum A has 5 tips (3+2), Phylum B has 4 tips (1+3)
  const tree={red:0,ch:[
    {red:0.18,ch:[                           // Phylum A
      {red:0.31,ch:[                         //   Class A1
        {red:0.42,ch:[                       //     Order A1a
          {red:0.55,ch:[                     //       Family A1a-i
            {red:0.73,ch:[                   //         Genus alpha
              {red:0.96,lbl:'Sp. A'},
              {red:0.98,lbl:'Sp. B'},
            ]},
            {red:0.70,lbl:'Sp. C'},          //         singleton genus
          ]},
        ]},
        {red:0.44,ch:[                       //     Order A1b
          {red:0.57,ch:[                     //       Family A1b-i
            {red:0.74,ch:[                   //         Genus beta
              {red:0.95,lbl:'Sp. D'},
              {red:0.97,lbl:'Sp. E'},
            ]},
          ]},
        ]},
      ]},
    ]},
    {red:0.20,ch:[                           // Phylum B
      {red:0.34,ch:[                         //   Class B1
        {red:0.43,ch:[                       //     Order B1a
          {red:0.56,ch:[                     //       Family B1a-i
            {red:0.72,ch:[                   //         Genus gamma
              {red:0.97,lbl:'Sp. F'},
              {red:0.99,lbl:'Sp. G'},
            ]},
          ]},
        ]},
        {red:0.46,ch:[                       //     Order B1b
          {red:0.58,ch:[                     //       Family B1b-i
            {red:0.74,ch:[                   //         Genus delta
              {red:0.95,lbl:'Sp. H'},
              {red:0.96,lbl:'Sp. I'},
            ]},
          ]},
        ]},
      ]},
    ]},
  ]};

  // Lay out y-positions: assign tips sequentially, internal = midpoint
  const tipSpacing=(B-T-10)/8; // 9 tips
  let tipIdx=0;
  function layoutY(node){
    if(node.lbl!==undefined){node.y=T+8+tipIdx*tipSpacing;tipIdx++;return;}
    for(const c of node.ch) layoutY(c);
    const ys=node.ch.map(c=>c.y);
    node.y=(Math.min(...ys)+Math.max(...ys))/2;
  }
  layoutY(tree);

  // Draw tree: thin elbow connectors (vertical bar + horizontal to each child)
  const tc=COLORS.ink3+'cc';
  function drawTree(node){
    if(!node.ch)return;
    const nx=redX(node.red);
    const ys=node.ch.map(c=>c.y);
    // Vertical span
    ctx.strokeStyle=tc;ctx.lineWidth=1.2;ctx.lineCap='round';
    ctx.beginPath();ctx.moveTo(nx,Math.min(...ys));ctx.lineTo(nx,Math.max(...ys));ctx.stroke();
    // Horizontal to each child
    for(const c of node.ch){
      ctx.beginPath();ctx.moveTo(nx,c.y);ctx.lineTo(redX(c.red),c.y);ctx.stroke();
      drawTree(c);
    }
  }
  drawTree(tree);

  // Collect tips and internal nodes for labelling/dots
  const tips=[], internals=[];
  function collect(node){
    if(node.lbl!==undefined){tips.push(node);return;}
    internals.push(node);
    for(const c of node.ch) collect(c);
  }
  collect(tree);

  // ── 4. Tip labels ──
  for(const t of tips){
    const tx=redX(t.red);
    ctx.beginPath();ctx.arc(tx,t.y,3,0,Math.PI*2);
    ctx.fillStyle=COLORS.gb;ctx.fill();
    _label(ctx,t.lbl,tx+8,t.y+1,9,COLORS.ink2,'left','500');
  }

  // ── 5. Root marker — offset left, not overlapping tree ──
  const rootX=redX(0)-20;
  ctx.strokeStyle=COLORS.ink3+'cc';ctx.lineWidth=1.2;
  ctx.beginPath();ctx.moveTo(rootX,tree.y);ctx.lineTo(redX(0),tree.y);ctx.stroke();
  ctx.beginPath();ctx.arc(rootX,tree.y,4,0,Math.PI*2);
  ctx.fillStyle=COLORS.ink;ctx.fill();
  _label(ctx,'Root',rootX-4,tree.y-12,10,COLORS.ink,'center','700');

  // ── 6. Node dots at every split ──
  const rankCol=function(red){
    if(red<0.25) return ranks[0].col;
    if(red<0.38) return ranks[1].col;
    if(red<0.50) return ranks[2].col;
    if(red<0.64) return ranks[3].col;
    return ranks[4].col;
  };
  for(let ni=0;ni<internals.length;ni++){
    const nd=internals[ni];
    if(nd.red===0)continue;
    const rc=rankCol(nd.red);
    const col=step>=2?rc:COLORS.ink4;
    ctx.beginPath();ctx.arc(redX(nd.red),nd.y,4.5,0,Math.PI*2);
    ctx.fillStyle=col;ctx.fill();
    ctx.strokeStyle='#fff';ctx.lineWidth=1.2;ctx.stroke();
  }
  if(step>=2){
    // Callout
    _roundRect(ctx,L+2,B-32,230,26,4,'#fff8f0',ranks[0].col+'44',1);
    _label(ctx,'Every split lands in its rank\'s band',L+117,B-19,9,ranks[0].col,'center','600');
  }

  // ── 7. Title (changes with step) ──
  const titles=[
    'X-axis = RED: normalized distance from root (0) to tips (1)',
    'Each rank occupies a fixed RED band (median \xb1 0.1)',
    'Same RED depth = same rank, regardless of lineage'
  ];
  _label(ctx,titles[step]||titles[0],400,18,13,COLORS.ink,'center','700');

  // ── 8. Bracket (step >= 1) ──
  if(step>=1){
    const oBandL=redX(0.33),oBandR=redX(0.53);
    const annY2=B+4;
    ctx.strokeStyle=COLORS.ink3;ctx.lineWidth=1;
    ctx.beginPath();
    ctx.moveTo(oBandL,annY2);ctx.lineTo(oBandL,annY2+5);
    ctx.lineTo(oBandR,annY2+5);ctx.lineTo(oBandR,annY2);ctx.stroke();
    _label(ctx,'median \xb1 0.1',redX(0.43),annY2+14,8,COLORS.ink3,'center','600');
  }
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
  // Step 2: Place MAG on reference tree — proper rectangular dendrogram
  _label(ctx,'GTDB reference tree',400,25,14,COLORS.ink2,'center','700');

  // Declarative tree: {x: depth level, ch:[...]} or leaf {x, lbl}
  // x = horizontal position (depth), y assigned by layout
  const L=60, R=420, T=50, B=370;
  const depths=[L, L+90, L+180, L+270, R]; // root, d1, d2, d3, tips

  const tree={x:0,ch:[
    {x:1,ch:[                               // clade A
      {x:2,ch:[
        {x:3,ch:[{x:4,lbl:'Ref 1'},{x:4,lbl:'Ref 2'}]},
        {x:3,lbl:'Ref 3'},
      ]},
      {x:2,ch:[{x:3,ch:[{x:4,lbl:'Ref 4'},{x:4,lbl:'Ref 5'}]}]},
    ]},
    {x:1,ch:[                               // clade B
      {x:2,ch:[{x:3,ch:[{x:4,lbl:'Ref 6'},{x:4,lbl:'Ref 7'}]}]},
    ]},
  ]};

  // Layout: assign y-positions
  const tipCount=7;
  const tipSpacing=(B-T)/(tipCount-1);
  let tipIdx=0;
  function layoutY(node){
    if(node.lbl!==undefined){node.y=T+tipIdx*tipSpacing;tipIdx++;return;}
    for(const c of node.ch) layoutY(c);
    const ys=node.ch.map(c=>c.y);
    node.y=(Math.min(...ys)+Math.max(...ys))/2;
  }
  layoutY(tree);

  // Draw: elbow connectors
  const lc=COLORS.border;
  function drawElbow(node){
    if(!node.ch)return;
    const nx=depths[node.x];
    const ys=node.ch.map(c=>c.y);
    // Vertical span
    ctx.strokeStyle=lc;ctx.lineWidth=1.5;ctx.lineCap='round';
    ctx.beginPath();ctx.moveTo(nx,Math.min(...ys));ctx.lineTo(nx,Math.max(...ys));ctx.stroke();
    // Horizontal to each child
    for(const c of node.ch){
      ctx.beginPath();ctx.moveTo(nx,c.y);ctx.lineTo(depths[c.x],c.y);ctx.stroke();
      drawElbow(c);
    }
  }
  // Root horizontal
  ctx.strokeStyle=lc;ctx.lineWidth=1.5;
  ctx.beginPath();ctx.moveTo(depths[0]-20,tree.y);ctx.lineTo(depths[0],tree.y);ctx.stroke();
  drawElbow(tree);

  // Collect all nodes
  const tips=[], internals=[];
  function collect(node){
    if(node.lbl!==undefined){tips.push(node);return;}
    internals.push(node);
    for(const c of node.ch) collect(c);
  }
  collect(tree);

  // Internal node dots
  for(const nd of internals){
    ctx.beginPath();ctx.arc(depths[nd.x],nd.y,3.5,0,Math.PI*2);
    ctx.fillStyle=COLORS.ink4;ctx.fill();
    ctx.strokeStyle='#fff';ctx.lineWidth=1;ctx.stroke();
  }

  // Tip dots + labels
  for(const t of tips){
    ctx.beginPath();ctx.arc(depths[t.x],t.y,4,0,Math.PI*2);
    ctx.fillStyle=COLORS.ink3+'99';ctx.fill();
    _label(ctx,t.lbl,depths[t.x]+10,t.y+1,9.5,COLORS.ink3,'left','500');
  }

  // Root marker
  ctx.beginPath();ctx.arc(depths[0]-20,tree.y,4,0,Math.PI*2);
  ctx.fillStyle=COLORS.ink;ctx.fill();

  // ── MAG insertion: between Ref 3 and clade with Ref 4/5 ──
  // Insert MAG as a new branch off the depth-2 node of clade A, second child
  const insertNode=tree.ch[0].ch[1]; // {x:2, ch:[...]} — parent of Ref 4/5
  const insertX=depths[insertNode.x];
  const insertY=insertNode.y;
  const magX=depths[3]+30, magY=insertY+38;

  // Dashed insertion branch
  ctx.strokeStyle=COLORS.gd;ctx.lineWidth=2;ctx.setLineDash([4,3]);
  ctx.beginPath();ctx.moveTo(insertX,insertY);ctx.lineTo(insertX,magY);
  ctx.lineTo(magX,magY);ctx.stroke();
  ctx.setLineDash([]);

  // MAG node with glow
  ctx.shadowColor=COLORS.gd;ctx.shadowBlur=10;
  ctx.beginPath();ctx.arc(magX,magY,11,0,Math.PI*2);
  ctx.fillStyle=COLORS.gd+'22';ctx.fill();
  ctx.strokeStyle=COLORS.gd;ctx.lineWidth=2;ctx.stroke();
  ctx.shadowBlur=0;
  _label(ctx,'MAG',magX,magY,9,COLORS.gd,'center','700');

  // pplacer label box
  _roundRect(ctx,490,magY-18,250,36,8,COLORS.gb+'11',COLORS.gb+'88',1);
  _label(ctx,'pplacer placement',615,magY,11,COLORS.gb,'center','600');
  _arrow(ctx,magX+13,magY,488,magY,COLORS.gb,1.5);

  // Legend
  _roundRect(ctx,80,B+16,520,36,8,'#eff6ff',COLORS.gb+'44',1);
  _label(ctx,'MAG is inserted into the reference tree based on concatenated marker alignment',340,B+34,10,COLORS.gb,'center','600');

  // Ref label
  _label(ctx,'Reference genomes',R+10,B+60,9,COLORS.ink4,'center','500');
}

function drawTkStep2(ctx){
  // Step 3: ANI species concept + lineage assignment
  _label(ctx,'Species = cluster of genomes with ANI > 95%',400,20,13,COLORS.ink2,'center','700');

  // ── 1. ANI clustering diagram ──
  // Clusters: organic dot scatter, no overlaps with MAG or annotations
  const clusters=[
    {cx:135,cy:150,r:72,col:COLORS.gb,name:'Species A',
     pts:[{dx:-35,dy:-18},{dx:-8,dy:-38},{dx:22,dy:-25},{dx:38,dy:-5},{dx:28,dy:22},{dx:-5,dy:30},{dx:-32,dy:12}]},
    {cx:380,cy:155,r:66,col:COLORS.gc,name:'Species B',
     pts:[{dx:15,dy:-35},{dx:38,dy:-12},{dx:32,dy:22},{dx:5,dy:35},{dx:-40,dy:-2},{dx:-18,dy:-22}]},
    {cx:615,cy:148,r:64,col:COLORS.gd,name:'Species C',
     pts:[{dx:-28,dy:-25},{dx:8,dy:-32},{dx:32,dy:-10},{dx:25,dy:22},{dx:-10,dy:28},{dx:-30,dy:8}]},
  ];

  // Draw 95% ANI radius circles with soft gradient fill
  for(const cl of clusters){
    const grad=ctx.createRadialGradient(cl.cx,cl.cy,0,cl.cx,cl.cy,cl.r);
    grad.addColorStop(0,cl.col+'10');grad.addColorStop(1,cl.col+'03');
    ctx.beginPath();ctx.arc(cl.cx,cl.cy,cl.r,0,Math.PI*2);
    ctx.fillStyle=grad;ctx.fill();
    ctx.strokeStyle=cl.col+'44';ctx.lineWidth=1.2;ctx.setLineDash([5,4]);ctx.stroke();
    ctx.setLineDash([]);
    // Cluster label above
    _label(ctx,cl.name,cl.cx,cl.cy-cl.r-14,11,cl.col,'center','700');
  }

  // Draw genome reference dots
  const dotR=5.5;
  for(const cl of clusters){
    for(const p of cl.pts){
      ctx.beginPath();ctx.arc(cl.cx+p.dx,cl.cy+p.dy,dotR,0,Math.PI*2);
      ctx.fillStyle=cl.col+'bb';ctx.fill();
      ctx.strokeStyle='#fff';ctx.lineWidth=1;ctx.stroke();
    }
  }

  // Centroid markers (small +)
  for(const cl of clusters){
    ctx.strokeStyle=cl.col+'99';ctx.lineWidth=1.2;
    ctx.beginPath();ctx.moveTo(cl.cx-5,cl.cy);ctx.lineTo(cl.cx+5,cl.cy);ctx.stroke();
    ctx.beginPath();ctx.moveTo(cl.cx,cl.cy-5);ctx.lineTo(cl.cx,cl.cy+5);ctx.stroke();
  }

  // 95% ANI radius arrow on Species A (centroid → edge, angled to avoid dots)
  const aCl=clusters[0];
  const arrowAngle=0.25; // slight downward-right angle — avoids all dots
  const edgeX=aCl.cx+Math.cos(arrowAngle)*(aCl.r-2);
  const edgeY=aCl.cy+Math.sin(arrowAngle)*(aCl.r-2);
  ctx.strokeStyle=aCl.col;ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(aCl.cx,aCl.cy);ctx.lineTo(edgeX,edgeY);ctx.stroke();
  // Arrowhead
  const aLen=7,aAng=0.45;
  ctx.beginPath();
  ctx.moveTo(edgeX,edgeY);
  ctx.lineTo(edgeX-aLen*Math.cos(arrowAngle-aAng),edgeY-aLen*Math.sin(arrowAngle-aAng));
  ctx.moveTo(edgeX,edgeY);
  ctx.lineTo(edgeX-aLen*Math.cos(arrowAngle+aAng),edgeY-aLen*Math.sin(arrowAngle+aAng));
  ctx.stroke();
  // Label alongside the arrow, offset below midpoint
  const midAX=(aCl.cx+edgeX)/2,midAY=(aCl.cy+edgeY)/2;
  _label(ctx,'95% ANI',midAX+12,midAY+18,8,aCl.col,'left','700');

  // MAG: inside Species B — lower-left, clear of all ref dots and centroid
  const magX=355,magY=178;
  ctx.shadowColor=COLORS.bad;ctx.shadowBlur=10;
  ctx.beginPath();ctx.arc(magX,magY,9,0,Math.PI*2);
  ctx.fillStyle=COLORS.bad+'55';ctx.fill();
  ctx.strokeStyle=COLORS.bad;ctx.lineWidth=2;ctx.stroke();
  ctx.shadowBlur=0;
  _label(ctx,'MAG',magX,magY+1,7.5,COLORS.bad,'center','700');

  // ANI distance line: MAG ↔ nearest ref genome dot in B
  const bCl=clusters[1];
  // Connect to actual dot at {dx:15,dy:-35} = (395,120)
  const nearX=bCl.cx+15,nearY=bCl.cy-35;
  // Compute direction and start/end at circle edges
  const adx=nearX-magX,ady=nearY-magY;
  const alen=Math.sqrt(adx*adx+ady*ady);
  const aux=adx/alen,auy=ady/alen;
  const magR=9; // MAG circle radius
  const lineX0=magX+aux*magR,lineY0=magY+auy*magR;
  const lineX1=nearX-aux*dotR,lineY1=nearY-auy*dotR;
  ctx.strokeStyle=COLORS.ok;ctx.lineWidth=1;ctx.setLineDash([3,2]);
  ctx.beginPath();ctx.moveTo(lineX0,lineY0);ctx.lineTo(lineX1,lineY1);ctx.stroke();
  ctx.setLineDash([]);
  // Arrowheads on both ends
  const aH=6,aW=0.4;
  ctx.fillStyle=COLORS.ok;
  // Arrow at ref end (top)
  ctx.beginPath();
  ctx.moveTo(lineX1,lineY1);
  ctx.lineTo(lineX1-aH*(aux+aW*auy),lineY1-aH*(auy-aW*aux));
  ctx.lineTo(lineX1-aH*(aux-aW*auy),lineY1-aH*(auy+aW*aux));
  ctx.closePath();ctx.fill();
  // Arrow at MAG end (bottom)
  ctx.beginPath();
  ctx.moveTo(lineX0,lineY0);
  ctx.lineTo(lineX0+aH*(aux+aW*auy),lineY0+aH*(auy-aW*aux));
  ctx.lineTo(lineX0+aH*(aux-aW*auy),lineY0+aH*(auy+aW*aux));
  ctx.closePath();ctx.fill();
  // 97.8% label — alongside the dashed line, offset right
  const lblX=(lineX0+lineX1)/2+16,lblY=(lineY0+lineY1)/2;
  _label(ctx,'97.8%',lblX,lblY,8.5,COLORS.ok,'center','700');

  // Inter-cluster gap lines (A↔B and B↔C)
  const gaps=[
    {from:clusters[0],to:clusters[1]},
    {from:clusters[1],to:clusters[2]},
  ];
  for(const g of gaps){
    const x1=g.from.cx+g.from.r+6,x2=g.to.cx-g.to.r-6;
    const y=(g.from.cy+g.to.cy)/2+2;
    ctx.strokeStyle=COLORS.ink4+'55';ctx.lineWidth=0.7;ctx.setLineDash([2,3]);
    ctx.beginPath();ctx.moveTo(x1,y);ctx.lineTo(x2,y);ctx.stroke();
    ctx.setLineDash([]);
    _label(ctx,'< 95%',(x1+x2)/2,y-9,8,COLORS.ink4,'center','500');
  }

  // ── 2. Lineage result ──
  const by=260;
  _roundRect(ctx,30,by,740,55,8,'#fff',COLORS.border,1);
  _label(ctx,'Assigned lineage:',68,by+14,10,COLORS.ink3,'left','600');

  ctx.font='500 9px "DM Mono",Consolas,monospace';
  const lineage='d__Bacteria; p__Bacteroidota; c__Bacteroidia; o__Bacteroidales; f__Bacteroidaceae; g__Bacteroides; s__Bacteroides_A sp003456789';
  const pCols={d:COLORS.ink3,p:COLORS.bad,c:COLORS.warn,o:COLORS.gd,f:COLORS.gb,g:COLORS.gc,s:COLORS.ga};
  let lx=50;
  const parts=lineage.split(/(;\s*)/);
  for(const part of parts){
    const m=part.match(/^([a-z])__/);
    if(m){
      const pre=m[0],rest=part.slice(pre.length);
      ctx.fillStyle=pCols[m[1]]||COLORS.ink3;ctx.textAlign='left';ctx.textBaseline='middle';
      ctx.fillText(pre,lx,by+37);lx+=ctx.measureText(pre).width;
      ctx.fillStyle=COLORS.ink;
      ctx.fillText(rest,lx,by+37);lx+=ctx.measureText(rest).width;
    } else {
      ctx.fillStyle=COLORS.ink4;ctx.textAlign='left';ctx.textBaseline='middle';
      ctx.fillText(part,lx,by+37);lx+=ctx.measureText(part).width;
    }
  }

  // ── 3. Key-point cards ──
  const ky=by+70;
  const cardW=230,cardGap=15,totalW=cardW*3+cardGap*2;
  const startX=(800-totalW)/2;
  const points=[
    {icon:'Within species:',val:'ANI > 95%',col:COLORS.ok},
    {icon:'Between species:',val:'ANI < 95%',col:COLORS.ink3},
    {icon:'Your MAG:',val:'97.8% → s__Bacteroides_A',col:COLORS.bad},
  ];
  for(let i=0;i<points.length;i++){
    const px=startX+i*(cardW+cardGap);
    const p=points[i];
    _roundRect(ctx,px,ky,cardW,36,6,p.col+'08',p.col+'33',1);
    _label(ctx,p.icon,px+cardW/2,ky+12,9,p.col,'center','600');
    _label(ctx,p.val,px+cardW/2,ky+26,10,p.col,'center','700');
  }

  // ── 4. Bottom note ──
  _roundRect(ctx,120,ky+48,560,22,5,'#fffbeb',COLORS.gd+'33',1);
  _label(ctx,'Always report: GTDB version, ANI value, and markers recovered',400,ky+59,8.5,COLORS.gd,'center','600');
}

/* ═══════════════════════════════════════════════════════════
   4. GP-CANVAS — Gene prediction (Prodigal algorithm steps)
   ═══════════════════════════════════════════════════════════ */

const gpHeaders=[
  'Step 1: Scan all 6 reading frames for ORFs',
  'Step 2: Score each ORF by coding potential',
  'Step 3: Select optimal gene set & refine starts',
  'Final predicted genes',
];

function gpHighlight(step){
  for(let i=0;i<3;i++){
    const el=document.getElementById('gp-card-'+i);
    if(el) el.style.opacity=step<=i? (step===i?1:0.35) : (i<step?0.5:0.35);
  }
  const h=document.getElementById('gp-header');
  if(h) h.textContent=gpHeaders[Math.min(step,3)];
}

function drawGpCanvas(step){
  step=step||0;
  const ctx=_c('gp-canvas');if(!ctx)return;
  ctx.clearRect(0,0,800,440);

  const R=rng(42);
  const cX=30,cY=8,cW=740,cH=12;

  // Contig backbone
  _roundRect(ctx,cX,cY,cW,cH,3,'#e2e8f0','#cbd5e1',1);
  _label(ctx,'Contig sequence (5\' → 3\')',cX+cW/2,cY+6,7.5,COLORS.ink3,'center','600');

  // Scale bar
  for(let i=0;i<=10;i++){
    const x=cX+i*(cW/10);
    ctx.strokeStyle=COLORS.border;ctx.lineWidth=0.5;
    ctx.beginPath();ctx.moveTo(x,cY+cH);ctx.lineTo(x,cY+cH+3);ctx.stroke();
    if(i%2===0)_monoLabel(ctx,(i*500)+'',x,cY+cH+10,6,COLORS.ink4,'center');
  }

  const frameLabels=['+1','+2','+3','−1','−2','−3'];
  // Step description line sits between ruler and frames
  const descY=cY+cH+22;
  const fY=descY+14;
  const fH=38,fGap=5;

  // All candidate ORFs: real genes + random short ORFs
  // Each has a coding score (0-1) that Prodigal would assign
  const orfs=[
    // Frame +1: dense with real genes
    {f:0,s:0.05,e:0.22,real:true,lbl:'geneA',score:0.92},
    {f:0,s:0.25,e:0.28,real:false,lbl:'',score:0.12},
    {f:0,s:0.30,e:0.52,real:true,lbl:'geneB',score:0.95},
    {f:0,s:0.56,e:0.59,real:false,lbl:'',score:0.08},
    {f:0,s:0.60,e:0.78,real:true,lbl:'geneC',score:0.88},
    {f:0,s:0.84,e:0.97,real:true,lbl:'geneD',score:0.85,partial:true},
    // Frame +2
    {f:1,s:0.04,e:0.09,real:false,lbl:'',score:0.15},
    {f:1,s:0.14,e:0.18,real:false,lbl:'',score:0.10},
    {f:1,s:0.42,e:0.58,real:true,lbl:'geneE',score:0.90},
    {f:1,s:0.72,e:0.76,real:false,lbl:'',score:0.11},
    // Frame +3
    {f:2,s:0.02,e:0.07,real:false,lbl:'',score:0.09},
    {f:2,s:0.20,e:0.24,real:false,lbl:'',score:0.13},
    {f:2,s:0.65,e:0.82,real:true,lbl:'geneF',score:0.87},
    // Frame -1
    {f:3,s:0.12,e:0.35,real:true,lbl:'geneG',score:0.93},
    {f:3,s:0.40,e:0.44,real:false,lbl:'',score:0.14},
    {f:3,s:0.55,e:0.62,real:false,lbl:'',score:0.18},
    // Frame -2
    {f:4,s:0.10,e:0.14,real:false,lbl:'',score:0.07},
    {f:4,s:0.25,e:0.48,real:true,lbl:'geneH',score:0.91},
    {f:4,s:0.68,e:0.72,real:false,lbl:'',score:0.12},
    // Frame -3
    {f:5,s:0.08,e:0.12,real:false,lbl:'',score:0.16},
    {f:5,s:0.35,e:0.50,real:false,lbl:'',score:0.20},
    {f:5,s:0.75,e:0.92,real:true,lbl:'geneI',score:0.86},
  ];

  const fwdCol='#4371e6',revCol='#16a085';

  // ── Draw frame tracks ──
  for(let f=0;f<6;f++){
    const fy=fY+f*(fH+fGap);
    _monoLabel(ctx,frameLabels[f],cX-8,fy+fH/2,10,f<3?fwdCol:revCol,'right');
    ctx.fillStyle=f<3?'#eef2fb':'#edf7f5';ctx.fillRect(cX,fy,cW,fH);
    ctx.strokeStyle=f<3?fwdCol+'22':revCol+'22';ctx.lineWidth=0.5;ctx.strokeRect(cX,fy,cW,fH);

    // Stop codons as faint red ticks
    const nStops=7+Math.floor(R()*5);
    for(let si=0;si<nStops;si++){
      const sx=cX+R()*cW;
      ctx.strokeStyle=COLORS.bad+'33';ctx.lineWidth=0.8;
      ctx.beginPath();ctx.moveTo(sx,fy+1);ctx.lineTo(sx,fy+fH-1);ctx.stroke();
    }
  }

  // ── Helper: draw an ORF arrow ──
  function drawOrf(o,col,alpha,showLabel,showStart,showScore){
    const fy=fY+o.f*(fH+fGap);
    const gx=cX+o.s*cW,gw=(o.e-o.s)*cW;
    const isFwd=o.f<3;
    const tipW=Math.min(8,gw*0.3);

    ctx.globalAlpha=alpha;
    ctx.fillStyle=col;
    ctx.beginPath();
    if(isFwd){
      ctx.moveTo(gx,fy+2);ctx.lineTo(gx+gw-tipW,fy+2);ctx.lineTo(gx+gw,fy+fH/2);
      ctx.lineTo(gx+gw-tipW,fy+fH-2);ctx.lineTo(gx,fy+fH-2);
    } else {
      ctx.moveTo(gx+gw,fy+2);ctx.lineTo(gx+tipW,fy+2);ctx.lineTo(gx,fy+fH/2);
      ctx.lineTo(gx+tipW,fy+fH-2);ctx.lineTo(gx+gw,fy+fH-2);
    }
    ctx.closePath();ctx.fill();

    // Partial gene dashed edge
    if(o.partial){
      ctx.setLineDash([3,2]);ctx.strokeStyle=COLORS.warn;ctx.lineWidth=1.5;
      ctx.beginPath();ctx.moveTo(gx+gw,fy+2);ctx.lineTo(gx+gw,fy+fH-2);ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.globalAlpha=1;

    if(showLabel&&o.lbl){
      _label(ctx,o.lbl+(o.partial?' (partial)':''),gx+gw/2,fy+fH/2,9,'#fff','center','600');
    }

    if(showStart&&o.real){
      const sx=isFwd?gx:gx+gw;
      ctx.fillStyle=COLORS.ok;
      ctx.beginPath();ctx.arc(sx,fy+fH/2,3,0,Math.PI*2);ctx.fill();
    }

    if(showScore&&gw>30){
      // Score badge inside the ORF
      const bx=gx+gw/2,by=fy+fH/2;
      const txt=o.score.toFixed(2);
      const badgeCol=o.score>0.7?'#fff':COLORS.ink3;
      ctx.font='600 9px "DM Sans",system-ui,sans-serif';
      ctx.fillStyle=badgeCol;ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText(txt,bx,by);
    }
  }

  // ── Step 0: Show all candidate ORFs (many short random ones) ──
  if(step===0){
    _label(ctx,'All start→stop ORF candidates',400,descY,10,COLORS.ink3,'center','600');
    for(const o of orfs){
      const col=o.real?(o.f<3?fwdCol:revCol):'#cbd5e1';
      drawOrf(o,col,o.real?0.5:0.3,false,false,false);
    }
    // Count annotation
    const realCount=orfs.filter(x=>x.real).length;
    const fakeCount=orfs.filter(x=>!x.real).length;
    const ly=fY+6*(fH+fGap)+12;
    _roundRect(ctx,cX,ly,cW,28,6,'#f8fafc',COLORS.border,1);
    _label(ctx,realCount+fakeCount+' candidate ORFs found across 6 frames',cX+cW/2,ly+10,10,COLORS.ink2,'center','600');
    _label(ctx,'Most are short random sequences between stop codons',cX+cW/2,ly+22,8.5,COLORS.ink4,'center','500');
  }

  // ── Step 1: Score coding potential — show scores ──
  if(step===1){
    _label(ctx,'Coding potential score (log-likelihood of codon/hexamer patterns)',400,descY,9,COLORS.ink3,'center','600');
    for(const o of orfs){
      const isHigh=o.score>0.7;
      const col=isHigh?(o.f<3?fwdCol:revCol):'#e2e8f0';
      const alpha=isHigh?0.85:0.2;
      drawOrf(o,col,alpha,false,false,true);
    }
    // Score threshold line
    const ly=fY+6*(fH+fGap)+12;
    _roundRect(ctx,cX,ly,cW,28,6,'#f8fafc',COLORS.border,1);
    const hiCount=orfs.filter(x=>x.score>0.7).length;
    _label(ctx,'Trained model scores each ORF: '+hiCount+' pass the coding threshold',cX+cW/2,ly+10,10,COLORS.ink2,'center','600');
    _label(ctx,'Codon usage + hexamer frequencies + GC frame bias → log-likelihood ratio',cX+cW/2,ly+22,8.5,COLORS.ink4,'center','500');
  }

  // ── Step 2: Final gene calls with start site refinement ──
  if(step===2){
    _label(ctx,'Dynamic programming → optimal non-overlapping genes + RBS start refinement',400,descY,9,COLORS.ink3,'center','600');
    // Draw rejected ORFs very faintly
    for(const o of orfs){
      if(!o.real) drawOrf(o,'#e8e8e8',0.15,false,false,false);
    }
    // Draw accepted genes prominently
    for(const o of orfs){
      if(o.real){
        const col=o.f<3?fwdCol:revCol;
        drawOrf(o,col,1,true,true,false);
      }
    }
    // RBS annotation on one gene
    const eg=orfs[0]; // geneA
    const egX=cX+eg.s*cW;
    const egY=fY+eg.f*(fH+fGap);
    // RBS bracket before start
    ctx.strokeStyle=COLORS.gd;ctx.lineWidth=1.2;
    ctx.beginPath();
    ctx.moveTo(egX-18,egY+fH/2-6);ctx.lineTo(egX-18,egY+fH/2+6);
    ctx.moveTo(egX-18,egY+fH/2);ctx.lineTo(egX-3,egY+fH/2);
    ctx.stroke();
    _label(ctx,'RBS',egX-20,egY+fH/2-8,7,COLORS.gd,'center','700');

    // Legend
    const ly=fY+6*(fH+fGap)+12;
    // mini arrow legend
    const lx1=cX+10;
    ctx.fillStyle=fwdCol;ctx.beginPath();
    ctx.moveTo(lx1,ly+6);ctx.lineTo(lx1+18,ly+6);ctx.lineTo(lx1+22,ly+10);
    ctx.lineTo(lx1+18,ly+14);ctx.lineTo(lx1,ly+14);ctx.closePath();ctx.fill();
    _label(ctx,'Predicted gene',lx1+28,ly+10,9,COLORS.ink3,'left','500');

    ctx.fillStyle=COLORS.ok;ctx.beginPath();ctx.arc(lx1+165,ly+10,3,0,Math.PI*2);ctx.fill();
    _label(ctx,'Start (ATG/GTG/TTG)',lx1+172,ly+10,9,COLORS.ink3,'left','500');

    ctx.strokeStyle=COLORS.gd;ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(lx1+330,ly+6);ctx.lineTo(lx1+330,ly+14);
    ctx.moveTo(lx1+330,ly+10);ctx.lineTo(lx1+340,ly+10);ctx.stroke();
    _label(ctx,'Ribosome binding site',lx1+345,ly+10,9,COLORS.ink3,'left','500');

    ctx.fillStyle=COLORS.bad+'33';ctx.fillRect(lx1+510,ly+7,14,6);
    _label(ctx,'Stop codon',lx1+528,ly+10,9,COLORS.ink3,'left','500');
  }

  // ── Step 3: same as step 2 but fully resolved (for re-entry) ──
  if(step>=3){
    drawGpCanvas(2);
  }
}

/* ═══════════════════════════════════════════════════════════
   5. KEGG-CANVAS — 7-step pedagogical animation
   ═══════════════════════════════════════════════════════════ */

const keggHeaders=[
  'Step 1: KEGG organizes biology in a hierarchy',
  'Step 2: Your gene gets a KO number',
  'Step 3: What is a KEGG module?',
  'Step 4: Complete module — all enzymes found',
  'Step 5: Incomplete module — gaps in the pathway',
  'Step 6: Missing gene does not equal missing function',
  'Step 7: anvi-estimate-metabolism — the deliverable',
];
const keggCanvasHeaders=[
  'KEGG hierarchy: Gene → KO → Module → Pathway',
  'KO assignment by KofamScan profile search',
  'Module definition: boolean logic of enzyme steps',
  'All enzymes present: module is complete',
  'Gaps in the pathway: module is incomplete',
  'Why genes can appear missing',
  'anvi-estimate-metabolism: module completeness',
];
const keggCardMap=[0,0,0,1,1,2,2];

function keggHighlight(step){
  const active=keggCardMap[Math.min(step,6)];
  for(let i=0;i<3;i++){
    const el=document.getElementById('kegg-card-'+i);if(!el)continue;
    el.style.opacity=i===active?'1':i<active?'0.5':'0.35';
    el.style.transform=i===active?'scale(1.02)':'scale(1)';
    el.style.boxShadow=i===active?'0 4px 6px rgba(15,23,42,.04),0 2px 12px rgba(15,23,42,.06)':'0 1px 2px rgba(15,23,42,.04),0 1px 3px rgba(15,23,42,.06)';
  }
  const h=document.getElementById('kegg-header');
  if(h) h.textContent=keggHeaders[Math.min(step,6)];
  const ch=document.getElementById('kegg-canvas-header');
  if(ch) ch.textContent=keggCanvasHeaders[Math.min(step,6)];
}

function drawKeggCanvas(step){
  step=step||0;
  const ctx=_c('kegg-canvas');if(!ctx)return;
  ctx.clearRect(0,0,800,440);
  [drawKeggStep0,drawKeggStep1,drawKeggStep2,drawKeggStep3,drawKeggStep4,drawKeggStep5,drawKeggStep6][Math.min(step,6)](ctx);
}

/* ── Step 0: KEGG hierarchy flow (polished — now includes Module level) ── */
function drawKeggStep0(ctx){
  const cx=400;

  _label(ctx,'KEGG organizes genes into a functional hierarchy',cx,44,16,COLORS.ink,'center','700');
  _label(ctx,'Every gene gets placed in this chain:',cx,70,12,COLORS.ink3,'center','400');

  const levels=['Gene','KO','Module','Pathway'];
  const colors=[COLORS.gb,COLORS.gd,COLORS.ga,COLORS.gc];
  const descs=['Your predicted ORF','Orthology ID','Set of reactions','Complete route'];
  const boxW=140,boxH=54,gap=40;
  const totalW=levels.length*boxW+(levels.length-1)*gap;
  const x0=cx-totalW/2,y=110;

  for(let i=0;i<levels.length;i++){
    const bx=x0+i*(boxW+gap);
    _roundRect(ctx,bx,y,boxW,boxH,10,colors[i]+'18',colors[i],2);
    _label(ctx,levels[i],bx+boxW/2,y+22,15,colors[i],'center','700');
    _label(ctx,descs[i],bx+boxW/2,y+40,9.5,COLORS.ink3,'center','400');
    if(i<levels.length-1) _arrow(ctx,bx+boxW+4,y+boxH/2,bx+boxW+gap-4,y+boxH/2,COLORS.ink4,2);
  }

  /* Example annotation */
  const ey=210;
  _label(ctx,'Example:',cx,ey,13,COLORS.ink2,'center','700');

  const exLabels=['adh gene','K00001','M00001','Glycolysis'];
  for(let i=0;i<4;i++){
    const bx=x0+i*(boxW+gap);
    _roundRect(ctx,bx,ey+16,boxW,36,8,colors[i]+'10',colors[i]+'66',1.2);
    _monoLabel(ctx,exLabels[i],bx+boxW/2,ey+34,11,colors[i],'center');
    if(i<3) _arrow(ctx,bx+boxW+4,ey+34,bx+boxW+gap-4,ey+34,COLORS.ink4+'88',1.5);
  }

  /* Scope note */
  _roundRect(ctx,100,300,600,90,10,'#f8fafc',COLORS.border,1);
  _label(ctx,'Scope:',128,322,11,COLORS.ink2,'left','700');
  _label(ctx,'KEGG has >24,000 KOs, >500 modules, >500 pathway maps',170,340,11,COLORS.ink3,'left','400');
  _label(ctx,'Modules are the most useful unit for MAG interpretation:',170,358,11,COLORS.ink3,'left','400');
  _label(ctx,'small enough to assess completeness, large enough to be biologically meaningful',170,376,11,COLORS.ink3,'left','400');
}

/* ── Step 1: KO assignment by KofamScan ── */
function drawKeggStep1(ctx){
  const cx=400;

  /* Query protein */
  _label(ctx,'Your predicted protein sequence',cx,30,14,COLORS.gb,'center','700');
  _roundRect(ctx,cx-200,46,400,32,6,'#eff6ff',COLORS.gb,1.5);
  _monoLabel(ctx,'MSTVKL IAGGAS VGQAL ...',cx,62,12,COLORS.gb,'center');

  /* Arrow to KofamScan */
  _arrow(ctx,cx,82,cx,108,COLORS.ink4,2);

  /* KofamScan tool box */
  _roundRect(ctx,cx-140,112,280,52,10,COLORS.gd+'14',COLORS.gd,2);
  _monoLabel(ctx,'KofamScan / kofam_scan',cx,130,13,COLORS.gd,'center');
  _label(ctx,'HMM search against KOfam profiles',cx,148,10,COLORS.ink3,'center','500');

  /* Two output branches — elbow arrows with two clear 90° corners */
  const ly=198,lw=200,lh=56,sep=110;
  const elbowY1=168, elbowMid=183;  /* first corner at 183, second at ly=198 */
  /* Left elbow: down → left → down into K00001 */
  (function(){
    const x1=cx-40,x2=cx-sep,hs=7,c=COLORS.ok;
    ctx.strokeStyle=c;ctx.lineWidth=1.5;ctx.lineCap='round';ctx.lineJoin='round';
    ctx.beginPath();ctx.moveTo(x1,elbowY1);ctx.lineTo(x1,elbowMid);ctx.lineTo(x2,elbowMid);ctx.lineTo(x2,ly);ctx.stroke();
    ctx.fillStyle=c;ctx.beginPath();
    ctx.moveTo(x2,ly);ctx.lineTo(x2-hs*0.5,ly-hs);ctx.lineTo(x2+hs*0.5,ly-hs);ctx.closePath();ctx.fill();
  })();
  /* Right elbow: down → right → down into K00003 */
  (function(){
    const x1=cx+40,x2=cx+sep,hs=7,c=COLORS.bad;
    ctx.strokeStyle=c;ctx.lineWidth=1.5;ctx.lineCap='round';ctx.lineJoin='round';
    ctx.beginPath();ctx.moveTo(x1,elbowY1);ctx.lineTo(x1,elbowMid);ctx.lineTo(x2,elbowMid);ctx.lineTo(x2,ly);ctx.stroke();
    ctx.fillStyle=c;ctx.beginPath();
    ctx.moveTo(x2,ly);ctx.lineTo(x2-hs*0.5,ly-hs);ctx.lineTo(x2+hs*0.5,ly-hs);ctx.closePath();ctx.fill();
  })();

  /* Hit above adaptive threshold — K00001 box */
  _roundRect(ctx,cx-sep-lw/2,ly,lw,lh,8,'#dcfce7',COLORS.ok,1.5);
  _monoLabel(ctx,'K00001  ★',cx-sep,ly+18,13,COLORS.ok,'center');
  _label(ctx,'Score > adaptive threshold',cx-sep,ly+34,10,COLORS.ok,'center','600');
  _label(ctx,'Confident assignment',cx-sep,ly+48,9,COLORS.ink3,'center','400');

  /* Hit below threshold — K00003 box */
  _roundRect(ctx,cx+sep-lw/2,ly,lw,lh,8,'#fef2f2',COLORS.bad+'88',1.5);
  _monoLabel(ctx,'K00003  ?',cx+sep,ly+18,13,COLORS.ink4,'center');
  _label(ctx,'Score < adaptive threshold',cx+sep,ly+34,10,COLORS.bad,'center','600');
  _label(ctx,'No confident KO assigned',cx+sep,ly+48,9,COLORS.ink3,'center','400');

  /* Flow to downstream — placed above explanation box to avoid arrow overlap */
  _arrow(ctx,cx-sep,ly+lh+6,cx-sep,280,COLORS.ink4,1.5);
  _roundRect(ctx,cx-sep-90,282,180,34,8,COLORS.ga+'14',COLORS.ga,1.5);
  _label(ctx,'Assigned KOs go to',cx-sep,294,10,COLORS.ink3,'center','500');
  _label(ctx,'module completeness',cx-sep,308,11,COLORS.ga,'center','700');

  /* Explanation of adaptive thresholds */
  const ey=340;
  _roundRect(ctx,100,ey,600,60,8,'#f8fafc',COLORS.border,1);
  _label(ctx,'Adaptive score thresholds',cx,ey+14,12,COLORS.ink2,'center','700');
  _label(ctx,'Each KO family has its own score cutoff, calibrated on known members.',cx,ey+30,10,COLORS.ink3,'center','400');
  _label(ctx,'This is better than a single E-value cutoff: fewer false positives, fewer missed hits.',cx,ey+46,10,COLORS.ink3,'center','400');

  _label(ctx,'KofamScan assigns KO numbers using family-specific HMM thresholds',cx,424,11,COLORS.ink4,'center','400');
}

/* ── Step 2: What is a KEGG module? (NEW) ── */
function drawKeggStep2(ctx){
  const cx=400;

  _label(ctx,'A module defines a metabolic function as a set of enzyme steps',cx,30,14,COLORS.ink,'center','700');

  /* Module ID + name */
  _roundRect(ctx,cx-240,52,480,42,8,COLORS.ga+'14',COLORS.ga,2);
  _monoLabel(ctx,'M00001',cx-100,68,16,COLORS.ga,'center');
  _label(ctx,'Glycolysis (Embden-Meyerhof)',cx+10,68,12,COLORS.ga,'left','600');
  _label(ctx,'pathway',cx+10,82,9,COLORS.ink4,'left','400');

  /* Definition block */
  const dy=112;
  _label(ctx,'Module definition (boolean logic):',120,dy,12,COLORS.ink2,'left','700');

  const defSteps=[
    {ko:'(K00844,K12407,K00845)',desc:'hexokinase / glucokinase',note:'alternatives'},
    {ko:'(K01810)',desc:'glucose-6-phosphate isomerase',note:'single enzyme'},
    {ko:'(K00850,K16370)',desc:'6-phosphofructokinase',note:'alternatives'},
    {ko:'(K01623,K01624)',desc:'fructose-bisphosphate aldolase',note:'alternatives'},
    {ko:'(K01803)',desc:'triosephosphate isomerase',note:'single enzyme'},
  ];

  const stepH=36,stepGap=6,leftM=80;
  for(let i=0;i<defSteps.length;i++){
    const s=defSteps[i];
    const sy=dy+20+i*(stepH+stepGap);

    /* Step number circle */
    ctx.beginPath();ctx.arc(leftM,sy+stepH/2,12,0,Math.PI*2);
    ctx.fillStyle=COLORS.ga+'22';ctx.fill();
    ctx.strokeStyle=COLORS.ga;ctx.lineWidth=1.5;ctx.stroke();
    _label(ctx,''+(i+1),leftM,sy+stepH/2,10,COLORS.ga,'center','700');

    /* KO IDs box */
    _roundRect(ctx,leftM+22,sy,280,stepH,6,'#f0fdf4',COLORS.ga+'66',1);
    _monoLabel(ctx,s.ko,leftM+22+140,sy+14,10,COLORS.ga,'center');
    _label(ctx,s.desc,leftM+22+140,sy+28,9,COLORS.ink3,'center','400');

    /* Note on right */
    _label(ctx,s.note,leftM+22+280+12,sy+stepH/2,9,COLORS.ink4,'left','500');

    /* Connector arrow between steps */
    if(i<defSteps.length-1){
      _arrow(ctx,leftM,sy+stepH+2,leftM,sy+stepH+stepGap-2,COLORS.ink4+'66',1);
    }
  }

  /* Key insight */
  const ky=dy+20+defSteps.length*(stepH+stepGap)+10;
  _roundRect(ctx,100,ky,600,50,8,'#fffbeb',COLORS.gd+'88',1.2);
  _label(ctx,'Commas mean alternatives (OR): any one KO can fill the step',cx,ky+16,11,COLORS.gd,'center','700');
  _label(ctx,'Spaces between steps mean sequence (AND): all steps must be present',cx,ky+34,11,COLORS.ink3,'center','500');
}

/* ── Step 3: Complete module — all enzymes present ── */
function drawKeggStep3(ctx){
  const cx=400;
  _label(ctx,'Module M00001: all steps have at least one KO present',cx,28,14,COLORS.ink,'center','700');

  /* Module definition at top */
  const defY=50;
  _roundRect(ctx,80,defY,640,28,6,COLORS.ga+'0a',COLORS.ga+'44',1);
  _monoLabel(ctx,'(K00844,K12407) (K01810) (K00850,K16370) (K01623) (K01803)',cx,defY+14,9.5,COLORS.ga,'center');

  /* Pathway visualization */
  const mets=[['Glucose'],['Glucose','6-phosphate'],['Fructose','6-phosphate'],['Fructose','1,6-bisP'],['Glyceraldehyde','3-phosphate'],['1,3-Bisphospho-','glycerate']];
  const metX=[50,180,310,440,570,720];
  const metY=150;

  for(let i=0;i<mets.length;i++){
    const isBig=i===0||i===5;
    const r=isBig?18:13;
    ctx.beginPath();ctx.arc(metX[i],metY,r,0,Math.PI*2);
    ctx.fillStyle='#f0fdf4';ctx.fill();
    ctx.strokeStyle=COLORS.ok;ctx.lineWidth=isBig?2:1.2;ctx.stroke();
    const lines=mets[i],baseY=metY+(isBig?28:22);
    for(let l=0;l<lines.length;l++) _label(ctx,lines[l],metX[i],baseY+l*11,8,COLORS.ink3,'center','500');
  }

  /* Enzyme boxes between metabolites, all present (green) */
  const kos=['K00844','K01810','K00850','K01623','K01803'];
  const names=['HK','GPI','PFK','ALDO','TPI'];
  for(let i=0;i<5;i++){
    const ax=metX[i]+20,bx=metX[i+1]-20;
    _arrow(ctx,ax,metY,bx,metY,COLORS.ink4,1.5);
    const emx=(metX[i]+metX[i+1])/2;
    _roundRect(ctx,emx-42,metY-50,84,34,8,'#dcfce7',COLORS.ok,1.5);
    _monoLabel(ctx,kos[i],emx,metY-38,9,COLORS.ok,'center');
    _label(ctx,names[i],emx,metY-24,9,COLORS.ok,'center','600');
  }

  /* Completeness result */
  const barY=230;
  _label(ctx,'Module completeness:',cx,barY,13,COLORS.ink2,'center','700');
  const barW=300,barH=24,barX=cx-barW/2;
  _roundRect(ctx,barX,barY+14,barW,barH,4,COLORS.ok,COLORS.ok,1.5);
  _label(ctx,'5 / 5 = 100%',cx,barY+26,13,'#fff','center','700');

  /* Interpretation */
  _roundRect(ctx,140,barY+56,520,40,8,'#f0fdf4',COLORS.ok+'66',1.2);
  _label(ctx,'Complete module: this MAG can perform glycolysis',cx,barY+70,12,COLORS.ok,'center','700');
  _label(ctx,'(at least one KO found for each step)',cx,barY+86,10,COLORS.ink3,'center','400');

  /* Note about alternatives */
  _roundRect(ctx,140,barY+112,520,48,8,'#f8fafc',COLORS.border,1);
  _label(ctx,'Step 1 had alternatives: K00844 OR K12407 OR K00845',cx,barY+128,10,COLORS.ink3,'center','500');
  _label(ctx,'We found K00844 — that is enough. We do not need all alternatives.',cx,barY+146,10,COLORS.ink3,'center','500');
}

/* ── Step 4: Incomplete module — gaps ── */
function drawKeggStep4(ctx){
  const cx=400;
  _label(ctx,'Same module, but now with gaps',cx,28,14,COLORS.ink,'center','700');

  /* Module definition */
  const defY=48;
  _roundRect(ctx,80,defY,640,28,6,COLORS.ga+'0a',COLORS.ga+'44',1);
  _monoLabel(ctx,'(K00844,K12407) (K01810) (K00850,K16370) (K01623) (K01803)',cx,defY+14,9.5,COLORS.ga,'center');

  const mets=[['Glucose'],['Glucose','6-phosphate'],['Fructose','6-phosphate'],['Fructose','1,6-bisP'],['Glyceraldehyde','3-phosphate'],['1,3-Bisphospho-','glycerate']];
  const metX=[50,180,310,440,570,720];
  const metY=140;
  const present=[true,true,false,true,false];

  for(let i=0;i<mets.length;i++){
    const isBig=i===0||i===5;
    const r=isBig?18:13;
    ctx.beginPath();ctx.arc(metX[i],metY,r,0,Math.PI*2);
    ctx.fillStyle=isBig?'#f0fdf4':'#f1f5f9';ctx.fill();
    ctx.strokeStyle=isBig?COLORS.ok:COLORS.border;ctx.lineWidth=isBig?2:1.2;ctx.stroke();
    const lines=mets[i],baseY=metY+(isBig?28:22);
    for(let l=0;l<lines.length;l++) _label(ctx,lines[l],metX[i],baseY+l*11,8,COLORS.ink3,'center','500');
  }

  const kos=['K00844','K01810','K00850','K01623','K01803'];
  const names=['HK','GPI','PFK','ALDO','TPI'];
  for(let i=0;i<5;i++){
    const ax=metX[i]+20,bx=metX[i+1]-20;
    const col=present[i]?COLORS.ok:COLORS.ink4;
    _arrow(ctx,ax,metY,bx,metY,present[i]?COLORS.ink4:COLORS.bad+'55',1.5);
    const emx=(metX[i]+metX[i+1])/2;
    _roundRect(ctx,emx-42,metY-50,84,34,8,present[i]?'#dcfce7':'#f1f5f9',col,1.5);
    _monoLabel(ctx,kos[i],emx,metY-38,9,col,'center');
    _label(ctx,present[i]?names[i]:'not found',emx,metY-24,present[i]?9:8,col,'center',present[i]?'600':'500');
    if(!present[i]){
      ctx.save();ctx.globalAlpha=0.12;
      ctx.strokeStyle=COLORS.bad;ctx.lineWidth=3;
      ctx.beginPath();ctx.moveTo(emx-18,metY-48);ctx.lineTo(emx+18,metY-26);ctx.stroke();
      ctx.beginPath();ctx.moveTo(emx+18,metY-48);ctx.lineTo(emx-18,metY-26);ctx.stroke();
      ctx.restore();
    }
  }

  /* Progress bar */
  const barY=210;
  _label(ctx,'Module completeness:',cx,barY,13,COLORS.ink2,'center','700');
  const barW=300,barH=22,barX=cx-barW/2;
  _roundRect(ctx,barX,barY+14,barW,barH,4,'#f1f5f9',COLORS.border,1);
  _roundRect(ctx,barX,barY+14,barW*0.6,barH,4,COLORS.gd,null,0);
  _label(ctx,'3 / 5 = 60%',cx,barY+25,12,'#fff','center','700');

  /* Interpretation */
  _roundRect(ctx,cx-180,barY+50,360,34,8,'#fef2f2',COLORS.bad+'55',1);
  _label(ctx,'Incomplete: 2 enzyme steps not annotated',cx,barY+67,11,COLORS.bad,'center','600');

  /* Legend */
  const legY=barY+98;
  _roundRect(ctx,240,legY,40,16,4,'#dcfce7',COLORS.ok,1.2);
  _label(ctx,'present',292,legY+8,9,COLORS.ok,'left','600');
  _roundRect(ctx,370,legY,40,16,4,'#f1f5f9',COLORS.ink4,1.2);
  _label(ctx,'missing',422,legY+8,9,COLORS.ink4,'left','600');

  /* Key question */
  _roundRect(ctx,100,legY+30,600,48,8,'#fffbeb',COLORS.gd+'88',1.2);
  _label(ctx,'But is the gene truly absent? Or just not detected?',cx,legY+48,12,COLORS.gd,'center','700');
  _label(ctx,'Multiple explanations exist for missing KOs (see next step)',cx,legY+66,10,COLORS.ink3,'center','400');
}

/* ── Step 5: Why genes appear missing ── */
function drawKeggStep5(ctx){
  const cx=400;

  /* Missing enzyme box at top */
  _roundRect(ctx,cx-56,24,112,38,8,'#f1f5f9',COLORS.ink4,2);
  _monoLabel(ctx,'K00850',cx,38,12,COLORS.ink4,'center');
  _label(ctx,'?',cx+42,38,14,COLORS.warn,'center','800');
  _label(ctx,'Missing from your annotation',cx,74,12,COLORS.ink2,'center','700');

  /* Five reasons */
  const reasons=[
    {txt:'1. Truly absent',desc:'The organism lacks the gene',col:COLORS.bad},
    {txt:'2. Too divergent',desc:'Sequence too different for profile',col:COLORS.gd},
    {txt:'3. Missing contig',desc:'Genome is incomplete (draft MAG)',col:COLORS.gc},
    {txt:'4. Broken gene',desc:'Frameshift or contig edge split',col:COLORS.gb},
    {txt:'5. Alternative enzyme',desc:'Non-homologous replacement',col:COLORS.ga},
  ];

  const startY=100;
  const boxW=128,boxH=62,gapX=14;
  const totalW=reasons.length*boxW+(reasons.length-1)*gapX;
  const x0=cx-totalW/2;

  for(let i=0;i<reasons.length;i++){
    const bx=x0+i*(boxW+gapX);
    const by=startY+44;
    /* Corner/elbow arrow: down from top, horizontal to box, down to box */
    const boxMidX=bx+boxW/2;
    const elbowY=startY+18;
    ctx.strokeStyle=reasons[i].col+'88';ctx.lineWidth=1.5;
    ctx.beginPath();
    ctx.moveTo(cx,startY);ctx.lineTo(cx,elbowY);
    ctx.lineTo(boxMidX,elbowY);ctx.lineTo(boxMidX,by-4);
    ctx.stroke();
    /* Arrowhead */
    ctx.beginPath();ctx.moveTo(boxMidX-4,by-9);ctx.lineTo(boxMidX,by-4);
    ctx.lineTo(boxMidX+4,by-9);ctx.stroke();
    _roundRect(ctx,bx,by,boxW,boxH,8,reasons[i].col+'10',reasons[i].col+'66',1.2);
    _label(ctx,reasons[i].txt,bx+boxW/2,by+16,10.5,reasons[i].col,'center','700');

    /* Word-wrap description */
    ctx.font='400 9px "DM Sans",system-ui,sans-serif';
    const words=reasons[i].desc.split(' ');
    let line='',ly=by+34;
    for(const w of words){
      const test=line?line+' '+w:w;
      if(ctx.measureText(test).width>boxW-14&&line){
        _label(ctx,line,bx+boxW/2,ly,9,COLORS.ink3,'center','400');
        line=w;ly+=12;
      } else line=test;
    }
    if(line) _label(ctx,line,bx+boxW/2,ly,9,COLORS.ink3,'center','400');
  }

  /* Bottom message */
  const by=startY+44+boxH+24;
  _roundRect(ctx,cx-220,by,440,44,10,'#fffbeb',COLORS.gd+'88',1.2);
  _label(ctx,'Absence of evidence is not evidence of absence',cx,by+16,13,COLORS.gd,'center','700');
  _label(ctx,'Always consider alternative explanations before concluding a gene is missing',cx,by+34,10,COLORS.ink3,'center','400');
}

/* ── Step 6: KEGG-decoder heatmap (NEW) ── */
function drawKeggStep6(ctx){
  const cx=400;

  _label(ctx,'anvi-estimate-metabolism: module completeness across MAGs',cx,28,14,COLORS.ink,'center','700');

  /* Two-algorithm explanation */
  const alY=52;
  _label(ctx,'Dual completeness algorithms:',cx,alY,11,COLORS.ink2,'center','700');

  /* Pathwise box */
  _roundRect(ctx,80,alY+12,310,50,8,COLORS.ga+'0c',COLORS.ga,1.5);
  _label(ctx,'Pathwise completeness',235,alY+26,11,COLORS.ga,'center','700');
  _label(ctx,'Best path through alternative KOs; report max fraction',235,alY+42,9,COLORS.ink3,'center','400');

  /* Stepwise box */
  _roundRect(ctx,410,alY+12,310,50,8,COLORS.gb+'0c',COLORS.gb,1.5);
  _label(ctx,'Stepwise completeness',565,alY+26,11,COLORS.gb,'center','700');
  _label(ctx,'% of top-level steps with at least one KO present',565,alY+42,9,COLORS.ink3,'center','400');

  /* Heatmap grid — spacious */
  const hx=80,hy=alY+96,cellW=70,cellH=26,gap=3;
  const mags=['MAG-01','MAG-02','MAG-03','MAG-04','MAG-05'];
  const modules=['Glycolysis','TCA','Pentose P.','Ox. phos.','N fixation'];

  const data=[
    [1,.8,1,.6,0],[.8,1,.6,1,0],[1,.6,.8,.4,.8],
    [.4,.6,.2,.8,1],[1,1,1,.8,0],
  ];

  /* Column headers — rotated */
  for(let j=0;j<modules.length;j++){
    const mx=hx+66+j*(cellW+gap)+cellW/2;
    ctx.save();
    ctx.translate(mx,hy-6);
    ctx.rotate(-Math.PI/6);
    ctx.font='500 9px "DM Sans",system-ui,sans-serif';
    ctx.fillStyle=COLORS.ink2;ctx.textAlign='left';
    ctx.fillText(modules[j],0,0);
    ctx.restore();
  }

  /* Row headers */
  for(let i=0;i<mags.length;i++){
    const my=hy+i*(cellH+gap)+cellH/2;
    _monoLabel(ctx,mags[i],hx+58,my+1,9,COLORS.ink2,'right');
  }

  /* Cells */
  for(let i=0;i<mags.length;i++){
    for(let j=0;j<modules.length;j++){
      const x=hx+66+j*(cellW+gap);
      const y=hy+i*(cellH+gap);
      const v=data[i][j];
      const r2=Math.round(255-(255-13)*v);
      const g2=Math.round(255-(255-148)*v);
      const b2=Math.round(255-(255-136)*v);
      _roundRect(ctx,x,y,cellW,cellH,3,'rgb('+r2+','+g2+','+b2+')',null,0);
      const textCol=v>0.5?'#fff':COLORS.ink3;
      _label(ctx,(v*100|0)+'%',x+cellW/2,y+cellH/2+1,10,textCol,'center','600');
    }
  }

  /* Color legend */
  const legX=hx+66+modules.length*(cellW+gap)+18;
  const legY2=hy+8;
  _label(ctx,'Module',legX+24,legY2,9,COLORS.ink2,'center','600');
  _label(ctx,'completeness',legX+24,legY2+12,9,COLORS.ink2,'center','600');
  for(let k=0;k<=4;k++){
    const v=k/4;
    const r2=Math.round(255-(255-13)*v);
    const g2=Math.round(255-(255-148)*v);
    const b2=Math.round(255-(255-136)*v);
    _roundRect(ctx,legX+2,legY2+24+k*20,40,16,3,'rgb('+r2+','+g2+','+b2+')',COLORS.border,0.5);
    _label(ctx,(v*100)+'%',legX+50,legY2+32+k*20,8,COLORS.ink3,'left','500');
  }

  /* Threshold note */
  const thY=hy+mags.length*(cellH+gap)+12;
  _roundRect(ctx,80,thY,640,30,8,'#fffbeb',COLORS.gd+'88',1.2);
  _label(ctx,'Default threshold: 0.75 — modules above this are considered complete',cx,thY+15,10,COLORS.gd,'center','700');

  /* Key advantages */
  const ky=thY+42;
  _roundRect(ctx,80,ky,640,52,8,'#f0fdf4',COLORS.ok+'66',1.2);
  _label(ctx,'Why anvi-estimate-metabolism?',cx,ky+14,11,COLORS.ok,'center','700');
  _label(ctx,'Native anvi\'o integration with contigs-db / profile-db; supports custom modules beyond KEGG,',cx,ky+30,9.5,COLORS.ink3,'center','500');
  _label(ctx,'copy-number estimation, and pangenome-level analysis',cx,ky+44,9.5,COLORS.ink3,'center','500');
}

/* ═══════════════════════════════════════════════════════════
   6. PFAM-CANVAS — 6-step pedagogical animation
   ═══════════════════════════════════════════════════════════ */

const pfamHeaders=[
  'Step 1: What is a protein domain?',
  'Step 2: Pfam profiles detect domains',
  'Step 3: Domain architecture',
  'Step 4: Same domain, different proteins',
  'Step 5: MAG domain fingerprint',
];
const pfamCanvasHeaders=[
  'Protein domains: reusable functional units',
  'Pfam profile HMMs scan your protein',
  'Domain arrangement along a protein',
  'Shared domains across proteins',
  'Domain-architecture view of your MAG',
];
const pfamCardMap=[0,0,1,1,2];

function pfamHighlight(step){
  const active=pfamCardMap[Math.min(step,4)];
  for(let i=0;i<3;i++){
    const el=document.getElementById('pfam-card-'+i);if(!el)continue;
    el.style.opacity=i===active?'1':i<active?'0.5':'0.35';
    el.style.transform=i===active?'scale(1.02)':'scale(1)';
    el.style.boxShadow=i===active?'0 4px 6px rgba(15,23,42,.04),0 2px 12px rgba(15,23,42,.06)':'0 1px 2px rgba(15,23,42,.04),0 1px 3px rgba(15,23,42,.06)';
  }
  const h=document.getElementById('pfam-header');
  if(h) h.textContent=pfamHeaders[Math.min(step,4)];
  const ch=document.getElementById('pfam-canvas-header');
  if(ch) ch.textContent=pfamCanvasHeaders[Math.min(step,4)];
}

function drawPfamCanvas(step){
  step=step||0;
  const ctx=_c('pfam-canvas');if(!ctx)return;
  ctx.clearRect(0,0,800,440);
  [drawPfamStep0,drawPfamStep1,drawPfamStep2,drawPfamStep3,drawPfamStep5][Math.min(step,4)](ctx);
}

/* helper: draw a protein backbone with domains */
function _pfamProtein(ctx,name,x,y,len,domains,showBounds){
  /* 1. Draw opaque domain fills FIRST */
  const sorted=[...domains].sort((a,b)=>a.s-b.s);
  for(const d of sorted){
    const dx=x+d.s,dw=d.e-d.s;
    _roundRect(ctx,dx,y+2,dw,28,6,d.c,null,0);
    _roundRect(ctx,dx,y+2,dw,28,6,null,d.c,1.5);
    _label(ctx,d.l,dx+dw/2,y+16,Math.min(10,dw/d.l.length*1.6),'#fff','center','700');
    if(showBounds){
      _monoLabel(ctx,d.s+'',dx,y+38,8,COLORS.ink4,'center');
      _monoLabel(ctx,d.e+'',dx+dw,y+38,8,COLORS.ink4,'center');
    }
  }
  /* 2. Draw backbone connectors only in gaps, padded 4px from domain edges */
  ctx.strokeStyle=COLORS.border;ctx.lineWidth=2.5;
  const pad=4;
  let cursor=0;
  for(const d of sorted){
    if(d.s-cursor>pad*2){ctx.beginPath();ctx.moveTo(x+cursor+pad,y+16);ctx.lineTo(x+d.s-pad,y+16);ctx.stroke();}
    cursor=d.e;
  }
  if(len-cursor>pad){ctx.beginPath();ctx.moveTo(x+cursor+pad,y+16);ctx.lineTo(x+len,y+16);ctx.stroke();}
  _label(ctx,'N',x-14,y+16,10,COLORS.ink4,'center','600');
  _label(ctx,'C',x+len+14,y+16,10,COLORS.ink4,'center','600');
  if(name) _label(ctx,name,x,y-6,12,COLORS.ink,'left','700');
}

/* ── Step 0: What is a protein domain? ── */
function drawPfamStep0(ctx){
  const cx=400;
  _label(ctx,'A single protein with three distinct domains',cx,36,15,COLORS.ink,'center','700');

  /* Long protein with three domains */
  const px=80,pw=640,py=120;
  const doms=[
    {s:40,e:190,l:'Kinase',c:COLORS.gb,desc:'Phosphorylates targets'},
    {s:240,e:400,l:'SH2',c:COLORS.ga,desc:'Binds phosphotyrosine'},
    {s:450,e:580,l:'SH3',c:COLORS.gc,desc:'Binds proline-rich motifs'},
  ];

  /* 1. Draw opaque domain fills FIRST */
  for(const d of doms){
    const dx=px+d.s,dw=d.e-d.s;
    _roundRect(ctx,dx,py+4,dw,32,8,d.c,null,0);
    _roundRect(ctx,dx,py+4,dw,32,8,null,d.c,2);
    _label(ctx,d.l,dx+dw/2,py+20,13,'#fff','center','700');
  }
  /* 2. Draw backbone connectors in gaps, padded from domain edges */
  ctx.strokeStyle=COLORS.border;ctx.lineWidth=3;
  const pad=4;
  let cur0=0;
  for(const d of doms){
    if(d.s-cur0>pad*2){ctx.beginPath();ctx.moveTo(px+cur0+pad,py+20);ctx.lineTo(px+d.s-pad,py+20);ctx.stroke();}
    cur0=d.e;
  }
  if(pw-cur0>pad){ctx.beginPath();ctx.moveTo(px+cur0+pad,py+20);ctx.lineTo(px+pw,py+20);ctx.stroke();}
  _label(ctx,'N',px-16,py+20,11,COLORS.ink4,'center','600');
  _label(ctx,'C',px+pw+16,py+20,11,COLORS.ink4,'center','600');
  _monoLabel(ctx,'~480 aa',px+pw,py+38,10,COLORS.ink4,'center');

  /* Annotations below each domain — corner arrows */
  const descY=py+80;
  const descH=28,descW=148;
  for(let i=0;i<doms.length;i++){
    const d=doms[i];
    const dx=px+d.s,dw=d.e-d.s;
    const domCx=dx+dw/2;
    /* Offset each description box slightly outward for cleaner elbows */
    const offsets=[-40,0,40];
    const boxCx=domCx+offsets[i];

    /* Corner arrow: down from domain bottom, then horizontal to box */
    const midY=py+56;
    ctx.strokeStyle=d.c;ctx.lineWidth=1.5;
    ctx.beginPath();ctx.moveTo(domCx,py+40);ctx.lineTo(domCx,midY);
    ctx.lineTo(boxCx,midY);ctx.lineTo(boxCx,descY);ctx.stroke();
    /* Arrowhead */
    ctx.beginPath();ctx.moveTo(boxCx-4,descY-5);ctx.lineTo(boxCx,descY);
    ctx.lineTo(boxCx+4,descY-5);ctx.stroke();

    _roundRect(ctx,boxCx-descW/2,descY,descW,descH,6,d.c+'12',d.c,1);
    _label(ctx,d.desc,boxCx,descY+descH/2,10,d.c,'center','500');
  }

  /* Linker regions */
  _label(ctx,'linker',px+215,py+6,9,COLORS.ink4,'center','400');
  _label(ctx,'linker',px+425,py+6,9,COLORS.ink4,'center','400');

  /* Caption */
  _roundRect(ctx,100,320,600,50,8,'#f8fafc',COLORS.border,1);
  _label(ctx,'Proteins are modular — built from reusable functional units',cx,338,13,COLORS.ink2,'center','600');
  _label(ctx,'Each domain folds independently and has its own function',cx,358,11,COLORS.ink3,'center','400');
}

/* ── Step 1: Pfam profiles detect domains ── */
function drawPfamStep1(ctx){
  const cx=400;

  /* Query protein at top */
  _label(ctx,'Your predicted protein',cx,24,14,COLORS.gb,'center','700');
  const qx=120,qw=560,qy=38;
  ctx.strokeStyle=COLORS.border;ctx.lineWidth=2.5;
  ctx.beginPath();ctx.moveTo(qx,qy+12);ctx.lineTo(qx+qw,qy+12);ctx.stroke();
  _label(ctx,'N',qx-14,qy+12,9,COLORS.ink4,'center','600');
  _label(ctx,'C',qx+qw+14,qy+12,9,COLORS.ink4,'center','600');
  /* Unknown regions with question marks */
  const qmarks=[{x:180,w:90},{x:340,w:120},{x:520,w:80}];
  for(const q of qmarks){
    ctx.fillStyle=COLORS.ink4+'18';
    _roundRect(ctx,q.x,qy+2,q.w,20,4,COLORS.ink4+'18',null,0);
    _monoLabel(ctx,'?',q.x+q.w/2,qy+12,11,COLORS.ink4,'center');
  }

  /* Scanning arrow */
  _arrow(ctx,cx,qy+30,cx,qy+58,COLORS.ink4,2);
  _label(ctx,'hmmsearch',cx+50,qy+44,10,COLORS.gd,'left','600');

  /* Pfam profile HMM library */
  const py=qy+68;
  _roundRect(ctx,60,py-4,680,72,10,'#f1f5f9',COLORS.border,1);
  _label(ctx,'Pfam profile HMM library (~20,000 families)',cx,py+6,11,COLORS.ink2,'center','700');

  const profiles=[
    {name:'PF00069',desc:'Protein kinase',col:COLORS.gb},
    {name:'PF00017',desc:'SH2 domain',col:COLORS.ga},
    {name:'PF00018',desc:'SH3 domain',col:COLORS.gc},
  ];
  const bw=180,bh=40,gap=16;
  const totalW=profiles.length*bw+(profiles.length-1)*gap;
  const bx0=cx-totalW/2;

  for(let i=0;i<profiles.length;i++){
    const p=profiles[i];
    const bx=bx0+i*(bw+gap);
    _roundRect(ctx,bx,py+18,bw,bh,8,p.col+'14',p.col,2);
    _monoLabel(ctx,p.name,bx+bw/2,py+32,11,p.col,'center');
    _label(ctx,p.desc,bx+bw/2,py+48,9,COLORS.ink2,'center','500');
  }

  /* ── Result section ── */
  const ry=py+bh+30;
  const rx=120,rw=560;

  /* Domain positions — SH2 centered at cx */
  const rdoms=[
    {s:40,e:170,l:'Kinase',c:COLORS.gb,pi:0},
    {s:215,e:345,l:'SH2',c:COLORS.ga,pi:1},
    {s:390,e:490,l:'SH3',c:COLORS.gc,pi:2},
  ];
  const domY=ry+20;

  /* Connecting lines from profiles to domains */
  for(let i=0;i<rdoms.length;i++){
    const d=rdoms[i],p=profiles[d.pi];
    const fromX=bx0+d.pi*(bw+gap)+bw/2;
    const fromY=py+18+bh+4;
    const toX=rx+(d.s+d.e)/2;
    const toY=domY;
    const elbowY=ry;
    ctx.strokeStyle=p.col+'55';ctx.lineWidth=1.2;ctx.setLineDash([4,3]);
    ctx.beginPath();ctx.moveTo(fromX,fromY);ctx.lineTo(fromX,elbowY);ctx.lineTo(toX,elbowY);ctx.lineTo(toX,toY);ctx.stroke();
    ctx.setLineDash([]);
  }

  /* "Matched domains" label — left-aligned, outside connector paths */
  _label(ctx,'Matched domains:',rx-12,domY+4,10,COLORS.ink3,'right','600');

  /* Domain boxes */
  for(const d of rdoms){
    const dx=rx+d.s,dw=d.e-d.s;
    _roundRect(ctx,dx,domY,dw,30,6,d.c,null,0);
    _roundRect(ctx,dx,domY,dw,30,6,null,d.c,1.5);
    _label(ctx,d.l,dx+dw/2,domY+15,11,'#fff','center','700');
  }
  /* Backbone connectors */
  ctx.strokeStyle=COLORS.border;ctx.lineWidth=2;
  const pad1=4;
  let cur1=0;
  for(const d of rdoms){
    if(d.s-cur1>pad1*2){ctx.beginPath();ctx.moveTo(rx+cur1+pad1,domY+15);ctx.lineTo(rx+d.s-pad1,domY+15);ctx.stroke();}
    cur1=d.e;
  }
  if(rw-cur1>pad1){ctx.beginPath();ctx.moveTo(rx+cur1+pad1,domY+15);ctx.lineTo(rx+rw,domY+15);ctx.stroke();}
  _label(ctx,'N',rx+6,domY+28,8,COLORS.ink4,'left','600');
  _label(ctx,'C',rx+rw-6,domY+28,8,COLORS.ink4,'right','600');

  /* E-value annotations below domains */
  for(const d of rdoms){
    const dx=rx+(d.s+d.e)/2;
    _monoLabel(ctx,'E < 1e-15',dx,domY+42,8,d.c,'center');
  }

  /* ── Annotation result table ── */
  const ty=domY+62;
  _roundRect(ctx,100,ty,600,80,8,'#f8fafc',COLORS.border,1);
  _label(ctx,'Pfam annotation output',cx,ty+14,11,COLORS.ink2,'center','700');
  /* Table header */
  const cols=[{l:'Domain',x:160},{l:'Accession',x:280},{l:'Start',x:390},{l:'End',x:450},{l:'E-value',x:540},{l:'Description',x:650}];
  for(const c of cols) _label(ctx,c.l,c.x,ty+30,8,COLORS.ink4,'center','700');
  ctx.strokeStyle=COLORS.border;ctx.lineWidth=0.5;
  ctx.beginPath();ctx.moveTo(120,ty+35);ctx.lineTo(680,ty+35);ctx.stroke();
  /* Row 1 */
  const row1=[{t:'Kinase',x:160,c:COLORS.gb},{t:'PF00069',x:280,c:COLORS.gb},{t:'32',x:390},{t:'136',x:450},{t:'1.2e-42',x:540},{t:'Protein kinase domain',x:650}];
  for(const c of row1) _monoLabel(ctx,c.t,c.x,ty+46,8,c.c||COLORS.ink3,'center');
  /* Row 2 */
  const row2=[{t:'SH2',x:160,c:COLORS.ga},{t:'PF00017',x:280,c:COLORS.ga},{t:'172',x:390},{t:'276',x:450},{t:'3.8e-28',x:540},{t:'SH2 domain',x:650}];
  for(const c of row2) _monoLabel(ctx,c.t,c.x,ty+60,8,c.c||COLORS.ink3,'center');
  /* Row 3 */
  const row3=[{t:'SH3',x:160,c:COLORS.gc},{t:'PF00018',x:280,c:COLORS.gc},{t:'312',x:390},{t:'392',x:450},{t:'7.1e-19',x:540},{t:'SH3 domain',x:650}];
  for(const c of row3) _monoLabel(ctx,c.t,c.x,ty+74,8,c.c||COLORS.ink3,'center');

  /* Caption */
  _roundRect(ctx,80,ty+92,640,44,8,'#f8fafc',COLORS.border,1);
  _label(ctx,'Each Pfam family has a profile HMM — same technology as HMMER',cx,ty+108,11,COLORS.ink2,'center','600');
  _label(ctx,'Domains are functional units that fold and function independently',cx,ty+122,9,COLORS.ink3,'center','400');
}

/* ── Step 2: Domain architecture ── */
function drawPfamStep2(ctx){
  const cx=400;
  _label(ctx,'Domain architecture of a multi-domain protein',cx,26,15,COLORS.ink,'center','700');

  /* ── Protein 1: ABC transporter ── */
  const px=60,pw=680,py=62;
  _label(ctx,'ABC transporter permease',px,py-8,12,COLORS.ink,'left','700');
  _monoLabel(ctx,'573 aa',px+pw+2,py+16,9,COLORS.ink4,'left');

  const doms=[
    {s:10,e:150,l:'ABC_tran',c:COLORS.gb,aa:'1-120',desc:'ATP-binding cassette'},
    {s:180,e:360,l:'ABC_membrane',c:COLORS.ga,aa:'145-290',desc:'Transmembrane domain'},
    {s:390,e:510,l:'ABC_tran',c:COLORS.gb,aa:'315-430',desc:'Second ATP cassette'},
    {s:540,e:660,l:'Peptidase_C39',c:COLORS.gd,aa:'440-535',desc:'Signal peptide cleavage'},
  ];

  /* Domain fills */
  for(const d of doms){
    const dx=px+d.s,dw=d.e-d.s;
    _roundRect(ctx,dx,py+2,dw,28,6,d.c,null,0);
    _roundRect(ctx,dx,py+2,dw,28,6,null,d.c,2);
    _label(ctx,d.l,dx+dw/2,py+16,Math.min(11,dw/d.l.length*1.6),'#fff','center','700');
  }
  /* Backbone */
  ctx.strokeStyle=COLORS.border;ctx.lineWidth=3;
  const pad2=4;
  let cur2=0;
  for(const d of doms){
    if(d.s-cur2>pad2*2){ctx.beginPath();ctx.moveTo(px+cur2+pad2,py+16);ctx.lineTo(px+d.s-pad2,py+16);ctx.stroke();}
    cur2=d.e;
  }
  if(pw-cur2>pad2){ctx.beginPath();ctx.moveTo(px+cur2+pad2,py+16);ctx.lineTo(px+pw,py+16);ctx.stroke();}
  _label(ctx,'N',px-14,py+16,10,COLORS.ink4,'center','600');
  _label(ctx,'C',px+pw+14,py+16,10,COLORS.ink4,'center','600');

  /* Amino acid ranges + descriptions below each domain */
  for(const d of doms){
    const dx=px+d.s,dw=d.e-d.s;
    _monoLabel(ctx,d.aa,dx+dw/2,py+42,8,d.c,'center');
    _label(ctx,d.desc,dx+dw/2,py+54,8,COLORS.ink3,'center','500');
  }

  /* ── Protein 2: Serine protease (different architecture, shows modularity) ── */
  const p2y=py+100;
  _label(ctx,'Subtilisin-like serine protease',px,p2y-8,12,COLORS.ink,'left','700');
  _monoLabel(ctx,'820 aa',px+pw+2,p2y+16,9,COLORS.ink4,'left');

  const doms2=[
    {s:20,e:180,l:'Inhibitor_I9',c:COLORS.gc,aa:'16-145',desc:'Propeptide inhibitor'},
    {s:220,e:460,l:'Peptidase_S8',c:COLORS.bad,aa:'180-370',desc:'Subtilase catalytic'},
    {s:500,e:650,l:'PA',c:COLORS.gd,aa:'410-535',desc:'Protease-associated'},
  ];

  for(const d of doms2){
    const dx=px+d.s,dw=d.e-d.s;
    _roundRect(ctx,dx,p2y+2,dw,28,6,d.c,null,0);
    _roundRect(ctx,dx,p2y+2,dw,28,6,null,d.c,2);
    _label(ctx,d.l,dx+dw/2,p2y+16,Math.min(11,dw/d.l.length*1.6),'#fff','center','700');
  }
  ctx.strokeStyle=COLORS.border;ctx.lineWidth=3;
  let cur3=0;
  for(const d of doms2){
    if(d.s-cur3>pad2*2){ctx.beginPath();ctx.moveTo(px+cur3+pad2,p2y+16);ctx.lineTo(px+d.s-pad2,p2y+16);ctx.stroke();}
    cur3=d.e;
  }
  if(pw-cur3>pad2){ctx.beginPath();ctx.moveTo(px+cur3+pad2,p2y+16);ctx.lineTo(px+pw,p2y+16);ctx.stroke();}
  _label(ctx,'N',px-14,p2y+16,10,COLORS.ink4,'center','600');
  _label(ctx,'C',px+pw+14,p2y+16,10,COLORS.ink4,'center','600');

  for(const d of doms2){
    const dx=px+d.s,dw=d.e-d.s;
    _monoLabel(ctx,d.aa,dx+dw/2,p2y+42,8,d.c,'center');
    _label(ctx,d.desc,dx+dw/2,p2y+54,8,COLORS.ink3,'center','500');
  }

  /* ── Key observations ── */
  const ky=p2y+80;
  _roundRect(ctx,80,ky,280,60,8,COLORS.gb+'10',COLORS.gb+'44',1);
  _label(ctx,'Same domain, different proteins',cx-230,ky+16,11,COLORS.gb,'center','700');
  _label(ctx,'ABC_tran appears twice in the',cx-230,ky+32,9,COLORS.ink3,'center','400');
  _label(ctx,'first protein (tandem repeat)',cx-230,ky+44,9,COLORS.ink3,'center','400');

  _roundRect(ctx,420,ky,300,60,8,COLORS.gd+'10',COLORS.gd+'44',1);
  _label(ctx,'Architecture = function',cx+170,ky+16,11,COLORS.gd,'center','700');
  _label(ctx,'The order and combination of',cx+170,ky+32,9,COLORS.ink3,'center','400');
  _label(ctx,'domains determines protein role',cx+170,ky+44,9,COLORS.ink3,'center','400');

  /* Caption */
  _roundRect(ctx,100,ky+74,600,44,8,'#f8fafc',COLORS.border,1);
  _label(ctx,'The arrangement of domains tells you what the protein does',cx,ky+90,12,COLORS.ink2,'center','600');
  _label(ctx,'Same domain (ABC_tran) can appear twice in one protein',cx,ky+104,10,COLORS.ink3,'center','400');
}

/* ── Step 3: Same domain, different proteins ── */
function drawPfamStep3(ctx){
  const cx=400;
  _label(ctx,'Same domain appears in different proteins',cx,22,14,COLORS.ink,'center','700');

  /* Layout: left panel = HAMP shared, right panel = HATPase_c shared */
  const lx=30,rx2=410,pw2=360,ph=180;

  /* ── Left panel: HAMP shared ── */
  _roundRect(ctx,lx,44,pw2,ph,10,COLORS.gc+'08',COLORS.gc+'33',1);
  _label(ctx,'HAMP domain',lx+pw2/2,60,12,COLORS.gc,'center','700');
  _label(ctx,'Signal transduction module',lx+pw2/2,74,9,COLORS.ink3,'center','400');

  /* Helper: draw backbone only in gaps between domains */
  function _gapBackbone(x0,y,totalW,doms,pad){
    ctx.strokeStyle=COLORS.border;ctx.lineWidth=2;
    let cur=0;
    for(const d of doms){
      if(d.x-cur>pad*2){ctx.beginPath();ctx.moveTo(x0+cur+pad,y);ctx.lineTo(x0+d.x-pad,y);ctx.stroke();}
      cur=d.x+d.w;
    }
    if(totalW-cur>pad){ctx.beginPath();ctx.moveTo(x0+cur+pad,y);ctx.lineTo(x0+totalW,y);ctx.stroke();}
  }

  /* Chemotaxis receptor */
  const c1y=92;
  _label(ctx,'Chemotaxis receptor',lx+16,c1y,9,COLORS.ink2,'left','600');
  const c1px=lx+16,c1pw=pw2-32;
  const c1doms=[{x:8,w:80},{x:110,w:120}];
  _gapBackbone(c1px,c1y+18,c1pw,c1doms,3);
  /* HAMP highlighted */
  _roundRect(ctx,c1px+8,c1y+8,80,20,5,COLORS.gc,null,0);
  _roundRect(ctx,c1px+8,c1y+8,80,20,5,null,COLORS.gc,1.5);
  _label(ctx,'HAMP',c1px+48,c1y+18,9,'#fff','center','700');
  /* MCPsignal */
  _roundRect(ctx,c1px+110,c1y+8,120,20,5,COLORS.ga+'44',COLORS.ga+'66',1);
  _label(ctx,'MCPsignal',c1px+170,c1y+18,9,COLORS.ga,'center','600');

  /* Histidine kinase */
  const c2y=150;
  _label(ctx,'Histidine kinase',lx+16,c2y,9,COLORS.ink2,'left','600');
  const c2doms=[{x:8,w:80},{x:110,w:100},{x:230,w:94}];
  _gapBackbone(c1px,c2y+18,c1pw,c2doms,3);
  /* HAMP highlighted */
  _roundRect(ctx,c1px+8,c2y+8,80,20,5,COLORS.gc,null,0);
  _roundRect(ctx,c1px+8,c2y+8,80,20,5,null,COLORS.gc,1.5);
  _label(ctx,'HAMP',c1px+48,c2y+18,9,'#fff','center','700');
  /* HisKA dimmed */
  _roundRect(ctx,c1px+110,c2y+8,100,20,5,COLORS.gd+'44',COLORS.gd+'66',1);
  _label(ctx,'HisKA',c1px+160,c2y+18,9,COLORS.gd,'center','600');
  /* HATPase_c dimmed */
  _roundRect(ctx,c1px+230,c2y+8,94,20,5,COLORS.bad+'22',COLORS.bad+'44',1);
  _label(ctx,'HATPase_c',c1px+277,c2y+18,8,COLORS.bad+'88','center','600');

  /* Connecting ribbon for HAMP */
  {
    const x1=c1px+8, x2=c1px+8+80;   /* domain left/right edges */
    const top=c1y+28, bot=c2y+8;
    const mid=(top+bot)/2;
    const grad=ctx.createLinearGradient(0,top,0,bot);
    grad.addColorStop(0,COLORS.gc+'44');
    grad.addColorStop(0.5,COLORS.gc+'18');
    grad.addColorStop(1,COLORS.gc+'44');
    ctx.fillStyle=grad;
    ctx.beginPath();
    ctx.moveTo(x1,top);
    ctx.bezierCurveTo(x1,mid,x1,mid,x1,bot);
    ctx.lineTo(x2,bot);
    ctx.bezierCurveTo(x2,mid,x2,mid,x2,top);
    ctx.closePath();
    ctx.fill();
  }

  /* ── Right panel: HATPase_c shared ── */
  _roundRect(ctx,rx2,44,pw2,ph,10,COLORS.bad+'08',COLORS.bad+'33',1);
  _label(ctx,'HATPase_c domain',rx2+pw2/2,60,12,COLORS.bad,'center','700');
  _label(ctx,'ATPase catalytic core',rx2+pw2/2,74,9,COLORS.ink3,'center','400');

  /* Histidine kinase */
  const r1y=92;
  _label(ctx,'Histidine kinase',rx2+16,r1y,9,COLORS.ink2,'left','600');
  const r1px=rx2+16,r1pw=pw2-32;
  const r1doms=[{x:8,w:60},{x:86,w:80},{x:184,w:120}];
  _gapBackbone(r1px,r1y+18,r1pw,r1doms,3);
  /* HAMP dimmed */
  _roundRect(ctx,r1px+8,r1y+8,60,20,5,COLORS.gc+'22',COLORS.gc+'44',1);
  _label(ctx,'HAMP',r1px+38,r1y+18,8,COLORS.gc+'88','center','600');
  /* HisKA dimmed */
  _roundRect(ctx,r1px+86,r1y+8,80,20,5,COLORS.gd+'44',COLORS.gd+'66',1);
  _label(ctx,'HisKA',r1px+126,r1y+18,8,COLORS.gd,'center','600');
  /* HATPase_c highlighted */
  _roundRect(ctx,r1px+184,r1y+8,120,20,5,COLORS.bad,null,0);
  _roundRect(ctx,r1px+184,r1y+8,120,20,5,null,COLORS.bad,1.5);
  _label(ctx,'HATPase_c',r1px+244,r1y+18,9,'#fff','center','700');

  /* DNA gyrase B */
  const r2y=150;
  _label(ctx,'DNA gyrase B',rx2+16,r2y,9,COLORS.ink2,'left','600');
  const r2doms=[{x:8,w:120},{x:184,w:120}];
  _gapBackbone(r1px,r2y+18,r1pw,r2doms,3);
  /* DNA_topoisoIV dimmed */
  _roundRect(ctx,r1px+8,r2y+8,120,20,5,COLORS.gb+'44',COLORS.gb+'66',1);
  _label(ctx,'DNA_topoisoIV',r1px+68,r2y+18,8,COLORS.gb,'center','600');
  /* HATPase_c highlighted */
  _roundRect(ctx,r1px+184,r2y+8,120,20,5,COLORS.bad,null,0);
  _roundRect(ctx,r1px+184,r2y+8,120,20,5,null,COLORS.bad,1.5);
  _label(ctx,'HATPase_c',r1px+244,r2y+18,9,'#fff','center','700');

  /* Connecting ribbon for HATPase_c */
  {
    const x1=r1px+184, x2=r1px+184+120; /* domain left/right edges */
    const top=r1y+28, bot=r2y+8;
    const mid=(top+bot)/2;
    const grad=ctx.createLinearGradient(0,top,0,bot);
    grad.addColorStop(0,COLORS.bad+'44');
    grad.addColorStop(0.5,COLORS.bad+'18');
    grad.addColorStop(1,COLORS.bad+'44');
    ctx.fillStyle=grad;
    ctx.beginPath();
    ctx.moveTo(x1,top);
    ctx.bezierCurveTo(x1,mid,x1,mid,x1,bot);
    ctx.lineTo(x2,bot);
    ctx.bezierCurveTo(x2,mid,x2,mid,x2,top);
    ctx.closePath();
    ctx.fill();
  }

  /* ── Bottom: interpretation ── */
  const by=244;
  _roundRect(ctx,60,by,330,56,8,COLORS.gc+'0c',COLORS.gc+'44',1);
  _label(ctx,'Same HAMP domain',60+165,by+16,11,COLORS.gc,'center','700');
  _label(ctx,'Both proteins sense environmental signals',60+165,by+32,9,COLORS.ink3,'center','400');
  _label(ctx,'and relay them across the membrane',60+165,by+44,9,COLORS.ink3,'center','400');

  _roundRect(ctx,410,by,330,56,8,COLORS.bad+'0c',COLORS.bad+'44',1);
  _label(ctx,'Same HATPase_c domain',410+165,by+16,11,COLORS.bad,'center','700');
  _label(ctx,'Both proteins use ATP hydrolysis',410+165,by+32,9,COLORS.ink3,'center','400');
  _label(ctx,'to power conformational changes',410+165,by+44,9,COLORS.ink3,'center','400');

  /* Key insight */
  _roundRect(ctx,100,by+72,600,60,8,COLORS.gd+'0c',COLORS.border,1);
  _label(ctx,'Shared domains = shared function',cx,by+90,13,COLORS.ink2,'center','700');
  _label(ctx,'Evolution reuses domains like building blocks.',cx,by+106,10,COLORS.ink3,'center','400');
  _label(ctx,'Domain shuffling creates new proteins with new combinations of functions.',cx,by+120,10,COLORS.ink3,'center','400');
}

/* ── Step 4 (was 5): MAG domain fingerprint ── */
function drawPfamStep5(ctx){
  const cx=400;
  _label(ctx,'From individual proteins to a functional fingerprint',cx,22,14,COLORS.ink,'center','700');

  /* ── Left: MAG protein box ── */
  const bx=30,bw=340,by=42,bh=210;
  _roundRect(ctx,bx,by,bw,bh,10,COLORS.gb+'08',COLORS.gb+'33',1);
  _label(ctx,'Your MAG: 2,847 predicted proteins',bx+bw/2,by+16,10,COLORS.gb,'center','700');

  /* Mini proteins inside the MAG box */
  const prots=[
    {name:'ABC transporter',doms:[
      {s:4,e:48,l:'ABC_tran',c:COLORS.gb},
      {s:58,e:120,l:'ABC_mem',c:COLORS.ga},
      {s:130,e:170,l:'ABC_tran',c:COLORS.gb},
    ],fn:'Import'},
    {name:'Histidine kinase',doms:[
      {s:4,e:40,l:'HAMP',c:COLORS.gc},
      {s:50,e:105,l:'HisKA',c:COLORS.gd},
      {s:115,e:170,l:'HATPase_c',c:COLORS.bad},
    ],fn:'Signalling'},
    {name:'Response regulator',doms:[
      {s:4,e:60,l:'Resp_reg',c:COLORS.ga},
      {s:70,e:130,l:'HTH_1',c:COLORS.gb},
    ],fn:'Regulation'},
    {name:'Radical SAM',doms:[
      {s:4,e:75,l:'Radical_SAM',c:COLORS.gd},
      {s:85,e:150,l:'Fer4',c:COLORS.bad},
    ],fn:'Cofactor'},
  ];

  const mpx=bx+14, mpy=by+30, mGap=40, mLen=180;
  for(let i=0;i<prots.length;i++){
    const p=prots[i];
    const py=mpy+i*mGap;
    _label(ctx,p.name,mpx,py,8,COLORS.ink2,'left','600');
    /* Mini backbone */
    ctx.strokeStyle=COLORS.border;ctx.lineWidth=1.5;
    ctx.beginPath();ctx.moveTo(mpx,py+12);ctx.lineTo(mpx+mLen,py+12);ctx.stroke();
    /* Mini domains */
    for(const d of p.doms){
      _roundRect(ctx,mpx+d.s,py+5,d.e-d.s,14,3,d.c,null,0);
      _label(ctx,d.l,mpx+d.s+(d.e-d.s)/2,py+12,Math.min(7,(d.e-d.s)/d.l.length*1.4),'#fff','center','700');
    }
    /* Function tag */
    _roundRect(ctx,mpx+mLen+10,py+3,54,18,4,COLORS.ink4+'14',COLORS.ink4+'44',0.5);
    _label(ctx,p.fn,mpx+mLen+37,py+12,7,COLORS.ink3,'center','500');
  }
  /* Ellipsis for more */
  _label(ctx,'... 2,843 more proteins',bx+bw/2,mpy+4*mGap+6,9,COLORS.ink4,'center','400');

  /* ── Arrow from MAG box to bar chart ── */
  const arrowX=bx+bw+12, arrowEndX=bx+bw+50;
  const arrowY=by+bh/2;
  ctx.strokeStyle=COLORS.ink4;ctx.lineWidth=1.5;
  ctx.beginPath();ctx.moveTo(arrowX,arrowY);ctx.lineTo(arrowEndX-6,arrowY);ctx.stroke();
  /* arrowhead */
  ctx.fillStyle=COLORS.ink4;ctx.beginPath();
  ctx.moveTo(arrowEndX,arrowY);ctx.lineTo(arrowEndX-8,arrowY-4);ctx.lineTo(arrowEndX-8,arrowY+4);ctx.closePath();ctx.fill();
  _label(ctx,'Count',arrowX+16,arrowY-8,8,COLORS.ink4,'center','600');
  _label(ctx,'domains',arrowX+16,arrowY+16,8,COLORS.ink4,'center','600');

  /* ── Right: Domain family bar chart ── */
  const chartX=430, chartW=340, chartY=by, chartH=bh;
  _roundRect(ctx,chartX,chartY,chartW,chartH,10,'#f8fafc',COLORS.border,1);
  _label(ctx,'Domain family counts',chartX+chartW/2,chartY+16,11,COLORS.ink2,'center','700');

  const fams=[
    {name:'ABC_tran',n:87,col:COLORS.gb},
    {name:'Response_reg',n:72,col:COLORS.ga},
    {name:'HisKA',n:64,col:COLORS.gd},
    {name:'HATPase_c',n:52,col:COLORS.bad},
    {name:'HTH_1',n:38,col:COLORS.gb},
    {name:'Radical_SAM',n:27,col:COLORS.gd},
  ];
  const maxN=fams[0].n;
  const barAreaX=chartX+90, barAreaW=220, barH=16, barGap=6;
  const barY0=chartY+32;
  for(let i=0;i<fams.length;i++){
    const f=fams[i];
    const fy=barY0+i*(barH+barGap);
    const bw2=Math.max(8,(f.n/maxN)*barAreaW);
    /* Label */
    _monoLabel(ctx,f.name,barAreaX-6,fy+barH/2+1,8,f.col,'right');
    /* Bar */
    _roundRect(ctx,barAreaX,fy,bw2,barH,3,f.col,null,0);
    /* Count */
    _label(ctx,''+f.n,barAreaX+bw2+8,fy+barH/2+1,9,f.col,'left','700');
  }

  /* ── Bottom: Interpretation ── */
  const iy=by+bh+16;
  _roundRect(ctx,30,iy,370,72,8,COLORS.gb+'0c',COLORS.gb+'44',1);
  _label(ctx,'Transport-rich MAG',30+185,iy+16,11,COLORS.gb,'center','700');
  _label(ctx,'87 ABC transporters suggest active',30+185,iy+34,9,COLORS.ink3,'center','400');
  _label(ctx,'substrate import from the environment',30+185,iy+48,9,COLORS.ink3,'center','400');
  _label(ctx,'Lifestyle: free-living, nutrient scavenger',30+185,iy+62,9,COLORS.ink2,'center','600');

  _roundRect(ctx,420,iy,370,72,8,COLORS.gd+'0c',COLORS.gd+'44',1);
  _label(ctx,'Two-component systems',420+185,iy+16,11,COLORS.gd,'center','700');
  _label(ctx,'HisKA + Response_reg = environmental',420+185,iy+34,9,COLORS.ink3,'center','400');
  _label(ctx,'sensing and gene regulation circuits',420+185,iy+48,9,COLORS.ink3,'center','400');
  _label(ctx,'Lifestyle: responsive to changing conditions',420+185,iy+62,9,COLORS.ink2,'center','600');

  /* Key insight */
  _roundRect(ctx,100,iy+84,600,36,8,COLORS.gc+'0c',COLORS.border,1);
  _label(ctx,'Domain family profile = metabolic fingerprint of your MAG',cx,iy+102,11,COLORS.ink2,'center','700');
}

/* ═══════════════════════════════════════════════════════════
   7. CAZY-CANVAS — 7-step pedagogical animation
   ═══════════════════════════════════════════════════════════ */

const cazyHeaders=[
  'Step 1: What are CAZymes?',
  'Step 2: Six CAZyme classes',
  'Step 3: GH — the largest class',
  'Step 4: Family = substrate specificity',
  'Step 5: dbCAN finds CAZymes in your MAG',
  'Step 6: PULs — CAZymes in genomic context',
  'Step 7: CAZyme niche prediction',
];
const cazyCanvasHeaders=[
  'Carbohydrate-Active enZymes',
  'Six classes of carbohydrate enzymes',
  'Glycoside Hydrolases: diverse sugar breakers',
  'Families within a class target specific substrates',
  'dbCAN three-method annotation pipeline',
  'Polysaccharide Utilization Loci',
  'Substrate-centric ecological interpretation',
];
const cazyCardMap=[0,0,0,1,1,2,2];

function cazyHighlight(step){
  const active=cazyCardMap[Math.min(step,6)];
  for(let i=0;i<3;i++){
    const el=document.getElementById('cazy-card-'+i);if(!el)continue;
    el.style.opacity=i===active?'1':i<active?'0.5':'0.35';
    el.style.transform=i===active?'scale(1.02)':'scale(1)';
    el.style.boxShadow=i===active?'0 4px 6px rgba(15,23,42,.04),0 2px 12px rgba(15,23,42,.06)':'0 1px 2px rgba(15,23,42,.04),0 1px 3px rgba(15,23,42,.06)';
  }
  const h=document.getElementById('cazy-header');
  if(h) h.textContent=cazyHeaders[Math.min(step,6)];
  const ch=document.getElementById('cazy-canvas-header');
  if(ch) ch.textContent=cazyCanvasHeaders[Math.min(step,6)];
}

function drawCazyCanvas(step){
  step=step||0;
  const ctx=_c('cazy-canvas');if(!ctx)return;
  ctx.clearRect(0,0,800,440);
  [drawCazyStep0,drawCazyStep1,drawCazyStep2,drawCazyStep3,drawCazyStep4,drawCazyStep5,drawCazyStep6][Math.min(step,6)](ctx);
}

/* helper: draw a sugar chain */
function _sugarChain(ctx,x,y,n,unitW,gap,colors){
  for(let i=0;i<n;i++){
    const ux=x+i*(unitW+gap);
    const col=colors[i%colors.length];
    _roundRect(ctx,ux,y,unitW,22,5,col,COLORS.border,1);
    if(i<n-1){
      ctx.strokeStyle=COLORS.ink4;ctx.lineWidth=1.2;
      ctx.beginPath();ctx.moveTo(ux+unitW,y+11);ctx.lineTo(ux+unitW+gap,y+11);ctx.stroke();
    }
  }
}

/* ── Step 0: What are CAZymes? ── */
function drawCazyStep0(ctx){
  const cx=400;
  _label(ctx,'Enzymes that process carbohydrate chains',cx,24,15,COLORS.ink,'center','700');

  /* Three large panels side by side */
  const pw=220,ph=280,pGap=22;
  const pTotal=3*pw+2*pGap;
  const px0=cx-pTotal/2,py=50;

  const panels=[
    {title:'Break',abbr:'GH',full:'Glycoside Hydrolases',col:COLORS.ga,
     nBefore:6,nAfter1:3,nAfter2:3,sym:'scissors'},
    {title:'Build',abbr:'GT',full:'Glycosyltransferases',col:COLORS.gb,
     nBefore:4,nAfter1:5,sym:'plus'},
    {title:'Modify',abbr:'CE',full:'Carbohydrate Esterases',col:COLORS.gd,
     nBefore:5,nAfter1:5,sym:'strip'},
  ];

  const uW=24,uGap=3;
  const sugC=['#a7f3d0','#bae6fd','#fde68a'];

  for(let i=0;i<panels.length;i++){
    const p=panels[i];
    const px=px0+i*(pw+pGap);
    const pcx=px+pw/2;

    /* Panel background */
    _roundRect(ctx,px,py,pw,ph,10,p.col+'06',p.col+'44',1);

    /* Abbreviation circle */
    ctx.beginPath();ctx.arc(pcx,py+34,22,0,Math.PI*2);
    ctx.fillStyle=p.col+'14';ctx.fill();
    ctx.strokeStyle=p.col+'66';ctx.lineWidth=1.5;ctx.stroke();
    _label(ctx,p.abbr,pcx,py+34,20,p.col,'center','800');

    /* Title + full name */
    _label(ctx,p.title,pcx,py+68,16,p.col,'center','700');
    _label(ctx,p.full,pcx,py+86,10,COLORS.ink3,'center','400');

    /* ── Before chain ── */
    _label(ctx,'Before',pcx,py+112,10,COLORS.ink4,'center','600');
    const bChainW=p.nBefore*uW+(p.nBefore-1)*uGap;
    const bx=pcx-bChainW/2;

    if(p.sym==='scissors'){
      /* Intact chain */
      _sugarChain(ctx,bx,py+122,p.nBefore,uW,uGap,sugC);
      /* Bond highlight in middle */
      const bondX=bx+3*(uW+uGap)-uGap/2;
      ctx.strokeStyle=p.col+'66';ctx.lineWidth=1;
      ctx.setLineDash([3,2]);
      ctx.beginPath();ctx.moveTo(bondX,py+120);ctx.lineTo(bondX,py+146);ctx.stroke();
      ctx.setLineDash([]);
    } else if(p.sym==='plus'){
      /* Shorter chain + gap */
      _sugarChain(ctx,bx,py+122,p.nBefore,uW,uGap,sugC);
      /* Incoming unit floating */
      ctx.setLineDash([3,3]);ctx.strokeStyle=p.col;ctx.lineWidth=1;
      ctx.beginPath();
      ctx.moveTo(bx+bChainW+4,py+133);
      ctx.lineTo(bx+bChainW+14,py+133);
      ctx.stroke();ctx.setLineDash([]);
      _roundRect(ctx,bx+bChainW+16,py+122,uW,22,5,sugC[p.nBefore%3],p.col+'88',1.5);
    } else {
      /* Chain with side groups dangling below */
      _sugarChain(ctx,bx,py+120,p.nBefore,uW,uGap,sugC);
      for(const si of [1,3]){
        const sgx=bx+si*(uW+uGap)+uW/2;
        ctx.strokeStyle=p.col;ctx.lineWidth=1.2;
        ctx.beginPath();ctx.moveTo(sgx,py+142);ctx.lineTo(sgx,py+150);ctx.stroke();
        _roundRect(ctx,sgx-10,py+150,20,14,3,p.col+'22',p.col,1);
        _label(ctx,'Ac',sgx,py+157,8,p.col,'center','700');
      }
    }

    /* Arrow down */
    _arrow(ctx,pcx,py+156,pcx,py+176,p.col,2);

    /* ── After chain ── */
    _label(ctx,'After',pcx,py+190,10,COLORS.ink4,'center','600');

    if(p.sym==='scissors'){
      /* Two fragments separated */
      const f1w=p.nAfter1*uW+(p.nAfter1-1)*uGap;
      const f2w=p.nAfter2*uW+(p.nAfter2-1)*uGap;
      const gap=18;
      const totalFW=f1w+gap+f2w;
      const fx=pcx-totalFW/2;
      _sugarChain(ctx,fx,py+200,p.nAfter1,uW,uGap,sugC);
      _sugarChain(ctx,fx+f1w+gap,py+200,p.nAfter2,uW,uGap,sugC);
      /* Gap indicator */
      _label(ctx,'+',fx+f1w+gap/2,py+210,14,p.col,'center','700');
    } else if(p.sym==='plus'){
      /* Longer chain */
      const aChainW=p.nAfter1*uW+(p.nAfter1-1)*uGap;
      _sugarChain(ctx,pcx-aChainW/2,py+200,p.nAfter1,uW,uGap,sugC);
      /* Highlight the new unit */
      const newX=pcx-aChainW/2+4*(uW+uGap);
      _roundRect(ctx,newX-1,py+198,uW+2,26,6,null,p.col,2);
    } else {
      /* Clean chain — side groups removed */
      const aChainW=p.nAfter1*uW+(p.nAfter1-1)*uGap;
      const ax=pcx-aChainW/2;
      _sugarChain(ctx,ax,py+200,p.nAfter1,uW,uGap,sugC);
    }

    /* One-line description */
    const descMap={scissors:'Cleaves glycosidic bonds',plus:'Forms new glycosidic bonds',strip:'Removes ester side groups'};
    _label(ctx,descMap[p.sym],pcx,py+242,10,COLORS.ink3,'center','400');

    /* Family count */
    const countMap={scissors:'~180 families',plus:'~120 families',strip:'~20 families'};
    _monoLabel(ctx,countMap[p.sym],pcx,py+260,10,p.col+'aa','center');
  }

  /* Key insight */
  _roundRect(ctx,60,py+ph+16,680,40,8,'#f8fafc',COLORS.border,1);
  _label(ctx,'CAZy database classifies six enzyme classes — GH, GT, PL, CE, CBM, AA',cx,py+ph+30,11,COLORS.ink2,'center','600');
  _label(ctx,'Together they break down, synthesize, and remodel all carbohydrate structures',cx,py+ph+46,10,COLORS.ink3,'center','400');
}

/* ── Step 1: Six CAZyme classes ── */
function drawCazyStep1(ctx){
  const cx=400;
  _label(ctx,'Six classes of carbohydrate-active enzymes',cx,28,14,COLORS.ink,'center','700');

  const classes=[
    {abbr:'GH',name:'Glycoside Hydrolases',fn:'Break glycosidic bonds',count:'~180 families',col:COLORS.ga},
    {abbr:'GT',name:'Glycosyltransferases',fn:'Form glycosidic bonds',count:'~120 families',col:COLORS.gb},
    {abbr:'PL',name:'Polysaccharide Lyases',fn:'Cleave via elimination',count:'~40 families',col:COLORS.gc},
    {abbr:'CE',name:'Carbohydrate Esterases',fn:'Remove ester groups',count:'~20 families',col:COLORS.gd},
    {abbr:'CBM',name:'Binding Modules',fn:'Target enzyme to substrate',count:'~90 families',col:COLORS.ink3},
    {abbr:'AA',name:'Auxiliary Activities',fn:'Redox aids degradation',count:'~18 families',col:COLORS.bad},
  ];

  const cols=3,rows=2,bw=224,bh=90,gx=24,gy=16;
  const totalW=cols*bw+(cols-1)*gx;
  const x0=cx-totalW/2,y0=50;

  for(let i=0;i<classes.length;i++){
    const c=classes[i];
    const col=i%cols,row=Math.floor(i/cols);
    const bx=x0+col*(bw+gx),by=y0+row*(bh+gy);

    _roundRect(ctx,bx,by,bw,bh,8,c.col+'0c',c.col,1.5);

    /* Abbreviation circle on left */
    const acx=bx+36,acy=by+bh/2;
    ctx.beginPath();ctx.arc(acx,acy,22,0,Math.PI*2);
    ctx.fillStyle=c.col+'18';ctx.fill();
    ctx.strokeStyle=c.col+'44';ctx.lineWidth=1;ctx.stroke();
    const abbrSz=c.abbr.length>2?14:18;
    _label(ctx,c.abbr,acx,acy,abbrSz,c.col,'center','800');

    /* Text on right */
    const tx=bx+68+(bw-68)/2;
    const nameSz=c.name.length>20?10:11;
    _label(ctx,c.name,tx,by+28,nameSz,COLORS.ink,'center','700');
    _label(ctx,c.fn,tx,by+46,10,COLORS.ink3,'center','400');
    _monoLabel(ctx,c.count,tx,by+66,10,c.col,'center');
  }

  /* Role grouping */
  const gy2=y0+rows*bh+(rows-1)*gy+24;
  _roundRect(ctx,60,gy2,680,70,8,'#f8fafc',COLORS.border,1);

  const groups=[
    {label:'Catalytic',desc:'GH + GT + PL + CE',sub:'directly process sugars',col:COLORS.ga,x:180},
    {label:'Substrate binding',desc:'CBM',sub:'anchors enzyme to target',col:COLORS.ink3,x:400},
    {label:'Redox helpers',desc:'AA',sub:'oxidative enzymes aid breakdown',col:COLORS.bad,x:620},
  ];
  for(let i=0;i<groups.length;i++){
    const g=groups[i];
    _label(ctx,g.label,g.x,gy2+18,12,g.col,'center','700');
    _label(ctx,g.desc,g.x,gy2+34,10,COLORS.ink3,'center','600');
    _label(ctx,g.sub,g.x,gy2+50,10,COLORS.ink4,'center','400');
    if(i<groups.length-1){
      const sx=g.x+110;
      ctx.strokeStyle=COLORS.border;ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(sx,gy2+10);ctx.lineTo(sx,gy2+60);ctx.stroke();
    }
  }
}

/* ── Step 2: GH — the largest class ── */
function drawCazyStep2(ctx){
  const cx=400;
  _label(ctx,'Glycoside Hydrolases: the most diverse CAZyme class',cx,28,14,COLORS.ink,'center','700');

  /* GH header pill */
  _roundRect(ctx,cx-140,52,280,38,8,COLORS.ga+'18',COLORS.ga,2);
  ctx.beginPath();ctx.arc(cx-100,71,16,0,Math.PI*2);
  ctx.fillStyle=COLORS.ga+'22';ctx.fill();
  _label(ctx,'GH',cx-100,71,16,COLORS.ga,'center','800');
  _label(ctx,'~180 families  |  >500 000 sequences',cx+20,71,11,COLORS.ink2,'center','600');

  /* Three example families */
  const fams=[
    {id:'GH5',sub:'Cellulose',desc:'Endoglucanase cuts\nbeta-1,4-glucan chains',col:'#16a34a',
     chain:['#a7f3d0','#a7f3d0','#a7f3d0','#a7f3d0','#a7f3d0','#a7f3d0']},
    {id:'GH13',sub:'Starch',desc:'Alpha-amylase breaks\nalpha-1,4-glucan bonds',col:'#d97706',
     chain:['#fde68a','#fde68a','#fde68a','#fde68a','#fde68a','#fde68a']},
    {id:'GH43',sub:'Hemicellulose',desc:'Xylanase degrades\nxylan side chains',col:'#7c3aed',
     chain:['#e9d5ff','#bae6fd','#e9d5ff','#bae6fd','#e9d5ff','#bae6fd']},
  ];

  const fw=224,fh=148,fGap=20;
  const fTotal=fams.length*fw+(fams.length-1)*fGap;
  const fx0=cx-fTotal/2,fy=106;

  for(let i=0;i<fams.length;i++){
    const f=fams[i];
    const fx=fx0+i*(fw+fGap);

    _roundRect(ctx,fx,fy,fw,fh,8,f.col+'08',f.col,1.5);

    /* Family ID + substrate pill */
    _monoLabel(ctx,f.id,fx+42,fy+22,16,f.col,'center');
    _roundRect(ctx,fx+fw/2-10,fy+10,fw/2-4,24,5,f.col+'22',null,0);
    _label(ctx,f.sub,fx+fw/2-10+(fw/2-4)/2,fy+22,11,f.col,'center','700');

    /* Mini sugar chain */
    const chainX=fx+22,chainY=fy+48;
    _sugarChain(ctx,chainX,chainY,6,24,4,f.chain);

    /* Scissors at cut point */
    const scX=chainX+3*28+2;
    ctx.strokeStyle=f.col;ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(scX,chainY-4);ctx.lineTo(scX,chainY+26);ctx.stroke();
    _label(ctx,'cut',scX,chainY+36,9,f.col,'center','600');

    /* Description */
    const lines=f.desc.split('\n');
    for(let j=0;j<lines.length;j++){
      _label(ctx,lines[j],fx+fw/2,fy+102+j*16,10,COLORS.ink3,'center','400');
    }
  }

  /* Key point */
  _roundRect(ctx,100,fy+fh+20,600,50,8,'#f8fafc',COLORS.border,1);
  _label(ctx,'Different GH families target different sugar bonds',cx,fy+fh+36,12,COLORS.ink2,'center','700');
  _label(ctx,'The family number is a strong predictor of substrate specificity',cx,fy+fh+54,10,COLORS.ink3,'center','400');
}

/* ── Step 3: Family = substrate specificity ── */
function drawCazyStep3(ctx){
  const cx=400;
  _label(ctx,'Within a class, families predict substrate specificity',cx,28,14,COLORS.ink,'center','700');

  /* Parent class pill */
  _roundRect(ctx,cx-150,52,300,38,8,COLORS.ga+'14',COLORS.ga,2);
  _label(ctx,'GH',cx-110,71,18,COLORS.ga,'center','800');
  _label(ctx,'Glycoside Hydrolases  (~180 families)',cx+20,71,11,COLORS.ink2,'center','600');

  /* Arrow down */
  _arrow(ctx,cx,94,cx,116,COLORS.ga,2);
  _label(ctx,'grouped by sequence similarity',cx+16,108,10,COLORS.ink4,'left','400');

  /* Family boxes — 3×2 grid for readability */
  const families=[
    {id:'GH5',substrate:'Cellulose',desc:'Plant cell walls',col:'#16a34a'},
    {id:'GH13',substrate:'Starch',desc:'Amylase family',col:'#d97706'},
    {id:'GH28',substrate:'Pectin',desc:'Polygalacturonase',col:'#dc2626'},
    {id:'GH9',substrate:'Cellulose',desc:'Endoglucanase',col:'#15803d'},
    {id:'GH48',substrate:'Cellulose',desc:'Exocellulase',col:'#059669'},
    {id:'GH43',substrate:'Hemicellulose',desc:'Xylan side chains',col:'#7c3aed'},
  ];
  const gcols=3,fw=210,fh=70,fGap=20,fGy=14;
  const fTotal=gcols*fw+(gcols-1)*fGap;
  const fx0=cx-fTotal/2,fy=126;

  /* Tree connector — trunk, horizontal branch, vertical drops (no crossing) */
  {
    const colCx=[];
    for(let c=0;c<gcols;c++) colCx.push(fx0+c*(fw+fGap)+fw/2);
    const brY=118;
    ctx.setLineDash([3,3]);ctx.strokeStyle=COLORS.ga+'44';ctx.lineWidth=1;
    /* trunk */
    ctx.beginPath();ctx.moveTo(cx,94);ctx.lineTo(cx,brY);ctx.stroke();
    /* horizontal branch */
    ctx.beginPath();ctx.moveTo(colCx[0],brY);ctx.lineTo(colCx[2],brY);ctx.stroke();
    /* vertical drops per column */
    for(let c=0;c<gcols;c++){
      ctx.beginPath();ctx.moveTo(colCx[c],brY);ctx.lineTo(colCx[c],fy);ctx.stroke();
      const r0b=fy+fh, r1t=fy+fh+fGy;
      ctx.beginPath();ctx.moveTo(colCx[c],r0b);ctx.lineTo(colCx[c],r1t);ctx.stroke();
    }
    ctx.setLineDash([]);
  }

  for(let i=0;i<families.length;i++){
    const f=families[i];
    const col=i%gcols,row=Math.floor(i/gcols);
    const fx=fx0+col*(fw+fGap),fby=fy+row*(fh+fGy);

    _roundRect(ctx,fx,fby,fw,fh,8,f.col+'10',f.col+'88',1.5);
    _monoLabel(ctx,f.id,fx+36,fby+22,14,f.col,'center');

    /* Substrate pill */
    _roundRect(ctx,fx+68,fby+10,fw-78,24,5,f.col+'22',null,0);
    _label(ctx,f.substrate,fx+68+(fw-78)/2,fby+22,11,f.col,'center','700');

    _label(ctx,f.desc,fx+fw/2,fby+54,10,COLORS.ink3,'center','400');
  }

  /* Substrate legend */
  const ly=fy+2*(fh+fGy)+12;
  _roundRect(ctx,60,ly,680,38,8,'#f8fafc',COLORS.border,1);
  const subs=[
    {name:'Cellulose',col:'#16a34a'},{name:'Starch',col:'#d97706'},
    {name:'Pectin',col:'#dc2626'},{name:'Hemicellulose',col:'#7c3aed'},
  ];
  let lx=100;
  for(const s of subs){
    _roundRect(ctx,lx,ly+13,14,14,4,s.col+'33',s.col,1);
    _label(ctx,s.name,lx+20,ly+20,10,COLORS.ink2,'left','600');
    lx+=ctx.measureText(s.name).width+50;
  }

  /* Key insight */
  _roundRect(ctx,100,ly+50,600,38,8,'#ecfdf5',COLORS.ga+'66',1);
  _label(ctx,'Same class, different families = different substrates',cx,ly+69,12,COLORS.ink2,'center','700');
}

/* ── Step 4: dbCAN pipeline ── */
function drawCazyStep4(ctx){
  const cx=400;
  _label(ctx,'dbCAN: three methods, consensus annotation',cx,24,15,COLORS.ink,'center','700');
  _label(ctx,'Each query protein is scanned independently by all three methods',cx,44,11,COLORS.ink3,'center','400');

  /* Three method panels — side by side like BGC fragmentation */
  const methods=[
    {name:'HMMER',num:'1',approach:'Profile HMMs',db:'dbCAN-HMMdb',
     how:'Aligns protein to family-specific\nprofile hidden Markov models',col:COLORS.ga},
    {name:'DIAMOND',num:'2',approach:'Sequence homology',db:'CAZy sequences',
     how:'BLASTp-like search against all\ncharacterised CAZyme sequences',col:COLORS.gb},
    {name:'eCAMI',num:'3',approach:'Peptide patterns',db:'Conserved motifs',
     how:'Scans for short conserved peptide\nsubsequences diagnostic of families',col:COLORS.gd},
  ];
  const pw=220,ph=180,pGap=18;
  const pTotal=3*pw+2*pGap;
  const px0=cx-pTotal/2,py=60;

  for(let i=0;i<methods.length;i++){
    const m=methods[i];
    const px=px0+i*(pw+pGap);
    _roundRect(ctx,px,py,pw,ph,8,m.col+'08',m.col,1.5);

    /* Circle number */
    ctx.beginPath();ctx.arc(px+pw/2,py+28,18,0,Math.PI*2);
    ctx.fillStyle=m.col+'18';ctx.fill();
    _label(ctx,m.num,px+pw/2,py+28,15,m.col,'center','800');

    _label(ctx,m.name,px+pw/2,py+58,15,m.col,'center','700');

    /* Approach + database */
    _roundRect(ctx,px+14,py+74,pw-28,24,5,m.col+'14',null,0);
    _label(ctx,m.approach,px+pw/2,py+86,10,m.col,'center','700');

    _label(ctx,'vs '+m.db,px+pw/2,py+110,10,COLORS.ink3,'center','500');

    /* How it works */
    const lines=m.how.split('\n');
    for(let j=0;j<lines.length;j++){
      _label(ctx,lines[j],px+pw/2,py+132+j*14,9,COLORS.ink4,'center','400');
    }
  }

  /* Consensus section */
  const consY=py+ph+18;
  _roundRect(ctx,px0,consY,pTotal,52,8,COLORS.gc+'10',COLORS.gc,2);
  _label(ctx,'Consensus: annotated if 2 of 3 methods agree',cx,consY+22,13,COLORS.gc,'center','800');
  _monoLabel(ctx,'overview.txt',cx,consY+40,10,COLORS.ink3,'center');

  /* Result */
  const resY=consY+64;
  _roundRect(ctx,cx-180,resY,360,36,8,'#ecfdf5',COLORS.ga,1.5);
  _monoLabel(ctx,'GH5_4  GT2  CBM6  CE1 ...',cx,resY+18,12,COLORS.ga,'center');

  /* Takeaway */
  _roundRect(ctx,100,resY+50,600,34,8,'#f8fafc',COLORS.border,1);
  _label(ctx,'Three independent methods reduce false positives',cx,resY+67,11,COLORS.ink2,'center','600');
}

/* ── Step 5: PULs — CAZymes in genomic context ── */
function drawCazyStep5(ctx){
  const cx=400;
  _label(ctx,'Polysaccharide Utilization Loci (PULs)',cx,28,14,COLORS.ink,'center','700');
  _label(ctx,'CAZymes often cluster with transporters and regulators',cx,48,11,COLORS.ink3,'center','400');

  /* Contig backbone */
  const cy=74,cw=700;
  _roundRect(ctx,50,cy,cw,5,3,'#e2e8f0','#cbd5e1',1);

  /* Genes in a PUL */
  const genes=[
    {x:60,w:48,dir:-1,col:'#cbd5e1',label:''},
    {x:124,w:58,dir:1,col:COLORS.gd,label:'SusR'},
    {x:198,w:64,dir:1,col:COLORS.gd,label:'SusC'},
    {x:278,w:52,dir:1,col:COLORS.gd,label:'SusD'},
    {x:346,w:74,dir:1,col:COLORS.ga,label:'GH13'},
    {x:436,w:68,dir:-1,col:COLORS.ga,label:'GH97'},
    {x:520,w:54,dir:1,col:COLORS.ga,label:'GH31'},
    {x:590,w:44,dir:1,col:COLORS.ink3,label:'CBM'},
    {x:650,w:40,dir:1,col:'#94a3b8',label:'hyp'},
    {x:706,w:38,dir:-1,col:'#cbd5e1',label:''},
  ];

  const gY=cy+18,gH=32;
  for(const g of genes){
    _geneArrow(ctx,g.x,gY,g.w,gH,g.dir,g.col+'cc',g.col);
    if(g.label) _label(ctx,g.label,g.x+g.w/2,gY+gH/2,g.label.length>4?9:10,'#fff','center','700');
  }

  /* Bracket around PUL */
  const bStart=118,bEnd=640,bY=gY+gH+12;
  ctx.strokeStyle=COLORS.ga;ctx.lineWidth=2;
  ctx.beginPath();
  ctx.moveTo(bStart,bY-6);ctx.lineTo(bStart,bY);ctx.lineTo(bEnd,bY);ctx.lineTo(bEnd,bY-6);
  ctx.stroke();
  _label(ctx,'PUL (Starch utilization)',cx-20,bY+14,12,COLORS.ga,'center','700');

  /* Legend row */
  const legY=bY+28;
  const legItems=[
    {label:'Regulators / Transporters',col:COLORS.gd},
    {label:'CAZymes (GH)',col:COLORS.ga},
    {label:'Binding (CBM)',col:COLORS.ink3},
  ];
  const lTotal=legItems.length;
  const lGap=30,lw=180;
  const lx0=cx-(lTotal*lw+(lTotal-1)*lGap)/2;
  for(let i=0;i<lTotal;i++){
    const it=legItems[i];
    const lx=lx0+i*(lw+lGap);
    ctx.fillStyle=it.col+'cc';
    _roundRect(ctx,lx,legY+2,14,14,3,it.col+'cc',null,0);
    _label(ctx,it.label,lx+20,legY+10,10,COLORS.ink2,'left','600');
  }

  /* Why PULs matter — two key points */
  const cmpY=legY+34;
  _roundRect(ctx,60,cmpY,340,100,8,COLORS.ga+'0c',COLORS.ga,1.5);
  _label(ctx,'What a PUL tells you',230,cmpY+18,12,COLORS.ga,'center','700');
  _label(ctx,'The organism can degrade a specific',230,cmpY+40,10,COLORS.ink2,'center','400');
  _label(ctx,'polysaccharide (e.g. starch, xylan, pectin)',230,cmpY+54,10,COLORS.ink2,'center','400');
  _label(ctx,'Genes for sensing, binding, transport,',230,cmpY+74,10,COLORS.ink3,'center','400');
  _label(ctx,'and hydrolysis are co-located',230,cmpY+88,10,COLORS.ink3,'center','400');

  _roundRect(ctx,420,cmpY,320,100,8,COLORS.gb+'0c',COLORS.gb,1.5);
  _label(ctx,'Where to find PULs',580,cmpY+18,12,COLORS.gb,'center','700');
  _label(ctx,'Mainly in Bacteroidota',580,cmpY+40,10,COLORS.ink2,'center','400');
  _label(ctx,'dbCAN-PUL database links CAZyme',580,cmpY+60,10,COLORS.ink3,'center','400');
  _label(ctx,'families to known PUL structures',580,cmpY+74,10,COLORS.ink3,'center','400');
  _label(ctx,'Defined by SusC/SusD-like pairs',580,cmpY+92,10,COLORS.ink4,'center','500');

  /* Key insight */
  _roundRect(ctx,80,cmpY+112,640,36,8,'#f8fafc',COLORS.border,1);
  _label(ctx,'A PUL is a genomic signature of a specific carbohydrate-degrading lifestyle',cx,cmpY+130,11,COLORS.ink2,'center','600');
}

/* ── Step 6: CAZyme niche prediction ── */
function drawCazyStep6(ctx){
  const cx=400;
  _label(ctx,'Group CAZyme families by substrate to predict ecological niche',cx,24,15,COLORS.ink,'center','700');

  /* Organism label */
  _roundRect(ctx,cx-130,44,260,24,5,'#0891b2'+'14','#0891b2',1);
  _label(ctx,'Lentimonas sp. CC4 (Verrucomicrobia)',cx,56,10,'#0891b2','center','600');

  /* Horizontal bar chart — avoids the scale problem */
  const subs=[
    {name:'Fucoidan',families:'GH29, GH95, GH141, S1_17',count:284,col:'#0891b2',
     source:'Brown algae'},
    {name:'Laminarin',families:'GH16, GH17, GH30',count:42,col:'#16a34a',
     source:'Brown algae storage'},
    {name:'Alginate',families:'PL6, PL7, PL17',count:18,col:'#d97706',
     source:'Algal cell walls'},
    {name:'Xylan',families:'GH10, GH43',count:8,col:'#7c3aed',
     source:'Hemicellulose'},
    {name:'Starch',families:'GH13',count:3,col:'#dc2626',
     source:'Storage'},
  ];

  const maxC=subs[0].count;
  const labelW=90,barMaxW=340,barH=30,rowGap=10;
  const bx0=labelW+60,by0=100;
  const totalH=subs.length*(barH+rowGap)-rowGap;

  /* Dominant marker — dashed rect around first row, label above */
  _label(ctx,'Dominant substrate',bx0+barMaxW/2,by0-12,9,'#0891b2','center','600');
  ctx.setLineDash([4,3]);ctx.strokeStyle='#0891b2'+'44';ctx.lineWidth=1.5;
  ctx.strokeRect(bx0-2,by0-4,barMaxW+160,barH+8);
  ctx.setLineDash([]);

  /* Axis line */
  ctx.strokeStyle=COLORS.border;ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(bx0,by0-4);ctx.lineTo(bx0,by0+totalH+4);ctx.stroke();

  for(let i=0;i<subs.length;i++){
    const s=subs[i];
    const by=by0+i*(barH+rowGap);
    const bw=barMaxW*(s.count/maxC);

    /* Substrate label left */
    _label(ctx,s.name,bx0-8,by+barH/2-4,12,s.col,'right','700');
    _label(ctx,s.source,bx0-8,by+barH/2+10,8,COLORS.ink4,'right','400');

    /* Bar */
    _roundRect(ctx,bx0+2,by,bw,barH,3,s.col+'22',s.col,1.5);

    /* Count — inside bar if wide, else right of bar */
    if(bw>80){
      _label(ctx,''+s.count,bx0+bw-10,by+barH/2,13,COLORS.ink,'right','800');
    } else {
      _label(ctx,''+s.count,bx0+bw+10,by+barH/2,13,s.col,'left','800');
    }

    /* Families — always at fixed x so they line up neatly */
    const famX=bx0+barMaxW+14;
    _monoLabel(ctx,s.families,famX,by+barH/2,9,COLORS.ink3,'left');
  }

  /* Interpretation */
  const iy=by0+totalH+20;
  _roundRect(ctx,60,iy,680,48,8,'#ecfeff','#0891b2'+'66',1.2);
  _label(ctx,'284 fucoidan-targeting CAZymes — a marine algal polysaccharide specialist',cx,iy+16,12,'#0891b2','center','700');
  _label(ctx,'~100 enzymes per fucoidan type; mostly on a single 0.89 Mbp plasmid',cx,iy+36,10,COLORS.ink3,'center','400');

  /* Caveat */
  _roundRect(ctx,60,iy+58,680,44,8,'#fffbeb',COLORS.gd+'88',1.2);
  _label(ctx,'Caveat: family-level predictions can be broad',cx,iy+74,12,COLORS.gd,'center','700');
  _label(ctx,'Always cross-check with PUL context and substrate-binding modules',cx,iy+94,10,COLORS.ink3,'center','400');
}

/* ═══════════════════════════════════════════════════════════
   8. BGC-CANVAS — Biosynthetic gene cluster
   ═══════════════════════════════════════════════════════════ */

/* ── BGC arrays and highlight ── */
const bgcHeaders=[
  'Step 1: What is a BGC?',
  'Step 2: Anatomy of a gene cluster',
  'Step 3: NRPS and PKS — the big two',
  'Step 4: Other BGC types',
  'Step 5: antiSMASH detects BGCs',
  'Step 6: MIBiG — known vs. novel',
  'Step 7: Interpreting BGC predictions',
];
const bgcCanvasHeaders=[
  'Biosynthetic Gene Clusters',
  'Gene types inside a BGC',
  'Modular assembly-line enzymes',
  'RiPPs, terpenes, siderophores',
  'antiSMASH detection workflow',
  'Most BGCs have no known match',
  'Confidence-based BGC interpretation',
];
const bgcCardMap=[0,0,1,1,1,2,2];

function bgcHighlight(step){
  const active=bgcCardMap[Math.min(step,6)];
  for(let i=0;i<3;i++){
    const el=document.getElementById('bgc-card-'+i);if(!el)continue;
    el.style.opacity=i===active?'1':i<active?'0.5':'0.35';
    el.style.transform=i===active?'scale(1.02)':'scale(1)';
    el.style.boxShadow=i===active?'0 4px 6px rgba(15,23,42,.04),0 2px 12px rgba(15,23,42,.06)':'0 1px 2px rgba(15,23,42,.04),0 1px 3px rgba(15,23,42,.06)';
  }
  const h=document.getElementById('bgc-header');
  if(h) h.textContent=bgcHeaders[Math.min(step,6)];
  const ch=document.getElementById('bgc-canvas-header');
  if(ch) ch.textContent=bgcCanvasHeaders[Math.min(step,6)];
}

let _bgcCurStep=-1;
function drawBgcCanvas(step){
  step=step||0;
  _bgcCurStep=step;
  const ctx=_c('bgc-canvas');if(!ctx)return;
  ctx.clearRect(0,0,800,440);
  [drawBgcStep0,drawBgcStep1,drawBgcStep2,drawBgcStep3,drawBgcStep4,drawBgcStep5,drawBgcStep6][Math.min(step,6)](ctx);
}

/* helper: draw a directional gene arrow */
function _geneArrow(ctx,x,y,w,h,dir,fill,stroke){
  ctx.fillStyle=fill;
  ctx.beginPath();
  if(dir===1){
    ctx.moveTo(x,y);ctx.lineTo(x+w-10,y);ctx.lineTo(x+w,y+h/2);
    ctx.lineTo(x+w-10,y+h);ctx.lineTo(x,y+h);
  } else {
    ctx.moveTo(x+w,y);ctx.lineTo(x+10,y);ctx.lineTo(x,y+h/2);
    ctx.lineTo(x+10,y+h);ctx.lineTo(x+w,y+h);
  }
  ctx.closePath();ctx.fill();
  if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.stroke();}
}

/* ── Step 0: What is a BGC? ── */
function drawBgcStep0(ctx){
  _label(ctx,'A BGC is a physically linked cluster of genes',400,24,14,COLORS.ink,'center','700');
  _label(ctx,'that together produce a specialized metabolite',400,44,14,COLORS.ink,'center','700');

  /* Contig backbone */
  const cx=40,cy=90,cw=720,ch=6;
  _roundRect(ctx,cx,cy,cw,ch,3,'#e2e8f0','#cbd5e1',1);
  _label(ctx,'Contig',cx+cw+10,cy+3,11,COLORS.ink3,'left','600');

  /* Scattered individual genes outside the cluster */
  const scatterGenes=[
    {x:50,w:40,dir:1},{x:110,w:35,dir:-1},{x:620,w:45,dir:1},{x:690,w:30,dir:-1}
  ];
  const geneY=cy+20,geneH=28;
  for(const g of scatterGenes){
    _geneArrow(ctx,g.x,geneY,g.w,geneH,g.dir,'#cbd5e1cc','#94a3b8');
  }

  /* BGC cluster genes in the middle */
  const clusterGenes=[
    {x:200,w:55,dir:1,col:COLORS.gc},
    {x:265,w:70,dir:1,col:COLORS.gc},
    {x:345,w:50,dir:-1,col:COLORS.gb},
    {x:405,w:80,dir:1,col:COLORS.gc},
    {x:495,w:45,dir:1,col:COLORS.gd},
    {x:550,w:40,dir:-1,col:COLORS.bad},
  ];
  for(const g of clusterGenes){
    _geneArrow(ctx,g.x,geneY,g.w,geneH,g.dir,g.col+'cc',g.col);
  }

  /* Bracket around the cluster */
  const bStart=195,bEnd=595,bY=geneY+geneH+12;
  ctx.strokeStyle=COLORS.gc;ctx.lineWidth=2;
  ctx.beginPath();
  ctx.moveTo(bStart,bY-8);ctx.lineTo(bStart,bY);ctx.lineTo(bEnd,bY);ctx.lineTo(bEnd,bY-8);
  ctx.stroke();
  _label(ctx,'BGC',395,bY+14,16,COLORS.gc,'center','800');

  /* Arrow down to metabolite */
  _arrow(ctx,395,bY+28,395,bY+52,COLORS.gc,2);

  /* Metabolite product */
  _roundRect(ctx,310,bY+56,170,40,10,COLORS.gc+'14',COLORS.gc,2);
  _label(ctx,'Specialized metabolite',395,bY+76,12,COLORS.gc,'center','700');

  /* Explanatory boxes at the bottom */
  const boxY=260;
  const boxes=[
    {label:'Biosynthesis',desc:'Enzymes that build\nthe core scaffold',col:COLORS.gc,x:120},
    {label:'Tailoring',desc:'Enzymes that modify\nthe product',col:COLORS.gb,x:310},
    {label:'Transport & regulation',desc:'Export the product,\ncontrol expression',col:COLORS.gd,x:500},
    {label:'Resistance',desc:'Self-protection against\nthe toxic product',col:COLORS.bad,x:690},
  ];
  for(const b of boxes){
    _roundRect(ctx,b.x-80,boxY,160,80,8,b.col+'0c',b.col,1.5);
    _label(ctx,b.label,b.x,boxY+18,12,b.col,'center','700');
    const lines=b.desc.split('\n');
    _label(ctx,lines[0],b.x,boxY+40,10,COLORS.ink3,'center','500');
    if(lines[1])_label(ctx,lines[1],b.x,boxY+55,10,COLORS.ink3,'center','500');
  }

  _label(ctx,'A single cluster encodes everything needed to make one compound',400,370,12,COLORS.ink2,'center','600');
}

/* ── Step 1: Anatomy of a gene cluster ── */
function drawBgcStep1(ctx){
  _label(ctx,'Anatomy of a biosynthetic gene cluster',400,24,14,COLORS.ink,'center','700');

  /* Contig backbone */
  const cx=40,cy=70,cw=720,ch=6;
  _roundRect(ctx,cx,cy,cw,ch,3,'#e2e8f0','#cbd5e1',1);

  /* Gene definitions with types */
  const genes=[
    {x:60,w:50,label:'reg',type:'Regulatory',col:'#94a3b8',dir:1},
    {x:125,w:90,label:'NRPS A1',type:'Core biosynthetic',col:COLORS.gc,dir:1},
    {x:230,w:75,label:'NRPS C1',type:'Core biosynthetic',col:COLORS.gc,dir:1},
    {x:320,w:60,label:'tailoring',type:'Tailoring',col:COLORS.gb,dir:-1},
    {x:395,w:100,label:'NRPS A2',type:'Core biosynthetic',col:COLORS.gc,dir:1},
    {x:510,w:55,label:'export',type:'Transport',col:COLORS.gd,dir:1},
    {x:580,w:50,label:'resist',type:'Resistance',col:COLORS.bad,dir:-1},
    {x:645,w:65,label:'reg2',type:'Regulatory',col:'#94a3b8',dir:1},
  ];

  const geneY=cy+20,geneH=36;
  for(const g of genes){
    _geneArrow(ctx,g.x,geneY,g.w,geneH,g.dir,g.col+'cc',g.col);
    _label(ctx,g.label,g.x+g.w/2,geneY+geneH/2,g.label.length>7?8:10,'#fff','center','700');
  }

  /* Leader lines to type labels */
  const typeGroups=[
    {type:'Core biosynthetic',col:COLORS.gc,genes:[1,2,4],labelY:geneY+geneH+60},
    {type:'Tailoring',col:COLORS.gb,genes:[3],labelY:geneY+geneH+60},
    {type:'Transport',col:COLORS.gd,genes:[5],labelY:geneY+geneH+60},
    {type:'Regulatory',col:'#94a3b8',genes:[0,7],labelY:geneY+geneH+60},
    {type:'Resistance',col:COLORS.bad,genes:[6],labelY:geneY+geneH+60},
  ];

  /* Legend with descriptions */
  const legY=195;
  const legItems=[
    {label:'Core biosynthetic',desc:'The heart of the cluster',col:COLORS.gc},
    {label:'Tailoring',desc:'Modify the product',col:COLORS.gb},
    {label:'Transport',desc:'Export the product',col:COLORS.gd},
    {label:'Regulatory',desc:'Control expression',col:'#94a3b8'},
    {label:'Resistance',desc:'Self-protection',col:COLORS.bad},
  ];
  const lw=136,lGap=8,lTotal=legItems.length*lw+(legItems.length-1)*lGap;
  const lx0=400-lTotal/2;
  for(let i=0;i<legItems.length;i++){
    const it=legItems[i];
    const lx=lx0+i*(lw+lGap);
    _roundRect(ctx,lx,legY,lw,55,6,it.col+'0c',it.col,1.5);
    ctx.fillStyle=it.col+'cc';ctx.fillRect(lx+8,legY+10,14,14);
    _label(ctx,it.label,lx+28,legY+17,10,it.col,'left','700');
    _label(ctx,it.desc,lx+lw/2,legY+40,10,COLORS.ink3,'center','500');
  }

  /* Product flow at bottom */
  const flowY=290;
  _label(ctx,'Together they produce:',400,flowY,13,COLORS.ink2,'center','700');
  _arrow(ctx,400,flowY+10,400,flowY+30,COLORS.gc,2);

  const prodBoxes=[
    {label:'Core scaffold',desc:'Built by NRPS/PKS',col:COLORS.gc,x:200},
    {label:'Modified product',desc:'Tailored for activity',col:COLORS.gb,x:400},
    {label:'Exported compound',desc:'Secreted to environment',col:COLORS.gd,x:600},
  ];
  for(const p of prodBoxes){
    _roundRect(ctx,p.x-80,flowY+35,160,50,8,p.col+'0c',p.col,1.5);
    _label(ctx,p.label,p.x,flowY+52,11,p.col,'center','700');
    _label(ctx,p.desc,p.x,flowY+70,10,COLORS.ink3,'center','500');
  }
  _arrow(ctx,280,flowY+60,320,flowY+60,COLORS.ink4,1.5);
  _arrow(ctx,480,flowY+60,520,flowY+60,COLORS.ink4,1.5);

  _label(ctx,'Genes are color-coded by their role in the biosynthetic pathway',400,410,11,COLORS.ink3,'center','500');
}

/* ── Step 2: NRPS and PKS — animated assembly line ── */
function drawBgcStep2(ctx){
  let startTime=null;
  const modules=[
    {aa:'Leu',col:'#7c3aed'},
    {aa:'Orn',col:'#0891b2'},
    {aa:'Pro',col:'#d97706'},
    {aa:'Val',col:'#16a34a'},
  ];
  const nMod=modules.length;
  const stepDur=2500;
  const holdDur=4500;
  const totalDur=nMod*stepDur+holdDur;

  function renderFrame(ts){
    if(_bgcCurStep!==2) return;
    const c=_c('bgc-canvas');if(!c) return;
    if(!startTime) startTime=ts;
    const elapsed=(ts-startTime)%totalDur;
    const activeIdx=Math.min(Math.floor(elapsed/stepDur),nMod);
    const t=(elapsed%stepDur)/stepDur;
    const done=activeIdx>=nMod;

    c.clearRect(0,0,800,440);
    const cx=400;

    /* Title */
    _label(c,'NRPS: one module ≈ one building block',cx,18,15,COLORS.ink,'center','700');
    _label(c,'Each module typically contains C-A-T domains that together add one amino acid to the chain',cx,36,10,COLORS.ink3,'center','400');

    /* ── Gene arrow row ── */
    const gw=140,gh=24,gGap=10;
    const rowW=nMod*gw+(nMod-1)*gGap+66;
    const gx0=(800-rowW)/2, gy=54;

    for(let i=0;i<nMod;i++){
      const gx=gx0+i*(gw+gGap);
      const isDone=i<activeIdx||done;
      const isActive=i===activeIdx&&!done;
      _geneArrow(c,gx,gy,gw,gh,1,
        isActive?COLORS.gc+'dd':isDone?COLORS.gc+'88':COLORS.gc+'33',COLORS.gc);
    }
    const teX=gx0+nMod*(gw+gGap);
    _geneArrow(c,teX,gy,56,gh,1,done?COLORS.gd+'bb':COLORS.gd+'33',COLORS.gd);
    _label(c,'TE',teX+28,gy+gh/2,9,'#fff','center','700');

    /* ── Module boxes (the KEY visual unit) ── */
    const mw=140,mh=80,mGap=10;
    const my=gy+gh+8;

    for(let i=0;i<nMod;i++){
      const mx=gx0+i*(mw+mGap);
      const isDone=i<activeIdx||done;
      const isActive=i===activeIdx&&!done;

      /* Module outer box — THIS is the unit */
      const mFill=isActive?COLORS.gc+'18':isDone?COLORS.gc+'08':'#f8fafc';
      const mStroke=isActive?COLORS.gc:isDone?COLORS.gc+'88':COLORS.border;
      _roundRect(c,mx,my,mw,mh,6,mFill,mStroke,isActive?2:1);

      /* Module label at top */
      _label(c,'Module '+(i+1),mx+mw/2,my+12,10,
        isActive?COLORS.gc:isDone?COLORS.gc+'88':COLORS.ink4,'center','700');

      /* C-A-T domains as pills — highlight sequentially for active module */
      const pillW=34,pillH=18,pillGap=4;
      const px0=mx+(mw-3*pillW-2*pillGap)/2;
      const py=my+24;
      const doms=['C','A','T'];
      const domFull=['Condensation','Adenylation','Thiolation'];
      const domRole=['joins chain','selects aa','carries it'];
      const dCols=[COLORS.gc,COLORS.gb,COLORS.gd];
      /* Which domain is active? A(0-0.3) → T(0.3-0.6) → C(0.6-1.0) */
      const activeDom=isActive?(t<0.3?1:t<0.6?2:0):-1;

      for(let d=0;d<3;d++){
        const px=px0+d*(pillW+pillGap);
        let pFill=dCols[d]+'22';
        let pBorder=dCols[d]+'55';
        let pBw=0.8;
        if(isDone){pFill=dCols[d]+'55';pBorder=dCols[d]+'88';}
        if(isActive&&d===activeDom){pFill=dCols[d];pBorder=dCols[d];pBw=2;}
        else if(isActive){pFill=dCols[d]+'44';pBorder=dCols[d]+'66';}
        _roundRect(c,px,py,pillW,pillH,3,pFill,pBorder,pBw);
        _label(c,doms[d],px+pillW/2,py+pillH/2,8,
          (isActive&&d===activeDom)?'#fff':'#fff','center','700');
      }

      /* Role label below pills for active domain */
      if(isActive&&activeDom>=0){
        const rolePx=px0+activeDom*(pillW+pillGap)+pillW/2;
        _label(c,domRole[activeDom],rolePx,py+pillH+10,7,dCols[activeDom],'center','600');
      }

      /* Amino acid — appears when T domain is active (t>=0.3) */
      const aaR=13;
      const aaCx=mx+mw/2;
      const aaCy=my+mh-aaR-2;

      if(isDone||(isActive&&t>=0.3)){
        let scale=1;
        if(isActive) scale=Math.min((t-0.3)/0.15,1);
        c.save();c.translate(aaCx,aaCy);c.scale(scale,scale);
        c.beginPath();c.arc(0,0,aaR,0,Math.PI*2);
        c.fillStyle=modules[i].col+'22';c.fill();
        c.strokeStyle=modules[i].col;c.lineWidth=1.5;c.stroke();
        _label(c,modules[i].aa,0,0,9,modules[i].col,'center','800');
        c.restore();
      }

      /* Arrow from amino acid to chain for active module */
      if(isActive&&t>=0.6){
        const arrowAlpha=Math.min((t-0.6)/0.2,1);
        c.globalAlpha=arrowAlpha;
        _arrow(c,aaCx,aaCy+aaR+2,aaCx,my+mh+16,modules[i].col,1.5);
        c.globalAlpha=1;
      }
    }

    /* ── Growing peptide chain below modules ── */
    const chainY=my+mh+36;
    const chainR=16,chainGap=8;
    const nBuilt=done?nMod:activeIdx;

    if(nBuilt>0){
      const chainW=nBuilt*(chainR*2+chainGap)-chainGap;
      const chainX0=cx-chainW/2;

      for(let i=0;i<nBuilt;i++){
        const ax=chainX0+i*(chainR*2+chainGap)+chainR;
        c.beginPath();c.arc(ax,chainY,chainR,0,Math.PI*2);
        c.fillStyle=modules[i].col+'22';c.fill();
        c.strokeStyle=modules[i].col;c.lineWidth=1.5;c.stroke();
        _label(c,modules[i].aa,ax,chainY,10,modules[i].col,'center','700');
        if(i>0){
          const prevAx=chainX0+(i-1)*(chainR*2+chainGap)+chainR*2;
          c.strokeStyle=COLORS.ink3+'66';c.lineWidth=2;
          c.beginPath();c.moveTo(prevAx,chainY);c.lineTo(ax-chainR,chainY);c.stroke();
        }
      }
    }

    /* Status label */
    const labelY=chainY+chainR+18;
    if(!done&&nBuilt===0){
      _label(c,'Module 1 activating...',cx,labelY,10,COLORS.gc,'center','600');
    } else if(!done){
      _label(c,'Growing peptide: '+nBuilt+' of '+nMod+' amino acids',cx,labelY,10,COLORS.gc,'center','600');
    } else {
      /* Final product */
      const chainW=nMod*(chainR*2+chainGap)-chainGap;
      const chainX0=cx-chainW/2;
      const pulse=0.5+0.5*Math.sin((elapsed-nMod*stepDur)/200);
      c.save();
      c.strokeStyle='rgba(124,58,237,'+pulse*0.4+')';c.lineWidth=2.5;
      c.setLineDash([5,4]);
      c.strokeRect(chainX0-8,chainY-chainR-4,chainW+16,chainR*2+8);
      c.setLineDash([]);c.restore();

      _label(c,'Nonribosomal peptide: 4 modules, 4 building blocks',cx,labelY,12,COLORS.gc,'center','700');
      _label(c,'Module order largely predicts product sequence; TE releases and often cyclises',cx,labelY+16,10,COLORS.ink3,'center','400');
    }

    /* ── Bottom: PKS comparison + domain key ── */
    const bY=labelY+36;
    _roundRect(c,60,bY,340,66,8,COLORS.gb+'0a',COLORS.gb,1);
    _label(c,'PKS works the same way',60+170,bY+14,11,COLORS.gb,'center','700');
    _label(c,'Each module (KS-AT-ACP) adds one acyl unit',60+170,bY+30,9,COLORS.ink3,'center','400');
    _label(c,'e.g. Erythromycin. Hybrid NRPS-PKS also exist.',60+170,bY+46,9,COLORS.ink4,'center','400');

    _roundRect(c,430,bY,320,66,8,'#f8fafc',COLORS.border,1);
    _label(c,'Inside each module',430+160,bY+14,11,COLORS.ink2,'center','700');
    _label(c,'C joins chain  |  A selects amino acid  |  T carries it',430+160,bY+32,9,COLORS.ink3,'center','400');
    _label(c,'3 domains cooperate to add one building block',430+160,bY+48,9,COLORS.ink4,'center','400');

    requestAnimationFrame(renderFrame);
  }
  requestAnimationFrame(renderFrame);
}

/* ── Step 3: Other BGC types (NEW — lighter overview) ── */
function drawBgcStep3(ctx){
  const cx=400;
  _label(ctx,'Beyond NRPS and PKS: other common BGC types',cx,28,14,COLORS.ink,'center','700');

  const types=[
    {name:'RiPP',full:'Ribosomally synthesized,\npost-translationally modified',example:'Nisin (food preservative)',col:COLORS.gd,
     desc:'Ribosome makes a precursor;\nenzymes modify it into the\nfinal bioactive peptide'},
    {name:'Terpene',full:'Terpene synthase\nclusters',example:'Geosmin (earthy smell)',col:COLORS.ga,
     desc:'Cyclize isoprene units\ninto diverse ring structures;\nwidely distributed'},
    {name:'Siderophore',full:'Iron-chelating\ncompound clusters',example:'Enterobactin',col:COLORS.bad,
     desc:'Scavenge iron from the\nenvironment; essential for\nsurvival in iron-poor niches'},
  ];

  const bw=220,bh=180,bGap=20;
  const bTotal=types.length*bw+(types.length-1)*bGap;
  const bx0=cx-bTotal/2,by=60;

  for(let i=0;i<types.length;i++){
    const t=types[i];
    const bx=bx0+i*(bw+bGap);

    _roundRect(ctx,bx,by,bw,bh,8,t.col+'08',t.col,1.5);
    _label(ctx,t.name,bx+bw/2,by+22,18,t.col,'center','800');

    const fLines=t.full.split('\n');
    for(let j=0;j<fLines.length;j++)
      _label(ctx,fLines[j],bx+bw/2,by+42+j*14,9.5,COLORS.ink3,'center','500');

    /* Divider */
    ctx.strokeStyle=t.col+'33';ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(bx+10,by+74);ctx.lineTo(bx+bw-10,by+74);ctx.stroke();

    /* Description */
    const dLines=t.desc.split('\n');
    for(let j=0;j<dLines.length;j++)
      _label(ctx,dLines[j],bx+bw/2,by+92+j*16,9.5,COLORS.ink2,'center','400');

    /* Example */
    _roundRect(ctx,bx+15,by+145,bw-30,26,5,t.col+'14',t.col+'66',1);
    _label(ctx,t.example,bx+bw/2,by+158,10,t.col,'center','700');
  }

  /* Note */
  _roundRect(ctx,80,by+bh+20,640,54,8,'#f8fafc',COLORS.border,1);
  _label(ctx,'These are less complex than NRPS/PKS but ecologically important',cx,by+bh+38,11,COLORS.ink2,'center','600');
  _label(ctx,'Siderophores are particularly relevant: they indicate iron limitation in the environment',cx,by+bh+56,10,COLORS.ink3,'center','400');
}

/* ── Step 4: antiSMASH pipeline (POLISHED) ── */
function drawBgcStep4(ctx){
  const cx=400;
  _label(ctx,'antiSMASH: rule-based BGC detection',cx,24,15,COLORS.ink,'center','700');

  /* ── Compact pipeline at top ── */
  const steps=[
    {label:'Gene prediction',x:100,col:COLORS.ink2},
    {label:'Domain detection',x:260,col:COLORS.gc},
    {label:'Cluster rules',x:420,col:COLORS.gb},
    {label:'Type assignment',x:560,col:COLORS.gd},
    {label:'MIBiG comparison',x:700,col:COLORS.ga},
  ];
  const wfY=44,bw=108,bh=28;
  for(let i=0;i<steps.length;i++){
    const s=steps[i];
    const isRule=i===2;
    _roundRect(ctx,s.x-bw/2,wfY,bw,bh,5,isRule?s.col+'22':s.col+'0c',s.col,isRule?2:1);
    _label(ctx,s.label,s.x,wfY+bh/2,9,s.col,'center',isRule?'800':'600');
    if(i<steps.length-1)
      _arrow(ctx,s.x+bw/2+2,wfY+bh/2,steps[i+1].x-bw/2-2,wfY+bh/2,COLORS.border,1);
  }

  /* ── NRPS rule example ── */
  const rY=100;
  _label(ctx,'Example: the NRPS detection rule',cx,rY,13,COLORS.gb,'center','700');

  /* Code box — real antiSMASH syntax */
  const codeY=rY+18;
  _roundRect(ctx,120,codeY,560,50,6,COLORS.ink+'08',COLORS.ink+'18',1);
  _monoLabel(ctx,'CONDITIONS:',140,codeY+18,10,COLORS.ink4,'left');
  _monoLabel(ctx,'cds(Condensation and (AMP-binding or A-OX))',260,codeY+18,10,COLORS.gc,'left');
  _monoLabel(ctx,'CUTOFF:',140,codeY+38,10,COLORS.ink4,'left');
  _monoLabel(ctx,'20 kb',260,codeY+38,10,COLORS.ink3,'left');

  /* Plain-english translation */
  _label(ctx,'"Find a gene with both Condensation and AMP-binding domains, within 20 kb"',cx,codeY+68,11,COLORS.ok,'center','600');

  /* ── Contig with rule applied ── */
  const scanY=codeY+100;
  _label(ctx,'antiSMASH scans your contig and applies the rule:',cx,scanY,11,COLORS.ink2,'center','600');

  /* contig bar */
  _roundRect(ctx,60,scanY+18,680,4,2,'#e2e8f0','#cbd5e1',0.5);

  /* genes */
  const genes=[
    {x:70,w:40,dir:1,col:'#cbd5e1',dom:''},
    {x:120,w:34,dir:-1,col:'#cbd5e1',dom:''},
    {x:190,w:54,dir:1,col:COLORS.gc,dom:'C'},
    {x:256,w:48,dir:1,col:COLORS.gc,dom:'A'},
    {x:316,w:38,dir:-1,col:COLORS.gc,dom:'T'},
    {x:368,w:54,dir:1,col:COLORS.gc,dom:'C'},
    {x:434,w:48,dir:1,col:COLORS.gc,dom:'A'},
    {x:494,w:38,dir:1,col:COLORS.gc,dom:'T'},
    {x:548,w:42,dir:-1,col:COLORS.gd,dom:'TE'},
    {x:610,w:40,dir:1,col:'#cbd5e1',dom:''},
    {x:660,w:46,dir:-1,col:'#cbd5e1',dom:''},
  ];
  const gY=scanY+30,gH=24;
  for(const g of genes) _geneArrow(ctx,g.x,gY,g.w,gH,g.dir,g.col+'99',g.col);

  /* Domain labels above coloured genes */
  for(const g of genes){
    if(g.dom) _label(ctx,g.dom,g.x+g.w/2,gY-8,8,g.col,'center','700');
  }

  /* Highlight detected BGC region */
  _roundRect(ctx,182,gY-16,420,gH+28,6,COLORS.gc+'08',COLORS.gc,2);
  _label(ctx,'Rule matched → NRPS region detected',392,gY+gH+22,10,COLORS.gc,'center','700');

  /* Bottom: other rule types mentioned briefly */
  const bY=gY+gH+50;
  _roundRect(ctx,100,bY,600,44,8,'#f8fafc',COLORS.border,1);
  _label(ctx,'antiSMASH has ~70 rules for different BGC types',cx,bY+16,11,COLORS.ink2,'center','700');
  _label(ctx,'NRPS, PKS, Terpene, RiPP, Siderophore, Bacteriocin, ...',cx,bY+34,10,COLORS.ink4,'center','400');
}

/* ── Step 5: MIBiG — known vs novel (NEW) ── */
function drawBgcStep5(ctx){
  const cx=400;
  _label(ctx,'MIBiG: the reference database of known BGCs',cx,28,14,COLORS.ink,'center','700');

  /* MIBiG box */
  _roundRect(ctx,cx-140,52,280,44,8,COLORS.ga+'14',COLORS.ga,2);
  _label(ctx,'MIBiG',cx,68,16,COLORS.ga,'center','800');
  _label(ctx,'~2,500 experimentally verified BGCs',cx,84,10,COLORS.ink3,'center','500');

  /* Spectrum: match percentage */
  const specY=120;
  _label(ctx,'When antiSMASH compares your BGC to MIBiG:',cx,specY,12,COLORS.ink2,'center','700');

  /* Three outcome boxes */
  const outcomes=[
    {label:'Strong match',pct:'>70%',desc:'Product is likely similar\nto a known compound',col:COLORS.ok,x:140},
    {label:'Weak match',pct:'30-70%',desc:'Some shared domains but\nproduct may differ',col:COLORS.gd,x:400},
    {label:'No match',pct:'<30%',desc:'Orphan cluster: unknown\nproduct, potentially novel',col:COLORS.bad,x:660},
  ];

  for(const o of outcomes){
    _roundRect(ctx,o.x-110,specY+18,220,90,8,o.col+'0c',o.col,1.5);
    _label(ctx,o.label,o.x,specY+36,12,o.col,'center','700');
    _monoLabel(ctx,o.pct,o.x,specY+54,14,o.col,'center');
    const lines=o.desc.split('\n');
    for(let j=0;j<lines.length;j++)
      _label(ctx,lines[j],o.x,specY+72+j*14,9.5,COLORS.ink3,'center','400');
  }

  /* Arrows between */
  _arrow(ctx,250,specY+60,290,specY+60,COLORS.ink4+'66',1.5);
  _arrow(ctx,510,specY+60,550,specY+60,COLORS.ink4+'66',1.5);

  /* Key insight */
  const ky=specY+126;
  _roundRect(ctx,80,ky,640,72,8,'#fffbeb',COLORS.gd+'88',1.2);
  _label(ctx,'Most BGCs found in MAGs have no MIBiG match',cx,ky+16,13,COLORS.gd,'center','700');
  _label(ctx,'This does not mean they are inactive: it means the product is unknown.',cx,ky+36,10,COLORS.ink3,'center','500');
  _label(ctx,'Orphan clusters are the majority and represent untapped chemical diversity.',cx,ky+54,10,COLORS.ink3,'center','500');

  /* Pie-like stats */
  const py=ky+86;
  _label(ctx,'Typical MAG BGC annotation:',cx,py,11,COLORS.ink2,'center','600');
  const bars=[
    {label:'No match',pct:60,col:COLORS.bad},
    {label:'Weak',pct:25,col:COLORS.gd},
    {label:'Strong',pct:15,col:COLORS.ok},
  ];
  const barTotalW=500,barH2=22;
  let bx=cx-barTotalW/2;
  for(const b of bars){
    const bw=barTotalW*(b.pct/100);
    _roundRect(ctx,bx,py+14,bw,barH2,bx===cx-barTotalW/2?4:0,b.col+'cc',null,0);
    if(bw>60) _label(ctx,b.label+' '+b.pct+'%',bx+bw/2,py+25,9,'#fff','center','700');
    bx+=bw;
  }
}

/* ── Step 6: Interpreting BGC predictions (REDESIGNED) ── */
function drawBgcStep6(ctx){
  const cx=400;
  _label(ctx,'Confidence-based BGC interpretation',cx,28,14,COLORS.ink,'center','700');

  /* Three confidence tiers */
  const tiers=[
    {label:'High confidence',criteria:'Complete on contig\nAll core domains present\nMIBiG match >70%',
     example:'NRPS, 45 kb, complete,\n78% to vancomycin BGC',col:COLORS.ok,x:140},
    {label:'Medium confidence',criteria:'On contig edge\nMost domains present\nMIBiG match 30-70%',
     example:'PKS, 22 kb, on edge,\n52% to similar cluster',col:COLORS.gd,x:400},
    {label:'Low confidence',criteria:'Fragmented / short\nFew domains\nNo MIBiG match',
     example:'Terpene, 8 kb, on edge,\nsingle domain, no match',col:COLORS.bad,x:660},
  ];

  for(const t of tiers){
    _roundRect(ctx,t.x-120,52,240,165,8,t.col+'08',t.col,1.5);
    _label(ctx,t.label,t.x,68,13,t.col,'center','800');

    /* Criteria */
    ctx.strokeStyle=t.col+'33';ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(t.x-100,82);ctx.lineTo(t.x+100,82);ctx.stroke();

    const cLines=t.criteria.split('\n');
    for(let j=0;j<cLines.length;j++){
      _label(ctx,cLines[j],t.x,96+j*16,10,COLORS.ink2,'center','500');
    }

    /* Example */
    ctx.beginPath();ctx.moveTo(t.x-100,146);ctx.lineTo(t.x+100,146);ctx.stroke();
    const eLines=t.example.split('\n');
    for(let j=0;j<eLines.length;j++){
      _monoLabel(ctx,eLines[j],t.x,162+j*14,8.5,t.col,'center');
    }
  }

  /* Decision checklist */
  const dy=236;
  _label(ctx,'Checklist for every BGC prediction:',cx,dy,12,COLORS.ink2,'center','700');

  const checks=[
    {q:'Is the cluster complete or on a contig edge?',why:'Edge clusters may be truncated'},
    {q:'Are all expected core domains present?',why:'Missing domains reduce confidence'},
    {q:'Does it match a known cluster in MIBiG?',why:'Novelty is exciting but harder to validate'},
    {q:'Is the MAG itself high quality (>90% comp, <5% cont)?',why:'Low-quality MAGs produce unreliable BGC calls'},
  ];

  for(let i=0;i<checks.length;i++){
    const c=checks[i];
    const cy=dy+16+i*36;
    const qx=100;

    /* Number */
    ctx.beginPath();ctx.arc(qx+10,cy+12,10,0,Math.PI*2);
    ctx.fillStyle=COLORS.gb+'22';ctx.fill();
    ctx.strokeStyle=COLORS.gb;ctx.lineWidth=1;ctx.stroke();
    _label(ctx,''+(i+1),qx+10,cy+12,9,COLORS.gb,'center','700');

    _label(ctx,c.q,qx+28,cy+8,10,COLORS.ink,'left','600');
    _label(ctx,c.why,qx+28,cy+22,9,COLORS.ink4,'left','400');
  }

  _roundRect(ctx,100,dy+16+checks.length*36+4,600,30,8,'#fef3c7','#f59e0b66',1.5);
  _label(ctx,'antiSMASH predicts biosynthetic potential, not proof of production',cx,dy+16+checks.length*36+19,11,'#92400e','center','700');
}

/* ═══════════════════════════════════════════════════════════
   8b. BGC-FRAG-CANVAS — Three fragmentation scenarios
   ═══════════════════════════════════════════════════════════ */

function drawBgcFragCanvas(){
  const ctx=_c('bgc-frag-canvas');if(!ctx)return;
  ctx.clearRect(0,0,800,440);
  const cx=400;

  /* Helper: draw a gene arrow */
  function _gene(x,y,w,h,col,label,flip){
    const tipW=10;
    ctx.fillStyle=col;ctx.beginPath();
    if(!flip){
      ctx.moveTo(x,y);ctx.lineTo(x+w-tipW,y);ctx.lineTo(x+w,y+h/2);
      ctx.lineTo(x+w-tipW,y+h);ctx.lineTo(x,y+h);
    }else{
      ctx.moveTo(x+w,y);ctx.lineTo(x+tipW,y);ctx.lineTo(x,y+h/2);
      ctx.lineTo(x+tipW,y+h);ctx.lineTo(x+w,y+h);
    }
    ctx.closePath();ctx.fill();
    if(label) _label(ctx,label,x+w/2,y+h/2+1,Math.min(10,w/label.length*1.8),'#fff','center','600');
  }

  /* Gene color palette */
  const gCols={bio:COLORS.gb, bio2:'#2563eb', tail:'#7c3aed', reg:COLORS.gd, res:COLORS.bad, trans:COLORS.ga, dim:'#cbd5e1'};
  const gH=24, contigH=10;

  /* ── Scenario 1: Complete BGC ── */
  const s1y=10;
  _roundRect(ctx,20,s1y,240,170,8,COLORS.ok+'08',COLORS.ok+'44',1);
  _label(ctx,'Complete BGC',140,s1y+20,13,COLORS.ok,'center','700');
  _label(ctx,'Highest confidence',140,s1y+36,10,COLORS.ink3,'center','400');

  /* contig bar */
  const c1x=36,c1w=208;
  _roundRect(ctx,c1x,s1y+54,c1w,contigH,3,COLORS.border+'44',null,0);

  /* genes on contig */
  const g1y=s1y+72;
  _gene(c1x+10,g1y,44,gH,gCols.bio,'KS',false);
  _gene(c1x+58,g1y,40,gH,gCols.bio2,'AT',false);
  _gene(c1x+102,g1y,34,gH,gCols.tail,'KR',false);
  _gene(c1x+140,g1y,38,gH,gCols.reg,'Reg',true);
  _gene(c1x+182,g1y,32,gH,gCols.trans,'Tr',false);
  /* BGC bracket */
  ctx.strokeStyle=COLORS.ok;ctx.lineWidth=1.5;ctx.setLineDash([]);
  const bL=c1x+8,bR=c1x+216;
  ctx.beginPath();ctx.moveTo(bL,g1y+gH+5);ctx.lineTo(bL,g1y+gH+12);
  ctx.lineTo(bR,g1y+gH+12);ctx.lineTo(bR,g1y+gH+5);ctx.stroke();
  _label(ctx,'BGC (all genes present)',140,g1y+gH+26,9,COLORS.ok,'center','600');

  /* checkmarks */
  _label(ctx,'All core domains',140,s1y+140,9,COLORS.ok,'center','600');
  _label(ctx,'MIBiG match possible',140,s1y+154,9,COLORS.ok,'center','400');

  /* ── Scenario 2: On contig edge ── */
  const s2y=s1y;
  _roundRect(ctx,280,s2y,240,170,8,'#fff7ed','#f59e0b66',1);
  _label(ctx,'BGC on contig edge',400,s2y+20,13,'#d97706','center','700');
  _label(ctx,'Medium confidence',400,s2y+36,10,COLORS.ink3,'center','400');

  /* contig — cut at right edge */
  const c2x=296,c2w=208;
  _roundRect(ctx,c2x,s2y+54,c2w,contigH,3,COLORS.border+'44',null,0);
  /* Jagged right edge */
  ctx.fillStyle='#fff';ctx.beginPath();
  const jx=c2x+c2w;
  for(let i=0;i<contigH;i+=3){ctx.rect(jx-2,s2y+54+i,4,1.5);}
  ctx.fill();

  /* genes — last one cut off */
  const g2y=s2y+72;
  _gene(c2x+10,g2y,44,gH,gCols.bio,'KS',false);
  _gene(c2x+58,g2y,40,gH,gCols.bio2,'AT',false);
  _gene(c2x+102,g2y,34,gH,gCols.tail,'KR',false);
  _gene(c2x+140,g2y,38,gH,gCols.reg,'Reg',true);
  /* Truncated gene */
  ctx.fillStyle=gCols.dim;ctx.beginPath();
  ctx.moveTo(c2x+182,g2y);ctx.lineTo(c2x+c2w,g2y);ctx.lineTo(c2x+c2w,g2y+gH);
  ctx.lineTo(c2x+182,g2y+gH);ctx.closePath();ctx.fill();
  _label(ctx,'?',c2x+200,g2y+gH/2+1,11,COLORS.ink4,'center','700');

  /* bracket */
  ctx.strokeStyle='#d97706';ctx.lineWidth=1.5;ctx.setLineDash([3,3]);
  ctx.beginPath();ctx.moveTo(c2x+8,g2y+gH+5);ctx.lineTo(c2x+8,g2y+gH+12);
  ctx.lineTo(c2x+c2w,g2y+gH+12);ctx.stroke();
  ctx.setLineDash([]);
  _label(ctx,'Genes may be missing',400,g2y+gH+26,9,'#d97706','center','600');

  _label(ctx,'Some domains absent',400,s2y+140,9,'#d97706','center','600');
  _label(ctx,'Classification uncertain',400,s2y+154,9,'#d97706','center','400');

  /* ── Scenario 3: Split across gap ── */
  const s3y=s1y;
  _roundRect(ctx,540,s3y,240,170,8,COLORS.bad+'08',COLORS.bad+'44',1);
  _label(ctx,'BGC split across gap',660,s3y+20,13,COLORS.bad,'center','700');
  _label(ctx,'Low confidence',660,s3y+36,10,COLORS.ink3,'center','400');

  /* Two contigs with gap */
  const c3x=556,c3w1=90,c3w2=100,gapW=24;
  _roundRect(ctx,c3x,s3y+54,c3w1,contigH,3,COLORS.border+'44',null,0);
  _roundRect(ctx,c3x+c3w1+gapW,s3y+54,c3w2,contigH,3,COLORS.border+'44',null,0);
  /* Gap indicator */
  ctx.strokeStyle=COLORS.bad;ctx.lineWidth=1;ctx.setLineDash([2,2]);
  ctx.beginPath();ctx.moveTo(c3x+c3w1+3,s3y+59);ctx.lineTo(c3x+c3w1+gapW-3,s3y+59);ctx.stroke();
  ctx.setLineDash([]);

  /* Genes split */
  const g3y=s3y+72;
  _gene(c3x+4,g3y,40,gH,gCols.bio,'KS',false);
  _gene(c3x+48,g3y,36,gH,gCols.bio2,'AT',false);
  /* Cut gene on edge of first contig */
  ctx.fillStyle=gCols.dim;ctx.beginPath();
  ctx.moveTo(c3x+c3w1-20,g3y);ctx.lineTo(c3x+c3w1,g3y);ctx.lineTo(c3x+c3w1,g3y+gH);
  ctx.lineTo(c3x+c3w1-20,g3y+gH);ctx.closePath();ctx.fill();
  _label(ctx,'?',c3x+c3w1-10,g3y+gH/2+1,9,COLORS.ink4,'center','700');

  /* Second contig genes */
  const c3x2=c3x+c3w1+gapW;
  ctx.fillStyle=gCols.dim;ctx.beginPath();
  ctx.moveTo(c3x2,g3y);ctx.lineTo(c3x2+18,g3y);ctx.lineTo(c3x2+18,g3y+gH);
  ctx.lineTo(c3x2,g3y+gH);ctx.closePath();ctx.fill();
  _label(ctx,'?',c3x2+9,g3y+gH/2+1,9,COLORS.ink4,'center','700');
  _gene(c3x2+22,g3y,40,gH,gCols.reg,'Reg',true);
  _gene(c3x2+66,g3y,30,gH,gCols.trans,'Tr',false);

  /* Red X in gap */
  ctx.strokeStyle=COLORS.bad;ctx.lineWidth=2.5;
  const gxC=c3x+c3w1+gapW/2, gyC=g3y+gH/2;
  ctx.beginPath();ctx.moveTo(gxC-6,gyC-6);ctx.lineTo(gxC+6,gyC+6);ctx.stroke();
  ctx.beginPath();ctx.moveTo(gxC+6,gyC-6);ctx.lineTo(gxC-6,gyC+6);ctx.stroke();

  _label(ctx,'Cannot reconstruct',660,g3y+gH+26,9,COLORS.bad,'center','600');
  _label(ctx,'Product unknown',660,s3y+140,9,COLORS.bad,'center','600');
  _label(ctx,'May be false positive',660,s3y+154,9,COLORS.bad,'center','400');

  /* ── Checklist ── */
  const dy=200;
  _label(ctx,'Checklist for every BGC prediction',cx,dy,13,COLORS.ink2,'center','700');

  const checks=[
    {q:'Is the cluster complete or on a contig edge?',icon:'1',col:COLORS.gb},
    {q:'Are all expected core biosynthetic domains present?',icon:'2',col:COLORS.gb},
    {q:'Does it match a known cluster in MIBiG?',icon:'3',col:COLORS.gb},
    {q:'Is the MAG itself high quality (>90% comp, <5% cont)?',icon:'4',col:COLORS.gb},
  ];

  for(let i=0;i<checks.length;i++){
    const c=checks[i];
    const cy=dy+22+i*34;
    /* Circle number */
    ctx.beginPath();ctx.arc(90,cy+10,11,0,Math.PI*2);
    ctx.fillStyle=c.col+'18';ctx.fill();ctx.strokeStyle=c.col;ctx.lineWidth=1;ctx.stroke();
    _label(ctx,c.icon,90,cy+11,10,c.col,'center','700');
    _label(ctx,c.q,110,cy+11,11,COLORS.ink2,'left','500');
  }

  /* Warning box */
  const wy=dy+22+checks.length*34+10;
  _roundRect(ctx,60,wy,680,32,6,'#fef3c7','#f59e0b66',1.2);
  _label(ctx,'antiSMASH predicts biosynthetic potential, not proof of production',cx,wy+16,11,'#92400e','center','700');
}

/* ═══════════════════════════════════════════════════════════
   9. SYNTH-CANVAS — Three pillars of MAG interpretation
   ═══════════════════════════════════════════════════════════ */

function drawSynthCanvas(){
  const ctx=_c('synth-canvas');if(!ctx)return;
  ctx.clearRect(0,0,800,440);

  // Triangle with three corners: Taxonomy, Function, Quality
  const cx=400,cy=215;
  const triR=150;
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

  // Dashed lines from center to corners — draw BEFORE circles so they go behind
  ctx.setLineDash([4,3]);ctx.lineWidth=1;
  for(const p of pts){
    ctx.strokeStyle=p.col+'44';
    ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(p.x,p.y);ctx.stroke();
  }
  ctx.setLineDash([]);

  // Center label
  _roundRect(ctx,cx-70,cy-16,140,32,8,COLORS.gb+'11',COLORS.gb+'66',1.5);
  _label(ctx,'Biological',cx,cy-4,11,COLORS.gb,'center','700');
  _label(ctx,'interpretation',cx,cy+10,11,COLORS.gb,'center','700');

  // Corner nodes — drawn AFTER lines so circles cover them
  for(const p of pts){
    ctx.shadowColor=p.col;ctx.shadowBlur=16;
    ctx.beginPath();ctx.arc(p.x,p.y,28,0,Math.PI*2);
    ctx.fillStyle='#fff';ctx.fill();
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

  // Bottom message
  _roundRect(ctx,140,395,520,30,8,'#eff6ff',COLORS.gb+'44',1);
  _label(ctx,'A strong interpretation integrates all three dimensions together',400,410,11,COLORS.gb,'center','600');
}


/* ═══════════════════════════════════════════════════════════
   10. SBS-CANVAS — How Illumina sequencing works (3 steps)
   ═══════════════════════════════════════════════════════════ */

let sbsStep=0;
let sbsAnimId=null;

function drawSbsCanvas(step){
  sbsStep=step;
  if(sbsAnimId){cancelAnimationFrame(sbsAnimId);sbsAnimId=null}
  const ctx=_c('sbs-canvas');if(!ctx)return;
  ctx.clearRect(0,0,800,440);

  if(step===0) drawSbs0(ctx);
  else if(step===1) drawSbs1(ctx);
  else if(step===2) drawSbs2(ctx);
  else if(step===3) drawSbs3(ctx);
  else if(step===4) drawSbs4(ctx);
  else if(step===5) drawSbs5(ctx);
  else if(step===6) drawSbs6();
}

/* ── Shared DNA/SBS drawing helpers ── */
const baseCols={A:COLORS.ok,T:'#dc2626',G:COLORS.gd,C:COLORS.gb};

function _dnaStrand(ctx,x,y,w,bases,color,dir,baseSize){
  const bw=w/bases.length;
  const bs=baseSize||4;
  ctx.strokeStyle=color;ctx.lineWidth=2;ctx.lineCap='round';
  ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+w,y);ctx.stroke();
  for(let i=0;i<bases.length;i++){
    const bx=x+i*bw+bw/2;
    const bc=baseCols[bases[i]]||COLORS.ink4;
    const by2=dir>0?y+bs*2.5:y-bs*2.5;
    ctx.strokeStyle=bc+'aa';ctx.lineWidth=1.5;
    ctx.beginPath();ctx.moveTo(bx,y);ctx.lineTo(bx,by2);ctx.stroke();
    ctx.beginPath();ctx.arc(bx,by2,bs,0,Math.PI*2);
    ctx.fillStyle=bc;ctx.fill();
    if(bs>=3.5) _monoLabel(ctx,bases[i],bx,by2,bs<4?4:5,'#fff','center');
  }
}

function _flowSurface(ctx,x,y,w,h){
  const g=ctx.createLinearGradient(x,y,x,y+h);
  g.addColorStop(0,'#e2e8f0');g.addColorStop(0.3,'#f1f5f9');g.addColorStop(1,'#cbd5e1');
  ctx.fillStyle=g;
  ctx.beginPath();ctx.roundRect(x,y,w,h,3);ctx.fill();
  ctx.strokeStyle='#94a3b8';ctx.lineWidth=1;ctx.stroke();
}

function _oligo(ctx,x,yBase,len,color){
  ctx.strokeStyle=color;ctx.lineWidth=1.5;ctx.lineCap='round';
  ctx.beginPath();ctx.moveTo(x,yBase);
  for(let i=1;i<=len;i++){
    ctx.lineTo(x+(i%2?2:-2),yBase-i*3);
  }
  ctx.stroke();
  ctx.beginPath();ctx.arc(x,yBase,2,0,Math.PI*2);
  ctx.fillStyle=color;ctx.fill();
}

/* ═══════════════════════════════════════════════════════════
   STEP 0 — Fragment genomic DNA & ligate adapters
   ═══════════════════════════════════════════════════════════ */
function drawSbs0(ctx){
  _label(ctx,'Fragment genomic DNA and ligate adapters',400,22,16,COLORS.ink,'center','700');

  /* ── Top: long genomic DNA ── */
  const gy=60;
  _label(ctx,'Genomic DNA',400,gy,12,COLORS.ink3,'center','600');
  // Long wavy line representing whole genome
  ctx.strokeStyle=COLORS.gb;ctx.lineWidth=3;ctx.lineCap='round';
  ctx.beginPath();ctx.moveTo(40,gy+25);
  for(let x=40;x<=760;x+=4){ctx.lineTo(x,gy+25+Math.sin(x*0.03)*6)}
  ctx.stroke();
  ctx.strokeStyle=COLORS.gb+'66';ctx.lineWidth=3;
  ctx.beginPath();ctx.moveTo(40,gy+35);
  for(let x=40;x<=760;x+=4){ctx.lineTo(x,gy+35+Math.sin(x*0.03+0.5)*6)}
  ctx.stroke();
  _label(ctx,'double-stranded, millions of bp',400,gy+55,10,COLORS.ink4,'center','500');

  /* ── Arrow: fragmentation ── */
  const ay=gy+72;
  _arrow(ctx,400,ay,400,ay+35,COLORS.gd,2);
  _label(ctx,'Enzymatic or mechanical shearing',392,ay+16,11,COLORS.gd,'right','600');

  /* ── Middle: three fragments with adapters ── */
  const fy=ay+50;
  _label(ctx,'Fragments (~300-600 bp) with adapters ligated',400,fy,12,COLORS.ink3,'center','600');

  const frags=[
    {x:80,w:200,seq:'ATGCTAGCGATC'},
    {x:310,w:180,seq:'GCTAGCATGC'},
    {x:530,w:200,seq:'TGCAATGCTAGC'}
  ];

  for(const f of frags){
    const ffy=fy+22;
    // P5 adapter
    _roundRect(ctx,f.x,ffy,40,36,5,COLORS.gd+'22',COLORS.gd,2);
    _label(ctx,'P5',f.x+20,ffy+18,10,COLORS.gd,'center','700');
    // DNA insert
    _dnaStrand(ctx,f.x+42,ffy+8,f.w-84,f.seq.split(''),COLORS.gb,1);
    _dnaStrand(ctx,f.x+42,ffy+28,f.w-84,f.seq.split('').map(b=>({A:'T',T:'A',G:'C',C:'G'}[b])),COLORS.gb,-1);
    // P7 adapter
    _roundRect(ctx,f.x+f.w-40,ffy,40,36,5,COLORS.gc+'22',COLORS.gc,2);
    _label(ctx,'P7',f.x+f.w-20,ffy+18,10,COLORS.gc,'center','700');
  }

  /* ── Bottom: adapter detail ── */
  const dy=fy+82;
  _roundRect(ctx,120,dy,560,110,10,'#f8fafc',COLORS.border,1);
  _label(ctx,'Adapter structure',400,dy+16,13,COLORS.ink2,'center','700');

  // Zoomed adapter diagram — centred in box (box 120..680, pills 530px wide)
  const zx=135,zy=dy+32;
  _roundRect(ctx,zx,zy,80,30,5,COLORS.gd+'33',COLORS.gd,1.5);
  _label(ctx,'P5 adapter',zx+40,zy+15,9,COLORS.gd,'center','700');

  _roundRect(ctx,zx+85,zy,60,30,0,'#ecfdf5',COLORS.ok,1);
  _label(ctx,'Rd1 SP',zx+115,zy+15,8,COLORS.ok,'center','600');

  _roundRect(ctx,zx+150,zy,50,30,0,'#fef3c7',COLORS.gd+'cc',1);
  _label(ctx,'Index',zx+175,zy+15,8,COLORS.gd,'center','600');

  ctx.fillStyle='#dbeafe';ctx.fillRect(zx+205,zy,120,30);
  ctx.strokeStyle=COLORS.gb;ctx.lineWidth=1;ctx.strokeRect(zx+205,zy,120,30);
  _label(ctx,'Insert DNA',zx+265,zy+15,9,COLORS.gb,'center','600');

  _roundRect(ctx,zx+330,zy,50,30,0,'#fef3c7',COLORS.gd+'cc',1);
  _label(ctx,'Index',zx+355,zy+15,8,COLORS.gd,'center','600');

  _roundRect(ctx,zx+385,zy,60,30,0,'#f3e8ff',COLORS.gc,1);
  _label(ctx,'Rd2 SP',zx+415,zy+15,8,COLORS.gc,'center','600');

  _roundRect(ctx,zx+450,zy,80,30,5,COLORS.gc+'33',COLORS.gc,1.5);
  _label(ctx,'P7 adapter',zx+490,zy+15,9,COLORS.gc,'center','700');

  // Labels below
  _label(ctx,'Sequencing primer sites',zx+265,zy+44,9,COLORS.ink4,'center','500');
  _label(ctx,'Barcodes for multiplexing',zx+265,zy+58,9,COLORS.ink4,'center','500');
  _label(ctx,'P5/P7 bind to flow cell surface oligos',zx+265,zy+72,9,COLORS.ink4,'center','500');
}

/* ═══════════════════════════════════════════════════════════
   STEP 1 — Bind fragments to flow cell surface
   ═══════════════════════════════════════════════════════════ */
function drawSbs1(ctx){
  _label(ctx,'Bind library fragments to the flow cell',400,22,16,COLORS.ink,'center','700');

  /* ── Top: flow cell surface ── */
  const sy=60;

  // Wide surface
  _flowSurface(ctx,60,sy+110,680,14);

  // Dense oligo lawn
  const oligoCols=[COLORS.gd+'aa',COLORS.gc+'aa'];
  for(let i=0;i<48;i++){
    _oligo(ctx,74+i*14,sy+110,5,oligoCols[i%2]);
  }

  // Oligo type labels — far left, clear of everything
  _label(ctx,'P5 oligo',90,sy+70,10,COLORS.gd,'center','600');
  _arrow(ctx,90,sy+76,80,sy+95,COLORS.gd,1.5);
  _label(ctx,'P7 oligo',170,sy+70,10,COLORS.gc,'center','600');
  _arrow(ctx,170,sy+76,165,sy+95,COLORS.gc,1.5);

  // Flow cell label
  _label(ctx,'Flow cell surface with complementary oligo lawn',400,sy+138,10,COLORS.ink4,'center','500');

  /* ── Fragment floating down and hybridizing ── */
  const fx=420,ffy=sy+42;
  // Fragment
  _roundRect(ctx,fx,ffy,28,22,4,COLORS.gd+'33',COLORS.gd,1.5);
  _label(ctx,'P5',fx+14,ffy+11,8,COLORS.gd,'center','700');

  ctx.strokeStyle=COLORS.gb;ctx.lineWidth=2.5;ctx.lineCap='round';
  ctx.beginPath();ctx.moveTo(fx+28,ffy+11);ctx.lineTo(fx+150,ffy+11);ctx.stroke();

  _roundRect(ctx,fx+150,ffy,28,22,4,COLORS.gc+'33',COLORS.gc,1.5);
  _label(ctx,'P7',fx+164,ffy+11,8,COLORS.gc,'center','700');

  // Hybridization dashed line from P5 down to surface oligo
  ctx.strokeStyle=COLORS.gd;ctx.lineWidth=1.5;ctx.setLineDash([4,3]);
  ctx.beginPath();ctx.moveTo(fx+14,ffy+22);ctx.lineTo(fx-5,sy+95);ctx.stroke();
  ctx.setLineDash([]);

  // Label — to the right of the fragment, no overlap
  _label(ctx,'P5 adapter hybridizes to',fx+200,ffy+4,10,COLORS.gd,'left','600');
  _label(ctx,'complementary surface oligo',fx+200,ffy+18,10,COLORS.gd,'left','600');

  /* ── Arrow down: denature ── */
  const dy=sy+155;
  _arrow(ctx,400,dy,400,dy+30,COLORS.ink4,2);
  _label(ctx,'Denature: wash away complement strand',392,dy+14,11,COLORS.ink3,'right','600');

  /* ── Bottom: single strands on surface ── */
  const ry=dy+40;
  _flowSurface(ctx,60,ry+65,680,14);
  for(let i=0;i<48;i++){
    _oligo(ctx,74+i*14,ry+65,5,oligoCols[i%2]);
  }

  // Three single strands tethered at different spots
  const strands=[{x:150,w:120},{x:350,w:100},{x:560,w:130}];
  for(const s of strands){
    ctx.strokeStyle=COLORS.gb;ctx.lineWidth=2.5;ctx.lineCap='round';
    ctx.beginPath();ctx.moveTo(s.x,ry+65);ctx.lineTo(s.x,ry+40);
    for(let dx=0;dx<=s.w;dx+=8){
      ctx.lineTo(s.x+dx,ry+40+Math.sin(dx*0.15)*8);
    }
    ctx.stroke();
    ctx.strokeStyle=COLORS.gb+'55';ctx.lineWidth=1.5;
    ctx.beginPath();ctx.moveTo(s.x+s.w,ry+40+Math.sin(s.w*0.15)*8);
    ctx.quadraticCurveTo(s.x+s.w+15,ry+30,s.x+s.w+8,ry+22);ctx.stroke();
  }

  _label(ctx,'Single-stranded templates tethered to surface, ready for amplification',400,ry+90,11,COLORS.ink3,'center','500');
}

/* ═══════════════════════════════════════════════════════════
   STEP 2 — Bridge amplification → clonal clusters
   ═══════════════════════════════════════════════════════════ */
function drawSbs2(ctx){
  _label(ctx,'Bridge amplification creates clonal clusters',400,22,16,COLORS.ink,'center','700');

  const steps=[
    {x:80,label:'1. Single strand\n   on surface'},
    {x:230,label:'2. Strand bends\n   to nearby oligo'},
    {x:380,label:'3. Polymerase\n   makes copy'},
    {x:530,label:'4. Denature\n   → two strands'},
    {x:680,label:'5. Repeat ×35\n   → cluster'}
  ];

  const surfY=160;
  for(let i=0;i<5;i++){
    const bx=steps[i].x;

    // Surface
    _flowSurface(ctx,bx-55,surfY,110,10);
    for(let j=0;j<5;j++){
      _oligo(ctx,bx-40+j*22,surfY,4,COLORS.ink4+'55');
    }

    if(i===0){
      // Single strand going up
      ctx.strokeStyle=COLORS.gb;ctx.lineWidth=3;ctx.lineCap='round';
      ctx.beginPath();ctx.moveTo(bx-20,surfY);ctx.lineTo(bx-20,surfY-50);
      ctx.lineTo(bx+30,surfY-50);ctx.stroke();
      ctx.strokeStyle=COLORS.gb+'77';ctx.lineWidth=2;
      ctx.beginPath();ctx.moveTo(bx+30,surfY-50);
      ctx.quadraticCurveTo(bx+45,surfY-40,bx+38,surfY-30);ctx.stroke();
    } else if(i===1){
      // Bridge: both ends attach
      ctx.strokeStyle=COLORS.gb;ctx.lineWidth=3;
      ctx.beginPath();ctx.moveTo(bx-25,surfY);
      ctx.quadraticCurveTo(bx-25,surfY-55,bx,surfY-60);
      ctx.quadraticCurveTo(bx+25,surfY-55,bx+25,surfY);ctx.stroke();
    } else if(i===2){
      // Bridge + complement being synthesized
      ctx.strokeStyle=COLORS.gb;ctx.lineWidth=3;
      ctx.beginPath();ctx.moveTo(bx-25,surfY);
      ctx.quadraticCurveTo(bx-25,surfY-55,bx,surfY-60);
      ctx.quadraticCurveTo(bx+25,surfY-55,bx+25,surfY);ctx.stroke();
      // Complement (red, dashed growing)
      ctx.strokeStyle=COLORS.bad;ctx.lineWidth=2;ctx.setLineDash([4,3]);
      ctx.beginPath();ctx.moveTo(bx-20,surfY-3);
      ctx.quadraticCurveTo(bx-20,surfY-48,bx,surfY-52);
      ctx.quadraticCurveTo(bx+15,surfY-48,bx+15,surfY-20);ctx.stroke();
      ctx.setLineDash([]);
      // Polymerase
      ctx.beginPath();ctx.arc(bx+15,surfY-20,7,0,Math.PI*2);
      ctx.fillStyle=COLORS.ok;ctx.fill();
      _label(ctx,'Pol',bx+15,surfY-20,6,'#fff','center','700');
    } else if(i===3){
      // Two strands separated
      ctx.strokeStyle=COLORS.gb;ctx.lineWidth=3;
      ctx.beginPath();ctx.moveTo(bx-28,surfY);ctx.lineTo(bx-28,surfY-45);
      ctx.lineTo(bx-10,surfY-45);ctx.stroke();
      ctx.strokeStyle=COLORS.bad;ctx.lineWidth=3;
      ctx.beginPath();ctx.moveTo(bx+28,surfY);ctx.lineTo(bx+28,surfY-45);
      ctx.lineTo(bx+10,surfY-45);ctx.stroke();
    } else {
      // Cluster: many strands
      const R=rng(77);
      for(let j=0;j<20;j++){
        const ang=-Math.PI/2+(R()-0.5)*Math.PI;
        const len=18+R()*25;
        const col=j%2===0?COLORS.gb:COLORS.bad;
        ctx.strokeStyle=col+(R()>0.3?'88':'cc');ctx.lineWidth=1.5;
        ctx.beginPath();
        const sx=bx+(R()-0.5)*30;
        ctx.moveTo(sx,surfY);
        ctx.lineTo(sx+Math.cos(ang)*len,surfY+Math.sin(ang)*len);ctx.stroke();
      }
      // Glow
      const cg=ctx.createRadialGradient(bx,surfY-15,3,bx,surfY-15,30);
      cg.addColorStop(0,COLORS.gb+'44');cg.addColorStop(1,COLORS.gb+'00');
      ctx.fillStyle=cg;ctx.beginPath();ctx.arc(bx,surfY-15,30,0,Math.PI*2);ctx.fill();
    }

    // Step label
    const lns=steps[i].label.split('\n');
    for(let l=0;l<lns.length;l++){
      _label(ctx,lns[l].trim(),bx,surfY+22+l*14,9,COLORS.ink3,'center','500');
    }

    if(i<4) _arrow(ctx,bx+58,surfY-30,steps[i+1].x-58,surfY-30,COLORS.ink4+'88',1.5);
  }

  /* ── Bottom: resulting flow cell view ── */
  const by=surfY+65;
  _label(ctx,'Result: millions of clonal clusters on the flow cell',400,by,13,COLORS.gd,'center','700');

  _roundRect(ctx,60,by+18,680,140,10,'#0f172a08',COLORS.border,1);
  // Lane dividers
  for(let i=1;i<4;i++){
    ctx.strokeStyle=COLORS.border;ctx.lineWidth=0.5;ctx.setLineDash([4,4]);
    ctx.beginPath();ctx.moveTo(60+i*170,by+18);ctx.lineTo(60+i*170,by+158);ctx.stroke();
    ctx.setLineDash([]);
  }

  // Clusters as dots
  const Rf=rng(42);
  const clCols=[COLORS.gb,COLORS.gc,COLORS.gd,COLORS.ga,'#dc2626','#8b5cf6'];
  for(let i=0;i<250;i++){
    const cx=70+Rf()*660,cy=by+24+Rf()*125;
    const r=1.5+Rf()*3;
    ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);
    ctx.fillStyle=clCols[Math.floor(Rf()*clCols.length)]+'55';ctx.fill();
  }

  // Lane labels inside the box, at the top
  _label(ctx,'Lane 1',145,by+30,8,COLORS.ink4+'88','center','500');
  _label(ctx,'Lane 2',315,by+30,8,COLORS.ink4+'88','center','500');
  _label(ctx,'Lane 3',485,by+30,8,COLORS.ink4+'88','center','500');
  _label(ctx,'Lane 4',655,by+30,8,COLORS.ink4+'88','center','500');

  _label(ctx,'Each cluster ≈ 1,000 identical copies of one original fragment',400,by+170,10,COLORS.ink3,'center','500');
}

/* ═══════════════════════════════════════════════════════════
   STEP 3 — SBS: Add fluorescent nucleotides
   ═══════════════════════════════════════════════════════════ */
function drawSbs3(ctx){
  _label(ctx,'Sequencing by synthesis: one base at a time',400,22,16,COLORS.ink,'center','700');

  /* ── Zoomed view: template + growing strand ── */
  const zy=55;
  _label(ctx,'Zoomed into one cluster — one SBS cycle',260,zy,12,COLORS.gb,'left','600');

  const tx=80,ty=zy+30,tw=520;
  const tSeq='ATGCTAGCATGCTA'.split('');
  _dnaStrand(ctx,tx,ty,tw,tSeq,COLORS.ink4+'88',1);
  _label(ctx,"3'",tx-16,ty,10,COLORS.ink4,'right','600');
  _label(ctx,"5'",tx+tw+16,ty,10,COLORS.ink4,'left','600');
  _label(ctx,'Template strand',tx+tw/2,ty-16,10,COLORS.ink4,'center','500');

  // Growing complement (8 of 14 done)
  const comp='TACGATCG'.split('');
  const cw=tw*(comp.length/tSeq.length);
  _dnaStrand(ctx,tx,ty+28,cw,comp,COLORS.gb,-1);
  _label(ctx,"5'",tx-16,ty+28,10,COLORS.gb,'right','600');
  _label(ctx,'New strand (growing read)',tx+cw/2,ty+50,10,COLORS.gb,'center','500');

  /* ── Four nucleotides floating in ── */
  const bases=['A','T','G','C'];
  const bCols=[COLORS.ok,'#dc2626',COLORS.gd,COLORS.gb];
  const nextX=tx+cw+tw/tSeq.length;

  for(let i=0;i<4;i++){
    const fx=nextX+20+i*34,fy=ty+14;
    const isMatch=i===0;
    ctx.globalAlpha=isMatch?1:0.25;
    ctx.beginPath();ctx.arc(fx,fy,10,0,Math.PI*2);
    ctx.fillStyle=bCols[i]+'33';ctx.fill();
    ctx.strokeStyle=bCols[i];ctx.lineWidth=isMatch?2.5:1;ctx.stroke();
    _monoLabel(ctx,bases[i],fx,fy,9,bCols[i],'center');
    if(isMatch){
      const g=ctx.createRadialGradient(fx,fy,4,fx,fy,18);
      g.addColorStop(0,bCols[0]+'55');g.addColorStop(1,bCols[0]+'00');
      ctx.fillStyle=g;ctx.beginPath();ctx.arc(fx,fy,18,0,Math.PI*2);ctx.fill();
      _arrow(ctx,fx,fy-18,fx,fy-30,bCols[0],2);
      _label(ctx,'Incorporates!',fx,fy+20,9,bCols[0],'center','700');
    }
    ctx.globalAlpha=1;
  }

  /* ── Key concepts ── */
  const ky=ty+75;
  _roundRect(ctx,60,ky,330,110,8,'#f0fdf4',COLORS.ok+'44',1);
  _label(ctx,'Modified nucleotides',225,ky+16,12,COLORS.ok,'center','700');
  _label(ctx,'Each dNTP carries:',100,ky+38,10,COLORS.ink2,'left','600');
  _label(ctx,'1. Fluorescent tag (unique color per base)',112,ky+54,10,COLORS.ink3,'left','400');
  _label(ctx,'2. 3\' reversible terminator (blocker)',112,ky+70,10,COLORS.ink3,'left','400');
  _label(ctx,'→ Only ONE base can incorporate per cycle',112,ky+90,10,COLORS.ok,'left','600');

  _roundRect(ctx,410,ky,330,110,8,'#eff6ff',COLORS.gb+'44',1);
  _label(ctx,'Why this works',575,ky+16,12,COLORS.gb,'center','700');
  _label(ctx,'All 4 modified dNTPs flood the cluster',435,ky+38,10,COLORS.ink3,'left','400');
  _label(ctx,'Only the complement of the next template',435,ky+54,10,COLORS.ink3,'left','400');
  _label(ctx,'base gets incorporated by polymerase',435,ky+70,10,COLORS.ink3,'left','400');
  _label(ctx,'Blocker prevents chain extension',435,ky+90,10,COLORS.gb,'left','600');

  /* ── Bottom: cycle overview ── */
  const cy=ky+125;
  _label(ctx,'The SBS cycle is repeated 150-300× to build each read',400,cy,12,COLORS.gd,'center','700');
  const readSeq='ATGCTAGCATGCTAGCATGCTAGCATGCTA'.split('');
  const cellW=22,cellH=22;
  for(let i=0;i<30;i++){
    const x=65+i*cellW,y=cy+18;
    const bIdx=bases.indexOf(readSeq[i]);
    const col=bIdx>=0?bCols[bIdx]:COLORS.ink4;
    ctx.globalAlpha=i<20?1:0.25;
    _roundRect(ctx,x,y,cellW-1,cellH,2,col,null);
    _monoLabel(ctx,readSeq[i],x+cellW/2,y+cellH/2,8,'#fff','center');
    ctx.globalAlpha=1;
    if(i===0||i===9||i===19||i===29) _monoLabel(ctx,(i+1)+'',x+cellW/2,y+cellH+8,6,COLORS.ink4,'center');
  }
  _label(ctx,'cycle',65+cellW/2,cy+cellH+19,6,COLORS.ink4,'center','500');
  _label(ctx,'One base call per cycle, per cluster',400,cy+60,10,COLORS.ink3,'center','500');
}

/* ═══════════════════════════════════════════════════════════
   STEP 4 — Image clusters & cleave blocker
   ═══════════════════════════════════════════════════════════ */
function drawSbs4(ctx){
  _label(ctx,'Image every cluster, then cleave and repeat',400,22,16,COLORS.ink,'center','700');

  /* ── 4-step mini-cycle ── */
  const cy=60;
  const cSteps=[
    {title:'1. Flood',desc:'All 4 modified dNTPs\nenter the flow cell',col:COLORS.gb,x:120},
    {title:'2. Incorporate',desc:'One complementary\nbase binds per cluster',col:COLORS.ok,x:300},
    {title:'3. Image',desc:'Laser excites fluorophore;\ncamera records color\nof every cluster',col:COLORS.gd,x:480},
    {title:'4. Cleave & wash',desc:'Remove blocker +\nfluorophore tag;\nready for next cycle',col:COLORS.gc,x:660}
  ];

  for(let i=0;i<4;i++){
    const s=cSteps[i];
    _roundRect(ctx,s.x-70,cy,140,80,8,s.col+'0c',s.col+'55',1.5);
    ctx.beginPath();ctx.arc(s.x-50,cy+16,10,0,Math.PI*2);
    ctx.fillStyle=s.col+'22';ctx.fill();ctx.strokeStyle=s.col;ctx.lineWidth=1.5;ctx.stroke();
    _label(ctx,(i+1)+'',s.x-50,cy+16,10,s.col,'center','700');
    _label(ctx,s.title.split('. ')[1],s.x+8,cy+16,11,s.col,'center','700');
    const lines=s.desc.split('\n');
    for(let l=0;l<lines.length;l++){
      _label(ctx,lines[l],s.x+8,cy+36+l*14,9,COLORS.ink3,'center','400');
    }
    if(i<3) _arrow(ctx,s.x+72,cy+40,cSteps[i+1].x-72,cy+40,COLORS.ink4+'88',1.5);
  }
  // Loop arrow
  ctx.strokeStyle=COLORS.gd+'66';ctx.lineWidth=1.5;ctx.setLineDash([5,4]);
  ctx.beginPath();ctx.moveTo(730,cy+60);ctx.lineTo(750,cy+60);
  ctx.lineTo(750,cy+90);ctx.lineTo(40,cy+90);ctx.lineTo(40,cy+40);ctx.lineTo(50,cy+40);ctx.stroke();
  ctx.setLineDash([]);
  _label(ctx,'repeat 150-300×',400,cy+100,10,COLORS.gd,'center','600');

  /* ── Imaging panel ── */
  const iy=cy+120;
  _label(ctx,'What the camera captures each cycle',400,iy,13,COLORS.gb,'center','700');

  const R=rng(88);
  const bCols=[COLORS.ok,'#dc2626',COLORS.gd,COLORS.gb];
  for(let cyc=0;cyc<5;cyc++){
    const ix=60+cyc*145,iiy=iy+18;
    _roundRect(ctx,ix,iiy,130,90,6,'#0f172a',COLORS.ink3+'88',1);
    _label(ctx,'Cycle '+(cyc+1),ix+65,iiy-6,9,COLORS.ink3,'center','500');
    for(let d=0;d<40;d++){
      const dx=ix+10+R()*110,dy=iiy+8+R()*72;
      const bi=Math.floor(R()*4);
      const g=ctx.createRadialGradient(dx,dy,0,dx,dy,5);
      g.addColorStop(0,bCols[bi]);g.addColorStop(1,bCols[bi]+'00');
      ctx.fillStyle=g;ctx.beginPath();ctx.arc(dx,dy,4,0,Math.PI*2);ctx.fill();
      ctx.beginPath();ctx.arc(dx,dy,2,0,Math.PI*2);
      ctx.fillStyle=bCols[bi];ctx.fill();
    }
  }

  _label(ctx,'Each glowing dot = one cluster → one base call',400,iy+120,10,COLORS.ink3,'center','500');

  /* ── Base calling ── */
  const by=iy+140;
  _label(ctx,'Base calling: color → letter',400,by,13,COLORS.gd,'center','700');

  for(let i=0;i<4;i++){
    const bx=200+i*110;
    ctx.beginPath();ctx.arc(bx,by+28,14,0,Math.PI*2);
    const g=ctx.createRadialGradient(bx,by+28,3,bx,by+28,14);
    g.addColorStop(0,bCols[i]);g.addColorStop(1,bCols[i]+'44');
    ctx.fillStyle=g;ctx.fill();
    _monoLabel(ctx,['A','T','G','C'][i],bx,by+28,12,'#fff','center');
    _label(ctx,'= '+['A','T','G','C'][i],bx,by+50,10,bCols[i],'center','700');
  }

  _label(ctx,'Software converts millions of color sequences into FASTQ files',400,by+72,10,COLORS.ink3,'center','500');
}

/* ═══════════════════════════════════════════════════════════
   STEP 5 — Paired-end reads (R1 & R2)
   ═══════════════════════════════════════════════════════════ */
function drawSbs5(ctx){

  /* ── Title ── */
  _label(ctx,'One read covers ~150 bp, but the fragment is 300–500 bp',400,20,15,COLORS.ink,'center','700');
  _label(ctx,'The sequencer reads from both ends to cover more of the insert',400,42,11,COLORS.ga,'center','600');

  /* ════════════════════════════════════════════════════════════
     Flow-cell surface schematics (same style as bridge amp)
     4 sub-steps on flow cell surfaces with arrows between them
     ════════════════════════════════════════════════════════════ */
  const stX=[100,280,480,660];   // x centre of each sub-step
  const surfY=185;               // surface y baseline (pushed down to fill canvas)
  const sw=140;                  // surface width
  const strandH=70;              // strand height above surface

  for(let i=0;i<4;i++){
    const cx=stX[i];
    _flowSurface(ctx,cx-sw/2,surfY,sw,10);
    for(let j=0;j<5;j++) _oligo(ctx,cx-40+j*20,surfY,4,COLORS.ink4+'55');
  }

  /* ── Arrows between sub-steps (drawn first so pills cover them) ── */
  for(let i=0;i<3;i++){
    _arrow(ctx,stX[i]+sw/2-5,surfY-35, stX[i+1]-sw/2+5,surfY-35, COLORS.ink4+'88',1.5);
  }

  /* ── Sub-step 1: Sequence R1 ── */
  const cx1=stX[0];
  ctx.strokeStyle=COLORS.gb; ctx.lineWidth=3; ctx.lineCap='round';
  ctx.beginPath(); ctx.moveTo(cx1-30,surfY);
  ctx.lineTo(cx1-30,surfY-strandH); ctx.lineTo(cx1+40,surfY-strandH); ctx.stroke();
  _roundRect(ctx,cx1-42,surfY-14,24,14,3,COLORS.gd,null);
  _label(ctx,'P5',cx1-30,surfY-7,7,'#fff','center','700');
  _roundRect(ctx,cx1+28,surfY-strandH-7,24,14,3,COLORS.gc,null);
  _label(ctx,'P7',cx1+40,surfY-strandH,7,'#fff','center','700');
  _arrow(ctx,cx1-24,surfY-strandH+18,cx1+24,surfY-strandH+18,COLORS.gb,2);
  _label(ctx,'R1 →',cx1,surfY-strandH+30,10,COLORS.gb,'center','700');
  _label(ctx,'1. Sequence R1',cx1,surfY+26,11,COLORS.gb,'center','700');
  _label(ctx,'from P5 end',cx1,surfY+40,9,COLORS.ink3,'center','400');

  /* ── Sub-step 2: Wash R1 ── */
  const cx2=stX[1];
  ctx.strokeStyle=COLORS.ink3+'66'; ctx.lineWidth=2;
  ctx.beginPath(); ctx.moveTo(cx2-20,surfY);
  ctx.lineTo(cx2-20,surfY-50); ctx.lineTo(cx2+20,surfY-50); ctx.stroke();
  _roundRect(ctx,cx2-32,surfY-14,24,14,3,COLORS.gd,null);
  _label(ctx,'P5',cx2-20,surfY-7,7,'#fff','center','700');
  ctx.strokeStyle=COLORS.bad+'99'; ctx.lineWidth=2.5;
  ctx.beginPath(); ctx.moveTo(cx2-12,surfY-62); ctx.lineTo(cx2+12,surfY-38); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx2+12,surfY-62); ctx.lineTo(cx2-12,surfY-38); ctx.stroke();
  _label(ctx,'2. Wash off',cx2,surfY+26,11,COLORS.bad,'center','700');
  _label(ctx,'R1 products',cx2,surfY+40,9,COLORS.ink3,'center','400');

  /* ── Sub-step 3: Re-bridge to P7 ── */
  const cx3=stX[2];
  ctx.strokeStyle=COLORS.gd; ctx.lineWidth=3;
  ctx.beginPath(); ctx.moveTo(cx3-35,surfY);
  ctx.quadraticCurveTo(cx3-35,surfY-strandH-5, cx3,surfY-strandH-10);
  ctx.quadraticCurveTo(cx3+35,surfY-strandH-5, cx3+35,surfY); ctx.stroke();
  _roundRect(ctx,cx3-47,surfY-14,24,14,3,COLORS.gd,null);
  _label(ctx,'P5',cx3-35,surfY-7,7,'#fff','center','700');
  _roundRect(ctx,cx3+23,surfY-14,24,14,3,COLORS.gc,null);
  _label(ctx,'P7',cx3+35,surfY-7,7,'#fff','center','700');
  _label(ctx,'3. Re-bridge',cx3,surfY+26,11,COLORS.gd,'center','700');
  _label(ctx,'to P7 oligo',cx3,surfY+40,9,COLORS.ink3,'center','400');

  /* ── Sub-step 4: Sequence R2 ── */
  const cx4=stX[3];
  ctx.strokeStyle=COLORS.gc; ctx.lineWidth=3; ctx.lineCap='round';
  ctx.beginPath(); ctx.moveTo(cx4+30,surfY);
  ctx.lineTo(cx4+30,surfY-strandH); ctx.lineTo(cx4-40,surfY-strandH); ctx.stroke();
  _roundRect(ctx,cx4+18,surfY-14,24,14,3,COLORS.gc,null);
  _label(ctx,'P7',cx4+30,surfY-7,7,'#fff','center','700');
  _roundRect(ctx,cx4-52,surfY-strandH-7,24,14,3,COLORS.gd,null);
  _label(ctx,'P5',cx4-40,surfY-strandH,7,'#fff','center','700');
  _arrow(ctx,cx4+24,surfY-strandH+18,cx4-24,surfY-strandH+18,COLORS.gc,2);
  _label(ctx,'← R2',cx4,surfY-strandH+30,10,COLORS.gc,'center','700');
  _label(ctx,'4. Sequence R2',cx4,surfY+26,11,COLORS.gc,'center','700');
  _label(ctx,'from P7 end',cx4,surfY+40,9,COLORS.ink3,'center','400');

  /* ════════════════════════════════════════════════════════════
     Result: what the two reads cover on the original fragment
     ════════════════════════════════════════════════════════════ */
  const ry=surfY+64;
  _label(ctx,'Result: two reads from opposite ends of the same fragment',400,ry,13,COLORS.ink,'center','700');

  const ffy=ry+22, ffx=60, ffw=680, ffh=38, adW=46;
  // P5 adapter
  _roundRect(ctx,ffx,ffy,adW,ffh,4,COLORS.gd,COLORS.gd,1.5);
  _label(ctx,'P5',ffx+adW/2,ffy+ffh/2,12,'#fff','center','700');
  // Insert region
  const insX=ffx+adW, insW=ffw-adW*2;
  const ig=ctx.createLinearGradient(insX,0,insX+insW,0);
  ig.addColorStop(0,'#dbeafe'); ig.addColorStop(0.5,'#eff6ff'); ig.addColorStop(1,'#dbeafe');
  ctx.fillStyle=ig; ctx.fillRect(insX,ffy,insW,ffh);
  ctx.strokeStyle=COLORS.gb+'33'; ctx.lineWidth=1; ctx.strokeRect(insX,ffy,insW,ffh);
  _label(ctx,'insert (300–500 bp)',ffx+ffw/2,ffy+ffh/2,11,COLORS.ink4,'center','500');
  // P7 adapter
  _roundRect(ctx,ffx+ffw-adW,ffy,adW,ffh,4,COLORS.gc,COLORS.gc,1.5);
  _label(ctx,'P7',ffx+ffw-adW/2,ffy+ffh/2,12,'#fff','center','700');

  // R1 coverage highlight
  const r1w=insW*0.30;
  ctx.fillStyle=COLORS.gb+'30'; ctx.fillRect(insX+1,ffy+1,r1w,ffh-2);
  _arrow(ctx,insX+4,ffy+ffh+14,insX+r1w,ffy+ffh+14,COLORS.gb,2);
  _label(ctx,'R1 — ~150 bp',insX+r1w/2,ffy+ffh+30,11,COLORS.gb,'center','700');

  // R2 coverage highlight
  const r2w=insW*0.30;
  const r2x=insX+insW-r2w;
  ctx.fillStyle=COLORS.gc+'30'; ctx.fillRect(r2x,ffy+1,r2w,ffh-2);
  _arrow(ctx,insX+insW-4,ffy+ffh+14,r2x,ffy+ffh+14,COLORS.gc,2);
  _label(ctx,'R2 — ~150 bp',r2x+r2w/2,ffy+ffh+30,11,COLORS.gc,'center','700');

  // Unsequenced gap in the middle
  const gapX1=insX+r1w, gapX2=r2x;
  if(gapX2-gapX1>20){
    ctx.setLineDash([4,4]); ctx.strokeStyle=COLORS.ink4+'55'; ctx.lineWidth=1;
    const gapMidY=ffy+ffh+14;
    ctx.beginPath(); ctx.moveTo(gapX1+4,gapMidY); ctx.lineTo(gapX2-4,gapMidY); ctx.stroke();
    ctx.setLineDash([]);
    _label(ctx,'unsequenced gap',(gapX1+gapX2)/2,ffy+ffh+30,9,COLORS.ink4,'center','400');
  }

  /* ── R2 quality note (centred below) ── */
  const qy=ffy+ffh+52;
  _label(ctx,'R2 quality is lower than R1:  reagents depleted · strands lose sync (phasing) · clusters decay',
    400,qy,10,COLORS.ink3,'center','400');
}

/* ═══════════════════════════════════════════════════════════
   STEP 6 — Full animated SBS cycle (requestAnimationFrame)
   ═══════════════════════════════════════════════════════════ */
function drawSbs6(){
  let startTime=null;
  const cycleDuration=5000;
  const totalCycles=4;
  const totalDuration=cycleDuration*totalCycles;

  function frame(ts){
    if(!startTime) startTime=ts;
    const elapsed=ts-startTime;
    const t=(elapsed%cycleDuration)/cycleDuration;
    const cycleNum=Math.min(Math.floor(elapsed/cycleDuration),totalCycles-1);

    if(sbsStep!==6) return;
    const ctx=_c('sbs-canvas');if(!ctx) return;
    ctx.clearRect(0,0,800,440);

    const bCols=[COLORS.ok,'#dc2626',COLORS.gd,COLORS.gb];
    const bases=['A','T','G','C'];

    // ── Header ──
    _label(ctx,'Full SBS cycle — animated',400,18,15,COLORS.ink,'center','700');
    _label(ctx,'Cycle '+(cycleNum+1)+' of '+totalCycles,400,36,11,COLORS.gd,'center','600');

    // Cycle progress bar (thin, below header)
    _roundRect(ctx,100,48,600,4,2,COLORS.border,null);
    _roundRect(ctx,100,48,600*t,4,2,COLORS.gd,null);

    // ── Template strand ──
    const tx=60,ty=72,tw=680;
    const tSeq='ATGCTAGCATGCTA'.split('');
    _dnaStrand(ctx,tx,ty,tw,tSeq,COLORS.ink4+'55',1,4);
    _label(ctx,"3'",tx-14,ty,9,COLORS.ink4,'right','600');
    _label(ctx,"5'",tx+tw+14,ty,9,COLORS.ink4,'left','600');
    _label(ctx,'Template strand',tx+tw/2,ty-16,10,COLORS.ink4,'center','500');

    // Growing complement from previous cycles
    const doneCount=Math.min(cycleNum,tSeq.length);
    if(doneCount>0){
      const doneBases=tSeq.slice(0,doneCount).map(b=>({A:'T',T:'A',G:'C',C:'G'}[b]));
      _dnaStrand(ctx,tx,ty+26,tw*(doneCount/tSeq.length),doneBases,COLORS.gb,-1,4);
    }

    // Current base info
    const curIdx=Math.min(cycleNum,tSeq.length-1);
    const curTemplate=tSeq[curIdx];
    const curComp={A:'T',T:'A',G:'C',C:'G'}[curTemplate];
    const curBI=bases.indexOf(curComp);
    const curCol=bCols[curBI];
    const curX=tx+(curIdx+0.5)*(tw/tSeq.length);

    // ── Cluster field (always visible, lower half) ──
    const clY=180,clH=180;
    _roundRect(ctx,60,clY,680,clH,8,'#0f172a',COLORS.ink3+'44',1);
    _label(ctx,'Cluster field (millions of clusters)',400,clY-8,9,COLORS.ink4,'center','500');

    const R=rng(55);
    for(let i=0;i<80;i++){
      const cx=70+R()*660,cy=clY+10+R()*(clH-20);
      const bi=Math.floor(R()*4);
      const glow=ctx.createRadialGradient(cx,cy,0,cx,cy,6);
      glow.addColorStop(0,bCols[bi]);glow.addColorStop(1,bCols[bi]+'00');
      ctx.fillStyle=glow;ctx.beginPath();ctx.arc(cx,cy,5,0,Math.PI*2);ctx.fill();
      ctx.beginPath();ctx.arc(cx,cy,2.5,0,Math.PI*2);ctx.fillStyle=bCols[bi];ctx.fill();
    }

    // ── Phase-specific animations ──
    let phaseText='';

    if(t<0.15){
      // Flood: nucleotides drift down toward strand
      phaseText='1. Flood with all 4 modified dNTPs';
      const p=t/0.15;
      for(let i=0;i<4;i++){
        const nx=curX-50+i*34;
        const ny=30+p*80;
        ctx.globalAlpha=0.4+p*0.6;
        ctx.beginPath();ctx.arc(nx,ny,10,0,Math.PI*2);
        ctx.fillStyle=bCols[i]+'44';ctx.fill();
        ctx.strokeStyle=bCols[i];ctx.lineWidth=2;ctx.stroke();
        _monoLabel(ctx,bases[i],nx,ny,8,bCols[i],'center');
        ctx.globalAlpha=1;
      }

    } else if(t<0.35){
      // Incorporate: matching base locks in, others fade
      phaseText='2. Complementary base incorporates';
      const p=(t-0.15)/0.2;
      for(let i=0;i<4;i++){
        const nx=curX-50+i*34;
        if(i===curBI){
          const my=110+(ty+26-110)*p;
          const mx=nx+(curX-nx)*p;
          const glow=ctx.createRadialGradient(mx,my,4,mx,my,16+p*12);
          glow.addColorStop(0,curCol+'77');glow.addColorStop(1,curCol+'00');
          ctx.fillStyle=glow;ctx.beginPath();ctx.arc(mx,my,24,0,Math.PI*2);ctx.fill();
          ctx.beginPath();ctx.arc(mx,my,10,0,Math.PI*2);
          ctx.fillStyle=curCol;ctx.fill();
          _monoLabel(ctx,bases[i],mx,my,8,'#fff','center');
        } else {
          ctx.globalAlpha=Math.max(0,1-p*1.2);
          ctx.beginPath();ctx.arc(nx,110,10,0,Math.PI*2);
          ctx.fillStyle=bCols[i]+'44';ctx.fill();
          ctx.strokeStyle=bCols[i];ctx.lineWidth=1;ctx.stroke();
          _monoLabel(ctx,bases[i],nx,110,8,bCols[i],'center');
          ctx.globalAlpha=1;
        }
      }

    } else if(t<0.55){
      // Laser scan across cluster field
      phaseText='3. Laser scans — camera images every cluster';
      const p=(t-0.35)/0.2;
      // Incorporated base on strand
      ctx.beginPath();ctx.arc(curX,ty+26,10,0,Math.PI*2);ctx.fillStyle=curCol;ctx.fill();
      _monoLabel(ctx,curComp,curX,ty+26,8,'#fff','center');
      // Laser sweep
      const laserX=60+p*680;
      ctx.strokeStyle='#22d3ee';ctx.lineWidth=3;ctx.globalAlpha=0.7;
      ctx.beginPath();ctx.moveTo(laserX,clY);ctx.lineTo(laserX,clY+clH);ctx.stroke();
      // Glow along laser
      const lg=ctx.createLinearGradient(laserX-15,0,laserX+15,0);
      lg.addColorStop(0,'#22d3ee00');lg.addColorStop(0.5,'#22d3ee33');lg.addColorStop(1,'#22d3ee00');
      ctx.fillStyle=lg;ctx.fillRect(laserX-15,clY,30,clH);
      ctx.globalAlpha=1;

    } else if(t<0.70){
      // Image captured — show base call
      phaseText='4. Base call recorded';
      const p=(t-0.55)/0.15;
      ctx.beginPath();ctx.arc(curX,ty+26,10,0,Math.PI*2);ctx.fillStyle=curCol;ctx.fill();
      _monoLabel(ctx,curComp,curX,ty+26,8,'#fff','center');
      // Flash
      ctx.globalAlpha=Math.max(0,(1-p)*0.25);
      ctx.fillStyle='#fff';ctx.fillRect(0,0,800,440);
      ctx.globalAlpha=1;
      // Base call badge
      const s=0.6+p*0.4;
      ctx.save();ctx.translate(400,clY+clH/2);ctx.scale(s,s);
      _roundRect(ctx,-65,-22,130,44,10,curCol,null);
      _label(ctx,'Base call: '+curComp,0,0,16,'#fff','center','700');
      ctx.restore();

    } else if(t<0.85){
      // Cleave
      phaseText='5. Cleave blocker + fluorophore, wash';
      const p=(t-0.70)/0.15;
      ctx.beginPath();ctx.arc(curX,ty+26,10,0,Math.PI*2);
      ctx.fillStyle=COLORS.ink4+'88';ctx.fill();
      _monoLabel(ctx,curComp,curX,ty+26,8,COLORS.ink4,'center');
      // Tag floating away
      ctx.globalAlpha=1-p;
      ctx.beginPath();ctx.arc(curX+14,ty+26-p*50,6,0,Math.PI*2);ctx.fillStyle=curCol;ctx.fill();
      ctx.beginPath();ctx.arc(curX-10,ty+26+10-p*40,5,0,Math.PI*2);ctx.fillStyle=COLORS.warn;ctx.fill();
      ctx.globalAlpha=1;
      _label(ctx,"3' OH restored",400,ty+60,11,COLORS.ok,'center','600');

    } else {
      // Ready
      phaseText='Ready for next cycle';
      const allN=Math.min(cycleNum+1,tSeq.length);
      if(allN>0){
        const ab=tSeq.slice(0,allN).map(b=>({A:'T',T:'A',G:'C',C:'G'}[b]));
        _dnaStrand(ctx,tx,ty+26,tw*(allN/tSeq.length),ab,COLORS.gb,-1,4);
      }
      _label(ctx,'Read so far: '+(cycleNum+1)+' bases',400,ty+58,12,COLORS.gb,'center','700');
    }

    // ── Phase label above read bar ──
    _label(ctx,phaseText,400,380,11,COLORS.ink3,'center','500');

    // ── Growing read bar at bottom ──
    const barY=396;
    const barW=600,barX=100;
    _roundRect(ctx,barX,barY,barW,16,3,COLORS.border,null);
    const readLen=cycleNum+(t>0.35?1:0);
    if(readLen>0){
      const filled=barW*(readLen/tSeq.length);
      _roundRect(ctx,barX,barY,Math.min(filled,barW),16,3,COLORS.gb,null);
    }
    _label(ctx,'Read: '+Math.min(readLen,tSeq.length)+'/'+tSeq.length+' bases',400,barY+8,9,readLen>0?'#fff':COLORS.ink3,'center','600');

    if(elapsed<totalDuration){
      sbsAnimId=requestAnimationFrame(frame);
    } else {
      _label(ctx,'Sequencing complete!',400,clY+clH/2-10,16,COLORS.ok,'center','700');
      _label(ctx,'Real runs: 150-300 cycles × millions of clusters',400,clY+clH/2+12,10,COLORS.ink3,'center','500');
    }
  }

  sbsAnimId=requestAnimationFrame(frame);
}

/* ═══════════════════════════════════════════════════════════
   11. ILLU-CANVAS — Illumina per-base quality (R1 vs R2)
   ═══════════════════════════════════════════════════════════ */

let illuStep=0;

function drawIlluCanvas(step){
  if(step!==undefined) illuStep=step;
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

  // Generate quality distributions
  function drawQualityTrack(label,col,baseQ,decayStart,decayRate,yJitter,faded){
    const alpha=faded?0.2:1;
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
      ctx.globalAlpha=0.12*alpha;
      ctx.fillStyle=col;ctx.fillRect(x-bw/2+0.5,yQ75,bw-1,yQ25-yQ75);
      ctx.globalAlpha=1;
    }

    // Median line
    ctx.beginPath();ctx.moveTo(medianPts[0].x,medianPts[0].yMed);
    for(let i=1;i<medianPts.length;i++){ctx.lineTo(medianPts[i].x,medianPts[i].yMed)}
    ctx.strokeStyle=col;ctx.lineWidth=2;ctx.globalAlpha=alpha;ctx.stroke();ctx.globalAlpha=1;

    // Label at end of line
    const lx=px+pw-40,ly=medianPts[nPos-1].yMed;
    ctx.globalAlpha=alpha;
    _label(ctx,label,lx,ly-10,12,col,'center','700');
    ctx.globalAlpha=1;

    return medianPts;
  }

  // Step 0: R1 only — show 3' quality drop
  // Step 1: Add R2 — show it's worse
  // Step 2: Add adapter read-through zone

  if(illuStep===0){
    // R1 only, with annotation highlighting the 3' drop
    const pts=drawQualityTrack('R1',COLORS.gb,36,40,0.10,3,false);

    // Annotate the 3' drop with a bracket and arrow
    const dropStart=Math.floor(40);
    const xStart=px+dropStart*bw;
    const yStart=pts[dropStart].yMed;
    const yEnd=pts[nPos-1].yMed;
    // Dashed trend line from high to low
    ctx.strokeStyle=COLORS.bad;ctx.lineWidth=1.5;ctx.setLineDash([4,3]);
    ctx.beginPath();ctx.moveTo(xStart,yStart-6);ctx.lineTo(px+pw-60,yEnd-6);ctx.stroke();
    ctx.setLineDash([]);
    _arrow(ctx,px+pw-80,yEnd-6,px+pw-55,yEnd-6,COLORS.bad,1.5);
    _label(ctx,'quality drops toward 3′ end',px+pw/2+60,yStart-18,11,COLORS.bad,'center','700');

    // Why? — explanation below the plot
    const wy=py+ph-60;
    _roundRect(ctx,px+80,wy,pw-160,50,6,COLORS.bad+'08',COLORS.bad+'33',1);
    _label(ctx,'Why?  Each cycle accumulates small errors:',px+pw/2,wy+16,10,COLORS.bad,'center','700');
    _label(ctx,'phasing (strands lose sync)  ·  signal decay (fluorescence fades)  ·  incomplete removal of terminators',
      px+pw/2,wy+34,9,COLORS.ink3,'center','400');
  }
  else if(illuStep===1){
    // Both R1 and R2 — R2 is visibly lower
    drawQualityTrack('R1',COLORS.gb,36,40,0.10,3,false);
    const r2pts=drawQualityTrack('R2',COLORS.bad,34,20,0.18,4,false);

    // Annotate gap between R1 and R2
    const annotPos=100;
    const r1y=py+ph-(Math.max(2,36-(annotPos>40?(annotPos-40)*0.10:0)))*(ph/42);
    const r2y=r2pts[annotPos].yMed;
    ctx.strokeStyle=COLORS.warn;ctx.lineWidth=1.5;
    ctx.beginPath();ctx.moveTo(px+annotPos*bw+bw/2,r1y+4);ctx.lineTo(px+annotPos*bw+bw/2,r2y-4);ctx.stroke();
    // Arrow tips
    _label(ctx,'↑',px+annotPos*bw+bw/2,r1y+10,8,COLORS.warn,'center','700');
    _label(ctx,'↓',px+annotPos*bw+bw/2,r2y-6,8,COLORS.warn,'center','700');
    _label(ctx,'R2 always lower',px+annotPos*bw+bw/2+50,((r1y+r2y)/2),10,COLORS.warn,'left','600');
  }
  else{
    // Full view: both tracks + adapter zone
    drawQualityTrack('R1',COLORS.gb,36,40,0.10,3,false);
    drawQualityTrack('R2',COLORS.bad,34,20,0.18,4,false);

    // Adapter region indicator
    const adapterStart=120;
    ctx.fillStyle=COLORS.gd+'15';
    ctx.fillRect(px+adapterStart*bw,py,pw-adapterStart*bw,ph);
    ctx.strokeStyle=COLORS.gd;ctx.lineWidth=1;ctx.setLineDash([4,3]);
    ctx.beginPath();ctx.moveTo(px+adapterStart*bw,py);ctx.lineTo(px+adapterStart*bw,py+ph);ctx.stroke();
    ctx.setLineDash([]);
    _label(ctx,'Adapter read-through zone',px+(adapterStart+nPos)/2*bw*0.5+px*0.5+200,py+14,11,COLORS.gd,'center','700');
    _label(ctx,'(short inserts)',px+(adapterStart+nPos)/2*bw*0.5+px*0.5+200,py+30,9,COLORS.ink4,'center','500');
  }

  // Highlight active card
  for(let i=0;i<3;i++){
    const el=document.getElementById('qual-card-'+i);if(!el)continue;
    el.style.opacity=i<=illuStep?'1':'.35';
    el.style.transform=i===illuStep?'scale(1.02)':'scale(1)';
    el.style.boxShadow=i===illuStep?'0 4px 6px rgba(15,23,42,.04),0 2px 12px rgba(15,23,42,.06)':'0 1px 2px rgba(15,23,42,.04),0 1px 3px rgba(15,23,42,.06)';
  }
}

/* ═══════════════════════════════════════════════════════════
   11. HMMER-CANVAS — Multiple alignment → profile HMM → query
   ═══════════════════════════════════════════════════════════ */

/* ── HMMER/BLAST concept — 8-step pedagogical animation ── */
const hmHeaders=[
  'Step 1: BLAST finds seed words in the query',
  'Step 2: BLAST extends seeds into a full alignment',
  'Step 3: The problem — divergent sequences escape BLAST',
  'Step 4: Solution — align the family to see patterns',
  'Step 5: Build a Profile HMM from the alignment',
  'Step 6: The HMM has Match, Insert, and Delete states',
  'Step 7: What each state "expects"',
  'Step 8: Viterbi finds the best path through the model',
  'Step 9: Score a new query through the model',
];
const hmCanvasHeaders=[
  'BLAST — break query into seed words',
  'BLAST — extend seed match and score',
  'Why BLAST misses remote homologs',
  'Multiple sequence alignment of a protein family',
  'From alignment columns to HMM states',
  'Profile HMM architecture — M / I / D states',
  'Conserved vs variable positions',
  'Viterbi algorithm — optimal path through the HMM',
  'Scoring a query through the profile HMM',
];
/* card 0 = BLAST (steps 0-2), card 1 = HMM (steps 3-7), card 2 = comparison (step 8) */
const hmCardMap=[0,0,0,1,1,1,1,1,2];

function hmHighlight(step){
  const active=hmCardMap[Math.min(step,8)];
  for(let i=0;i<3;i++){
    const el=document.getElementById('hm-card-'+i);if(!el)continue;
    el.style.opacity=i===active?'1':i<active?'0.5':'0.35';
    el.style.transform=i===active?'scale(1.02)':'scale(1)';
    el.style.boxShadow=i===active?'0 4px 6px rgba(15,23,42,.04),0 2px 12px rgba(15,23,42,.06)':'0 1px 2px rgba(15,23,42,.04),0 1px 3px rgba(15,23,42,.06)';
  }
  const h=document.getElementById('hm-header');
  if(h) h.textContent=hmHeaders[Math.min(step,8)];
  const ch=document.getElementById('hm-canvas-header');
  if(ch) ch.textContent=hmCanvasHeaders[Math.min(step,8)];
}

function drawHmmerCanvas(step){
  step=step||0;
  const ctx=_c('hmmer-canvas');if(!ctx)return;
  ctx.clearRect(0,0,800,440);
  [drawHmSeed,drawHmExtend,drawHmProblem,drawHmMsa,drawHmBuild,drawHmArchitecture,drawHmExpect,drawHmViterbi,drawHmScoreCompare][Math.min(step,8)](ctx);
}

/* ══════════════════════════════════════════════════
   7 DRAWING FUNCTIONS — one idea per step
   ══════════════════════════════════════════════════ */

/* ── Step 0: BLAST — find seed words ── */
function drawHmSeed(ctx){
  const cx=400, cW=56, cH=44;
  const query='MKTVVIG';
  const qW=query.length*cW, qX=cx-qW/2, qY=115;

  _label(ctx,'Your unknown protein',cx,85,16,COLORS.gb,'center','700');
  _label(ctx,'You want to know: what is this protein?',cx,107,12,COLORS.ink3,'center','500');

  for(let i=0;i<query.length;i++){
    const x=qX+i*cW, inSeed=i>=2&&i<=4;
    ctx.fillStyle=inSeed?COLORS.gb+'18':'#f8fafc';
    ctx.fillRect(x,qY,cW-3,cH-3);
    ctx.strokeStyle=inSeed?COLORS.gb:COLORS.border;ctx.lineWidth=inSeed?2:0.8;
    ctx.strokeRect(x,qY,cW-3,cH-3);
    _monoLabel(ctx,query[i],x+cW/2-1,qY+cH/2,20,inSeed?COLORS.gb:COLORS.ink2,'center');
  }

  /* highlight bracket */
  _roundRect(ctx,qX+2*cW-5,qY-5,3*cW+4,cH+7,6,null,COLORS.gb,2.5);
  _label(ctx,'seed word (k = 3)',cx,qY+cH+20,13,COLORS.gb,'center','700');

  /* explanation */
  _label(ctx,'BLAST chops the query into short words',cx,qY+cH+60,14,COLORS.ink2,'center','600');
  _label(ctx,'and searches the database for exact matches to each word.',cx,qY+cH+82,14,COLORS.ink2,'center','600');

  /* visual: three seed words fanning out */
  const seeds=['MKT','KTV','TVV','VVI','VIG'];
  const seedY=qY+cH+120;
  _label(ctx,'All seed words from this query:',cx,seedY,12,COLORS.ink4,'center','500');
  const seedW=70;
  const seedX0=cx-(seeds.length*seedW)/2;
  for(let i=0;i<seeds.length;i++){
    const x=seedX0+i*seedW;
    _roundRect(ctx,x,seedY+14,seedW-6,32,4,i===2?COLORS.gb+'22':'#f8fafc',i===2?COLORS.gb:COLORS.border,i===2?2:1);
    _monoLabel(ctx,seeds[i],x+(seedW-6)/2,seedY+30,14,i===2?COLORS.gb:COLORS.ink3,'center');
  }
  _label(ctx,'Each word is searched against the entire database',cx,seedY+62,12,COLORS.ink4,'center','500');
}

/* ── Step 1: BLAST — extend seed and score ── */
function drawHmExtend(ctx){
  const cx=400, cW=50, cH=38;

  /* seed match found */
  _label(ctx,'A seed word matched a database sequence!',cx,55,14,COLORS.ok,'center','700');

  const qSeq='MKTVVIG', dbSeq='QRTVVIG';
  const qW=qSeq.length*cW, qX=cx-qW/2;

  /* Query row */
  const qY=85;
  _label(ctx,'Query',qX-12,qY+cH/2,12,COLORS.gb,'right','700');
  for(let i=0;i<qSeq.length;i++){
    const x=qX+i*cW, inSeed=i>=2&&i<=4;
    ctx.fillStyle=inSeed?COLORS.gb+'15':'#f8fafc';
    ctx.fillRect(x,qY,cW-3,cH-3);
    ctx.strokeStyle=inSeed?COLORS.gb:COLORS.border;ctx.lineWidth=1;
    ctx.strokeRect(x,qY,cW-3,cH-3);
    _monoLabel(ctx,qSeq[i],x+cW/2-1,qY+cH/2,18,inSeed?COLORS.gb:COLORS.ink2,'center');
  }

  /* Database row */
  const dbY=qY+cH+10;
  _label(ctx,'Database hit',qX-12,dbY+cH/2,12,COLORS.ok,'right','700');
  for(let i=0;i<dbSeq.length;i++){
    const x=qX+i*cW, inSeed=i>=1&&i<=3;
    ctx.fillStyle=inSeed?COLORS.ok+'15':'#f0fdf4';
    ctx.fillRect(x,dbY,cW-3,cH-3);
    ctx.strokeStyle=inSeed?COLORS.ok:COLORS.border;ctx.lineWidth=1;
    ctx.strokeRect(x,dbY,cW-3,cH-3);
    _monoLabel(ctx,dbSeq[i],x+cW/2-1,dbY+cH/2,18,inSeed?COLORS.ok:COLORS.ink3,'center');
  }

  /* Arrow: extend */
  const a1=dbY+cH+18;
  _arrow(ctx,cx,a1,cx,a1+28,COLORS.ok,2);
  _label(ctx,'Extend alignment in both directions',cx+16,a1+14,12,COLORS.ok,'left','600');

  /* HSP */
  const hY=a1+40;
  _label(ctx,'HSP (High-Scoring Segment Pair)',cx,hY,13,COLORS.ink2,'center','700');
  const hpY=hY+16;
  for(let i=0;i<qSeq.length;i++){
    const x=qX+i*cW, match=qSeq[i]===dbSeq[i];
    ctx.fillStyle=match?COLORS.ok+'12':'#fef2f2';
    ctx.fillRect(x,hpY,cW-3,cH-3);ctx.strokeStyle=COLORS.border;ctx.lineWidth=0.8;ctx.strokeRect(x,hpY,cW-3,cH-3);
    _monoLabel(ctx,qSeq[i],x+cW/2-1,hpY+cH/2,18,match?COLORS.ok:COLORS.bad,'center');
    _monoLabel(ctx,match?'|':'x',x+cW/2-1,hpY+cH+2,14,match?COLORS.ok+'88':COLORS.bad+'77','center');
    ctx.fillStyle=match?COLORS.ok+'12':'#fef2f2';
    ctx.fillRect(x,hpY+cH+12,cW-3,cH-3);ctx.strokeStyle=COLORS.border;ctx.lineWidth=0.8;ctx.strokeRect(x,hpY+cH+12,cW-3,cH-3);
    _monoLabel(ctx,dbSeq[i],x+cW/2-1,hpY+cH+12+cH/2,18,match?COLORS.ok:COLORS.bad,'center');
  }

  /* Score */
  const sY=hpY+2*cH+32;
  _roundRect(ctx,cx-170,sY,340,48,10,'#dcfce7',COLORS.ok,2);
  _label(ctx,'Score: 89 bits    E-value: 3.2e-21',cx,sY+18,15,COLORS.ok,'center','700');
  _label(ctx,'Lower E-value = more significant hit',cx,sY+36,11,COLORS.ink4,'center','500');
}

/* ── Step 2: The problem — divergent sequences escape BLAST ── */
function drawHmProblem(ctx){
  const cx=400, cW=56, cH=44;

  _label(ctx,'What if the family member is very different?',cx,49,16,COLORS.bad,'center','700');

  const qSeq='MKTVVIG', divSeq='LRSWFAG';
  const qW=qSeq.length*cW, qX=cx-qW/2;

  /* Query */
  const qY=85;
  _label(ctx,'Query',qX-12,qY+cH/2,13,COLORS.gb,'right','700');
  for(let i=0;i<qSeq.length;i++){
    const x=qX+i*cW;
    ctx.fillStyle='#f8fafc';ctx.fillRect(x,qY,cW-3,cH-3);
    ctx.strokeStyle=COLORS.border;ctx.lineWidth=1;ctx.strokeRect(x,qY,cW-3,cH-3);
    _monoLabel(ctx,qSeq[i],x+cW/2-1,qY+cH/2,20,COLORS.ink2,'center');
  }

  /* Divergent database sequence */
  const dbY=qY+cH+20;
  _label(ctx,'Distant relative',qX-12,dbY+cH/2,13,COLORS.ink3,'right','700');
  for(let i=0;i<divSeq.length;i++){
    const x=qX+i*cW;
    ctx.fillStyle='#fef2f2';ctx.fillRect(x,dbY,cW-3,cH-3);
    ctx.strokeStyle=COLORS.bad+'66';ctx.lineWidth=1;ctx.strokeRect(x,dbY,cW-3,cH-3);
    _monoLabel(ctx,divSeq[i],x+cW/2-1,dbY+cH/2,20,COLORS.bad,'center');
  }

  /* No seed match indicator */
  const midY=dbY+cH+30;
  _label(ctx,'No 3-letter word matches anywhere!',cx,midY,14,COLORS.bad,'center','700');

  /* Big X */
  const xY=midY+20;
  ctx.save();ctx.font='700 64px Inter,system-ui';ctx.fillStyle=COLORS.bad+'33';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText('✗',cx,xY+40);ctx.restore();

  _label(ctx,'BLAST cannot even start — no seed = no search',cx,xY+86,15,COLORS.bad,'center','700');

  /* Bottom insight */
  _roundRect(ctx,cx-260,xY+110,520,44,10,COLORS.bad+'08',COLORS.bad+'44',1.5);
  _label(ctx,'This protein IS a family member, but BLAST will never find it.',cx,xY+132,13,COLORS.bad,'center','600');
}

/* ── Step 3: MSA reveals conservation patterns ── */
function drawHmMsa(ctx){
  const cx=400;

  _label(ctx,'Solution: align known family members to find patterns',cx,50,15,COLORS.gc,'center','700');

  const seqs=[
    ['M','K','T','-','V','G'],
    ['M','K','T','A','V','G'],
    ['M','R','T','-','I','G'],
    ['M','K','S','-','V','G'],
  ];
  const nC=6, cW=60, cH=48;
  const msaX=cx-nC*cW/2, msaY=86;

  /* Column labels */
  const colLabels=['conserved','variable','variable','gaps','variable','conserved'];
  const colCons=[true,false,false,false,false,true];

  for(let r=0;r<4;r++){
    _label(ctx,'Seq '+(r+1),msaX-12,msaY+r*cH+cH/2,11,COLORS.ink4,'right','500');
    for(let c=0;c<nC;c++){
      const x=msaX+c*cW, y=msaY+r*cH;
      const cons=colCons[c];
      ctx.fillStyle=cons?COLORS.gc+'22':'#f8fafc';
      ctx.fillRect(x,y,cW-4,cH-4);
      ctx.strokeStyle=cons?COLORS.gc+'66':COLORS.border;ctx.lineWidth=1;
      ctx.strokeRect(x,y,cW-4,cH-4);
      _monoLabel(ctx,seqs[r][c],x+cW/2-2,y+cH/2,22,cons?COLORS.gc:COLORS.ink2,'center');
    }
  }

  /* Column labels below */
  const labY=msaY+4*cH+14;
  for(let c=0;c<nC;c++){
    const x=msaX+c*cW+cW/2-2;
    const col=colCons[c]?COLORS.gc:c===3?COLORS.gd:COLORS.gb;
    _label(ctx,colLabels[c],x,labY,11,col,'center','600');
  }

  /* Explanation */
  const eY=labY+40;
  _roundRect(ctx,cx-300,eY,600,70,10,COLORS.gc+'08',COLORS.gc+'33',1.5);
  _label(ctx,'Some positions always have the same amino acid (conserved)',cx,eY+20,13,COLORS.gc,'center','600');
  _label(ctx,'Other positions vary between family members',cx,eY+40,13,COLORS.gb,'center','600');
  _label(ctx,'This pattern is the "fingerprint" of the family',cx,eY+58,12,COLORS.ink3,'center','500');
}

/* ── Shared: two-phase pipeline banner ── */
function _hmPipeline(ctx,activePhase,queryStr){
  /* activePhase: 1 = TRAIN highlighted, 2 = SEARCH highlighted
     queryStr: optional letters shown in SEARCH box (default 'MKTVVIG') */
  const pipY=4, pipH=38;
  const p1x=40, p1w=310, p2x=p1x+p1w+38, p2w=380;
  const t1Active=activePhase===1, t2Active=activePhase===2;

  /* Phase 1: TRAIN */
  if(t1Active){
    _roundRect(ctx,p1x,pipY,p1w,pipH,8,COLORS.gc+'15',COLORS.gc,2);
  } else {
    ctx.save();ctx.setLineDash([5,4]);
    _roundRect(ctx,p1x,pipY,p1w,pipH,8,COLORS.gc+'08',COLORS.gc+'33',1.5);
    ctx.restore();
  }
  _label(ctx,'① TRAIN',p1x+10,pipY+pipH/2,13,t1Active?COLORS.gc:COLORS.gc+'88','left','800');
  const miX=p1x+98, miY=pipY+8;
  for(let r=0;r<3;r++){
    for(let c=0;c<4;c++){
      ctx.fillStyle=COLORS.gc+(t1Active?(r===0?'55':'22'):'11');
      ctx.fillRect(miX+c*14,miY+r*8,12,6);
    }
  }
  _label(ctx,'→ model',miX+70,pipY+pipH/2,12,t1Active?COLORS.gc:COLORS.gc+'66','left','600');

  /* Arrow between phases */
  _arrow(ctx,p1x+p1w+8,pipY+pipH/2,p1x+p1w+30,pipY+pipH/2,COLORS.ink4+'66',1.5);

  /* Phase 2: SEARCH */
  if(t2Active){
    _roundRect(ctx,p2x,pipY,p2w,pipH,8,COLORS.gb+'15',COLORS.gb,2);
  } else {
    ctx.save();ctx.setLineDash([5,4]);
    _roundRect(ctx,p2x,pipY,p2w,pipH,8,COLORS.gb+'08',COLORS.gb+'33',1.5);
    ctx.restore();
  }
  _label(ctx,'② SEARCH',p2x+10,pipY+pipH/2,13,t2Active?COLORS.gb:COLORS.gb+'88','left','800');
  const qLetters=queryStr||'MKTVVIG', qlX=p2x+108;
  for(let i=0;i<qLetters.length;i++){
    _monoLabel(ctx,qLetters[i],qlX+i*18,pipY+pipH/2,12,t2Active?COLORS.gb:COLORS.gb+'55','center');
  }
  _label(ctx,'→ score',qlX+qLetters.length*18+8,pipY+pipH/2,12,t2Active?COLORS.gb:COLORS.gb+'66','left','600');

  /* "you are here" indicator */
  const hereX=t1Active?p1x+p1w/2:p2x+p2w/2;
  const hereCol=t1Active?COLORS.gc:COLORS.gb;
  _label(ctx,'▼ we are here',hereX,pipY+pipH+12,9,hereCol,'center','700');

  if(t1Active){
    /* checkmark on TRAIN, coming-soon on SEARCH */
  } else {
    /* checkmark on TRAIN (done) */
    _label(ctx,'✓',p1x+p1w-16,pipY+pipH/2,14,COLORS.gc+'88','center','700');
  }
}

/* ── Step 4: Build an HMM from the alignment ── */
function drawHmBuild(ctx){
  const cx=400;

  /* ═══════════════════════════════════════════════════════════════
     TOP: two-phase pipeline — TRAIN active
     ═══════════════════════════════════════════════════════════════ */
  _hmPipeline(ctx,1);

  /* ═══════════════════════════════════════════════════════════════
     MAIN: MSA → column-to-state mapping → bar charts
     ═══════════════════════════════════════════════════════════════ */
  const msaTopY=72;

  /* MSA grid */
  const seqs=[
    ['M','K','T','V','G'],
    ['M','K','T','V','G'],
    ['M','R','T','I','G'],
    ['M','K','S','V','G'],
  ];
  const nC=5, cW=50, cH=28;
  const msaX=cx-(nC*cW)/2, msaY=msaTopY;
  const colColors=[COLORS.gc,COLORS.gb,'#8b5cf6','#0ea5e9',COLORS.gc];

  /* "Known family members" label left of MSA */
  ctx.save();ctx.translate(msaX-18,msaY+4*cH/2);ctx.rotate(-Math.PI/2);
  ctx.font='600 10px Inter,system-ui';ctx.fillStyle=COLORS.ink4;ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText('Known family members',0,0);ctx.restore();

  for(let c=0;c<nC;c++){
    ctx.fillStyle=colColors[c]+'0a';
    ctx.fillRect(msaX+c*cW,msaY,cW-2,4*cH);
  }
  for(let r=0;r<4;r++){
    for(let c=0;c<nC;c++){
      const x=msaX+c*cW, y=msaY+r*cH;
      ctx.fillStyle=colColors[c]+'15';
      ctx.fillRect(x,y,cW-2,cH-2);
      ctx.strokeStyle=colColors[c]+'55';ctx.lineWidth=1;
      ctx.strokeRect(x,y,cW-2,cH-2);
      _monoLabel(ctx,seqs[r][c],x+cW/2-1,y+cH/2,14,colColors[c],'center');
    }
  }

  /* Column → state arrows */
  const msaBtm=msaY+4*cH;
  const stY=msaBtm+66;
  _label(ctx,'Each column → one state',cx,msaBtm+14,11,COLORS.ink3,'center','600');
  for(let c=0;c<nC;c++){
    const x=msaX+c*cW+cW/2-1;
    _arrow(ctx,x,msaBtm+24,x,stY-18,colColors[c],1.8);
  }

  /* M states with dominant AA */
  const sR=15;
  const domAA=['M','K','T','V','G'];
  for(let i=0;i<nC;i++){
    const x=msaX+i*cW+cW/2-1;
    _roundRect(ctx,x-sR,stY-sR,sR*2,sR*2,5,colColors[i]+'22',colColors[i],2);
    _label(ctx,'M'+(i+1),x,stY-3,8,colColors[i],'center','700');
    _monoLabel(ctx,domAA[i],x,stY+9,10,colColors[i],'center');
    if(i<nC-1){
      const nx=msaX+(i+1)*cW+cW/2-1;
      _arrow(ctx,x+sR+2,stY,nx-sR-2,stY,COLORS.gc+'44',1.2);
    }
  }

  /* Mini bar charts below each state */
  const barY=stY+sR+6;
  const barData=[
    [{aa:'M',f:1.0}],
    [{aa:'K',f:0.75},{aa:'R',f:0.25}],
    [{aa:'T',f:0.75},{aa:'S',f:0.25}],
    [{aa:'V',f:0.75},{aa:'I',f:0.25}],
    [{aa:'G',f:1.0}],
  ];
  const barW=34, barH=52;

  for(let i=0;i<nC;i++){
    const bx=msaX+i*cW+cW/2-1-barW/2;
    const bd=barData[i];
    _roundRect(ctx,bx,barY,barW,barH,3,'#f8fafc',COLORS.border,0.5);
    let segY=barY+barH;
    for(const seg of bd){
      const sh=Math.max(seg.f*barH,6);
      segY-=sh;
      ctx.fillStyle=colColors[i]+(seg.aa==='other'?'15':'33');
      ctx.fillRect(bx+1,segY,barW-2,sh-1);
      if(sh>10) _monoLabel(ctx,seg.aa==='other'?'…':seg.aa,bx+barW/2,segY+sh/2,seg.aa==='other'?8:9,colColors[i],'center');
    }
    const topPct=Math.round(bd[0].f*100)+'%';
    _label(ctx,topPct,bx+barW/2,barY+barH+10,9,colColors[i],'center','700');
  }

  /* ═══════════════════════════════════════════════════════════════
     RIGHT PANEL: what the model learns
     ═══════════════════════════════════════════════════════════════ */
  const exX=msaX+nC*cW+22;
  const exW=800-exX-8;

  _label(ctx,'What the model learns:',exX+exW/2,msaY+2,12,COLORS.gc,'center','700');

  /* Conserved */
  _roundRect(ctx,exX,msaY+14,exW,54,8,COLORS.gc+'0a',COLORS.gc+'33',1);
  _label(ctx,'Conserved (M1, M5)',exX+exW/2,msaY+28,10,COLORS.gc,'center','700');
  _label(ctx,'One AA dominates → model is',exX+exW/2,msaY+42,9,COLORS.ink3,'center','500');
  _label(ctx,'very strict at this position',exX+exW/2,msaY+54,9,COLORS.gc,'center','600');

  /* Variable */
  _roundRect(ctx,exX,msaY+76,exW,54,8,COLORS.gb+'0a',COLORS.gb+'33',1);
  _label(ctx,'Variable (M2, M3, M4)',exX+exW/2,msaY+90,10,COLORS.gb,'center','700');
  _label(ctx,'Several AAs seen → model is',exX+exW/2,msaY+104,9,COLORS.ink3,'center','500');
  _label(ctx,'flexible at this position',exX+exW/2,msaY+116,9,COLORS.gb,'center','600');

  /* Fingerprint summary */
  _roundRect(ctx,exX,msaY+138,exW,42,8,COLORS.ink+'06',COLORS.ink4+'44',1);
  _label(ctx,'The bars are the "fingerprint"',exX+exW/2,msaY+152,10,COLORS.ink2,'center','600');
  _label(ctx,'of this protein family',exX+exW/2,msaY+166,10,COLORS.ink2,'center','600');

  /* Bottom takeaway */
  _roundRect(ctx,cx-280,barY+barH+22,560,32,8,COLORS.gc+'0c',COLORS.gc+'33',1);
  _label(ctx,'hmmbuild reads the alignment and outputs a Profile HMM file (.hmm)',cx,barY+barH+38,11,COLORS.gc,'center','600');
}

/* ── Step 5: HMM architecture — Match / Insert / Delete states ── */
function drawHmArchitecture(ctx){
  const cx=400;

  _label(ctx,'Profile HMM: three types of state',cx,38,16,COLORS.gc,'center','700');
  _label(ctx,'Same model we just built — now showing Insert and Delete states too',cx,58,11,COLORS.ink4,'center','500');

  /* ── Main chain: 5 M states matching the family alignment ── */
  const nSt=5, sR=18, gap=110;
  const stX0=cx-((nSt-1)*gap)/2, mY=188;
  /* Dominant AAs from the family alignment (columns from the MSA) */
  const domAA=['M','K','T','V','G'];
  const domCons=[true,false,false,false,true]; /* conserved columns */

  /* Begin node */
  const bX=stX0-56;
  _roundRect(ctx,bX-14,mY-14,28,28,14,COLORS.ink4+'22',COLORS.ink4,1.5);
  _label(ctx,'B',bX,mY,10,COLORS.ink4,'center','700');
  _arrow(ctx,bX+16,mY,stX0-sR-4,mY,COLORS.ink4+'66',1.5);

  for(let i=0;i<nSt;i++){
    const x=stX0+i*gap;

    /* Match state (square) */
    _roundRect(ctx,x-sR,mY-sR,sR*2,sR*2,5,COLORS.gc+'22',COLORS.gc,2.5);
    _label(ctx,'M'+(i+1),x,mY-4,11,COLORS.gc,'center','700');
    /* Dominant AA from family alignment below the state label */
    _monoLabel(ctx,domAA[i],x,mY+12,12,domCons[i]?COLORS.gc:COLORS.gb,'center');

    /* Arrow to next M */
    if(i<nSt-1) _arrow(ctx,x+sR+4,mY,x+gap-sR-4,mY,COLORS.gc+'66',1.8);

    /* Insert state (circle above) */
    const iY=mY-68, iR=13;
    ctx.beginPath();ctx.arc(x,iY,iR,0,Math.PI*2);
    ctx.fillStyle=COLORS.gb+'22';ctx.fill();
    ctx.strokeStyle=COLORS.gb;ctx.lineWidth=1.5;ctx.stroke();
    _label(ctx,'I'+(i+1),x,iY,9,COLORS.gb,'center','700');

    /* Arrow M→I (left side, going up) */
    _arrow(ctx,x-10,mY-sR-3,x-10,iY+iR+3,COLORS.gb,1.2);
    /* Arrow I→M (right side, going down) */
    _arrow(ctx,x+10,iY+iR+3,x+10,mY-sR-3,COLORS.gb,1.2);

    /* Self-loop indicator — arrowhead centred on circle stroke at top */
    const ahX=x-3, ahY=iY-iR;
    ctx.beginPath();
    ctx.moveTo(ahX+6, ahY);           /* tip pointing right */
    ctx.lineTo(ahX-3, ahY-4);
    ctx.lineTo(ahX-3, ahY+4);
    ctx.closePath();ctx.fillStyle=COLORS.gb;ctx.fill();

    /* Delete state (diamond below, between this M and next M) */
    if(i<nSt-1){
      const dY=mY+68, dR=12;
      const dX=x+gap/2;
      ctx.save();ctx.translate(dX,dY);ctx.rotate(Math.PI/4);
      ctx.fillStyle=COLORS.gd+'22';ctx.fillRect(-dR,-dR,dR*2,dR*2);
      ctx.strokeStyle=COLORS.gd;ctx.lineWidth=1.5;ctx.strokeRect(-dR,-dR,dR*2,dR*2);
      ctx.restore();
      _label(ctx,'D'+(i+2),dX,dY,9,COLORS.gd,'center','700');

      /* M→D arrow */
      _arrow(ctx,x+sR/2+3,mY+sR+3,dX-dR-1,dY-dR-1,COLORS.gd+'aa',1.3);
      /* D→next M arrow */
      const nx=stX0+(i+1)*gap;
      _arrow(ctx,dX+dR+1,dY-dR-1,nx-sR/2-3,mY+sR+3,COLORS.gd+'aa',1.3);
    }
  }

  /* End node */
  const eX=stX0+(nSt-1)*gap+56;
  _roundRect(ctx,eX-14,mY-14,28,28,14,COLORS.ink4+'22',COLORS.ink4,1.5);
  _label(ctx,'E',eX,mY,10,COLORS.ink4,'center','700');
  _arrow(ctx,stX0+(nSt-1)*gap+sR+4,mY,eX-16,mY,COLORS.ink4+'66',1.5);

  /* ── Legend below ── */
  const lY=mY+110;
  const items=[
    {col:COLORS.gc, label:'Match (M)', desc:'Emit the expected amino acid'},
    {col:COLORS.gb, label:'Insert (I)', desc:'Extra AA in the query'},
    {col:COLORS.gd, label:'Delete (D)', desc:'Skip a model position'},
  ];
  const lW=220, lX0=cx-(items.length*lW)/2;
  for(let i=0;i<items.length;i++){
    const x=lX0+i*lW+lW/2;
    _roundRect(ctx,lX0+i*lW+10,lY,lW-20,70,8,items[i].col+'0a',items[i].col+'44',1.5);
    _label(ctx,items[i].label,x,lY+20,13,items[i].col,'center','700');
    _label(ctx,items[i].desc,x,lY+42,10,COLORS.ink3,'center','500');
    _label(ctx,i===0?'(most common)':i===1?'(handles insertions)':'(handles deletions)',x,lY+58,9,COLORS.ink4,'center','500');
  }
}

/* ── Step 6: Viterbi algorithm — best path through the HMM ── */
function drawHmViterbi(ctx){
  const cx=400;

  /* ═══════════════════════════════════════════════════════════════
     TOP: two-phase pipeline — SEARCH active
     ═══════════════════════════════════════════════════════════════ */
  _hmPipeline(ctx,2,'MKVG');

  /* ── Left: 3-step search process ── */
  const procX=30, procW=170, procY=72;
  _label(ctx,'How hmmsearch works:',procX+procW/2,procY,11,COLORS.gb,'center','700');

  const steps=[
    {n:'①',t:'Feed query into model',col:COLORS.gb},
    {n:'②',t:'Try every possible path',col:COLORS.gc},
    {n:'③',t:'Keep the highest-scoring',col:'#f59e0b'},
  ];
  for(let i=0;i<steps.length;i++){
    const y=procY+18+i*36;
    const s=steps[i];
    _roundRect(ctx,procX,y,procW,30,6,s.col+'0c',s.col+'33',1);
    _label(ctx,s.n,procX+16,y+15,11,s.col,'center','700');
    _label(ctx,s.t,procX+30,y+15,10,s.col,'left','600');
    if(i<2) _arrow(ctx,procX+procW/2,y+30,procX+procW/2,y+36,s.col+'44',1);
  }

  /* ── Right: Viterbi path through the SAME 5-state model ── */
  const modelX=220;

  /* Query sequence — 4 AAs against 5 model states → one deletion */
  const query=['M','K','V','G'];
  const qCW=44, qY=72;
  const qX0=modelX+200;
  _label(ctx,'Query:',qX0-10,qY+14,11,COLORS.gb,'right','700');
  for(let i=0;i<query.length;i++){
    const x=qX0+i*qCW;
    _roundRect(ctx,x,qY,qCW-4,28,4,COLORS.gb+'15',COLORS.gb,1.5);
    _monoLabel(ctx,query[i],x+qCW/2-2,qY+14,15,COLORS.gb,'center');
  }

  /* HMM states — 5 positions matching the build step (M,K,T,V,G) */
  const nSt=5, sR=14, gap=88;
  const stX0=modelX+60, mY=158;
  const domAA=['M','K','T','V','G'];

  /* B node */
  const bX=stX0-42;
  ctx.beginPath();ctx.arc(bX,mY,9,0,Math.PI*2);
  ctx.fillStyle=COLORS.ink4+'18';ctx.fill();
  ctx.strokeStyle=COLORS.ink4+'66';ctx.lineWidth=1;ctx.stroke();
  _label(ctx,'B',bX,mY,8,COLORS.ink4,'center','700');

  /* E node */
  const eX=stX0+(nSt-1)*gap+42;
  ctx.beginPath();ctx.arc(eX,mY,9,0,Math.PI*2);
  ctx.fillStyle=COLORS.ink4+'18';ctx.fill();
  ctx.strokeStyle=COLORS.ink4+'66';ctx.lineWidth=1;ctx.stroke();
  _label(ctx,'E',eX,mY,8,COLORS.ink4,'center','700');

  /* Path: B→M1→M2→D3→M4→M5→E  (skip position 3 = T) */
  const onPath=[true,true,false,true,true];
  const dOnIdx=1; /* diamond index 1 = D3 (between M2 and M3) */

  for(let i=0;i<nSt;i++){
    const x=stX0+i*gap;
    const isOn=onPath[i];

    _roundRect(ctx,x-sR,mY-sR,sR*2,sR*2,4,
      isOn?COLORS.gc+'33':COLORS.gc+'0c',
      isOn?COLORS.gc:COLORS.gc+'44',
      isOn?2.5:1);
    _label(ctx,'M'+(i+1),x,mY-3,8,isOn?COLORS.gc:COLORS.gc+'55','center','700');
    _monoLabel(ctx,domAA[i],x,mY+9,9,isOn?COLORS.gc:COLORS.gc+'44','center');

    if(i<nSt-1){
      ctx.setLineDash([3,3]);
      _arrow(ctx,x+sR+3,mY,x+gap-sR-3,mY,COLORS.gc+'22',1);
      ctx.setLineDash([]);
    }

    /* Insert states (faded) */
    const iY=mY-42;
    ctx.beginPath();ctx.arc(x,iY,7,0,Math.PI*2);
    ctx.fillStyle=COLORS.gb+'0c';ctx.fill();
    ctx.strokeStyle=COLORS.gb+'33';ctx.lineWidth=1;ctx.stroke();
    _label(ctx,'I'+(i+1),x,iY,6,COLORS.gb+'44','center','700');

    /* Delete diamonds */
    if(i<nSt-1){
      const dY=mY+42, dR=9, dX=x+gap/2;
      const dIsOn=(i===dOnIdx);
      ctx.save();ctx.translate(dX,dY);ctx.rotate(Math.PI/4);
      ctx.fillStyle=dIsOn?COLORS.gd+'33':COLORS.gd+'0c';
      ctx.fillRect(-dR,-dR,dR*2,dR*2);
      ctx.strokeStyle=dIsOn?COLORS.gd:COLORS.gd+'33';
      ctx.lineWidth=dIsOn?2:1;
      ctx.strokeRect(-dR,-dR,dR*2,dR*2);
      ctx.restore();
      _label(ctx,'D'+(i+2),dX,dY,7,dIsOn?COLORS.gd:COLORS.gd+'44','center','700');
    }
  }

  /* Viterbi path (bold amber arrows) */
  const pCol='#f59e0b';
  _arrow(ctx,bX+11,mY,stX0-sR-3,mY,pCol,2.5);
  const m1x=stX0, m2x=stX0+gap;
  _arrow(ctx,m1x+sR+3,mY,m2x-sR-3,mY,pCol,2.5);
  /* M2 → D3 (diagonal down to diamond between M2 and M3) */
  const d3x=m2x+gap/2, d3y=mY+42;
  _arrow(ctx,m2x+sR/2+3,mY+sR+2,d3x-7,d3y-7,pCol,2.5);
  /* D3 → M4 (diagonal up, skipping M3) */
  const m4x=stX0+3*gap;
  _arrow(ctx,d3x+7,d3y-7,m4x-sR/2-3,mY+sR+2,pCol,2.5);
  /* M4 → M5 */
  const m5x=stX0+4*gap;
  _arrow(ctx,m4x+sR+3,mY,m5x-sR-3,mY,pCol,2.5);
  /* M5 → E */
  _arrow(ctx,m5x+sR+3,mY,eX-11,mY,pCol,2.5);

  _label(ctx,'Best path:  B → M1 → M2 → D3 → M4 → M5 → E',cx+80,mY+68,11,pCol,'center','700');

  /* ── Resulting alignment ── */
  const alY=mY+86;
  _label(ctx,'Resulting alignment:',cx+80,alY,12,COLORS.gc,'center','700');

  const alData=[
    {pos:'1',query:'M', model:'M', type:'match'},
    {pos:'2',query:'K', model:'K', type:'match'},
    {pos:'3',query:'—', model:'T', type:'delete'},
    {pos:'4',query:'V', model:'V', type:'match'},
    {pos:'5',query:'G', model:'G', type:'match'},
  ];
  const aCW=66, aX0=cx+80-(alData.length*aCW)/2;

  _label(ctx,'Position',aX0-12,alY+20,8,COLORS.ink4,'right','600');
  _label(ctx,'Query',aX0-12,alY+38,8,COLORS.gb,'right','600');
  _label(ctx,'Model',aX0-12,alY+56,8,COLORS.gc,'right','600');

  for(let i=0;i<alData.length;i++){
    const d=alData[i], x=aX0+i*aCW;
    const isDel=d.type==='delete';
    _roundRect(ctx,x,alY+10,aCW-4,52,5,isDel?COLORS.gd+'12':'#f0fdf4',isDel?COLORS.gd:COLORS.gc,1.5);
    _label(ctx,d.pos,x+aCW/2-2,alY+22,8,COLORS.ink4,'center','600');
    _monoLabel(ctx,d.query,x+aCW/2-2,alY+38,13,isDel?COLORS.gd:COLORS.gb,'center');
    _monoLabel(ctx,d.model,x+aCW/2-2,alY+54,13,isDel?COLORS.gd:COLORS.gc,'center');
  }

  /* Bottom explanation */
  const exY=alY+70;
  _roundRect(ctx,procX,exY,770,44,8,COLORS.gc+'0c',COLORS.gc+'33',1);
  _label(ctx,'Position 3 (T): query has no AA here → model skips it via delete state D3',cx,exY+14,11,COLORS.gd,'center','600');
  _label(ctx,'Viterbi picks the single path that maximises the total log-odds score',cx,exY+32,11,COLORS.ink3,'center','500');
}

/* ── Step 6: What each state "expects" ── */
function drawHmExpect(ctx){
  const cx=400;

  _label(ctx,'What does each state "expect"?',cx,32,16,COLORS.gc,'center','700');

  /* Conserved callout (left) */
  const boxY=68;
  _roundRect(ctx,30,boxY,350,310,12,COLORS.gc+'08',COLORS.gc+'44',1.5);
  _label(ctx,'Conserved position (M1)',205,boxY+28,14,COLORS.gc,'center','700');

  _label(ctx,'Column 1 in the alignment:',205,boxY+58,12,COLORS.ink3,'center','500');
  const consAAs=['M','M','M','M'];
  const consX=120;
  for(let i=0;i<4;i++){
    _roundRect(ctx,consX+i*46,boxY+72,40,40,4,COLORS.gc+'22',COLORS.gc,1.5);
    _monoLabel(ctx,consAAs[i],consX+i*46+20,boxY+92,20,COLORS.gc,'center');
  }
  _label(ctx,'All 4 sequences have M',205,boxY+126,12,COLORS.ink3,'center','500');

  /* Big M box */
  _label(ctx,'So the model strongly expects M:',205,boxY+156,13,COLORS.gc,'center','600');
  _roundRect(ctx,140,boxY+170,70,70,8,COLORS.gc+'30',COLORS.gc,2.5);
  _monoLabel(ctx,'M',175,boxY+205,36,COLORS.gc,'center');
  _label(ctx,'100%',175,boxY+252,16,COLORS.gc,'center','700');

  _label(ctx,'Always M in this family',205,boxY+282,12,COLORS.ink3,'center','600');

  /* Variable callout (right) */
  _roundRect(ctx,420,boxY,350,310,12,COLORS.gb+'08',COLORS.gb+'44',1.5);
  _label(ctx,'Variable position (M2)',595,boxY+28,14,COLORS.gb,'center','700');

  _label(ctx,'Column 2 in the alignment:',595,boxY+58,12,COLORS.ink3,'center','500');
  const varAAs=['K','K','R','K'];
  const varX=510;
  for(let i=0;i<4;i++){
    _roundRect(ctx,varX+i*46,boxY+72,40,40,4,COLORS.gb+'22',COLORS.gb,1.5);
    _monoLabel(ctx,varAAs[i],varX+i*46+20,boxY+92,20,COLORS.gb,'center');
  }
  _label(ctx,'K appears 3 times, R once',595,boxY+126,12,COLORS.ink3,'center','500');

  /* Proportional boxes */
  _label(ctx,'The model accepts several AAs:',595,boxY+156,13,COLORS.gb,'center','600');
  const vd=[{a:'K',p:'75%',sz:50},{a:'R',p:'25%',sz:38}];
  let vx=460;
  for(const v of vd){
    const vy=boxY+170+(60-v.sz)/2;
    _roundRect(ctx,vx,vy,v.sz,v.sz,5,COLORS.gb+'22',COLORS.gb,1.5);
    _monoLabel(ctx,v.a,vx+v.sz/2,vy+v.sz/2,v.sz>30?22:14,COLORS.gb,'center');
    _label(ctx,v.p,vx+v.sz/2,boxY+240,12,COLORS.gb,'center','600');
    vx+=v.sz+12;
  }

  _label(ctx,'Several AAs are plausible',595,boxY+282,12,COLORS.ink3,'center','600');

  /* Bottom */
  _roundRect(ctx,cx-280,boxY+326,560,36,8,COLORS.gc+'0c',COLORS.gc+'33',1);
  _label(ctx,'This is how the model knows what "fits" at each position',cx,boxY+344,13,COLORS.gc,'center','600');
}

/* ── Step 8: Score the SAME query from Viterbi + BLAST vs HMMER comparison ── */
function drawHmScoreCompare(ctx){
  const cx=400;

  /* ═══════════════════════════════════════════════════════════════
     TOP: two-phase pipeline — SEARCH active (same query as Viterbi)
     ═══════════════════════════════════════════════════════════════ */
  _hmPipeline(ctx,2,'MKVG');

  /* Alignment from Viterbi: 5 positions, query MKVG has deletion at pos 3 */
  const data=[
    {query:'M', model:'M', st:'M1',fit:true, pct:'100%',note:'dominant',  type:'match'},
    {query:'K', model:'K', st:'M2',fit:true, pct:'75%', note:'common',    type:'match'},
    {query:'—', model:'T', st:'D3',fit:null, pct:'—',   note:'deletion',  type:'del'},
    {query:'V', model:'V', st:'M4',fit:true, pct:'75%', note:'common',    type:'match'},
    {query:'G', model:'G', st:'M5',fit:true, pct:'100%',note:'dominant',  type:'match'},
  ];
  const cW=76, cH=68, qY=60;
  const qX=cx-(data.length*cW)/2;

  /* Column headers */
  _label(ctx,'Query',qX-14,qY+16,10,COLORS.gb,'right','700');
  _label(ctx,'Model',qX-14,qY+44,10,COLORS.gc,'right','700');

  for(let i=0;i<data.length;i++){
    const d=data[i], x=qX+i*cW;
    const isDel=d.type==='del';
    const col=isDel?COLORS.gd:COLORS.gc;

    /* Cell background */
    ctx.fillStyle=isDel?COLORS.gd+'10':col+'10';
    ctx.fillRect(x,qY,cW-4,cH);
    ctx.strokeStyle=col+(isDel?'66':'');ctx.lineWidth=isDel?1.5:2;
    if(isDel){ctx.save();ctx.setLineDash([4,3]);}
    ctx.strokeRect(x,qY,cW-4,cH);
    if(isDel){ctx.restore();}

    /* Query AA (top) */
    _monoLabel(ctx,d.query,x+cW/2-2,qY+18,18,isDel?COLORS.gd:COLORS.gb,'center');
    /* Separator line */
    ctx.beginPath();ctx.moveTo(x+6,qY+cH/2);ctx.lineTo(x+cW-10,qY+cH/2);
    ctx.strokeStyle=COLORS.border;ctx.lineWidth=0.5;ctx.setLineDash([]);ctx.stroke();
    /* Model AA (bottom) */
    _monoLabel(ctx,d.model,x+cW/2-2,qY+52,18,isDel?COLORS.gd:COLORS.gc,'center');

    /* State label + score below cell */
    _label(ctx,d.st,x+cW/2-2,qY+cH+14,10,col,'center','600');
    _label(ctx,d.pct,x+cW/2-2,qY+cH+30,13,col,'center','700');
    _label(ctx,d.note,x+cW/2-2,qY+cH+46,10,col,'center','500');
  }

  /* Deletion explanation */
  const delX=qX+2*cW+cW/2-2, delY=qY+cH+62;
  _label(ctx,'↑ gap penalty',delX,delY,9,COLORS.gd,'center','600');

  /* Score */
  const sY=qY+cH+76;
  _roundRect(ctx,cx-200,sY,400,42,10,'#dcfce7',COLORS.ok,2);
  _label(ctx,'Score: 118.7 bits    E-value: 2.4e-31',cx,sY+16,14,COLORS.ok,'center','700');
  _label(ctx,'4 strong matches minus 1 deletion penalty — still a clear hit!',cx,sY+34,11,COLORS.ink4,'center','500');

  /* Comparison table */
  const tY=sY+56;
  _label(ctx,'BLAST vs HMMER',cx,tY,14,COLORS.ink2,'center','700');
  const rows=[
    ['','BLAST','HMMER'],
    ['Searches','Sequence vs sequence','Sequence vs family model'],
    ['Sensitivity','Needs exact seed match','Sums weak matches across positions'],
    ['Best for','Close homologs','Remote / divergent homologs'],
    ['Tools','Diamond, BLAST+','hmmsearch, hmmscan'],
  ];
  const tCW=[130,240,240], tCH=26;
  const tX=cx-(tCW[0]+tCW[1]+tCW[2])/2;
  for(let r=0;r<rows.length;r++){
    for(let c=0;c<3;c++){
      const x=tX+tCW.slice(0,c).reduce((a,b)=>a+b,0);
      const y=tY+16+r*tCH;
      const isHd=r===0;
      ctx.fillStyle=isHd?COLORS.ink+'08':r%2===0?'#f8fafc':'#fff';
      ctx.fillRect(x,y,tCW[c]-2,tCH-2);
      ctx.strokeStyle=COLORS.border;ctx.lineWidth=0.5;ctx.strokeRect(x,y,tCW[c]-2,tCH-2);
      _label(ctx,rows[r][c],x+tCW[c]/2-1,y+tCH/2,isHd?11:10,
        isHd?COLORS.ink2:c===0?COLORS.ink3:c===1?COLORS.gb:COLORS.gc,'center',isHd||c===0?'700':'500');
    }
  }
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
  const sbsHeaders=[
    'Step 1: Fragment & ligate adapters',
    'Step 2: Bind to flow cell',
    'Step 3: Bridge amplification',
    'Step 4: Add fluorescent nucleotides',
    'Step 5: Image clusters & cleave',
    'Step 6: Paired-end reads',
    'Step 7: Full cycle animation'
  ];

  function sbsHighlight(step){
    for(let i=0;i<7;i++){
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

  /* ═══════════════════════════════════════════════════════════
     ERROR BRIDGE — pipeline error propagation visual
     ═══════════════════════════════════════════════════════════ */
  function drawErrorBridge(){
    const ctx=_c('error-bridge-canvas');if(!ctx)return;
    ctx.clearRect(0,0,800,440);

    /* ── Top: 4 pipeline stages ── */
    const stages=[
      {label:'Reads',sub:'Raw sequences',col:COLORS.ok,x:60,icon:'📖'},
      {label:'Assembly',sub:'Contigs',col:COLORS.gb,x:250,icon:'🧩'},
      {label:'Binning',sub:'MAGs',col:COLORS.gd,x:440,icon:'📦'},
      {label:'Annotation',sub:'Biological claims',col:COLORS.gc,x:630,icon:'🏷️'}
    ];
    const bw=130,bh=52,by=10;
    for(let i=0;i<4;i++){
      const s=stages[i];
      _roundRect(ctx,s.x,by,bw,bh,8,s.col+'15',s.col,2);
      _label(ctx,s.label,s.x+bw/2,by+20,14,s.col,'center','700');
      _label(ctx,s.sub,s.x+bw/2,by+40,9,COLORS.ink4,'center','500');
      if(i<3){
        _arrow(ctx,s.x+bw+4,by+bh/2,stages[i+1].x-4,by+bh/2,COLORS.ink4+'88',2);
      }
    }

    /* ── Pipeline label ── */
    _label(ctx,'The metagenomics pipeline',400,by+bh+20,10,COLORS.ink4,'center','500');

    /* ── Error chain 1: quality → annotation ── */
    const c1y=by+bh+48;
    _label(ctx,'Error chain 1: a single bad base call',400,c1y,11,COLORS.bad,'center','700');

    const chain1=[
      {label:'Low-quality\nbase call',col:COLORS.bad,x:40,w:100},
      {label:'False k-mer\nin graph',col:'#dc2626',x:160,w:100},
      {label:'Spurious\ngraph branch',col:COLORS.warn,x:280,w:100},
      {label:'Fragmented\ncontig',col:COLORS.gd,x:400,w:100},
      {label:'Broken\ngene',col:COLORS.gb,x:520,w:100},
      {label:'Missing\nannotation',col:COLORS.gc,x:640,w:110}
    ];
    const c1by=c1y+14;
    for(let i=0;i<chain1.length;i++){
      const c=chain1[i];
      // Gradient fill getting darker as error propagates
      const alpha=Math.min(0.08+i*0.03,0.22);
      const alphaHex=Math.round(alpha*255).toString(16).padStart(2,'0');
      _roundRect(ctx,c.x,c1by,c.w,44,6,COLORS.bad+alphaHex,c.col+'88',1.5);
      const lines=c.label.split('\n');
      for(let l=0;l<lines.length;l++){
        _label(ctx,lines[l],c.x+c.w/2,c1by+16+l*14,9,c.col,'center','600');
      }
      if(i<chain1.length-1){
        _arrow(ctx,c.x+c.w+2,c1by+22,chain1[i+1].x-2,c1by+22,COLORS.bad+'66',1.5);
      }
    }

    /* ── Magnification metaphor ── */
    const my=c1by+62;
    // Small dot on the left growing into big impact on the right
    ctx.save();
    const grad=ctx.createLinearGradient(80,0,720,0);
    grad.addColorStop(0,COLORS.bad+'08');grad.addColorStop(1,COLORS.bad+'25');
    ctx.fillStyle=grad;
    ctx.beginPath();
    ctx.moveTo(80,my+2);ctx.lineTo(720,my-12);ctx.lineTo(720,my+38);ctx.lineTo(80,my+24);ctx.closePath();
    ctx.fill();
    ctx.restore();
    // Small circle left
    ctx.beginPath();ctx.arc(80,my+13,4,0,Math.PI*2);ctx.fillStyle=COLORS.bad+'44';ctx.fill();
    ctx.strokeStyle=COLORS.bad;ctx.lineWidth=1;ctx.stroke();
    // Big circle right
    ctx.beginPath();ctx.arc(720,my+13,14,0,Math.PI*2);ctx.fillStyle=COLORS.bad+'33';ctx.fill();
    ctx.strokeStyle=COLORS.bad;ctx.lineWidth=1.5;ctx.stroke();
    _label(ctx,'Q20 error',80,my+30,8,COLORS.bad,'center','500');
    _label(ctx,'(1 in 100)',80,my+40,7,COLORS.ink4,'center','400');
    _label(ctx,'"Novel enzyme',720,my+36,8,COLORS.bad,'center','600');
    _label(ctx,'in uncultured archaeon"',720,my+46,8,COLORS.bad,'center','600');
    _label(ctx,'Errors amplify: small sequencing noise can become a published biological claim',400,my+14,10,COLORS.ink3,'center','500');

    /* ── Error chain 2: contamination → false function ── */
    const c2y=my+68;
    _label(ctx,'Error chain 2: a contaminant read',400,c2y,11,COLORS.bad,'center','700');

    const chain2=[
      {label:'Contaminant\nread',col:COLORS.bad,x:120,w:110},
      {label:'Wrong\nbin (MAG)',col:COLORS.warn,x:290,w:110},
      {label:'Chimeric\ngenome',col:COLORS.gd,x:460,w:110},
      {label:'False metabolic\ncapability',col:COLORS.gc,x:630,w:120}
    ];
    const c2by=c2y+14;
    for(let i=0;i<chain2.length;i++){
      const c=chain2[i];
      const alpha=Math.min(0.08+i*0.04,0.22);
      const alphaHex=Math.round(alpha*255).toString(16).padStart(2,'0');
      _roundRect(ctx,c.x,c2by,c.w,44,6,COLORS.bad+alphaHex,c.col+'88',1.5);
      const lines=c.label.split('\n');
      for(let l=0;l<lines.length;l++){
        _label(ctx,lines[l],c.x+c.w/2,c2by+16+l*14,9,c.col,'center','600');
      }
      if(i<chain2.length-1){
        _arrow(ctx,c.x+c.w+2,c2by+22,chain2[i+1].x-2,c2by+22,COLORS.bad+'66',1.5);
      }
    }

    /* ── Bottom: what we can control ── */
    const by2=c2by+68;
    _roundRect(ctx,100,by2,600,50,8,COLORS.ok+'0c',COLORS.ok+'44',1.5);
    _label(ctx,'What this lecture is about',400,by2+16,12,COLORS.ok,'center','700');
    _label(ctx,'Quality control, validation, and knowing the limits of your MAGs before making claims',400,by2+36,10,COLORS.ink3,'center','500');
  }

  /* ── Slide change handler ── */
  function go(){
    const i=Reveal.getState().indexh;

    if(i===SID('error-bridge')){setTimeout(()=>drawErrorBridge(),300)}
    if(i===SID('illumina-sbs')){setTimeout(()=>{const f=Reveal.getState().indexf;const s=f>=0?f+1:0;drawSbsCanvas(s);sbsHighlight(s)},300)}
    if(i===SID('illumina-quality')){setTimeout(()=>{const f=Reveal.getState().indexf;drawIlluCanvas(f>=0?f+1:0)},300)}
    if(i===SID('why-not-16s')){setTimeout(()=>{const f=Reveal.getState().indexf;drawTaxCanvas(f>=0?1:0)},300)}
    if(i===SID('gtdb')){setTimeout(()=>{const f=Reveal.getState().indexf;drawGtdbCanvas(f>=0?f+1:0)},300)}
    if(i===SID('gtdb-tk')){setTimeout(()=>{const f=Reveal.getState().indexf;const s=f>=0?f+1:0;drawTkCanvas(s);tkHighlight(s)},300)}
    if(i===SID('gene-prediction')){setTimeout(()=>{const f=Reveal.getState().indexf;const s=f>=0?f+1:0;drawGpCanvas(s);gpHighlight(s)},300)}
    if(i===SID('hmmer-concept')){setTimeout(()=>{const f=Reveal.getState().indexf;const s=f>=0?f+1:0;drawHmmerCanvas(s);hmHighlight(s)},300)}
    if(i===SID('kegg')){setTimeout(()=>{const f=Reveal.getState().indexf;const s=f>=0?f+1:0;drawKeggCanvas(s);keggHighlight(s)},300)}
    if(i===SID('pfam')){setTimeout(()=>{const f=Reveal.getState().indexf;const s=f>=0?f+1:0;drawPfamCanvas(s);pfamHighlight(s)},300)}
    if(i===SID('cazymes')){setTimeout(()=>{const f=Reveal.getState().indexf;const s=f>=0?f+1:0;drawCazyCanvas(s);cazyHighlight(s)},300)}
    if(i===SID('bgcs')){setTimeout(()=>{const f=Reveal.getState().indexf;const s=f>=0?f+1:0;drawBgcCanvas(s);bgcHighlight(s)},300)}
    if(i===SID('bgc-caveats')){setTimeout(()=>drawBgcFragCanvas(),300)}
    if(i===SID('synthesis')){setTimeout(()=>drawSynthCanvas(),300)}
  }

  Reveal.on('slidechanged',go);
  go();

  /* ── Fragment events for stepping slides ── */
  Reveal.on('fragmentshown',e=>{
    const si=Reveal.getState().indexh;
    if(si===SID('gtdb-tk')){
      const idx=parseInt(e.fragment.getAttribute('data-fragment-index'));
      drawTkCanvas(idx+1);tkHighlight(idx+1);
    }
    if(si===SID('gtdb')){
      const idx=parseInt(e.fragment.getAttribute('data-fragment-index'));
      drawGtdbCanvas(idx+1);
    }
    if(si===SID('illumina-sbs')){
      const idx=parseInt(e.fragment.getAttribute('data-fragment-index'));
      drawSbsCanvas(idx+1);sbsHighlight(idx+1);
    }
    if(si===SID('illumina-quality')){
      const idx=parseInt(e.fragment.getAttribute('data-fragment-index'));
      drawIlluCanvas(idx+1);
    }
    if(si===SID('why-not-16s')){
      drawTaxCanvas(1);
    }
    if(si===SID('gene-prediction')){
      const idx=parseInt(e.fragment.getAttribute('data-fragment-index'));
      drawGpCanvas(idx+1);gpHighlight(idx+1);
    }
    if(si===SID('hmmer-concept')){
      const idx=parseInt(e.fragment.getAttribute('data-fragment-index'));
      drawHmmerCanvas(idx+1);hmHighlight(idx+1);
    }
    if(si===SID('kegg')){
      const idx=parseInt(e.fragment.getAttribute('data-fragment-index'));
      drawKeggCanvas(idx+1);keggHighlight(idx+1);
    }
    if(si===SID('pfam')){
      const idx=parseInt(e.fragment.getAttribute('data-fragment-index'));
      drawPfamCanvas(idx+1);pfamHighlight(idx+1);
    }
    if(si===SID('cazymes')){
      const idx=parseInt(e.fragment.getAttribute('data-fragment-index'));
      drawCazyCanvas(idx+1);cazyHighlight(idx+1);
    }
    if(si===SID('bgcs')){
      const idx=parseInt(e.fragment.getAttribute('data-fragment-index'));
      drawBgcCanvas(idx+1);bgcHighlight(idx+1);
    }
  });

  Reveal.on('fragmenthidden',e=>{
    const si=Reveal.getState().indexh;
    if(si===SID('gtdb-tk')){
      const idx=parseInt(e.fragment.getAttribute('data-fragment-index'));
      drawTkCanvas(idx);tkHighlight(idx);
    }
    if(si===SID('gtdb')){
      const idx=parseInt(e.fragment.getAttribute('data-fragment-index'));
      drawGtdbCanvas(idx);
    }
    if(si===SID('illumina-sbs')){
      const idx=parseInt(e.fragment.getAttribute('data-fragment-index'));
      drawSbsCanvas(idx);sbsHighlight(idx);
    }
    if(si===SID('illumina-quality')){
      const idx=parseInt(e.fragment.getAttribute('data-fragment-index'));
      drawIlluCanvas(idx);
    }
    if(si===SID('why-not-16s')){
      drawTaxCanvas(0);
    }
    if(si===SID('gene-prediction')){
      const idx=parseInt(e.fragment.getAttribute('data-fragment-index'));
      drawGpCanvas(idx);gpHighlight(idx);
    }
    if(si===SID('hmmer-concept')){
      const idx=parseInt(e.fragment.getAttribute('data-fragment-index'));
      drawHmmerCanvas(idx);hmHighlight(idx);
    }
    if(si===SID('kegg')){
      const idx=parseInt(e.fragment.getAttribute('data-fragment-index'));
      drawKeggCanvas(idx);keggHighlight(idx);
    }
    if(si===SID('pfam')){
      const idx=parseInt(e.fragment.getAttribute('data-fragment-index'));
      drawPfamCanvas(idx);pfamHighlight(idx);
    }
    if(si===SID('cazymes')){
      const idx=parseInt(e.fragment.getAttribute('data-fragment-index'));
      drawCazyCanvas(idx);cazyHighlight(idx);
    }
    if(si===SID('bgcs')){
      const idx=parseInt(e.fragment.getAttribute('data-fragment-index'));
      drawBgcCanvas(idx);bgcHighlight(idx);
    }
  });

  setTimeout(go,100);
});
