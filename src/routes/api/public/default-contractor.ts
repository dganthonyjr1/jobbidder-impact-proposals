import { createFileRoute } from '@tanstack/react-router'
import { supabaseAdmin } from '@/integrations/supabase/client.server'

export const Route = createFileRoute('/api/public/default-contractor')({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, {
          status: 204,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET,OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          },
        }),
      GET: async () => {
        // Return the first active contractor's slug and business name
        const { data, error } = await supabaseAdmin
          .from('contractors')
          .select('slug, business_name, logo_url, primary_color')
          .not('slug', 'is', null)
          .limit(1)
          .maybeSingle()

        if (error || !data) {
          return Response.json({ error: 'No contractor found' }, { status: 404 })
        }

        return Response.json(
          { slug: data.slug, business_name: data.business_name, logo_url: data.logo_url, primary_color: data.primary_color },
          {
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Cache-Control': 'public, max-age=60',
            },
          }
        )
      },
    },
  },
})
