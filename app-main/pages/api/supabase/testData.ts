import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '../../../lib/api/supabaseAdmin'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Query the "drinks" table instead of "my_table"
  const { data, error } = await supabaseAdmin
    .from('package_sizes')
    .select('*') // pick whichever columns you need

  if (error) {
    console.error('Supabase query error:', error)
    return res.status(500).json({ error: error.message })
  }

  return res.status(200).json({ data })
}
