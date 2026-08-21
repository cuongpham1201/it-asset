import assert from 'node:assert/strict'
import test from 'node:test'
import { MasterDataService } from '../src/modules/master-data/master-data.service'
import { SettingsService } from '../src/modules/settings/settings.service'

test('only administrators can persist application settings',async()=>{
  const service=new SettingsService({} as never)
  await assert.rejects(()=>service.update({key:'regional',value:{language:'vi-VN'}},{id:'user',role:'IT'}),/Chỉ Admin/)
})

test('only administrators can modify master data',async()=>{
  const service=new MasterDataService({} as never)
  await assert.rejects(()=>service.createDepartment({code:'IT',name:'IT'},{id:'user',role:'IT'}),/Chỉ Admin/)
})
