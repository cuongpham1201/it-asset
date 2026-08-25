import assert from 'node:assert/strict'
import test from 'node:test'
import { assertIncidentTransition,incidentPriority,incidentSla } from '../src/modules/incidents/incidents.rules'

test('incident priority is calculated from impact and urgency',()=>{
  assert.equal(incidentPriority('CRITICAL','HIGH'),'P1')
  assert.equal(incidentPriority('HIGH','MEDIUM'),'P2')
  assert.equal(incidentPriority('MEDIUM','MEDIUM'),'P3')
  assert.equal(incidentPriority('LOW','LOW'),'P4')
})

test('incident workflow prevents skipping assessment and closure stages',()=>{
  assert.doesNotThrow(()=>assertIncidentTransition('NEW','ACKNOWLEDGED'))
  assert.doesNotThrow(()=>assertIncidentTransition('IN_PROGRESS','MONITORING'))
  assert.doesNotThrow(()=>assertIncidentTransition('RESOLVED','CLOSED'))
  assert.throws(()=>assertIncidentTransition('NEW','RESOLVED'),/INCIDENT_TRANSITION_NOT_ALLOWED/)
  assert.throws(()=>assertIncidentTransition('CLOSED','IN_PROGRESS'),/INCIDENT_TRANSITION_NOT_ALLOWED/)
})

test('P1 SLA is stricter than P4',()=>{
  assert.ok(incidentSla('P1').responseMinutes<incidentSla('P4').responseMinutes)
  assert.ok(incidentSla('P1').resolutionMinutes<incidentSla('P4').resolutionMinutes)
})
