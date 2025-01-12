// /pages/test-relations.tsx

import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { parse } from 'cookie'

interface PackageDrinkData {
  package_slug: string
  package_title: string
  drink_slug: string
  drink_name: string
}

export default function TestRelationsPage() {
  const [data, setData] = useState<PackageDrinkData[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string>('')

  useEffect(() => {
    (async () => {
      try {
        // 1) Attempt to parse session_id from client cookies
        const cookiesObj = parse(document.cookie || '')
        let localSessionId = cookiesObj.session_id || ''

        // 2) Call our getOrCreateSession endpoint
        //    If sessionId doesn't exist, it will be created server-side
        const sessionRes = await axios.post(
          '/api/supabase/getOrCreateSession',
          { sessionId: localSessionId },
          { withCredentials: true } // So browser can store any new cookie
        )

        // 3) The API returns { session, newlyCreated }
        const { session, newlyCreated } = sessionRes.data
        const newSessionId = session?.session_id

        // 4) If a new session was created, store it in a client cookie
        if (newSessionId && newSessionId !== localSessionId) {
          document.cookie = `session_id=${newSessionId}; path=/;`
        }
        setSessionId(newSessionId || '')

        // 5) Now fetch the relational data from testRelations
        const response = await axios.get('/api/supabase/testRelations')
        setData(response.data.data)
      } catch (err) {
        console.error('Error in TestRelationsPage useEffect:', err)
        setError('Failed to fetch data')
      }
    })()
  }, [])

  if (error) return <p style={{ color: 'red' }}>Error: {error}</p>
  if (!data) return <p>Loading data...</p>

  return (
    <div style={{ padding: '1rem' }}>
      <h1>Test Supabase Relations</h1>

      <p>Your client-side session_id is: <strong>{sessionId || '(none)'}</strong></p>

      <p>This list shows which drinks belong to which package.</p>
      <table style={{ borderCollapse: 'collapse', marginTop: '1rem' }}>
        <thead>
          <tr>
            <th style={{ border: '1px solid #ccc', padding: 8 }}>Package Slug</th>
            <th style={{ border: '1px solid #ccc', padding: 8 }}>Package Title</th>
            <th style={{ border: '1px solid #ccc', padding: 8 }}>Drink Slug</th>
            <th style={{ border: '1px solid #ccc', padding: 8 }}>Drink Name</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr key={idx}>
              <td style={{ border: '1px solid #ccc', padding: 8 }}>{row.package_slug}</td>
              <td style={{ border: '1px solid #ccc', padding: 8 }}>{row.package_title}</td>
              <td style={{ border: '1px solid #ccc', padding: 8 }}>{row.drink_slug}</td>
              <td style={{ border: '1px solid #ccc', padding: 8 }}>{row.drink_name}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
