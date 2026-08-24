import assert from 'node:assert/strict'
import test from 'node:test'
import { AssetsService } from '../src/modules/assets/assets.service'

test('scan queries PostgreSQL by asset tag, barcode or serial',async()=>{
  let captured:any
  const expected={id:'asset-1',assetTag:'TS-2026-001'}
  const db={asset:{findFirst:({where}:any)=>{captured=where;return Promise.resolve(expected)}}}
  const service=new AssetsService(db as any)
  assert.equal(await service.scan('  BC-000001  ',{id:'admin',role:'ADMIN',departmentId:null}),expected)
  assert.equal(captured.deletedAt,null)
  assert.deepEqual(captured.OR.map((item:any)=>Object.keys(item)[0]),['assetTag','barcode','serialNumber'])
  assert.equal(captured.OR[1].barcode.equals,'BC-000001')
})

test('HCNS scan cannot resolve assets outside its department',async()=>{
  let captured:any
  const db={asset:{findFirst:({where}:any)=>{captured=where;return Promise.resolve(null)}}}
  const service=new AssetsService(db as any)
  await assert.rejects(()=>service.scan('TS-OTHER-001',{id:'hr',role:'HCNS',departmentId:'department-hr'}),/Không tìm thấy tài sản/)
  assert.equal(captured.departmentId,'department-hr')
})
