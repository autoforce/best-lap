import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { externalUrl } from '../src/lib/utils'

describe('externalUrl', () => {
  it('adds https to addresses saved without the protocol', () => {
    assert.equal(externalUrl('geelybrasil.com.br'), 'https://geelybrasil.com.br')
    assert.equal(externalUrl(' www.site.com.br/loja '), 'https://www.site.com.br/loja')
  })

  it('keeps addresses that already have one', () => {
    assert.equal(externalUrl('https://www.geelybrasil.com.br/itavema-geely'), 'https://www.geelybrasil.com.br/itavema-geely')
    assert.equal(externalUrl('http://site.com'), 'http://site.com')
    assert.equal(externalUrl('HTTPS://Site.com'), 'HTTPS://Site.com')
  })
})
