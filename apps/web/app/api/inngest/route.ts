import { serve } from 'inngest/next'
import { inngest } from '@/inngest/client'
import { brokerCron, radarCron, enrichmentCron, scoringCron, dossierCron, digestCron, dedupCron } from '@/inngest/functions'

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [brokerCron, radarCron, enrichmentCron, scoringCron, dossierCron, digestCron, dedupCron],
})
