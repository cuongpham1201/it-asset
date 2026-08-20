import assert from 'node:assert/strict'
import test from 'node:test'
import { PeopleService } from '../src/modules/people/people.service'

test('only Admin and IT may manage asset recipients',()=>{
  const service=new PeopleService({} as any)
  assert.doesNotThrow(()=>service.assertManager({id:'admin',role:'ADMIN'}))
  assert.doesNotThrow(()=>service.assertManager({id:'it',role:'IT'}))
  assert.throws(()=>service.assertManager({id:'user',role:'USER'}),/Admin hoặc IT/)
})
