import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'

const appSource = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8')
const hookSource = readFileSync(new URL('../src/hooks/useSaveAction.ts', import.meta.url), 'utf8')

test('settings saves wait for the server before touching local state', () => {
  for (const [handler, key] of [['saveBrandingSetting', 'branding'], ['saveEmailSetting', 'email'], ['saveRegionalSetting', 'regional']]) {
    const line = appSource.split('\n').find(row => row.includes(`const ${handler}=`))
    assert.ok(line, `${handler} is missing`)
    assert.match(line!, /async/, `${handler} must await the server`)
    assert.match(line!, new RegExp(`await api\\.put\\('/settings',\\{key:'${key}'`), `${handler} must await the PUT`)
    // The local setter has to come after the await, otherwise a rejected save still "sticks".
    const awaitAt = line!.indexOf('await api.put')
    const setterAt = line!.search(/set(Branding|EmailSettings|Regional)\(value\)/)
    assert.ok(setterAt > awaitAt, `${handler} updates local state before the server confirmed`)
  }
})

test('no settings form announces success before the request resolves', () => {
  assert.equal(appSource.includes("onSave(form);alert("), false, 'a fire-and-forget save with an immediate alert is back')
  for (const message of ['Đã lưu cài đặt khu vực và ngôn ngữ.', 'Đã lưu cấu hình email.', 'Đã lưu nhận diện thương hiệu và mẫu biên bản.']) {
    assert.ok(appSource.includes(`void runSave(form,'${message}')`), `"${message}" is no longer routed through runSave`)
  }
})

test('the save hook only reports success after the promise resolves', async () => {
  assert.match(hookSource, /await save\(value\)\s*\n\s*setState\(\{ saving: false, success: successMessage \}\)/)
  assert.match(hookSource, /catch \(failure\) \{\s*\n\s*setState\(\{ saving: false, error/)
})

test('the asset payload carries manufacturer and model', () => {
  const line = appSource.split('\n').find(row => row.includes('const common={assetTag:secured.code'))
  assert.ok(line, 'asset payload builder is missing')
  assert.match(line!, /manufacturerId:secured\.manufacturerId/)
  assert.match(line!, /modelId:secured\.modelId/)
})

test('the asset form no longer accepts an image it cannot store', () => {
  assert.equal(appSource.includes("update('imageDataUrl'"), false, 'the discarded image input is back')
  assert.equal(appSource.includes('uploadImage'), false, 'the image uploader is back')
  assert.ok(appSource.includes('asset-image-placeholder'), 'the "not supported yet" notice is missing')
})

test('opening the app no longer pulls the whole asset table', () => {
  const loader = appSource.slice(appSource.indexOf('const refreshServerData='), appSource.indexOf('const actionType'))
  assert.equal(/\/assets\?page=/.test(loader), false, 'the shell loader fetches asset pages again')
  assert.equal(/totalPages/.test(loader), false, 'the page fan-out is back')
})
