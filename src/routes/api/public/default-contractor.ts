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
        // Try to find the contractor by the known slug first
        const { data, error } = await supabaseAdmin
          .from('contractors')
          .select('slug, business_name, logo_url, primary_color')
          .eq('slug', 'mikes-roofing')
          .maybeSingle()

        // If found, return it
        if (!error && data) {
          return Response.json(
            { slug: data.slug, business_name: data.business_name, logo_url: data.logo_url, primary_color: data.primary_color },
            {
              headers: {
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'public, max-age=60',
              },
            }
          )
        }

        // Fallback: return first contractor with any slug
        const { data: fallback, error: fallbackError } = await supabaseAdmin
          .from('contractors')
          .select('slug, business_name, logo_url, primary_color')
          .not('slug', 'is', null)
          .neq('slug', '')
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle()

        if (fallbackError || !fallback) {
          // Last resort: return hardcoded known-good values
          return Response.json(
            { slug: 'mikes-roofing', business_name: 'DGA Management LLC', logo_url: null, primary_color: '#ff6b00' },
            {
              headers: {
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'public, max-age=60',
              },
            }
          )
        }

        return Response.json(
          { slug: fallback.slug, business_name: fallback.business_name, logo_url: fallback.logo_url, primary_color: fallback.primary_color },
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
