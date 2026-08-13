/* PixelOLED Studio Web — static editor compatible with PixelOLED Studio firmware. */
(() => {
	'use strict';
	// La aplicación de escritorio usa una cuadrícula de 5 px por píxel lógico.
	const W=128, SCALE=5, ON='#42d9d1', OFF='#111817', GRID='#1e2d28';
	const welcomeHex='000000000000000000000000000000000ffffffffffffffffffffffffffffff03ffffffffffffffffffffffffffffffc7800000000000000000000000000001e67ffffffffffffffffffffffffffffe6effffffffffffffffffffffffffffff7dffc3dfffe78df043fe1bfff77fffffbdffddfffff775f7ddfdfbfff7ffffffbdffdd9dd8f775f7ddfdf1dd9678ffffbdffc3deb77775f0ddfe3bdd67777fffbdffdfdf707775f7ddffdbdd77777fffbdffdfdeb7f775f7ddffdb5977777fffbdffdf8dd8e38c1043fc3ce58638ffffbdffffffffffffffffffffffffffffffbeffffffffffffffffffffffffffffff767ffffffffffffffffffffffffffffe67800000000000000000000000000001e3ffffffffffffffffffffffffffffffc0ffffffffffffffffffffffffffffff0000000000000000000000000000000007ffffffffffe00000000000007fffff07fbf77fffbfe7ffffffffffc0ffffff842077783eb824000000000043fbffffc5ef777efebfa4000000036045fa7c3fc5ff777efebfa4360000036049e1bfffc5feff7efeafa436060c0c1849fbbfffc5fdfef01d9fa4c185140dd849f33dffc5f3f9fffbbfa4dd84e403e049eabbffc5ffffffffffa43e080263e049fb3c1fc5ffffffffffa43e0802514048ffffff85ffffffffffa41409125000487fffff05ff9c0f1e0fa400080290004400000205ff1dcf5eafa4000407100043fffffc05f63dcf5e0fa40003f820004000000005f87dceeeafa400020040004000000005fcfe9e0eafa400020080004000000005faff3f1e0fa40002ba80004000000005f77fffffffa40003ff80004000000005ffffffffffa400000000004000000005ffffffffffa400000000004000000004000000000027ffffffffffc000000007ffffffffffe0000000000000000000000000000000000000000000000000000ffffffffffffffffffffffffffffffff80000000000000000000000000000001bffffffffffffffffffffffffffffffdbffffffffffffffffffffffffffffffdbf05fe1ffffffeffeffefffffffffffdaf7beeeffffffffffffffffffffffffda755eeec69c7fce9cf1cf1a7fffffffda36dfe1fa6fbfee6eefefe9bfffffffda75deefc2fc3feeeeefef0bffffffffdafbdeefbafbbfeeeeeeeeebf9ffffffdbf41fefc2fc3fc6ec71c70bf9ffffffdbffffffffffffffffffffffffffffffdbffffffffffffffffffffffffffffffdbffffffffffffffffffffffffffffffdbffffffffffffffffffffffffffffffdbffffffffffffffffffffffffffffffdbffffffffffffffffffffffffffffffdbffffffffffffffffffffffffffffffdbffffffffffffffffffffffffffffffd80000000000000000000000000000001ffffffffffffffffffffffffffffffff';
	const $=id=>document.getElementById(id), canvas=$('oledCanvas'), ctx=canvas.getContext('2d');
	// Símbolos básicos disponibles en los tres modos de texto, como en escritorio.
	window.PixelOLEDFonts.latin['¡']=['00100','00000','00100','00100','00100','10001','01110'];
	window.PixelOLEDFonts.latin[';']=['00000','00110','00110','00000','00110','00110','00100'];
	window.PixelOLEDFonts.latin['"']=['01010','01010','01010','00000','00000','00000','00000'];
	window.PixelOLEDFonts.latin['ñ']=['01010','10100','10110','11001','10001','10001','10001'];
	window.PixelOLEDFonts.latin['Ñ']=['01010','10100','10001','11001','10101','10011','10001'];
	const KANA_LATIN_SYMBOLS=new Set(['!','"','#','$','%','&','/','(',')','=','?','¡','_',':',';','-','.',',','@','+','*']);
	let height=64, pixels=decodeHex(welcomeHex,64), inverted=false, tool='pencil', drawValue=1, history=[], redo=[], frames=[null,null,null,null], selectedFrame=null, playing=false, playTimer=null, serialPort=null, reader=null, serialReady=false, serialBuffer=[], readerRunning=false, serialQueue=Promise.resolve();
	let stroke=null, shapeStart=null, shapeEnd=null, triangleBase=null, curveEnd=null, preview=null, selection=null, selectionStart=null, sectionStart=null, textSession=null, textScript='latin', textCursorVisible=false, textInputEnabled=false, selectionClipboard=null;
	const toolDefs=[['pencil','✎','Lápiz (1 px)'],['brush','⌁','Pincel (2×2 px)'],['eraser','⌫','Borrador'],['color','■','Color cian / negro'],['selection','⌑','Seleccionar área'],['line','╱','Línea'],['curve','⌒','Línea curva (3 puntos)'],['rectangle','□','Rectángulo'],['rounded','▢','Rectángulo redondeado'],['triangle','△','Triángulo'],['circle','○','Círculo'],['filledRectangle','■','Rectángulo relleno'],['filledRounded','▣','Rectángulo redondeado relleno'],['filledTriangle','▲','Triángulo relleno'],['filledCircle','●','Círculo relleno'],['latin','A','Texto latino'],['hiragana','あ','Texto hiragana'],['katakana','ア','Texto katakana'],['invert','◐','Invertir OLED'],['clear','⌫','Borrar']];
	const kana={
		a:'あ',i:'い',u:'う',e:'え',o:'お',ka:'か',ki:'き',ku:'く',ke:'け',ko:'こ',sa:'さ',shi:'し',si:'し',su:'す',se:'せ',so:'そ',ta:'た',chi:'ち',ti:'ち',tsu:'つ',tu:'つ',te:'て',to:'と',na:'な',ni:'に',nu:'ぬ',ne:'ね',no:'の',ha:'は',hi:'ひ',fu:'ふ',hu:'ふ',he:'へ',ho:'ほ',ma:'ま',mi:'み',mu:'む',me:'め',mo:'も',ya:'や',yu:'ゆ',yo:'よ',ra:'ら',ri:'り',ru:'る',re:'れ',ro:'ろ',wa:'わ',wo:'を',nn:'ん',ga:'が',gi:'ぎ',gu:'ぐ',ge:'げ',go:'ご',za:'ざ',ji:'じ',zi:'じ',zu:'ず',ze:'ぜ',zo:'ぞ',ba:'ば',bi:'び',bu:'ぶ',be:'べ',bo:'ぼ',pa:'ぱ',pi:'ぴ',pu:'ぷ',pe:'ぺ',po:'ぽ',kya:'きゃ',kyu:'きゅ',kyo:'きょ',sha:'しゃ',shu:'しゅ',sho:'しょ',cha:'ちゃ',chu:'ちゅ',cho:'ちょ',nya:'にゃ',nyu:'にゅ',nyo:'にょ',hya:'ひゃ',hyu:'ひゅ',hyo:'ひょ',mya:'みゃ',myu:'みゅ',myo:'みょ',rya:'りゃ',ryu:'りゅ',ryo:'りょ',gya:'ぎゃ',gyu:'ぎゅ',gyo:'ぎょ',ja:'じゃ',ju:'じゅ',jo:'じょ',bya:'びゃ',byu:'びゅ',byo:'びょ',pya:'ぴゃ',pyu:'ぴゅ',pyo:'ぴょ'
	};
	function decodeHex(hex,h){
		const b=Uint8Array.from(hex.match(/.{1,2}/g)||[],x=>parseInt(x,16));return bitmapToPixels(b,h)
	}
	function snapshot(){
		return {
			height,pixels:new Uint8Array(pixels),inverted
		}
	}
	function restore(s){
		height=s.height;pixels=new Uint8Array(s.pixels);inverted=s.inverted;$('resolution').value=height;resizeCanvas();render();queueFrame()
	}
	function remember(){
		history.push(snapshot());if(history.length>50)history.shift();redo=[]
	}
	function resizeCanvas(){
		canvas.width=W*SCALE;canvas.height=height*SCALE
	}
	function render(){
		ctx.fillStyle=OFF;ctx.fillRect(0,0,canvas.width,canvas.height);for(let y=0;y<height;y++)for(let x=0;x<W;x++){
			ctx.fillStyle=pixels[y*W+x]?ON:OFF;ctx.fillRect(x*SCALE,y*SCALE,SCALE,SCALE);ctx.strokeStyle=GRID;ctx.strokeRect(x*SCALE+.5,y*SCALE+.5,SCALE,SCALE)
		}
		if(preview)renderOverlay(preview);if(selection)renderSelection();if(textInputEnabled&&tool==='text'&&textSession?.base&&textCursorVisible)renderTextCursor()
	}
	function renderOverlay(data){
		for(let i=0;i<data.length;i++)if(data[i]!==pixels[i]){
			const x=i%W,y=(i/W)|0;ctx.fillStyle=data[i]?ON:OFF;ctx.fillRect(x*SCALE+1,y*SCALE+1,SCALE-2,SCALE-2)
		}
	}
	function renderSelection(){
		const s=selection;ctx.save();ctx.setLineDash([5,5]);ctx.lineWidth=2;ctx.strokeStyle='#a9ddcf';ctx.strokeRect(s.x*SCALE,s.y*SCALE,s.w*SCALE,s.h*SCALE);ctx.setLineDash([]);for(let y=0;y<s.h;y++)for(let x=0;x<s.w;x++)if(s.data[y*s.w+x]){
			const dx=s.x+x,dy=s.y+y;if(dx>=0&&dx<W&&dy>=0&&dy<height){
				ctx.fillStyle=ON;ctx.fillRect(dx*SCALE+1,dy*SCALE+1,SCALE-2,SCALE-2)
			}
		}
		ctx.restore()
	}
	function renderSelectionPreview(a,b){
		const x=Math.min(a.x,b.x),y=Math.min(a.y,b.y),w=Math.abs(a.x-b.x)+1,h=Math.abs(a.y-b.y)+1;ctx.save();ctx.setLineDash([5,5]);ctx.lineWidth=2;ctx.strokeStyle='#a9ddcf';ctx.strokeRect(x*SCALE,y*SCALE,w*SCALE,h*SCALE);ctx.restore()
	}
	function point(e){
		const r=canvas.getBoundingClientRect();return {
			x:Math.max(0,Math.min(W-1,Math.floor((e.clientX-r.left)*W/r.width))),y:Math.max(0,Math.min(height-1,Math.floor((e.clientY-r.top)*height/r.height)))
		}
	}
	function setPixel(p,x,y,v){
		if(x>=0&&x<W&&y>=0&&y<height)p[y*W+x]=v
	}
	function line(p,a,b,v){
		let [x0,y0,x1,y1]=[a.x,a.y,b.x,b.y],dx=Math.abs(x1-x0),sx=x0<x1?1:-1,dy=-Math.abs(y1-y0),sy=y0<y1?1:-1,e=dx+dy;while(true){
			setPixel(p,x0,y0,v);if(x0===x1&&y0===y1)break;let e2=2*e;if(e2>=dy){
				e+=dy;x0+=sx
			}
			if(e2<=dx){
				e+=dx;y0+=sy
			}
		}
	}
	function insideRounded(x,y,x0,y0,x1,y1,r){
		const cx=Math.min(Math.max(x,x0+r),x1-r),cy=Math.min(Math.max(y,y0+r),y1-r);return (x-cx)**2+(y-cy)**2<=r**2
	}
	function rectangle(p,a,b,v,filled=false,round=false){
		let x0=Math.min(a.x,b.x),x1=Math.max(a.x,b.x),y0=Math.min(a.y,b.y),y1=Math.max(a.y,b.y);if(round){
			const r=Math.max(1,Math.floor(Math.min(x1-x0,y1-y0)/4));for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
				const outer=insideRounded(x,y,x0,y0,x1,y1,r);if(!outer)continue;if(filled||x0===x1||y0===y1){
					setPixel(p,x,y,v);continue
				}
				const inner=insideRounded(x,y,x0+1,y0+1,x1-1,y1-1,Math.max(0,r-1));if(!inner)setPixel(p,x,y,v)
			}
			return
		}
		for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)if(filled||x===x0||x===x1||y===y0||y===y1)setPixel(p,x,y,v)
	}
	function circle(p,a,b,v,filled){
		const cx=a.x,cy=a.y,r=Math.max(Math.abs(b.x-cx),Math.abs(b.y-cy));if(r===0){
			setPixel(p,cx,cy,v);return
		}
		let x=r,y=0,error=1-r;while(x>=y){
			const rows=[[cy+y,x],[cy-y,x],[cy+x,y],[cy-x,y]];if(filled){
				for(const [row,half] of rows)for(let col=cx-half;col<=cx+half;col++)setPixel(p,col,row,v)
			}
			else{
				for(const [px,py] of [[cx+x,cy+y],[cx+y,cy+x],[cx-y,cy+x],[cx-x,cy+y],[cx-x,cy-y],[cx-y,cy-x],[cx+y,cy-x],[cx+x,cy-y]])setPixel(p,px,py,v)
			}
			y++;if(error<0)error+=2*y+1;else{
				x--;error+=2*(y-x)+1
			}
		}
	}
	function triangle(p,a,b,c,v,filled){
		if(!filled){
			line(p,a,b,v);line(p,b,c,v);line(p,c,a,v);return
		}
		const minX=Math.min(a.x,b.x,c.x),maxX=Math.max(a.x,b.x,c.x),minY=Math.min(a.y,b.y,c.y),maxY=Math.max(a.y,b.y,c.y),sign=(q,r,s)=>q.x*(r.y-s.y)+r.x*(s.y-q.y)+s.x*(q.y-r.y);for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++){
			const q={
				x,y
			},d1=sign(q,a,b),d2=sign(q,b,c),d3=sign(q,c,a);if((d1>=0&&d2>=0&&d3>=0)||(d1<=0&&d2<=0&&d3<=0))setPixel(p,x,y,v)
		}
	}
	function curve(p,a,b,c,v){
		let prev=a;for(let i=1;i<=80;i++){
			const t=i/80,u=1-t,q={
				x:Math.round(u*u*a.x+2*u*t*c.x+t*t*b.x),y:Math.round(u*u*a.y+2*u*t*c.y+t*t*b.y)
			};line(p,prev,q,v);prev=q
		}
	}
	function toolbarBitmap(hex,w,h,scale=1,offsetX=2,offsetY=2){
		const c=document.createElement('canvas');c.width=24;c.height=24;const g=c.getContext('2d');g.fillStyle='#a9ddcf';const data=Uint8Array.from(hex.match(/.{1,2}/g)||[],x=>parseInt(x,16));for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(data[y*Math.ceil(w/8)+(x>>3)]&(1<<(7-(x&7))))g.fillRect(offsetX+x*scale,offsetY+y*scale,scale,scale);return c
	}
	function eraserIcon(){
		const c=document.createElement('canvas');c.width=c.height=24;const g=c.getContext('2d');g.fillStyle='#a9ddcf';const paint=(x,y)=>{
			if(x>=0&&x<20&&y>=0&&y<20)g.fillRect(x+2,y+2,1,1)
		};const line=(a,b)=>{
			let[x0,y0]=a,[x1,y1]=b,dx=Math.abs(x1-x0),sx=x0<x1?1:-1,dy=-Math.abs(y1-y0),sy=y0<y1?1:-1,e=dx+dy;for(;;){
				for(let oy=-1;oy<=1;oy++)for(let ox=-1;ox<=1;ox++)if(Math.abs(ox)+Math.abs(oy)<=1)paint(x0+ox,y0+oy);if(x0===x1&&y0===y1)return;const e2=2*e;if(e2>=dy){
					e+=dy;x0+=sx
				}
				if(e2<=dx){
					e+=dx;y0+=sy
				}
			}
		};line([1,11],[10,2]);line([10,2],[17,9]);line([17,9],[8,18]);line([8,18],[1,11]);line([3,13],[9,19]);line([9,19],[17,19]);return c
	}
	function colorIcon(){
		const c=document.createElement('canvas');c.width=c.height=24;const g=c.getContext('2d');g.fillStyle=ON;g.fillRect(9,4,10,10);g.fillStyle=OFF;g.fillRect(5,8,10,10);return c
	}
	function outlineIcon(kind,filled=false){
		const c=document.createElement('canvas');c.width=c.height=24;
		const g=c.getContext('2d');g.fillStyle='#a9ddcf';
		const px=(x,y)=>g.fillRect(x,y,1,1);
		if(kind==='rectangle'){
			if(filled)g.fillRect(4,6,16,13);
			else{
				for(let x=4;x<=19;x++){
					px(x,6);px(x,18)
				}
				for(let y=6;y<=18;y++){
					px(4,y);px(19,y)
				}
			}
		}
		if(kind==='rounded'){
			const rows=[[7,16],[5,18],[4,19],[4,19],[4,19],[4,19],[4,19],[4,19],[4,19],[4,19],[4,19],[5,18],[7,16]];
			if(filled)rows.forEach(([a,b],i)=>g.fillRect(a,6+i,b-a+1,1));
			else{
				for(let x=7;x<=16;x++){
					px(x,6);px(x,18)
				}
				for(let y=9;y<=15;y++){
					px(4,y);px(19,y)
				}
				for(const [x,y] of [[5,7],[6,7],[17,7],[18,7],[5,17],[6,17],[17,17],[18,17],[4,8],[19,8],[4,16],[19,16]])px(x,y)
			}
		}
		if(kind==='circle'){
			const rows=[[10,13],[8,15],[7,16],[6,17],[6,17],[6,17],[6,17],[6,17],[6,17],[7,16],[8,15],[10,13]];
			if(filled)rows.forEach(([a,b],i)=>g.fillRect(a,6+i,b-a+1,1));
			else for(const [x,y] of [[10,6],[11,6],[12,6],[13,6],[8,7],[9,7],[14,7],[15,7],[7,8],[16,8],[6,10],[17,10],[6,11],[17,11],[6,12],[17,12],[6,13],[17,13],[7,15],[16,15],[8,16],[9,16],[14,16],[15,16],[10,17],[11,17],[12,17],[13,17]])px(x,y);
		}
		return c;
	}
	function selectionIcon(){
		const c=document.createElement('canvas');c.width=c.height=24;const g=c.getContext('2d'),d=Uint8Array.from('0000100010007fe0102010201020102010201ff800200020000000000000'.match(/.{1,2}/g),v=>parseInt(v,16));g.fillStyle='#a9ddcf';for(let y=0;y<16;y++)for(let x=0;x<14;x++)if(d[y*2+(x>>3)]&(1<<(7-(x&7))))g.fillRect(x+5,y+4,1,1);return c
	}
	const pixelIcons={
		pencil:()=>toolbarBitmap('0000000000180038007000e001c0008006000e001c003800300040007ff800000000',15,17),brush:()=>toolbarBitmap('0000000000100038007004e00fc01f802f8047c0238011000a00040007f000000000',15,17),eraser:eraserIcon,color:colorIcon,curve:()=>toolbarBitmap('0000000001c007000c00080010001000100000000000',13,11,2,0,2),selection:selectionIcon,rectangle:()=>outlineIcon('rectangle'),rounded:()=>outlineIcon('rounded'),circle:()=>outlineIcon('circle'),filledRectangle:()=>outlineIcon('rectangle',true),filledRounded:()=>outlineIcon('rounded',true),filledCircle:()=>outlineIcon('circle',true),clear:()=>toolbarBitmap('0000000000000fe4001008002410002e220024420020820021020022020004020008020010040023f80000000000000000000',18,20,1,3,3)
	};
	function buildToolbar(){
		const host=$('toolbar');toolDefs.forEach(([id,icon,title])=>{
			const b=document.createElement('button');b.className='tool '+(id==='clear'?'small':'');b.dataset.tool=id;if(pixelIcons[id])b.append(pixelIcons[id]());else b.textContent=icon;if(id==='clear'){
				b.style.background='var(--bg)';b.style.boxShadow='none';b.style.color='var(--ink)'
			}
			b.title=title;b.setAttribute('aria-label',title);b.onclick=()=>chooseTool(id);host.append(b)
		});updateTools()
	}
	function updateTools(){
		document.querySelectorAll('.tool').forEach(b=>{
			const id=b.dataset.tool;const selected=id===tool||(id==='color'&&drawValue)||(['latin','hiragana','katakana'].includes(id)&&tool==='text'&&id===textScript);b.classList.toggle('selected',selected)
		})
	}
	function chooseTool(t){
		if(playing)return;if(t==='clear'){
			if(textSession?.base)finishText();remember();pixels.fill(inverted?1:0);render();status('OLED borrada');queuePacket(2);return
		}
		if(t==='invert'){
			if(textSession?.base)finishText();remember();for(let i=0;i<pixels.length;i++)pixels[i]^=1;inverted=!inverted;render();queuePacket(3);return
		}
		if(t==='color'){
			drawValue^=1;updateTools();status('Color de dibujo: '+(drawValue?'cian':'negro'));return
		}
		if(['latin','hiragana','katakana'].includes(t)){
			if(textSession?.base)finishText();textScript=t;tool='text';textSession=null;status('Texto: '+t+'. Haz clic para escribir')
		}
		else{
			if(textSession?.base)finishText();if(t==='selection'){
				tool=t;selectionStart=null;status('Selecciona la primera esquina del área')
			}
			else{
				tool=t;status('Herramienta: '+t)
			}
		}
		shapeStart=shapeEnd=triangleBase=curveEnd=preview=null;updateTools();render()
	}
	function status(s){
		$('status').textContent=s
	}
	canvas.addEventListener('pointerdown',e=>{
		e.preventDefault();canvas.setPointerCapture(e.pointerId);const p=point(e);if(playing)return;if(tool==='section'){
			if(!sectionStart){
				sectionStart=p;status('Marca la esquina opuesta de la sección')
			}
			else{
				exportSection(sectionStart,p);sectionStart=null;tool='pencil';status('Sección generada')
			}
			return
		}
		if(selection){
			if(p.x>=selection.x&&p.x<selection.x+selection.w&&p.y>=selection.y&&p.y<selection.y+selection.h){
				stroke={
					mode:'dragSelection',ox:p.x-selection.x,oy:p.y-selection.y
				};return
			}
			commitSelection()
		}
		if(tool==='selection'){
			if(!selectionStart){
				selectionStart=p;status('Selecciona la esquina opuesta del área')
			}
			else makeSelection(selectionStart,p);return
		}
		if(tool==='text'){
			if(textSession?.base)finishText();beginText(p);return
		}
		if(['line','curve','rectangle','rounded','circle','filledRectangle','filledRounded','triangle','filledTriangle','filledCircle'].includes(tool)){
			shapeClick(p);return
		}
		remember();stroke={
			mode:'paint',last:p,moved:false
		};paint(p);render()
	})
	canvas.addEventListener('pointermove',e=>{
		const p=point(e);if(stroke?.mode==='paint'){
			if(p.x!==stroke.last.x||p.y!==stroke.last.y)stroke.moved=true;forLine(stroke.last,p,q=>paint(q));stroke.last=p;render();return
		}
		if(stroke?.mode==='dragSelection'){
			selection.x=Math.max(-selection.w+1,Math.min(W-1,p.x-stroke.ox));selection.y=Math.max(-selection.h+1,Math.min(height-1,p.y-stroke.oy));render();return
		}
		if((tool==='selection'&&selectionStart)||(tool==='section'&&sectionStart)){
			render();renderSelectionPreview(selectionStart||sectionStart,p);return
		}
		if(shapeStart){
			preview=Uint8Array.from(pixels);drawShape(preview,shapeStart,p);render()
		}
	})
	canvas.addEventListener('pointerup',()=>{
		if(stroke?.mode==='paint'){
			const quickPixel=!stroke.moved&&(tool==='pencil'||tool==='eraser');if(quickPixel)queuePacket(0x01,[stroke.last.x,stroke.last.y,tool==='eraser'?(inverted?1:0):drawValue]);else queueFrame()
		}
		if(stroke?.mode==='dragSelection'){
			commitSelection()
		}
		stroke=null
	})
	function forLine(a,b,f){
		let temp=new Uint8Array(W*height);line(temp,a,b,1);for(let i=0;i<temp.length;i++)if(temp[i])f({
			x:i%W,y:(i/W)|0
		})
	}
	function paint(p){
		const v=tool==='eraser'?(inverted?1:0):drawValue;if(tool==='brush')for(let y=0;y<2;y++)for(let x=0;x<2;x++)setPixel(pixels,p.x+x,p.y+y,v);else setPixel(pixels,p.x,p.y,v)
	}
	function shapeClick(p){
		const isTriangle=tool==='triangle'||tool==='filledTriangle';if(!shapeStart){
			remember();shapeStart=p;status(isTriangle?'Selecciona final de la base':tool==='curve'?'Selecciona final de la curva':'Selecciona el punto final');return
		}
		if(isTriangle&&!triangleBase){
			triangleBase=p;status('Selecciona el vértice');return
		}
		if(tool==='curve'&&!curveEnd){
			curveEnd=p;status('Mueve el cursor para curvar la línea y haz clic para confirmar');return
		}
		drawShape(pixels,shapeStart,p);shapeStart=triangleBase=curveEnd=preview=null;render();queueFrame()
	}
	function drawShape(p,a,b){
		const v=drawValue;if(tool==='line')line(p,a,b,v);else if(tool==='curve'){
			if(curveEnd)curve(p,a,curveEnd,b,v);else line(p,a,b,v)
		}
		else if(tool==='rectangle'||tool==='filledRectangle')rectangle(p,a,b,v,tool==='filledRectangle');else if(tool==='rounded'||tool==='filledRounded')rectangle(p,a,b,v,tool==='filledRounded',true);else if(tool==='circle'||tool==='filledCircle')circle(p,a,b,v,tool==='filledCircle');else if(tool==='triangle'||tool==='filledTriangle')triangle(p,a,triangleBase||b,b,v,tool==='filledTriangle')
	}
	function makeSelection(a,b){
		const x=Math.min(a.x,b.x),y=Math.min(a.y,b.y),w=Math.abs(a.x-b.x)+1,h=Math.abs(a.y-b.y)+1;selection={
			x,y,w,h,data:new Uint8Array(w*h),source:{
				x,y,w,h
			}
		};for(let yy=0;yy<h;yy++)for(let xx=0;xx<w;xx++)selection.data[yy*w+xx]=pixels[(y+yy)*W+x+xx];selectionStart=null;status('Arrastra para mover. Espacio rota, Enter confirma');render()
	}
	function commitSelection(){
		if(!selection)return;remember();const src=selection.source;if(src)for(let y=0;y<src.h;y++)for(let x=0;x<src.w;x++)setPixel(pixels,src.x+x,src.y+y,inverted?1:0);for(let y=0;y<selection.h;y++)for(let x=0;x<selection.w;x++)setPixel(pixels,selection.x+x,selection.y+y,selection.data[y*selection.w+x]);selection=null;render();queueFrame()
	}
	function beginText(p){
		remember();textSession={
			script:textScript,x:p.x,y:p.y,base:Uint8Array.from(pixels),value:'',compose:''
		};textInputEnabled=true;textCursorVisible=true;status('Escribe texto y pulsa Enter para confirmar');render()
	}
	function finishText(){
		if(!textSession?.base)return;textInputEnabled=false;textSession=null;textCursorVisible=false;queueFrame();status('Texto aplicado');render()
	}
	function textCursorPosition(){
		let x=textSession.x,y=textSession.y;const step=textSession.script==='latin'?6:9, line=textSession.script==='latin'?8:9;for(const ch of textSession.value){
			if(ch==='\n'){
				y+=line;x=textSession.x
			}
			else x+=step
		}
		return{
			x,y,height:textSession.script==='latin'?7:8
		}
	}
	function renderTextCursor(){
		const pos=textCursorPosition();if(pos.x>=0&&pos.x<W&&pos.y>=0&&pos.y<height){
			ctx.fillStyle='#a9ddcf';ctx.fillRect(pos.x*SCALE,pos.y*SCALE,Math.max(1,SCALE-1),pos.height*SCALE-1)
		}
	}
	function drawText(){
		if(!textSession?.base)return;pixels=Uint8Array.from(textSession.base);let x=textSession.x,y=textSession.y;for(const ch of textSession.value){
			if(ch==='\n'){
				y+=textSession.script==='latin'?8:9;x=textSession.x;continue
			}
			glyph(pixels,ch,x,y,drawValue,textSession.script!=='latin');x+=textSession.script==='latin'?6:9
		}
		render()
	}
	function appendKanaInput(character){
		let buffer=textSession.compose+character.toLowerCase();if(textSession.compose==='n'&&textSession.value)textSession.value=textSession.value.slice(0,-1);while(buffer){
			const exact=kana[buffer],hasLonger=Object.keys(kana).some(key=>key.startsWith(buffer)&&key!==buffer);if(exact&&!hasLonger){
				let output=textSession.script==='katakana'?[...exact].map(c=>String.fromCharCode(c.charCodeAt(0)+0x60)).join(''):exact;textSession.compose='';textSession.value+=output;return
			}
			if(hasLonger){
				textSession.compose=buffer;if(buffer==='n')textSession.value+=textSession.script==='katakana'?'ン':'ん';return
			}
			if(buffer.startsWith('n')){
				textSession.value+=textSession.script==='katakana'?'ン':'ん';buffer=buffer.slice(1);continue
			}
			textSession.compose='';return
		}
	}
	function glyph(p,ch,x,y,v,isKana){
		const fonts=window.PixelOLEDFonts;const latin=fonts.latin[ch];if(isKana&&!latin){
			const index=fonts.kanaChars.indexOf(ch);if(index<0)return;for(let row=0;row<8;row++){
				const value=parseInt(fonts.kanaHex.slice((index*8+row)*2,(index*8+row+1)*2),16);for(let col=0;col<8;col++)if(value&(1<<(7-col)))setPixel(p,x+col,y+row,v)
			}
			return
		}
		const rows=latin||fonts.latin['?'];for(let row=0;row<rows.length;row++)for(let col=0;col<5;col++)if(rows[row][col]==='1')setPixel(p,x+col,y+row,v)
	}
	document.addEventListener('keydown',e=>{
		if(e.target=== $('bitmapOutput')||e.target===$('bitmapName'))return;if(e.key==='Escape'){
			shapeStart=triangleBase=curveEnd=preview=null;selection=null;textSession=null;textCursorVisible=false;textInputEnabled=false;render();return
		}
		if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){
			e.preventDefault();if(history.length){
				redo.push(snapshot());restore(history.pop())
			}
			return
		}
		if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='y'){
			e.preventDefault();if(redo.length){
				history.push(snapshot());restore(redo.pop())
			}
			return
		}
		if(selection){
			if(e.key==='Enter'){
				commitSelection();return
			}
			if(e.key===' '){
				e.preventDefault();const s=selection,n=new Uint8Array(s.w*s.h);for(let y=0;y<s.h;y++)for(let x=0;x<s.w;x++)n[x*s.h+(s.h-1-y)]=s.data[y*s.w+x];[s.w,s.h]=[s.h,s.w];s.data=n;render();return
			}
			if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='c'){
				navigator.clipboard?.writeText(JSON.stringify(selection));return
			}
			if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='x'){
				navigator.clipboard?.writeText(JSON.stringify(selection));commitSelection();return
			}
		}
		if(!textInputEnabled||tool!=='text'||!textSession?.base)return;if(e.key==='Enter'){
			e.preventDefault();if(e.shiftKey){
				textSession.value+='\n';textSession.compose='';drawText()
			}
			else finishText();return
		}
		if(e.key==='Backspace'){
			e.preventDefault();textSession.value=textSession.value.slice(0,-1);textSession.compose='';drawText();return
		}
		if(e.key===' '){
			e.preventDefault();textSession.value+=' ';textSession.compose='';drawText();return
		}
		if(e.key==='|'||((e.code==='Backslash'||e.code==='IntlBackslash')&&(e.shiftKey||e.altKey))){
			e.preventDefault();if(textSession.value.length<18){
				textSession.value+='|';textSession.compose='';drawText()
			}
			return
		}
		if(e.key.length===1&&textSession.value.length<18){
			e.preventDefault();if(textSession.script==='latin'||KANA_LATIN_SYMBOLS.has(e.key))textSession.value+=e.key;else appendKanaInput(e.key);drawText()
		}
	})
	$('resolution').onchange=()=>{
		const h=+$('resolution').value;if(h===height)return;if(!confirm('Cambiar la resolución borra el canvas y los frames. ¿Continuar?')){
			$('resolution').value=height;return
		}
		height=h;pixels=new Uint8Array(W*h);frames=[null,null,null,null];selectedFrame=null;resizeCanvas();render();updateFrames();status('Configurando OLED 128×'+h+'…');serialQueue=serialQueue.then(async()=>{
			if(!await configureHeight())return false;return sendFrame()
		}).then(ok=>{
			if(ok)status('OLED borrada')
		});
	}
	function bytes(){
		const out=new Uint8Array(height*16);for(let y=0;y<height;y++)for(let x=0;x<W;x++)if(pixels[y*W+x])out[y*16+(x>>3)]|=1<<(7-(x&7));return out
	}
	function bitmapToPixels(b,h){
		if(b.length!==h*16)return new Uint8Array(W*h);const p=new Uint8Array(W*h);for(let y=0;y<h;y++)for(let x=0;x<W;x++)p[y*W+x]=(b[y*16+(x>>3)]>>(7-(x&7)))&1;return p
	}
	function safeName(){
		const n=$('bitmapName').value.trim();return /^[A-Za-z_][A-Za-z0-9_]{0,15}$/.test(n)?n:'Ejemplo_PixelOLED_1'
	}
	function format(b,name,comment=''){
		const rows=[];for(let i=0;i<b.length;i+=16)rows.push('    '+[...b.slice(i,i+16)].map(v=>'0x'+v.toString(16).padStart(2,'0')).join(', ')+',');return `${comment?comment+'\n':''}const unsigned char ${name}[] = {\n${rows.join('\n')}\n};\n`
	}
	$('generateBitmap').onclick=()=>{
		$('bitmapOutput').value=format(bytes(),safeName());status('Bitmap generado')
	};$('generateGif').onclick=()=>{
		const all=frames.filter(Boolean);if(!all.length)return dialog('Guarda al menos un frame antes de generar los bitmaps.');$('bitmapOutput').value=all.map((f,i)=>format(bitmapBytes(f.pixels,f.height),`${safeName()}_GIF${i+1}`)).join('\n\n');status('Bitmaps de animación generados')
	};$('generateSection').onclick=()=>{
		sectionStart=null;tool='section';status('Marca las dos esquinas de la sección');updateTools()
	};
	function exportSection(a,p){
		const x0=Math.min(a.x,p.x),x1=Math.max(a.x,p.x),y0=Math.min(a.y,p.y),y1=Math.max(a.y,p.y),w=x1-x0+1,h=y1-y0+1,rowBytes=Math.ceil(w/8),b=new Uint8Array(h*rowBytes);for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)if(pixels[y*W+x])b[(y-y0)*rowBytes+((x-x0)>>3)]|=1<<(7-((x-x0)&7));$('bitmapOutput').value=format(b,`${safeName()}_${w}x${h}`,`// Sección ${w}×${h}px, origen (${x0}, ${y0})`)
	}
	$('copyBitmap').onclick=async()=>{
		try{
			await navigator.clipboard.writeText($('bitmapOutput').value);status('Bitmap copiado')
		}
		catch{
			dialog('No se pudo acceder al portapapeles. Selecciona y copia el texto manualmente.')
		}
	};$('loadBitmap').onclick=()=>{
		try{
			const s=$('bitmapOutput').value;if(s.length>25000)throw Error('El texto del bitmap es demasiado grande');const groups=s.match(/\{([\s\S]*)\}/g);if(!groups||groups.length!==1)throw Error('El bitmap debe contener exactamente un arreglo entre llaves');const vals=[...groups[0].matchAll(/0x([0-9a-fA-F]{2})/g)].map(m=>parseInt(m[1],16));if(vals.length!==height*16)throw Error(`Este bitmap debe contener ${height*16} bytes para 128×${height}px; recibió ${vals.length}`);remember();pixels=bitmapToPixels(Uint8Array.from(vals),height);render();queueFrame();status('Bitmap cargado')
		}
		catch(err){
			dialog(err.message)
		}
	};
	function bitmapBytes(p,h){
		const old=pixels,oh=height;pixels=p;height=h;const b=bytes();pixels=old;height=oh;return b
	}
	document.querySelectorAll('.frame-slot').forEach(b=>b.onclick=()=>{
		if(playing)return;const i=+b.dataset.frame;if(frames[i]){
			restore(frames[i]);selectedFrame=i;status(`Frame ${i+1} cargado`)
		}
		else{
			frames[i]=snapshot();selectedFrame=i;status(`Frame ${i+1} guardado`)
		}
		updateFrames()
	});function updateFrames(){
		document.querySelectorAll('.frame-slot').forEach((b,i)=>{
			b.textContent=frames[i]?'✓':'';b.classList.toggle('selected',i===selectedFrame)
		})
	}
	$('deleteFrame').onclick=()=>{
		if(selectedFrame===null)return status('Selecciona un frame para borrarlo');frames[selectedFrame]=null;status(`Frame ${selectedFrame+1} eliminado`);selectedFrame=null;updateFrames()
	};$('playButton').onclick=()=>{
		if(playing){
			playing=false;clearTimeout(playTimer);$('playButton').textContent='▶';status('Animación detenida');return
		}
		const all=frames.filter(Boolean);if(!all.length)return dialog('Guarda al menos un frame antes de reproducir.');const saved=snapshot();playing=true;$('playButton').textContent='■';let i=0;status('Animación en reproducción');const next=async()=>{
			if(!playing){
				restore(saved);return
			}
			const f=all[i++%all.length];height=f.height;pixels=Uint8Array.from(f.pixels);render();const sent=serialReady?await queueFrame():true;if(!playing)return;if(!sent){
				playing=false;$('playButton').textContent='▶';status('La placa no confirmó el frame de animación');return
			}
			playTimer=setTimeout(next,+$('animationDelay').value.split(' ')[0])
		};next()
	};
	function dialog(text){
		$('dialogText').textContent=text;$('messageDialog').showModal()
	}
	$('dialogClose').onclick=()=>$('messageDialog').close();
	function checksum(a){
		return a.reduce((x,y)=>x^y,0)
	}
	function packet(cmd,payload=[]){
		const a=Uint8Array.from([0xaa,cmd,payload.length&255,payload.length>>8,...payload]);return Uint8Array.from([...a,checksum(a.slice(1))])
	}
	const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
	async function receiveLoop(){
		readerRunning=true;try{
			while(serialPort?.readable&&reader){
				const {
					value,done
				}
				=await reader.read();if(done)break;if(value)serialBuffer.push(...value)
			}
		}
		catch{
			if(serialReady)status('La conexión serial se interrumpió')
		}
		finally{
			readerRunning=false
		}
	}
	async function connect(){
		if(!('serial'in navigator))return dialog('Web Serial requiere Chrome o Edge en un contexto seguro (HTTPS).');if(serialPort){
			await disconnect();return
		}
		try{
			serialPort=await navigator.serial.requestPort();await serialPort.open({
				baudRate:115200
			});reader=serialPort.readable.getReader();serialBuffer=[];receiveLoop();status('Esperando reinicio de la placa…');await delay(1500);serialReady=true;if(await configureHeight()&&await sendFrame()){
				$('connectButton').textContent='Desconectar';$('connectionLed').classList.add('connected');status('Conectado a la placa')
			}
			else await disconnect()
		}
		catch(e){
			serialPort=null;dialog(`No se pudo abrir el puerto serial: ${e.message}`)
		}
	}
	async function disconnect(){
		serialReady=false;serialBuffer=[];try{
			await reader?.cancel();reader?.releaseLock();await serialPort?.close()
		}
		catch{
		}
		reader=null;serialPort=null;$('connectButton').textContent='Conectar';$('connectionLed').classList.remove('connected');status('Sin conectar')
	}
	$('connectButton').onclick=connect;
	async function waitAck(command){
		const deadline=Date.now()+1500;while(Date.now()<deadline){
			while(serialBuffer.length&&serialBuffer[0]!==0xaa)serialBuffer.shift();if(serialBuffer.length>=6){
				const len=serialBuffer[2]|(serialBuffer[3]<<8),total=5+len;if(serialBuffer.length>=total){
					const frame=serialBuffer.splice(0,total),actual=checksum(Uint8Array.from(frame.slice(1,-1)));if(frame[1]===0x06&&len===1&&frame[4]===command&&frame.at(-1)===actual)return true
				}
			}
			await delay(2)
		}
		return false
	}
	async function sendPacket(cmd,payload=[]){
		if(!serialReady||!serialPort?.writable)return false;for(let attempt=0;attempt<3;attempt++){
			let w;try{
				w=serialPort.writable.getWriter();await w.write(packet(cmd,payload));w.releaseLock();w=null;if(await waitAck(cmd))return true
			}
			catch{
			}
			finally{
				w?.releaseLock()
			}
		}
		status('La placa no confirmó el comando; reconecta el puerto');return false
	}
	function queuePacket(command,payload=[]){
		serialQueue=serialQueue.then(()=>sendPacket(command,payload)).catch(()=>false);return serialQueue
	}
	function queueFrame(){
		serialQueue=serialQueue.then(()=>sendFrame()).catch(()=>false);return serialQueue
	}
	async function configureHeight(){
		return sendPacket(0x0a,[height])
	}
	async function sendFrame(){
		if(!serialReady)return false;if(!await sendPacket(0x07,[height]))return false;const b=bytes();for(let y=0;y<height;y++)if(!await sendPacket(0x08,[y,...b.slice(y*16,y*16+16)]))return false;return sendPacket(0x09,[])
	}
	buildToolbar();
	// Cierra texto antes de que cualquier botón de la barra cambie de herramienta.
	// pointerdown se usa para evitar que el foco nativo del botón conserve la sesión.
	$('toolbar').addEventListener('pointerdown',()=>{
		textInputEnabled=false;if(textSession?.base)finishText();else{
			textCursorVisible=false;render()
		}
	});
	resizeCanvas();render();updateFrames();setInterval(()=>{
		if(textInputEnabled&&tool==='text'&&textSession?.base){
			textCursorVisible=!textCursorVisible;render()
		}
	},500);
})();
