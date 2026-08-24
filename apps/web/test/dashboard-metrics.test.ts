import assert from 'node:assert/strict'
import test from 'node:test'
import { countDashboardLabels, dashboardLabelsEqual } from '../src/features/dashboard/dashboard-metrics'

test('dashboard groups newly entered assets by their normalized category', () => {
  const groups = countDashboardLabels(['Laptop', ' laptop ', 'LAPTOP', 'Máy in', 'Camera'], 'Chưa phân loại')
  assert.deepEqual(groups, [
    { label: 'Laptop', count: 3 },
    { label: 'Camera', count: 1 },
    { label: 'Máy in', count: 1 },
  ])
})

test('dashboard retains dynamic categories instead of limiting the result to six groups', () => {
  const groups = countDashboardLabels(['A', 'B', 'C', 'D', 'E', 'F', 'G'], 'Chưa phân loại')
  assert.equal(groups.length, 7)
})

test('dashboard category filtering is case, spacing and diacritic insensitive', () => {
  assert.equal(dashboardLabelsEqual('  Màn hình ', 'MAN HINH'), true)
  assert.equal(dashboardLabelsEqual('Laptop', 'Máy in'), false)
})
