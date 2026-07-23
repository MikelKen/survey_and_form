import { describe, expect, it } from 'vitest'

import * as indexModule from '../src/index.js'
import { initializeKafka } from '../src/lib/kafkaService.js'
import { publish } from '../src/lib/publisherService.js'
import { subscribe } from '../src/lib/subscriberService.js'

describe('src/index.js', () => {
  it('re-exporta initializeKafka desde kafkaService', () => {
    expect(indexModule.initializeKafka).toBe(initializeKafka)
  })

  it('re-exporta publish desde publisherService', () => {
    expect(indexModule.publish).toBe(publish)
  })

  it('re-exporta subscribe desde subscriberService', () => {
    expect(indexModule.subscribe).toBe(subscribe)
  })
})
