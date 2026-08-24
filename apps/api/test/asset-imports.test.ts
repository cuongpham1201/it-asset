import assert from 'node:assert/strict'
import test from 'node:test'
import { validateImportPayload } from '../src/modules/asset-imports/asset-imports.rules'
import { AssetImportsService } from '../src/modules/asset-imports/asset-imports.service'

const valid={assetTag:'TS-001',name:'Laptop',barcode:'BC-001',categoryId:'10000000-0000-4000-8000-000000000001',warehouseId:'10000000-0000-4000-8000-000000000002',purchaseCost:100}

test('Excel staging validation accepts a complete row',()=>assert.deepEqual(validateImportPayload(valid),[]))
test('Excel staging reports missing identity and invalid references without partial commit',()=>{const errors=validateImportPayload({...valid,assetTag:'',categoryId:'bad',purchaseCost:-1});assert.ok(errors.some(value=>value.includes('assetTag')));assert.ok(errors.some(value=>value.includes('categoryId')));assert.ok(errors.some(value=>value.includes('purchaseCost')))})

test('rollback refuses a committed batch after any downstream asset operation',async()=>{
  let assetUpdated=false
  const tx={assetImportBatch:{findUnique:async()=>({status:'COMMITTED',committedRows:1,sourceFileName:'assets.xlsx',rows:[{rowNumber:2,assetId:'asset-1',asset:{deletedAt:null,currentCustodianId:'person-1',status:{code:'IN_USE'},_count:{assignments:1,returns:0,transfers:0,maintenanceRecords:0,inventoryItems:0,histories:2}}}]})},asset:{update:async()=>{assetUpdated=true}}}
  const service=new AssetImportsService({$transaction:(work:any)=>work(tx)} as any)
  await assert.rejects(()=>service.rollback('batch-1',{id:'admin',role:'ADMIN',departmentId:null}),/Không thể rollback/)
  assert.equal(assetUpdated,false)
})
