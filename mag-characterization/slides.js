
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

function drawGtdbCanvas(){
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

  // ── 1. Draw rank bands (±0.1 around median) ──
  for(const rk of ranks){
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
  _label(ctx,'Relative Evolutionary Divergence',L+treeW/2,B+42,9,COLORS.ink2,'center','600');

  // ── 3. Tree structure (rectangular dendrogram) ──
  // 8 tips, two main clades, realistic uneven branching
  // Node format: {red, y, children:[...]} or {red, y, label}
  const tipGap=(B-T-20)/7;  // 8 tips
  const tipY=i=>T+10+i*tipGap;

  // Helper: draw rectangular (elbow) branch
  function elbow(x1,y1,x2,y2,col,lw){
    ctx.strokeStyle=col;ctx.lineWidth=lw;
    ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x1,y2);ctx.lineTo(x2,y2);ctx.stroke();
  }

  const tc=COLORS.ink3;  // tree colour

  // Tips (species level, RED≈0.95-1.0)
  const tips=[
    {red:0.97,y:tipY(0),lbl:'Sp. A'},
    {red:0.95,y:tipY(1),lbl:'Sp. B'},
    {red:0.98,y:tipY(2),lbl:'Sp. C'},
    {red:0.96,y:tipY(3),lbl:'Sp. D'},
    {red:0.97,y:tipY(4),lbl:'Sp. E'},
    {red:0.95,y:tipY(5),lbl:'Sp. F'},
    {red:0.99,y:tipY(6),lbl:'Sp. G'},
    {red:0.96,y:tipY(7),lbl:'Sp. H'},
  ];

  // Internal nodes (RED, y-midpoint of children)
  // Genus splits
  const g1={red:0.74,y:(tips[0].y+tips[1].y)/2};  // Sp.A+B
  const g2={red:0.70,y:(tips[2].y+tips[3].y)/2};  // Sp.C+D
  const g3={red:0.73,y:(tips[4].y+tips[5].y)/2};  // Sp.E+F
  const g4={red:0.71,y:(tips[6].y+tips[7].y)/2};  // Sp.G+H
  // Family splits
  const f1={red:0.55,y:(g1.y+g2.y)/2};  // g1+g2
  const f2={red:0.57,y:(g3.y+g4.y)/2};  // g3+g4
  // Order splits
  const o1={red:0.42,y:(f1.y+tips[3].y*0+f1.y)/1};  // just f1
  const o2={red:0.44,y:f2.y};
  // Class split
  const c1={red:0.30,y:(f1.y+f2.y)/2};
  // Phylum split (root splits into two phyla)
  const p1={red:0.17,y:c1.y};
  // Root
  const root={red:0.0, y:(tips[0].y+tips[7].y)/2};

  // Draw branches bottom-up (elbows: horizontal from parent, then vertical to child)
  function drawNode(parent,child,lw){
    const px=redX(parent.red),py=parent.y;
    const cx2=redX(child.red),cy2=child.y;
    // horizontal from parent.red at child.y, then vertical
    ctx.strokeStyle=tc;ctx.lineWidth=lw;
    ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(px,cy2);ctx.stroke();
    ctx.beginPath();ctx.moveTo(px,cy2);ctx.lineTo(cx2,cy2);ctx.stroke();
  }

  // Root → phylum
  drawNode(root,p1,2.5);
  // Phylum → class
  drawNode(p1,c1,2.2);
  // Add a second small clade below to show the split more clearly
  // (root also connects down to a single "outgroup" tip at the bottom)

  // Class → orders
  drawNode(c1,{red:c1.red,y:f1.y},2);
  ctx.strokeStyle=tc;ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(redX(c1.red),f1.y);ctx.lineTo(redX(o1.red),f1.y);ctx.stroke();
  // Actually let me simplify: just use clean elbows throughout

  // Let me redraw cleanly with a recursive approach
  ctx.clearRect(L-5,T-5,treeW+15,B-T+15);

  // Re-draw rank bands (they got cleared)
  for(const rk of ranks){
    const x0=redX(rk.red-0.1), x1=redX(rk.red+0.1);
    ctx.fillStyle=rk.col+'10';
    ctx.fillRect(x0,T-10,x1-x0,B-T+20);
    ctx.strokeStyle=rk.col+'55';ctx.lineWidth=1;
    ctx.setLineDash([6,4]);
    ctx.beginPath();ctx.moveTo(redX(rk.red),T-10);ctx.lineTo(redX(rk.red),B+10);ctx.stroke();
    ctx.setLineDash([]);
  }

  // Clean rectangular dendrogram drawing
  function drawClade(nodeRed, children, lw){
    // children = [{red,y},...] — draw vertical bar + horizontal to each child
    if(children.length<2)return;
    const ys=children.map(c=>c.y);
    const yMin=Math.min(...ys), yMax=Math.max(...ys);
    const nx=redX(nodeRed);
    // Vertical bar spanning children
    ctx.strokeStyle=tc;ctx.lineWidth=lw;
    ctx.beginPath();ctx.moveTo(nx,yMin);ctx.lineTo(nx,yMax);ctx.stroke();
    // Horizontal to each child
    for(const c of children){
      ctx.beginPath();ctx.moveTo(nx,c.y);ctx.lineTo(redX(c.red),c.y);ctx.stroke();
    }
  }

  // Draw from root outward
  // Root (RED=0) splits into two phyla
  drawClade(0.0,[{red:0.17,y:(tips[0].y+tips[3].y)/2},{red:0.19,y:(tips[4].y+tips[7].y)/2}],2.5);
  // Root trunk
  ctx.strokeStyle=tc;ctx.lineWidth=2.5;
  ctx.beginPath();ctx.moveTo(redX(0),root.y);ctx.lineTo(redX(0),(tips[0].y+tips[3].y)/2);ctx.stroke();
  ctx.beginPath();ctx.moveTo(redX(0),root.y);ctx.lineTo(redX(0),(tips[4].y+tips[7].y)/2);ctx.stroke();

  // Phylum A → two classes
  const pAy=(tips[0].y+tips[3].y)/2;
  drawClade(0.17,[{red:0.31,y:(tips[0].y+tips[1].y)/2},{red:0.33,y:(tips[2].y+tips[3].y)/2}],2);

  // Phylum B → two classes
  const pBy=(tips[4].y+tips[7].y)/2;
  drawClade(0.19,[{red:0.30,y:(tips[4].y+tips[5].y)/2},{red:0.32,y:(tips[6].y+tips[7].y)/2}],2);

  // Class → order (each class goes to one order for simplicity)
  // Class A1 → order → family → genus → tips
  const cA1y=(tips[0].y+tips[1].y)/2, cA2y=(tips[2].y+tips[3].y)/2;
  const cB1y=(tips[4].y+tips[5].y)/2, cB2y=(tips[6].y+tips[7].y)/2;

  // Orders
  drawClade(0.31,[{red:0.55,y:tips[0].y},{red:0.55,y:tips[1].y}],1.5);
  drawClade(0.33,[{red:0.54,y:tips[2].y},{red:0.56,y:tips[3].y}],1.5);
  drawClade(0.30,[{red:0.57,y:tips[4].y},{red:0.55,y:tips[5].y}],1.5);
  drawClade(0.32,[{red:0.54,y:tips[6].y},{red:0.56,y:tips[7].y}],1.5);

  // Skip family/genus level — go straight from order→family→tips
  // Family→Genus→Tips for each pair
  // Pair 0-1
  drawClade(0.55,[{red:0.74,y:tips[0].y},{red:0.74,y:tips[1].y}],1.2);
  // Tips
  for(const t of [tips[0],tips[1]]){
    ctx.strokeStyle=tc;ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(redX(0.74),t.y);ctx.lineTo(redX(t.red),t.y);ctx.stroke();
  }
  // Pair 2-3
  drawClade(0.54,[{red:0.70,y:tips[2].y},{red:0.72,y:tips[3].y}],1.2);
  for(const t of [tips[2],tips[3]]){
    const gx=t===tips[2]?0.70:0.72;
    ctx.strokeStyle=tc;ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(redX(gx),t.y);ctx.lineTo(redX(t.red),t.y);ctx.stroke();
  }
  // Pair 4-5
  drawClade(0.57,[{red:0.73,y:tips[4].y},{red:0.73,y:tips[5].y}],1.2);
  for(const t of [tips[4],tips[5]]){
    ctx.strokeStyle=tc;ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(redX(0.73),t.y);ctx.lineTo(redX(t.red),t.y);ctx.stroke();
  }
  // Pair 6-7
  drawClade(0.54,[{red:0.71,y:tips[6].y},{red:0.71,y:tips[7].y}],1.2);
  for(const t of [tips[6],tips[7]]){
    ctx.strokeStyle=tc;ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(redX(0.71),t.y);ctx.lineTo(redX(t.red),t.y);ctx.stroke();
  }

  // ── 4. Tip labels ──
  for(const t of tips){
    const tx=redX(t.red);
    ctx.beginPath();ctx.arc(tx,t.y,3,0,Math.PI*2);
    ctx.fillStyle=COLORS.gb;ctx.fill();
    _label(ctx,t.lbl,tx+8,t.y+1,9,COLORS.ink2,'left','500');
  }

  // ── 5. Root marker ──
  ctx.beginPath();ctx.arc(redX(0),root.y,5,0,Math.PI*2);
  ctx.fillStyle=COLORS.ink;ctx.fill();
  _label(ctx,'Root',redX(0)-4,root.y-12,10,COLORS.ink,'center','700');

  // ── 6. Node dots at key splits to show where ranks fall ──
  const nodeDots=[
    {red:0.17,y:pAy,col:ranks[0].col},{red:0.19,y:pBy,col:ranks[0].col},
    {red:0.31,y:cA1y,col:ranks[1].col},{red:0.33,y:cA2y,col:ranks[1].col},
    {red:0.30,y:cB1y,col:ranks[1].col},{red:0.32,y:cB2y,col:ranks[1].col},
  ];
  for(const nd of nodeDots){
    ctx.beginPath();ctx.arc(redX(nd.red),nd.y,4,0,Math.PI*2);
    ctx.fillStyle=nd.col;ctx.fill();
    ctx.strokeStyle='#fff';ctx.lineWidth=1.5;ctx.stroke();
  }

  // ── 7. Title ──
  _label(ctx,'Phylogenetic tree with RED rank boundaries',400,18,13,COLORS.ink,'center','700');

  // ── 8. Annotation: bracket showing ±0.1 on the Order band ──
  const oBandL=redX(0.33),oBandR=redX(0.53);
  const annY=B+4;
  ctx.strokeStyle=COLORS.ink3;ctx.lineWidth=1;
  ctx.beginPath();
  ctx.moveTo(oBandL,annY);ctx.lineTo(oBandL,annY+5);
  ctx.lineTo(oBandR,annY+5);ctx.lineTo(oBandR,annY);ctx.stroke();
  _label(ctx,'median ± 0.1',redX(0.43),annY+14,8,COLORS.ink3,'center','600');
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
    if(i===SID('illumina-sbs')){setTimeout(()=>{drawSbsCanvas(0);sbsHighlight(0)},300)}
    if(i===SID('illumina-quality')){setTimeout(()=>drawIlluCanvas(0),300)}
    if(i===SID('why-not-16s')){setTimeout(()=>drawTaxCanvas(0),300)}
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

  /* ── Fragment events for stepping slides ── */
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
    if(si===SID('illumina-quality')){
      const idx=parseInt(e.fragment.getAttribute('data-fragment-index'));
      drawIlluCanvas(idx+1);
    }
    if(si===SID('why-not-16s')){
      drawTaxCanvas(1);
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
    if(si===SID('illumina-quality')){
      const idx=parseInt(e.fragment.getAttribute('data-fragment-index'));
      drawIlluCanvas(idx);
    }
    if(si===SID('why-not-16s')){
      drawTaxCanvas(0);
    }
  });

  setTimeout(go,100);
});
