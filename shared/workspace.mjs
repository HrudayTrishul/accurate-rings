export const ORDER_STAGES = ['pending', 'in_production', 'inspection', 'packed', 'dispatched', 'delivered'];
export const COST_FIELDS = ['raw_material_cost', 'electricity_cost', 'labour_cost', 'packing_cost', 'transport_cost', 'scrap_rework_loss'];
export const CITY_COORDINATES = { Hyderabad: [17.385, 78.4867], Secunderabad: [17.4399, 78.4983], Chennai: [13.0827, 80.2707], Bengaluru: [12.9716, 77.5946], Pune: [18.5204, 73.8567], Mumbai: [19.076, 72.8777], Delhi: [28.6139, 77.209], Warangal: [17.9689, 79.5941], Ahmedabad: [23.0225, 72.5714], Coimbatore: [11.0168, 76.9558], Visakhapatnam: [17.6868, 83.2185] };
export class WorkspaceError extends Error { constructor(message, status = 400) { super(message); this.status = status; } }
const money = (number) => Math.round(number * 100) / 100;
const nextId = (rows, key) => Math.max(0, ...rows.map(row => Number(row[key]))) + 1;
const dateAt = (today, offset) => { const date = new Date(today); date.setUTCDate(date.getUTCDate() + offset); return date.toISOString().slice(0, 10); };
const text = (value, label, min = 1, max = 120) => { if (typeof value !== 'string' || value.trim().length < min || value.trim().length > max) throw new WorkspaceError(`${label} must contain ${min}–${max} characters.`); return value.trim(); };
const number = (value, label, min = 0, max = 10000000, integer = false) => { if (value === '' || value == null || !Number.isFinite(Number(value)) || Number(value) < min || Number(value) > max || (integer && !Number.isInteger(Number(value)))) throw new WorkspaceError(`${label} must be ${integer ? 'a whole number' : 'a number'} between ${min} and ${max}.`); return Number(value); };
const find = (rows, key, id, label) => { const row = rows.find(item => item[key] === Number(id)); if (!row) throw new WorkspaceError(`${label} was not found.`, 404); return row; };
function validDate(value, label) { const parsed = new Date(value); if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '') || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) throw new WorkspaceError(`${label} must be a valid date.`); return value; }

export function createWorkspace(now = new Date()) {
  const day = offset => dateAt(now, offset);
  const customers = [
    { customer_id: 1, company_name: 'Deccan Motion Systems', customer_name: 'Anil Rao', location: 'Hyderabad' },
    { customer_id: 2, company_name: 'Metro Auto Components', customer_name: 'Kavya Menon', location: 'Chennai' },
    { customer_id: 3, company_name: 'Precision Drive Works', customer_name: 'Arjun Shah', location: 'Pune' },
    { customer_id: 4, company_name: 'Southern Bearings', customer_name: 'Meera Iyer', location: 'Bengaluru' },
    { customer_id: 5, company_name: 'Western Industrial Supply', customer_name: 'Rohan Patel', location: 'Mumbai' },
  ];
  const products = [
    { name: '6205 Inner Ring', grade: 'SAE 52100', specification: 'Ø 25 × 52 mm', price: 86 },
    { name: '6306 Outer Ring', grade: 'SAE 52100', specification: 'Ø 30 × 72 mm', price: 112 },
    { name: 'Precision Spacer Ring', grade: 'EN31', specification: 'Ø 40 × 60 mm', price: 94 },
    { name: 'Tapered Bearing Ring', grade: 'SAE 52100', specification: 'Ø 35 × 62 mm', price: 138 },
  ];
  const orderInfo = [ [1,0,1800,'in_production',-3,4], [2,1,1200,'inspection',-4,2], [3,2,2400,'packed',-7,1], [4,0,900,'pending',-1,7], [5,3,1600,'dispatched',-9,0], [2,2,800,'delivered',-12,-2], [1,1,2000,'pending',0,10], [4,3,600,'delivered',-14,-5] ];
  const orders = orderInfo.map((entry,index) => { const [customer,product,quantity,status,created,due] = entry; const p=products[product]; return { order_id: 1001+index, customer_id: customer, product_name: p.name, grade: p.grade, specification: p.specification, quantity, unit_price: p.price, total_amount: quantity*p.price, order_date: day(created), expected_delivery_date: day(due), status, priority: index===1 ? 'urgent' : 'normal', notes: index===1 ? 'Final dimensional inspection before packing.' : '' }; });
  const inventory = [
    { inventory_id: 1, item_name: 'SAE 52100 steel bar', sku: 'RM-52100', item_type: 'raw_material', available_quantity: 4280, reserved_quantity: 1280, unit: 'kg', low_stock_limit: 1500, location: 'Raw material · A1' },
    { inventory_id: 2, item_name: 'EN31 alloy steel', sku: 'RM-EN31', item_type: 'raw_material', available_quantity: 620, reserved_quantity: 180, unit: 'kg', low_stock_limit: 800, location: 'Raw material · A2' },
    { inventory_id: 3, item_name: '6205 inner rings', sku: 'FG-6205', item_type: 'finished_product', available_quantity: 3120, reserved_quantity: 1800, unit: 'pcs', low_stock_limit: 1000, location: 'Finished goods · B1' },
    { inventory_id: 4, item_name: '6306 outer rings', sku: 'FG-6306', item_type: 'finished_product', available_quantity: 780, reserved_quantity: 400, unit: 'pcs', low_stock_limit: 1000, location: 'Finished goods · B2' },
    { inventory_id: 5, item_name: 'Corrugated cartons', sku: 'PK-CARTON', item_type: 'packing_material', available_quantity: 460, reserved_quantity: 60, unit: 'pcs', low_stock_limit: 200, location: 'Packing · C1' },
    { inventory_id: 6, item_name: 'Rust preventive oil', sku: 'RM-OIL', item_type: 'raw_material', available_quantity: 185, reserved_quantity: 20, unit: 'litres', low_stock_limit: 80, location: 'Stores · A3' },
  ];
  const machines = [
    { machine_id: 1, machine_name: 'CNC Turning · 01', department: 'Turning', power_rating_kw: 12, status: 'active', operator_name: 'Ravi Kumar', capacity_hours: 8 },
    { machine_id: 2, machine_name: 'CNC Turning · 02', department: 'Turning', power_rating_kw: 12, status: 'active', operator_name: 'Neha Singh', capacity_hours: 8 },
    { machine_id: 3, machine_name: 'Centreless Grinder · 01', department: 'Grinding', power_rating_kw: 18, status: 'active', operator_name: 'Suresh Babu', capacity_hours: 8 },
    { machine_id: 4, machine_name: 'Heat Treatment · 01', department: 'Heat treatment', power_rating_kw: 32, status: 'maintenance', operator_name: 'Asha Reddy', capacity_hours: 8 },
  ];
  const production = [
    { production_id: 501, order_id:1001, machine_id:1, operator_name:'Ravi Kumar', target_quantity:1800, quantity_produced:1260, production_date:day(0), status:'in_progress' },
    { production_id: 502, order_id:1002, machine_id:2, operator_name:'Neha Singh', target_quantity:1200, quantity_produced:1200, production_date:day(-1), status:'completed' },
    { production_id: 503, order_id:1003, machine_id:3, operator_name:'Suresh Babu', target_quantity:2400, quantity_produced:2400, production_date:day(-2), status:'completed' },
    { production_id: 504, order_id:1005, machine_id:1, operator_name:'Ravi Kumar', target_quantity:1600, quantity_produced:1600, production_date:day(-3), status:'completed' },
    { production_id: 505, order_id:1006, machine_id:3, operator_name:'Suresh Babu', target_quantity:800, quantity_produced:800, production_date:day(-5), status:'completed' },
    { production_id: 506, order_id:1008, machine_id:2, operator_name:'Neha Singh', target_quantity:600, quantity_produced:600, production_date:day(-7), status:'completed' },
  ];
  const inspections = [
    { inspection_id:701, production_id:502, order_id:1002, quantity_checked:0, accepted_rings:0, faulty_rings:0, reworked_quantity:0, scrap_quantity:0, inspection_date:day(0), inspector_name:'', status:'pending', remarks:'Awaiting dimensional inspection' },
    ...production.slice(2).map((p,i)=>({inspection_id:702+i, production_id:p.production_id, order_id:p.order_id, quantity_checked:p.quantity_produced, accepted_rings:p.quantity_produced, faulty_rings:0, reworked_quantity:0, scrap_quantity:0, inspection_date:day(-2-i), inspector_name:'Priya Sharma', status:'completed', remarks:'Dimensions and surface finish within tolerance' })),
  ];
  const dispatches = [
    { dispatch_id:901, order_id:1003, packed_quantity:2400, packing_date:day(0), dispatch_date:null, delivery_date:null, delivery_status:'packed', transport_details:'Deccan Logistics · MH12 AB 4218', tracking_reference:'DL-8421' },
    { dispatch_id:902, order_id:1005, packed_quantity:1600, packing_date:day(-2), dispatch_date:day(-1), delivery_date:null, delivery_status:'dispatched', transport_details:'Western Freight · MH04 CX 1830', tracking_reference:'WF-6290' },
    { dispatch_id:903, order_id:1006, packed_quantity:800, packing_date:day(-4), dispatch_date:day(-3), delivery_date:day(-2), delivery_status:'delivered', transport_details:'Southline Cargo', tracking_reference:'SC-5716' },
    { dispatch_id:904, order_id:1008, packed_quantity:600, packing_date:day(-7), dispatch_date:day(-6), delivery_date:day(-5), delivery_status:'delivered', transport_details:'Southline Cargo', tracking_reference:'SC-5682' },
  ];
  const finance = orders.map((o,i)=>{const costs={raw_material_cost:money(o.quantity*36),electricity_cost:1800+i*140,labour_cost:money(o.quantity*13),packing_cost:money(o.quantity*2.4),transport_cost:1600+i*100,scrap_rework_loss:i===1?480:0};const total=COST_FIELDS.reduce((sum,key)=>sum+costs[key],0);return{profit_id:o.order_id,order_id:o.order_id,selling_amount:o.total_amount,...costs,total_cost:money(total),profit_or_loss:money(o.total_amount-total),record_date:o.status==='delivered'?day(-2-i%2):o.order_date,status:o.status==='delivered'?'realized':'forecast'};});
  const machineUsage = Array.from({length:21},(_,i)=>{const m=machines[i%3];const offset=-Math.floor(i/3);const hours=[6.5,5.8,7.1][i%3];return{usage_id:801+i,machine_id:m.machine_id,order_id:1001+i%3,start_time:`${day(offset)}T08:00:00Z`,end_time:`${day(offset)}T${String(8+Math.floor(hours)).padStart(2,'0')}:${Math.round((hours%1)*60).toString().padStart(2,'0')}:00Z`,running_hours:hours,operator_name:m.operator_name};});
  return { customers,products,orders,inventory,machines,production,outputLog:production.map(p=>({output_id:p.production_id,production_id:p.production_id,quantity_produced:p.quantity_produced,production_date:p.production_date})),inspections,dispatches,finance,machineUsage,activity:[{activity_id:1,type:'quality',message:'LOT-503 cleared for dispatch',at:new Date(now).toISOString(),customer_id:3},{activity_id:2,type:'dispatch',message:'ORD-1005 dispatched to Mumbai',at:new Date(new Date(now).getTime()-3600000).toISOString(),customer_id:5},{activity_id:3,type:'production',message:'LOT-501 reached 1,260 of 1,800 rings',at:new Date(new Date(now).getTime()-7200000).toISOString(),customer_id:1}],meta:{plant:'Nacharam, Secunderabad',updated_at:new Date(now).toISOString()} };
}

export function emptyWorkspace(now = new Date()) {
  const seed=createWorkspace(now);
  return {...seed,customers:[],orders:[],inventory:[],machines:[],production:[],outputLog:[],inspections:[],dispatches:[],finance:[],machineUsage:[],activity:[]};
}

export function visibleWorkspace(state, user) {
  const visible=structuredClone(state);
  if(user.role==='customer') {
    visible.orders=visible.orders.filter(o=>o.customer_id===user.customer_id);
    const ids=new Set(visible.orders.map(o=>o.order_id));
    visible.customers=visible.customers.filter(c=>c.customer_id===user.customer_id);
    visible.dispatches=visible.dispatches.filter(d=>ids.has(d.order_id));
    visible.activity=visible.activity.filter(a=>a.customer_id===user.customer_id);
    for(const name of ['inventory','machines','production','outputLog','inspections','finance','machineUsage'])visible[name]=[];
  } else if(user.role==='staff') visible.finance=[];
  return visible;
}

export function applyAction(original, action, payload, user, now=new Date()) {
  if(!['admin','staff'].includes(user?.role))throw new WorkspaceError('Your role has view-only access.',403);
  if(['updateCosts','createMachine','updateMachine'].includes(action)&&user.role!=='admin')throw new WorkspaceError('Only an administrator can change costs or machine configuration.',403);
  const state=structuredClone(original), today=dateAt(now,0);
  let message='', customerId=null;
  const orderFor=id=>find(state.orders,'order_id',id,'Order');
  if(action==='createOrder') {
    const company=text(payload.company_name,'Company',2); const contact=text(payload.customer_name,'Contact name',2); const city=text(payload.location,'Customer city',2);
    const product=text(payload.product_name,'Product',2);const quantity=number(payload.quantity,'Quantity',1,10000000,true);const price=number(payload.unit_price,'Unit price',0.01);
    const due=validDate(payload.expected_delivery_date,'Delivery date');if(due<today)throw new WorkspaceError('Delivery date cannot be in the past.');
    let customer=state.customers.find(c=>c.company_name.toLowerCase()===company.toLowerCase());
    if(!customer){customer={customer_id:nextId(state.customers,'customer_id'),company_name:company,customer_name:contact,location:city};state.customers.push(customer);}
    const catalog=state.products.find(p=>p.name===product);
    const order={order_id:nextId(state.orders,'order_id'),customer_id:customer.customer_id,product_name:product,grade:catalog?.grade||'As specified',specification:catalog?.specification||'As specified',quantity,unit_price:price,total_amount:money(quantity*price),order_date:today,expected_delivery_date:due,status:'pending',priority:payload.priority==='urgent'?'urgent':'normal',notes:typeof payload.notes==='string'?payload.notes.slice(0,500):''};
    state.orders.push(order); customerId=customer.customer_id;message=`ORD-${order.order_id} created for ${company}`;
  } else if(action==='adjustStock') {
    const item=find(state.inventory,'inventory_id',payload.inventory_id,'Stock item');const delta=number(payload.delta,'Adjustment',-10000000,10000000);if(delta===0)throw new WorkspaceError('Enter a non-zero adjustment.');
    const reason=text(payload.reason,'Adjustment reason',3,240);if(item.available_quantity+delta<item.reserved_quantity)throw new WorkspaceError('Adjustment would reduce stock below the reserved quantity.');
    item.available_quantity=money(item.available_quantity+delta);message=`${item.sku}: ${delta>0?'+':''}${delta} ${item.unit} · ${reason}`;
  } else if(action==='createStockItem') {
    const sku=text(payload.sku,'SKU',2,40).toUpperCase();if(state.inventory.some(i=>i.sku===sku))throw new WorkspaceError('This SKU already exists.');
    if(!['raw_material','finished_product','packing_material'].includes(payload.item_type))throw new WorkspaceError('Choose a stock category.');
    if(!['kg','pcs','litres','metres'].includes(payload.unit))throw new WorkspaceError('Choose a supported unit.');
    state.inventory.push({inventory_id:nextId(state.inventory,'inventory_id'),item_name:text(payload.item_name,'Item name',2),sku,item_type:payload.item_type,unit:payload.unit,available_quantity:number(payload.available_quantity,'Opening stock'),reserved_quantity:0,low_stock_limit:number(payload.low_stock_limit,'Reorder level'),location:text(payload.location,'Storage location',2)});message=`${sku} added to inventory`;
  } else if(action==='createMachine'||action==='updateMachine') {
    const name=text(payload.machine_name,'Machine name',2);
    const current=action==='updateMachine'?find(state.machines,'machine_id',payload.machine_id,'Machine'):null;
    if(state.machines.some(m=>m.machine_name.toLowerCase()===name.toLowerCase()&&m.machine_id!==current?.machine_id))throw new WorkspaceError('This machine name already exists.');
    if(!['active','maintenance'].includes(payload.status))throw new WorkspaceError('Choose a machine status.');
    const values={machine_name:name,department:text(payload.department,'Department',2),power_rating_kw:number(payload.power_rating_kw,'Rated power',0.1,1000),capacity_hours:number(payload.capacity_hours,'Daily capacity',0.1,24),operator_name:text(payload.operator_name,'Operator',2),status:payload.status};
    if(current)Object.assign(current,values);else state.machines.push({machine_id:nextId(state.machines,'machine_id'),...values});message=name+' configuration saved';
  } else if(action==='createBatch') {
    const order=orderFor(payload.order_id);const machine=find(state.machines,'machine_id',payload.machine_id,'Machine');if(machine.status!=='active')throw new WorkspaceError('This machine is unavailable for production.');if(['delivered','dispatched'].includes(order.status))throw new WorkspaceError('This order has already entered delivery.');
    const quantity=number(payload.target_quantity,'Batch target',1,10000000,true);
    const allocated=state.production.filter(p=>p.order_id===order.order_id).reduce((sum,p)=>sum+p.target_quantity,0);
    const scrap=state.inspections.filter(i=>i.order_id===order.order_id).reduce((sum,i)=>sum+i.scrap_quantity,0);
    if(allocated+quantity>order.quantity+scrap)throw new WorkspaceError(`Only ${Math.max(0,order.quantity+scrap-allocated)} rings remain to allocate.`);
    const id=nextId(state.production,'production_id');state.production.push({production_id:id,order_id:order.order_id,machine_id:machine.machine_id,operator_name:text(payload.operator_name,'Operator',2),target_quantity:quantity,quantity_produced:0,production_date:today,status:'in_progress'});order.status='in_production';customerId=order.customer_id;message=`LOT-${id} scheduled on ${machine.machine_name}`;
  } else if(action==='updateBatch') {
    const batch=find(state.production,'production_id',payload.production_id,'Batch');if(batch.status==='completed')throw new WorkspaceError('This batch is already complete.',409);
    const increment=number(payload.quantity,'Produced quantity',1,10000000,true);if(batch.quantity_produced+increment>batch.target_quantity)throw new WorkspaceError('Produced quantity cannot exceed the batch target.');
    batch.quantity_produced+=increment;batch.production_date=today;state.outputLog??=original.production.map(p=>({output_id:p.production_id,production_id:p.production_id,quantity_produced:p.quantity_produced,production_date:p.production_date}));state.outputLog.push({output_id:nextId(state.outputLog,'output_id'),production_id:batch.production_id,quantity_produced:increment,production_date:today});const order=orderFor(batch.order_id);customerId=order.customer_id;
    if(batch.quantity_produced===batch.target_quantity){batch.status='completed';state.inspections.push({inspection_id:nextId(state.inspections,'inspection_id'),production_id:batch.production_id,order_id:batch.order_id,quantity_checked:0,accepted_rings:0,faulty_rings:0,reworked_quantity:0,scrap_quantity:0,inspection_date:today,inspector_name:'',status:'pending',remarks:'Awaiting inspection'});order.status=state.production.filter(p=>p.order_id===order.order_id).every(p=>p.status==='completed')&&state.production.filter(p=>p.order_id===order.order_id).reduce((n,p)=>n+p.quantity_produced,0)>=order.quantity?'inspection':'in_production';message=`LOT-${batch.production_id} completed and queued for inspection`;}else message=`LOT-${batch.production_id}: ${batch.quantity_produced} / ${batch.target_quantity} rings`;
  } else if(action==='recordInspection') {
    const inspection=find(state.inspections,'inspection_id',payload.inspection_id,'Inspection');if(inspection.status==='completed')throw new WorkspaceError('This inspection has already been recorded.',409);
    const batch=find(state.production,'production_id',inspection.production_id,'Batch');const accepted=number(payload.accepted_rings,'Accepted rings',0,10000000,true),faulty=number(payload.faulty_rings,'Faulty rings',0,10000000,true),reworked=number(payload.reworked_quantity||0,'Reworked rings',0,10000000,true),scrap=number(payload.scrap_quantity||0,'Scrap rings',0,10000000,true);
    if(accepted+faulty!==batch.quantity_produced)throw new WorkspaceError(`Accepted and faulty rings must total ${batch.quantity_produced}.`);
    if(reworked+scrap>faulty)throw new WorkspaceError('Rework and scrap cannot exceed the faulty quantity.');
    Object.assign(inspection,{quantity_checked:batch.quantity_produced,accepted_rings:accepted,faulty_rings:faulty,reworked_quantity:reworked,scrap_quantity:scrap,inspector_name:text(payload.inspector_name,'Inspector',2),remarks:text(payload.remarks||'Within specified tolerances','Inspection remarks',2,500),inspection_date:today,status:'completed'});customerId=orderFor(inspection.order_id).customer_id;message=`LOT-${batch.production_id} inspected · ${accepted} accepted, ${faulty} faulty`;
  } else if(action==='createDispatch') {
    const order=orderFor(payload.order_id);const qty=number(payload.packed_quantity,'Packed quantity',1,10000000,true);
    const accepted=state.inspections.filter(i=>i.order_id===order.order_id).reduce((sum,i)=>sum+i.accepted_rings+i.reworked_quantity,0);
    const allocated=state.dispatches.filter(d=>d.order_id===order.order_id).reduce((sum,d)=>sum+d.packed_quantity,0);
    if(qty>Math.min(accepted,order.quantity)-allocated)throw new WorkspaceError('Packed quantity exceeds inspected, unallocated rings.');
    const id=nextId(state.dispatches,'dispatch_id');state.dispatches.push({dispatch_id:id,order_id:order.order_id,packed_quantity:qty,packing_date:today,dispatch_date:null,delivery_date:null,delivery_status:'packed',transport_details:text(payload.transport_details,'Transport details',3,240),tracking_reference:text(payload.tracking_reference,'Tracking reference',2,80)});if(!['dispatched','delivered'].includes(order.status))order.status='packed';customerId=order.customer_id;message=`DSP-${id} packed for ${qty} rings`;
  } else if(action==='advanceDispatch') {
    const dispatch=find(state.dispatches,'dispatch_id',payload.dispatch_id,'Dispatch');if(dispatch.delivery_status==='delivered')throw new WorkspaceError('Delivery is complete and cannot be moved backward.',409);
    const order=orderFor(dispatch.order_id);customerId=order.customer_id;
    if(dispatch.delivery_status==='packed'){dispatch.delivery_status='dispatched';dispatch.dispatch_date=today;order.status='dispatched';}else{dispatch.delivery_status='delivered';dispatch.delivery_date=today;const delivered=state.dispatches.filter(d=>d.order_id===order.order_id&&d.delivery_status==='delivered').reduce((sum,d)=>sum+d.packed_quantity,0);if(delivered>=order.quantity){order.status='delivered';const finance=state.finance.find(f=>f.order_id===order.order_id);if(finance){finance.status='realized';finance.record_date=today;}}}
    message=`DSP-${dispatch.dispatch_id} ${dispatch.delivery_status}`;
  } else if(action==='logRuntime') {
    const machine=find(state.machines,'machine_id',payload.machine_id,'Machine');if(machine.status!=='active')throw new WorkspaceError('This machine is under maintenance.');
    const hours=number(payload.running_hours,'Running hours',0.1,24);const order=orderFor(payload.order_id);const end=new Date(now),start=new Date(end.getTime()-hours*3600000);
    state.machineUsage.push({usage_id:nextId(state.machineUsage,'usage_id'),machine_id:machine.machine_id,order_id:order.order_id,start_time:start.toISOString(),end_time:end.toISOString(),running_hours:money(hours),operator_name:text(payload.operator_name,'Operator',2)});customerId=order.customer_id;message=`${machine.machine_name}: ${hours} hours logged`;
  } else if(action==='updateCosts') {
    const order=orderFor(payload.order_id);const costs=Object.fromEntries(COST_FIELDS.map(key=>[key,money(number(payload[key],key.replaceAll('_',' ')))]));const total=money(COST_FIELDS.reduce((sum,key)=>sum+costs[key],0));
    let record=state.finance.find(f=>f.order_id===order.order_id);if(!record){record={profit_id:order.order_id,order_id:order.order_id};state.finance.push(record);}
    Object.assign(record,{selling_amount:order.total_amount,...costs,total_cost:total,profit_or_loss:money(order.total_amount-total),record_date:today,status:order.status==='delivered'?'realized':'forecast'});customerId=order.customer_id;message=`ORD-${order.order_id} cost sheet updated`;
  } else throw new WorkspaceError('This action is not supported.',404);
  state.activity.unshift({activity_id:nextId(state.activity,'activity_id'),type:action,message,at:new Date(now).toISOString(),customer_id:customerId,actor:user.name});state.activity=state.activity.slice(0,100);state.meta.updated_at=new Date(now).toISOString();
  return {state,message};
}

export function reportFor(state, period='monthly', now=new Date()) {
  const end=new Date(now);const start=new Date(now);start.setUTCHours(0,0,0,0);
  if(period==='weekly')start.setUTCDate(start.getUTCDate()-6);else if(period==='yearly'){start.setUTCMonth(0,1);}else start.setUTCDate(1);
  const within=value=>{const d=new Date(value);return d>=start&&d<=end;};
  const orders=state.orders.filter(o=>within(o.order_date));const production=(state.outputLog||state.production).filter(p=>within(p.production_date));const quality=state.inspections.filter(i=>within(i.inspection_date)&&i.status==='completed');const finance=state.finance.filter(f=>within(f.record_date));const usage=state.machineUsage.filter(m=>within(m.start_time));
  return{orders:orders.length,ordered:orders.reduce((s,o)=>s+o.quantity,0),produced:production.reduce((s,p)=>s+p.quantity_produced,0),accepted:quality.reduce((s,i)=>s+i.accepted_rings,0),faulty:quality.reduce((s,i)=>s+i.faulty_rings,0),profit:money(finance.filter(f=>f.status==='realized').reduce((s,f)=>s+f.profit_or_loss,0)),electricity:money(usage.reduce((s,u)=>s+u.running_hours*(state.machines.find(m=>m.machine_id===u.machine_id)?.power_rating_kw||0),0)),dispatches:state.dispatches.filter(d=>d.dispatch_date&&within(d.dispatch_date)).length};
}
