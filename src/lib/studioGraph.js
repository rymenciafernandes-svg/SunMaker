export const NODE_TYPES = {
  radar: { title: 'Radar de Oportunidades', kicker: 'IDENTIFICAR', description: 'Detectar oportunidades', params: {target: '35'} },
  simulation: { title: 'Laboratório de Decisões', kicker: 'SIMULAR', description: 'Testar alternativas', params: {priceChange: '5', costChange: '0'} },
  question: { title: 'Pergunte ao SunMaker', kicker: 'CONSULTAR', description: 'Explorar os resultados', params: {question: 'below', target: '35'} },
  filter: { title: 'Condição comercial', kicker: 'FILTRAR', description: 'Selecionar produtos', params: {metric: 'stock', operator: 'gt', value: '0'} },
  report: { title: 'Resumo comercial', kicker: 'REGISTRAR', description: 'Registrar resultados', params: {} },
  alert: { title: 'Gerar alerta comercial', kicker: 'ALERTAR', description: 'Sinalizar itens no histórico', params: {minimum:'1'} },
};
export const QUESTIONS = {
  below: 'Quantos produtos estão abaixo da margem alvo?',
  loss: 'Quantos produtos estão com prejuízo?',
  capital: 'Quanto capital está investido em estoque?',
  margin: 'Qual é a margem média dos produtos?',
  count: 'Quantos produtos foram encontrados?',
};
export function questionFromText(text) {
  const s=String(text).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  if(!s)return '';
  if(/prejuizo|abaixo do custo|perda/.test(s))return 'loss';
  if(/capital|investido|valor.*estoque/.test(s))return 'capital';
  if(/margem/.test(s)&&/abaixo|menor|inferior/.test(s))return 'below';
  if(/margem/.test(s)&&/media/.test(s))return 'margin';
  if(/quantos|quantidade|total/.test(s)&&/produtos|itens/.test(s)&&!/margem|custo|preco|estoque/.test(s))return 'count';
  return '';
}
export const INTERVALS = {0:'Apenas manual',15:'A cada 15 minutos',30:'A cada 30 minutos',60:'A cada hora',360:'A cada 6 horas',720:'A cada 12 horas',1440:'A cada 24 horas'};
export const NODE_WIDTH=180, NODE_HEIGHT=108, BOARD_WIDTH=2220, BOARD_HEIGHT=1540;
export const clamp = (v,a,b) => Math.min(b,Math.max(a,v));
export function makeNode(type,x=30,y=35,id=`n-${Date.now()}-${Math.random().toString(36).slice(2,9)}`) {
  const base=NODE_TYPES[type];
  return {id,type,title:base.title,x:clamp(x,0,2000),y:clamp(y,0,1400),params:{...base.params}};
}
export function template(mode='markup') {
  return {id:null,revision:0,name:'Novo fluxo comercial',mode,interval_minutes:0,active:false,graph:{nodes:[makeNode('radar',30,35,'radar'),makeNode('simulation',245,35,'simulation'),makeNode('question',140,225,'question')],edges:[{source:'radar',target:'simulation'},{source:'simulation',target:'question'}]}};
}
export function orderedNodes(graph) {
  const nodes=graph.nodes, edges=graph.edges;
  if(!nodes.length||nodes.length>12||edges.length!==nodes.length-1) throw Error('Conecte de 1 a 12 blocos em sequência.');
  const ids=new Set(nodes.map(n=>n.id)); const out=new Map(), into=new Set();
  if(ids.size!==nodes.length) throw Error('Blocos duplicados.');
  for(const e of edges){if(!ids.has(e.source)||!ids.has(e.target)||e.source===e.target||out.has(e.source)||into.has(e.target))throw Error('Cada bloco aceita uma entrada e uma saída.');out.set(e.source,e.target);into.add(e.target);}
  const roots=nodes.filter(n=>!into.has(n.id));if(roots.length!==1)throw Error('O fluxo precisa de um único início.');
  const ordered=[],seen=new Set();let cur=roots[0].id;
  while(cur){if(seen.has(cur))throw Error('Não é permitido criar ciclos.');seen.add(cur);ordered.push(nodes.find(n=>n.id===cur));cur=out.get(cur);}
  if(ordered.length!==nodes.length)throw Error('Há blocos desconectados.');return ordered;
}
export function connectEdge(graph,source,target) {
  if(source===target||!graph.nodes.some(n=>n.id===source)||!graph.nodes.some(n=>n.id===target))throw Error('Escolha dois blocos diferentes.');
  if(graph.edges.some(e=>e.source===source||e.target===target))throw Error('A saída ou entrada já está conectada. Remova a conexão antiga primeiro.');
  let at=target;const visited=new Set();while(at){if(at===source||visited.has(at))throw Error('A conexão criaria um ciclo.');visited.add(at);at=graph.edges.find(e=>e.source===at)?.target;}
  return {...graph,edges:[...graph.edges,{source,target}]};
}
export function edgePath(a,b) {
  const x1=a.x+NODE_WIDTH,y1=a.y+NODE_HEIGHT/2,x2=b.x,y2=b.y+NODE_HEIGHT/2;
  const bend=Math.max(45,Math.abs(x2-x1)/2);
  return `M ${x1} ${y1} C ${x1+bend} ${y1}, ${x2-bend} ${y2}, ${x2} ${y2}`;
}
export function validateDraft(draft) {
  if(!draft.name.trim()||draft.name.trim().length>100)throw Error('Informe um nome de até 100 caracteres.');
  if(!['markup','margin'].includes(draft.mode)||!(draft.interval_minutes in INTERVALS))throw Error('Modo ou intervalo inválido.');
  const parse=(v,min,max,inclusive=true)=>{const n=String(v??'').trim()===''?NaN:Number(v);if(!Number.isFinite(n)||n<min||(inclusive?n>max:n>=max))throw Error('Valor inválido nos parâmetros do bloco.');return n;};
  for(const n of orderedNodes(draft.graph)) {
    if(!NODE_TYPES[n.type]||!n.title.trim()||n.title.length>100)throw Error('Revise o título do bloco.');
    if(['radar','question'].includes(n.type))parse(n.params.target,0,100,false);
    if(n.type==='simulation'){const price=parse(n.params.priceChange,-100,500);if(price===-100)throw Error('O preço deve permanecer positivo.');parse(n.params.costChange,-100,500);}
    if(n.type==='question'&&!(n.params.question in QUESTIONS))throw Error('Selecione uma pergunta válida.');
    if(n.type==='filter'){if(!['margin','cost','stock','price'].includes(n.params.metric)||!['lt','lte','gt','gte'].includes(n.params.operator))throw Error('Selecione uma condição válida.');parse(n.params.value,-1e12,1e12);}
    if(n.type==='alert'&&!Number.isInteger(parse(n.params.minimum,1,10000)))throw Error('A quantidade mínima do alerta deve ser inteira.');
  }
  return true;
}
