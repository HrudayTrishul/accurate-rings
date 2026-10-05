import test from 'node:test';
import assert from 'node:assert/strict';
import { applyAction, createWorkspace, emptyWorkspace, visibleWorkspace, reportFor, COST_FIELDS, WorkspaceError } from '../shared/workspace.mjs';
const now=new Date('2026-10-05T18:00:00Z'),admin={role:'admin',name:'Test administrator'};
const act=(state,action,payload,date=now)=>applyAction(state,action,payload,admin,date).state;
const orderPayload={company_name:'Test Customer',customer_name:'Test Contact',location:'Chennai',product_name:'6205 Inner Ring',quantity:100,unit_price:86,expected_delivery_date:'2026-10-12'};
const machinePayload={machine_name:'Test CNC',department:'Turning',operator_name:'Test Operator',power_rating_kw:12,capacity_hours:8,status:'active'};
function blankOrder(){return act(act(emptyWorkspace(now),'createMachine',machinePayload),'createOrder',orderPayload);}
test('a real order proceeds through production, quality and two partial deliveries',()=>{
 let state=blankOrder();state=act(state,'createBatch',{order_id:1,machine_id:1,target_quantity:100,operator_name:'Test Operator'});
 state=act(state,'updateBatch',{production_id:1,quantity:40},new Date('2026-10-04T12:00:00Z'));
 state=act(state,'updateBatch',{production_id:1,quantity:60});assert.equal(state.orders[0].status,'inspection');assert.equal(state.inspections.length,1);
 assert.equal(reportFor(state,'weekly',now).produced,100);assert.equal(state.outputLog.length,2);
 state=act(state,'recordInspection',{inspection_id:1,accepted_rings:95,faulty_rings:5,reworked_quantity:5,scrap_quantity:0,inspector_name:'Test Inspector'});
 state=act(state,'updateCosts',{order_id:1,...Object.fromEntries(COST_FIELDS.map(k=>[k,100]))});
 for(const qty of [40,60])state=act(state,'createDispatch',{order_id:1,packed_quantity:qty,transport_details:'Test Carrier',tracking_reference:'TEST-'+qty});
 assert.throws(()=>act(state,'createDispatch',{order_id:1,packed_quantity:1,transport_details:'Test Carrier',tracking_reference:'EXTRA'}),/exceeds/);
 state=act(state,'advanceDispatch',{dispatch_id:1});state=act(state,'advanceDispatch',{dispatch_id:1});assert.notEqual(state.orders[0].status,'delivered');assert.equal(state.finance[0].status,'forecast');
 state=act(state,'advanceDispatch',{dispatch_id:2});state=act(state,'advanceDispatch',{dispatch_id:2});assert.equal(state.orders[0].status,'delivered');assert.equal(state.finance[0].status,'realized');assert.equal(state.finance[0].profit_or_loss,8000);
 assert.throws(()=>act(state,'advanceDispatch',{dispatch_id:2}),/complete/);
 assert.equal(reportFor(state,'monthly',now).profit,8000);
});
test('invalid changes are atomic, reject overproduction and reconcile inspections',()=>{
 const state=createWorkspace(now),before=JSON.stringify(state);
 for(const [action,payload] of [['adjustStock',{inventory_id:1,delta:-4000,reason:'Invalid stock issue'}],['updateBatch',{production_id:501,quantity:1000}],['recordInspection',{inspection_id:701,accepted_rings:1190,faulty_rings:5,inspector_name:'Test Inspector'}],['createBatch',{order_id:1004,machine_id:4,target_quantity:1,operator_name:'Test Operator'}]]){
 assert.throws(()=>act(state,action,payload),WorkspaceError);assert.equal(JSON.stringify(state),before);
 }
 assert.throws(()=>act(state,'createOrder',{...orderPayload,expected_delivery_date:'2026-99-99'}),WorkspaceError);
 assert.throws(()=>act(state,'createStockItem',{item_name:'Test',sku:'RM-EN31',item_type:'raw_material',unit:'kg',available_quantity:0,low_stock_limit:0,location:'A2'}),/already exists/);
});
test('role restrictions are enforced in the workflow and returned data',()=>{
 const state=createWorkspace(now);
 assert.throws(()=>applyAction(state,'adjustStock',{},{role:'customer'}),e=>e.status===403);
 assert.throws(()=>applyAction(state,'updateCosts',{},{role:'staff'}),e=>e.status===403);
 const customer=visibleWorkspace(state,{role:'customer',customer_id:2});
 assert.ok(customer.orders.length);assert.ok(customer.orders.every(o=>o.customer_id===2));
 for(const k of ['finance','inventory','machines','production','outputLog','inspections','machineUsage'])assert.deepEqual(customer[k],[]);
 const ids=new Set(customer.orders.map(o=>o.order_id));assert.ok(customer.dispatches.every(d=>ids.has(d.order_id)));assert.deepEqual(visibleWorkspace(state,{role:'staff'}).finance,[]);
});
test('costs are upserted and all six categories are included',()=>{
 let state=createWorkspace(now);const costs=Object.fromEntries(COST_FIELDS.map((k,i)=>[k,(i+1)*100]));
 state=act(state,'updateCosts',{order_id:1001,...costs});state=act(state,'updateCosts',{order_id:1001,...costs,labour_cost:1000});
 assert.equal(state.finance.filter(f=>f.order_id===1001).length,1);const sheet=state.finance.find(f=>f.order_id===1001);
 assert.equal(sheet.total_cost,2800);assert.equal(sheet.selling_amount-sheet.total_cost,sheet.profit_or_loss);
});
test('partial batches retain manufacturing status and scrap opens replacement capacity',()=>{
 let state=blankOrder();state=act(state,'createBatch',{order_id:1,machine_id:1,target_quantity:50,operator_name:'Test Operator'});state=act(state,'updateBatch',{production_id:1,quantity:50});
 assert.equal(state.orders[0].status,'in_production');state=act(state,'recordInspection',{inspection_id:1,accepted_rings:45,faulty_rings:5,scrap_quantity:5,inspector_name:'Test Inspector'});
 state=act(state,'createBatch',{order_id:1,machine_id:1,target_quantity:55,operator_name:'Test Operator'});assert.equal(state.production[1].target_quantity,55);
 assert.throws(()=>act(state,'createBatch',{order_id:1,machine_id:1,target_quantity:1,operator_name:'Test Operator'}),/remain/);
});
test('company mode starts empty and reports exclude old dates and unrealized costs',()=>{
 const state=emptyWorkspace(now);for(const key of ['customers','orders','machines','inventory','production','outputLog','inspections','finance'])assert.deepEqual(state[key],[]);
 const seed=createWorkspace(now);seed.finance.push({record_date:'2025-01-01',status:'realized',profit_or_loss:999999});
 const monthly=reportFor(seed,'monthly',now);assert.equal(monthly.profit,seed.finance.filter(f=>f.status==='realized'&&f.record_date.startsWith('2026-10')).reduce((s,f)=>s+f.profit_or_loss,0));
});
