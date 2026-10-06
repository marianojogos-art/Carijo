import {readFileSync} from 'node:fs';
import {inflateSync} from 'node:zlib';
// Local test utility: decode browser screenshots without uploading them.
export function readPng(path){
 const bytes=readFileSync(path),chunks=[];let width,height,type,depth;
 for(let offset=8;offset<bytes.length;){const size=bytes.readUInt32BE(offset),kind=bytes.toString('ascii',offset+4,offset+8),chunk=bytes.subarray(offset+8,offset+8+size);if(kind==='IHDR'){width=chunk.readUInt32BE(0);height=chunk.readUInt32BE(4);depth=chunk[8];type=chunk[9];if(chunk[12])throw new Error('Interlaced PNG unsupported');}if(kind==='IDAT')chunks.push(chunk);offset+=size+12;}
 if(depth!==8||![2,6].includes(type))throw new Error('Use an 8-bit RGB or RGBA PNG');
 const channels=type===6?4:3,stride=width*channels,raw=inflateSync(Buffer.concat(chunks)),decoded=new Uint8Array(stride*height),data=new Uint8ClampedArray(width*height*4);
 const paeth=(a,b,c)=>{const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);return pa<=pb&&pa<=pc?a:pb<=pc?b:c;};
 for(let y=0;y<height;y++){const filter=raw[y*(stride+1)];for(let x=0;x<stride;x++){const i=y*stride+x,left=x>=channels?decoded[i-channels]:0,up=y?decoded[i-stride]:0,corner=y&&x>=channels?decoded[i-stride-channels]:0;decoded[i]=(raw[y*(stride+1)+1+x]+[0,left,up,Math.floor((left+up)/2),paeth(left,up,corner)][filter])&255;}}
 for(let p=0;p<width*height;p++){data[p*4]=decoded[p*channels];data[p*4+1]=decoded[p*channels+1];data[p*4+2]=decoded[p*channels+2];data[p*4+3]=type===6?decoded[p*channels+3]:255;}
 return{width,height,data};
}
export function cropImage(image,x,y,width,height){const data=new Uint8ClampedArray(width*height*4);for(let row=0;row<height;row++)data.set(image.data.subarray(((y+row)*image.width+x)*4,((y+row)*image.width+x+width)*4),row*width*4);return{width,height,data};}
