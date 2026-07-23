import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const attachKafkaErrorHandlers = vi.fn()
const kafkaInstance = vi.fn()

vi.mock('../../src/lib/kafkaService.js', () => ({
  attachKafkaErrorHandlers,
  kafkaInstance,
}))

describe('src/lib/subscriberService.js', () => {
  beforeEach(() => {
    kafkaInstance.mockReset()
    attachKafkaErrorHandlers.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('falla si Kafka no fue inicializado', async () => {
    kafkaInstance.mockReturnValue(null)

    const { subscribe } = await import('../../src/lib/subscriberService.js')

    await expect(subscribe('orders', vi.fn())).rejects.toThrow(
      'Kafka not initialized. Call initializeKafka() first.'
    )
  })

  it('crea, configura y conecta el consumer solo una vez', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const connect = vi.fn().mockResolvedValue()
    const commitOffsets = vi.fn().mockResolvedValue()
    const subscribeMock = vi.fn().mockResolvedValue()
    const run = vi.fn().mockResolvedValue()
    const consumer = { connect, commitOffsets, subscribe: subscribeMock, run }
    const kafka = { consumer: vi.fn(() => consumer) }
    const eachMessage = vi.fn()
    kafkaInstance.mockReturnValue(kafka)

    const { subscribe } = await import('../../src/lib/subscriberService.js')

    await subscribe('orders', eachMessage)
    await expect(subscribe('payments', eachMessage)).rejects.toThrow(
      'Kafka consumer with groupId "test-group" is already running.'
    )

    expect(kafka.consumer).toHaveBeenCalledTimes(1)
    expect(kafka.consumer).toHaveBeenCalledWith({ groupId: 'test-group' })
    expect(attachKafkaErrorHandlers).toHaveBeenCalledWith(consumer, 'Consumer-test-group')
    expect(connect).toHaveBeenCalledTimes(1)
    expect(subscribeMock).toHaveBeenNthCalledWith(1, { topic: 'orders', fromBeginning: true })
    expect(subscribeMock).toHaveBeenCalledTimes(1)
    expect(run).toHaveBeenNthCalledWith(1, { eachMessage: expect.any(Function) })
    expect(run).toHaveBeenCalledTimes(1)

    const payload = { topic: 'orders', partition: 1, message: { offset: '41', value: 'order' } }
    await run.mock.calls[0][0].eachMessage(payload)
    await run.mock.calls[0][0].eachMessage(payload)
    await payload.acknowledge()

    expect(eachMessage).toHaveBeenCalledWith(payload)
    expect(logSpy).toHaveBeenCalledTimes(1)
    expect(logSpy).toHaveBeenCalledWith('[Kafka] Consumer-test-group listening topic "orders" partition 1')
    expect(commitOffsets).toHaveBeenCalledWith([
      { topic: 'orders', partition: 1, offset: '42' },
    ])
  })

  it('suscribe multiples topicos y enruta cada mensaje al handler correspondiente', async () => {
    const connect = vi.fn().mockResolvedValue()
    const subscribeMock = vi.fn().mockResolvedValue()
    const run = vi.fn().mockResolvedValue()
    const consumer = { connect, subscribe: subscribeMock, run }
    const kafka = { consumer: vi.fn(() => consumer) }
    const ordersHandler = vi.fn().mockResolvedValue()
    const paymentsHandler = vi.fn().mockResolvedValue()
    kafkaInstance.mockReturnValue(kafka)

    const { subscribe } = await import('../../src/lib/subscriberService.js')

    await subscribe(
      [
        { topic: 'orders', onMessage: ordersHandler, fromBeginning: false },
        { topic: 'payments', onMessage: paymentsHandler },
        { topic: 'audit' },
      ],
      vi.fn(),
      { groupId: 'multi-group', fromBeginning: true, partitionsConsumedConcurrently: 2 }
    )

    expect(kafka.consumer).toHaveBeenCalledWith({ groupId: 'multi-group' })
    expect(attachKafkaErrorHandlers).toHaveBeenCalledWith(consumer, 'Consumer-multi-group')
    expect(connect).toHaveBeenCalledTimes(1)
    expect(subscribeMock).toHaveBeenNthCalledWith(1, { topic: 'orders', fromBeginning: false })
    expect(subscribeMock).toHaveBeenNthCalledWith(2, { topic: 'payments', fromBeginning: true })
    expect(subscribeMock).toHaveBeenNthCalledWith(3, { topic: 'audit', fromBeginning: true })
    expect(run).toHaveBeenCalledWith({
      partitionsConsumedConcurrently: 2,
      eachMessage: expect.any(Function),
    })

    const { eachMessage } = run.mock.calls[0][0]
    const ordersPayload = { topic: 'orders', partition: 0, message: { value: 'order' } }
    const paymentsPayload = { topic: 'payments', partition: 1, message: { value: 'payment' } }
    const auditPayload = { topic: 'audit', partition: 2, message: { value: 'audit' } }
    const unknownPayload = { topic: 'unknown', partition: 3, message: { value: 'unknown' } }

    await eachMessage(ordersPayload)
    await eachMessage(paymentsPayload)
    await eachMessage(auditPayload)
    await eachMessage(unknownPayload)

    expect(ordersHandler).toHaveBeenCalledWith(ordersPayload)
    expect(paymentsHandler).toHaveBeenCalledWith(paymentsPayload)
    expect(ordersHandler).toHaveBeenCalledTimes(1)
    expect(paymentsHandler).toHaveBeenCalledTimes(1)
  })
})
