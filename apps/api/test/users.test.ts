import assert from 'node:assert/strict'
import test from 'node:test'
import { isPasswordPolicyValid } from '../src/auth/password'
import { UsersService } from '../src/modules/users/users.service'

test('local user temporary password enforces the shared password policy',()=>{
  assert.equal(isPasswordPolicyValid('Admin@123'),true)
  assert.equal(isPasswordPolicyValid('admin123'),false)
  assert.equal(isPasswordPolicyValid('Admin123'),false)
  assert.equal(isPasswordPolicyValid('A@1a'),false)
})

test('only administrators may access user management',()=>{
  const service=new UsersService({} as any)
  assert.doesNotThrow(()=>service.assertAdmin({id:'admin',role:'ADMIN'}))
  assert.throws(()=>service.assertAdmin({id:'it',role:'IT'}),/quản trị viên/)
})
