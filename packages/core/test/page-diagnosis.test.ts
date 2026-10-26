import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { extractPageSnapshot, resourceKey } from '../src/utils/extract-page-snapshot'
import {
  addDays,
  buildGroupRecommendations,
  buildPageRecommendations,
  compareSnapshots,
  localDay,
} from '../src/utils/page-diagnosis'
import type { PageSnapshotData, SnapshotGroupAggregate } from '../src/modules/insights/page-snapshot.interface'

// Trimmed from a real PageSpeed Insights response (Lighthouse 13.5, mobile) of site.autoforce.com
const lighthouseResult = JSON.parse(readFileSync(join(__dirname, 'fixtures', 'lighthouse-13.5-snapshot.json'), 'utf8'))

describe('resourceKey', () => {
  it('drops the query string and www, and replaces build hashes, UUIDs and long ids', () => {
    assert.equal(
      resourceKey('https://assets.autodromo.com.br/_next/static/chunks/main-af7f8b75f41a1eea.js'),
      'assets.autodromo.com.br/_next/static/chunks/main-*.js'
    )
    assert.equal(
      resourceKey('https://www.googletagmanager.com/gtag/js?id=G-RJ0CRE4KYJ&cx=c'),
      'googletagmanager.com/gtag/js'
    )
    assert.equal(
      resourceKey('https://static.autodromo.com.br/uploads/9ab0b541-edb5-4154-9e1b-89b54f72dcb8_BANNER.webp?width=800'),
      'static.autodromo.com.br/uploads/*_BANNER.webp'
    )
    assert.equal(resourceKey('https://connect.facebook.net/signals/config/1840091816310510?v=2'), 'connect.facebook.net/signals/config/*')
  })

  it('keeps readable words made of hex letters', () => {
    assert.equal(resourceKey('https://example.com/js/facade.js'), 'example.com/js/facade.js')
  })
})

describe('extractPageSnapshot', () => {
  const snapshot = extractPageSnapshot(lighthouseResult)

  it('reads the page weight by type', () => {
    assert.equal(snapshot.request_count, 109)
    assert.ok(snapshot.total_bytes! > 5_000_000)
    assert.ok(snapshot.bytes_by_type.image > 3_000_000)
    assert.equal(snapshot.bytes_by_type['third-party'], undefined)
  })

  it('splits third parties from the site and the Autoforce platform', () => {
    const gtm = snapshot.third_parties.find((t) => t.entity === 'Google Tag Manager')!
    assert.equal(gtm.own, false)
    assert.equal(gtm.category, 'tag-manager')
    assert.equal(gtm.requests, 4)
    assert.equal(snapshot.third_parties.find((t) => t.entity === 'autodromo.com.br')!.own, true)
    assert.equal(snapshot.third_parties.find((t) => t.entity === 'autoforce.com')!.own, true)
    // Sorted by main-thread time
    assert.equal(snapshot.third_parties[0].entity, 'Google Tag Manager')
  })

  it('keeps the flagged files, merging repeated ones', () => {
    const gtag = snapshot.resources.filter((r) => r.audit === 'unused-javascript' && r.key === 'googletagmanager.com/gtag/js')
    assert.equal(gtag.length, 1)
    assert.equal(gtag[0].count, 3)
    const css = snapshot.resources.find((r) => r.audit === 'render-blocking-insight')!
    assert.equal(css.key, 'assets.autodromo.com.br/_next/static/css/*.css')
    assert.equal(css.own, true)
    assert.ok(css.wasted_ms! > 0)
    // total-byte-weight is kept even though it passes
    assert.ok(snapshot.resources.some((r) => r.audit === 'total-byte-weight'))
  })

  it('reads the LCP element, its breakdown and the discovery checklist', () => {
    assert.equal(snapshot.lcp?.label, 'AutoForce Dashboard')
    assert.equal(snapshot.lcp?.is_image, true)
    assert.equal(snapshot.lcp?.lazy_loaded, false)
    assert.equal(snapshot.lcp?.priority_hinted, false)
    assert.equal(snapshot.lcp?.discoverable, true)
    assert.equal(snapshot.lcp?.load_delay_ms, 697)
  })

  it('reads the server checks', () => {
    assert.deepEqual(snapshot.checks, {
      redirect_ms: 63,
      server_response_ms: 210,
      compression: true,
      dom_elements: 968,
      unsized_images: 12,
    })
  })

  it('stays small enough to keep daily', () => {
    assert.ok(JSON.stringify(snapshot).length < 10_000)
  })

  it('does not fail on an empty result', () => {
    const empty = extractPageSnapshot({})
    assert.deepEqual(empty.resources, [])
    assert.equal(empty.lcp, null)
  })
})

describe('buildPageRecommendations', () => {
  const recs = buildPageRecommendations(extractPageSnapshot(lighthouseResult))
  const ids = recs.map((r) => r.id)

  it('points to the causes found in the real result', () => {
    assert.ok(ids.includes('third-party-cost'))
    assert.ok(ids.includes('many-google-tags'))
    assert.ok(ids.includes('heavy-images'))
    assert.ok(ids.includes('render-blocking'))
    assert.ok(ids.includes('lcp-priority'))
    assert.ok(ids.includes('redirect'))
  })

  it('does not flag what passed', () => {
    assert.ok(!ids.includes('lcp-lazy'))
    assert.ok(!ids.includes('slow-server'))
    assert.ok(!ids.includes('no-compression'))
  })

  it('puts high impact first and names who fixes it', () => {
    const order = { high: 0, medium: 1, low: 2 }
    for (let i = 1; i < recs.length; i++) assert.ok(order[recs[i - 1].impact] <= order[recs[i].impact])
    assert.equal(recs.find((r) => r.id === 'third-party-cost')!.owner, 'tags')
    assert.equal(recs.find((r) => r.id === 'heavy-images')!.owner, 'content')
  })
})

const base: PageSnapshotData = {
  total_bytes: 2_000_000,
  request_count: 80,
  bytes_by_type: { image: 1_000_000, script: 700_000 },
  third_parties: [
    { entity: 'Google Tag Manager', category: 'tag-manager', own: false, bytes: 300_000, main_thread_ms: 400, requests: 2 },
    { entity: 'Hotjar', category: 'analytics', own: false, bytes: 50_000, main_thread_ms: 120, requests: 2 },
  ],
  resources: [{ audit: 'total-byte-weight', key: 'site.com/banner.webp', own: true, total_bytes: 400_000 }],
  lcp: { selector: 'div.banner > img', label: 'Banner', is_image: true },
  checks: { redirect_ms: 0, server_response_ms: 300 },
}

describe('compareSnapshots', () => {
  it('finds nothing between equal snapshots', () => {
    assert.deepEqual(compareSnapshots(base, base), [])
  })

  it('reports new and removed third parties, weight, new heavy files, LCP and redirects, worse first', () => {
    const current: PageSnapshotData = {
      ...base,
      total_bytes: 2_900_000,
      bytes_by_type: { image: 1_800_000, script: 700_000 },
      third_parties: [
        base.third_parties[0],
        { entity: 'Chat Widget', category: 'customer-success', own: false, bytes: 400_000, main_thread_ms: 600, requests: 5 },
      ],
      resources: [
        ...base.resources,
        { audit: 'total-byte-weight', key: 'site.com/video-hero.mp4', own: true, total_bytes: 800_000 },
      ],
      lcp: { selector: 'section.hero > h1', label: 'Título', is_image: false },
      checks: { redirect_ms: 250, server_response_ms: 300 },
    }
    const changes = compareSnapshots(current, base)
    const kinds = changes.map((c) => c.kind)
    assert.ok(kinds.includes('weight'))
    assert.ok(kinds.includes('type_weight'))
    assert.ok(kinds.includes('third_party_added'))
    assert.ok(kinds.includes('third_party_removed'))
    assert.ok(kinds.includes('new_heavy_file'))
    assert.ok(kinds.includes('lcp_element'))
    assert.ok(kinds.includes('redirect'))
    assert.equal(changes[0].direction, 'worse')
    assert.equal(changes.find((c) => c.kind === 'third_party_removed')!.direction, 'better')
    assert.equal(changes.find((c) => c.kind === 'third_party_added')!.title, 'Novo terceiro: Chat Widget')
  })

  it('ignores small swings', () => {
    const current = { ...base, total_bytes: 2_100_000, checks: { ...base.checks, server_response_ms: 450 } }
    assert.deepEqual(compareSnapshots(current, base), [])
  })
})

describe('buildGroupRecommendations', () => {
  const group: SnapshotGroupAggregate = {
    channels_with_data: 10,
    resources: [
      { key: 'assets.autodromo.com.br/_next/static/css/*.css', own: true, audits: ['render-blocking-insight'], channels: 9, avg_wasted_ms: 700, top_channels: [] },
      { key: 'site-a.com/banner.webp', own: true, audits: ['image-delivery-insight'], channels: 2, avg_wasted_bytes: 900_000, top_channels: [] },
    ],
    third_parties: [{ entity: 'Google Tag Manager', category: 'tag-manager', channels: 8, avg_main_thread_ms: 900, avg_bytes: 600_000 }],
    lcp: { image: 9, lazy_loaded: 4, missing_priority_hint: 8, not_discoverable: 0, avg_load_delay_ms: 900 },
    weight: { avg_total_bytes: 4_000_000, avg_bytes_by_type: { image: 2_500_000 } },
  }

  it('flags what repeats across most sites', () => {
    const ids = buildGroupRecommendations(group).map((r) => r.id)
    assert.deepEqual(ids.sort(), ['group-common-tags', 'group-heavy-images', 'group-lcp-lazy', 'group-lcp-priority', 'group-template-files'])
  })

  it('lists only the shared template files as evidence', () => {
    const files = buildGroupRecommendations(group).find((r) => r.id === 'group-template-files')!
    assert.equal(files.evidence.length, 1)
    assert.match(files.evidence[0], /9 de 10 sites/)
  })

  it('needs at least 3 sites', () => {
    assert.deepEqual(buildGroupRecommendations({ ...group, channels_with_data: 2 }), [])
  })
})

describe('dates', () => {
  it('uses the local day of the collection', () => {
    // 01:30 UTC is still the previous day in São Paulo
    assert.equal(localDay(new Date('2026-10-24T01:30:00Z'), 'America/Sao_Paulo'), '2026-10-23')
    assert.equal(addDays('2026-03-01', -7), '2026-02-22')
  })
})
