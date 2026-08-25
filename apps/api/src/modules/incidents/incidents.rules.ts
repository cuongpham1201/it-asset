import { IncidentImpact,IncidentPriority,IncidentStatus,IncidentUrgency } from '@prisma/client'

const priorityMatrix:Record<IncidentImpact,Record<IncidentUrgency,IncidentPriority>>={
  CRITICAL:{HIGH:'P1',MEDIUM:'P1',LOW:'P2'},
  HIGH:{HIGH:'P1',MEDIUM:'P2',LOW:'P3'},
  MEDIUM:{HIGH:'P2',MEDIUM:'P3',LOW:'P4'},
  LOW:{HIGH:'P3',MEDIUM:'P4',LOW:'P4'},
}

export const incidentPriority=(impact:IncidentImpact,urgency:IncidentUrgency)=>priorityMatrix[impact][urgency]

export const incidentSla=(priority:IncidentPriority)=>({
  P1:{responseMinutes:15,resolutionMinutes:4*60},
  P2:{responseMinutes:30,resolutionMinutes:8*60},
  P3:{responseMinutes:4*60,resolutionMinutes:3*24*60},
  P4:{responseMinutes:8*60,resolutionMinutes:5*24*60},
}[priority])

const transitions:Record<IncidentStatus,IncidentStatus[]>={
  NEW:['ACKNOWLEDGED','CANCELLED'],
  ACKNOWLEDGED:['IN_PROGRESS','CANCELLED'],
  IN_PROGRESS:['MONITORING','RESOLVED'],
  MONITORING:['IN_PROGRESS','RESOLVED'],
  RESOLVED:['IN_PROGRESS','CLOSED'],
  CLOSED:[],
  CANCELLED:[],
}

export function assertIncidentTransition(from:IncidentStatus,to:IncidentStatus){
  if(from===to)return
  if(!transitions[from].includes(to))throw new Error('INCIDENT_TRANSITION_NOT_ALLOWED')
}
