/* QR codes made in the app (no outside library), for sending pallets to another phone (panels.js, Share log).
   Byte mode, error correction level M, versions 1 to 20 (up to 666 bytes). qrSvg(text) gives an SVG string with a
   4-module quiet zone; it throws when the text is too long for version 20. Follows the QR Code standard
   (ISO/IEC 18004); the steps and tables are the same as in Project Nayuki's reference encoder (MIT). */
const QR=(()=>{
  // Level M: error correction codewords per block, and the number of blocks, by version (index 0 unused).
  const ECC=[-1,10,16,26,18,24,16,18,22,22,26,30,22,22,24,24,28,28,26,26,26];
  const BLOCKS=[-1,1,1,1,2,2,4,4,4,5,5,5,8,9,9,10,10,11,13,14,16];
  const rawModules=v=>{let r=(16*v+128)*v+64;if(v>=2){const n=Math.floor(v/7)+2;r-=(25*n-10)*n-55;if(v>=7)r-=36}return r};
  const dataCodewords=v=>Math.floor(rawModules(v)/8)-ECC[v]*BLOCKS[v];
  const mul=(x,y)=>{let z=0;for(let i=7;i>=0;i--){z=(z<<1)^((z>>>7)*0x11D);z^=((y>>>i)&1)*x}return z};
  function divisor(deg){const r=new Array(deg).fill(0);r[deg-1]=1;let root=1;
    for(let i=0;i<deg;i++){for(let j=0;j<deg;j++){r[j]=mul(r[j],root);if(j+1<deg)r[j]^=r[j+1]}root=mul(root,2)}return r}
  function remainder(data,div){const r=div.map(()=>0);
    for(const b of data){const f=b^r.shift();r.push(0);div.forEach((c,i)=>{r[i]^=mul(c,f)})}return r}
  function alignPos(v,size){if(v===1)return [];const n=Math.floor(v/7)+2,step=Math.ceil((v*4+4)/(n*2-2))*2,r=[6];
    for(let p=size-7;r.length<n;p-=step)r.splice(1,0,p);return r}
  const bit=(x,i)=>((x>>>i)&1)!==0;
  function encode(text){
    const bytes=Array.from(new TextEncoder().encode(String(text)));
    let v=1;for(;v<=20;v++){const cc=v<10?8:16;if(4+cc+bytes.length*8<=dataCodewords(v)*8)break}
    if(v>20)throw new Error("Too much for one QR code");
    // Data bits: byte mode, length, the bytes, a terminator, then padding.
    const bits=[],put=(val,len)=>{for(let i=len-1;i>=0;i--)bits.push((val>>>i)&1)};
    put(4,4);put(bytes.length,v<10?8:16);bytes.forEach(b=>put(b,8));
    const cap=dataCodewords(v)*8;put(0,Math.min(4,cap-bits.length));put(0,(8-bits.length%8)%8);
    for(let p=0xEC;bits.length<cap;p^=0xEC^0x11)put(p,8);
    const data=[];for(let i=0;i<bits.length;i+=8){let b=0;for(let j=0;j<8;j++)b=(b<<1)|bits[i+j];data.push(b)}
    // Error correction, split into blocks and interleaved.
    const nb=BLOCKS[v],el=ECC[v],raw=Math.floor(rawModules(v)/8),nShort=nb-raw%nb,shortLen=Math.floor(raw/nb),div=divisor(el),blocks=[];
    for(let i=0,k=0;i<nb;i++){const d=data.slice(k,k+shortLen-el+(i<nShort?0:1));k+=d.length;const e=remainder(d,div);if(i<nShort)d.push(0);blocks.push(d.concat(e))}
    const cw=[];for(let i=0;i<blocks[0].length;i++)blocks.forEach((b,j)=>{if(i!==shortLen-el||j>=nShort)cw.push(b[i])});
    // The grid: function patterns first, then the codewords, then the best mask.
    const size=v*4+17,m=[],fn=[];for(let y=0;y<size;y++){m.push(new Array(size).fill(false));fn.push(new Array(size).fill(false))}
    const setF=(x,y,d)=>{m[y][x]=d;fn[y][x]=true};
    for(let i=0;i<size;i++){setF(6,i,i%2===0);setF(i,6,i%2===0)}
    [[3,3],[size-4,3],[3,size-4]].forEach(([cx,cy])=>{for(let dy=-4;dy<=4;dy++)for(let dx=-4;dx<=4;dx++){const d=Math.max(Math.abs(dx),Math.abs(dy)),x=cx+dx,y=cy+dy;if(x>=0&&x<size&&y>=0&&y<size)setF(x,y,d!==2&&d!==4)}});
    const ap=alignPos(v,size),na=ap.length;
    for(let i=0;i<na;i++)for(let j=0;j<na;j++){if((i===0&&j===0)||(i===0&&j===na-1)||(i===na-1&&j===0))continue;
      for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)setF(ap[i]+dx,ap[j]+dy,Math.max(Math.abs(dx),Math.abs(dy))!==1)}
    const format=mask=>{const d=(0<<3)|mask;let r=d;for(let i=0;i<10;i++)r=(r<<1)^((r>>>9)*0x537);const b=((d<<10)|r)^0x5412;
      for(let i=0;i<=5;i++)setF(8,i,bit(b,i));setF(8,7,bit(b,6));setF(8,8,bit(b,7));setF(7,8,bit(b,8));
      for(let i=9;i<15;i++)setF(14-i,8,bit(b,i));for(let i=0;i<8;i++)setF(size-1-i,8,bit(b,i));
      for(let i=8;i<15;i++)setF(8,size-15+i,bit(b,i));setF(8,size-8,true)};
    format(0);
    if(v>=7){let r=v;for(let i=0;i<12;i++)r=(r<<1)^((r>>>11)*0x1F25);const b=(v<<12)|r;
      for(let i=0;i<18;i++){const a=size-11+i%3,c=Math.floor(i/3);setF(a,c,bit(b,i));setF(c,a,bit(b,i))}}
    let i=0;
    for(let right=size-1;right>=1;right-=2){if(right===6)right=5;
      for(let vert=0;vert<size;vert++)for(let j=0;j<2;j++){const x=right-j,up=((right+1)&2)===0,y=up?size-1-vert:vert;
        if(!fn[y][x]&&i<cw.length*8){m[y][x]=bit(cw[i>>>3],7-(i&7));i++}}}
    const MASKS=[(x,y)=>(x+y)%2===0,(x,y)=>y%2===0,(x,y)=>x%3===0,(x,y)=>(x+y)%3===0,(x,y)=>(Math.floor(x/3)+Math.floor(y/2))%2===0,
      (x,y)=>x*y%2+x*y%3===0,(x,y)=>(x*y%2+x*y%3)%2===0,(x,y)=>((x+y)%2+x*y%3)%2===0];
    const apply=k=>{for(let y=0;y<size;y++)for(let x=0;x<size;x++)if(!fn[y][x]&&MASKS[k](x,y))m[y][x]=!m[y][x]};
    // Penalty (runs of one colour, 2x2 blocks, corner-square look-alikes, balance): the lowest is easiest for cameras to read.
    const penalty=()=>{let p=0,dark=0;
      for(let a=0;a<size;a++){let rx=1,ry=1;for(let b=1;b<size;b++){
        if(m[a][b]===m[a][b-1]){rx++;if(rx===5)p+=3;else if(rx>5)p++}else rx=1;
        if(m[b][a]===m[b-1][a]){ry++;if(ry===5)p+=3;else if(ry>5)p++}else ry=1}}
      for(let y=0;y<size;y++)for(let x=0;x<size;x++){if(m[y][x])dark++;
        if(x<size-1&&y<size-1){const c=m[y][x];if(c===m[y][x+1]&&c===m[y+1][x]&&c===m[y+1][x+1])p+=3}}
      // Patterns that look like the corner squares (1:1:3:1:1 with 4 light modules beside them) confuse readers.
      const F1=[1,0,1,1,1,0,1,0,0,0,0],F2=[0,0,0,0,1,0,1,1,1,0,1],at=(x,y)=>x>=0&&y>=0&&x<size&&y<size&&m[y][x]?1:0;
      for(let a=0;a<size;a++)for(let b=-4;b<size;b++){let h1=1,h2=1,v1=1,v2=1;
        for(let k=0;k<11;k++){const h=at(b+k,a),v=at(a,b+k);if(h!==F1[k])h1=0;if(h!==F2[k])h2=0;if(v!==F1[k])v1=0;if(v!==F2[k])v2=0}
        p+=40*(h1+h2+v1+v2)}
      return p+Math.floor(Math.abs(dark*20-size*size*10)/(size*size))*10};
    let best=0,bestP=Infinity;
    for(let k=0;k<8;k++){apply(k);format(k);const p=penalty();if(p<bestP){bestP=p;best=k}apply(k)}
    apply(best);format(best);
    return {size,modules:m,version:v};
  }
  function svg(text){const q=encode(text),n=q.size+8;let d="";
    for(let y=0;y<q.size;y++)for(let x=0;x<q.size;x++)if(q.modules[y][x])d+="M"+(x+4)+","+(y+4)+"h1v1h-1z";
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+n+' '+n+'" shape-rendering="crispEdges"><rect width="'+n+'" height="'+n+'" fill="#fff"/><path d="'+d+'" fill="#000"/></svg>'}
  return {encode,svg};
})();
