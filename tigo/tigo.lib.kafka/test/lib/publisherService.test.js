import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const attachKafkaErrorHandlers = vi.fn()
const kafkaInstance = vi.fn()

vi.mock('../../src/lib/kafkaService.js', () => ({
  attachKafkaErrorHandlers,
  kafkaInstance,
}))

describe('src/lib/publisherService.js', () => {
  beforeEach(() => {
    kafkaInstance.mockReset()
    attachKafkaErrorHandlers.mockReset()
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('falla si Kafka no fue inicializado', async () => {
    kafkaInstance.mockReturnValue(null)

    const { publish } = await import('../../src/lib/publisherService.js')

    await expect(publish('orders', 'payload')).rejects.toThrow(
      'Kafka not initialized. Call initializeKafka() first.'
    )
  })

  it('crea, configura y conecta el producer solo una vez', async () => {
    const connect = vi.fn().mockResolvedValue()
    const send = vi.fn().mockResolvedValue()
    const producer = { connect, send }
    const kafka = { producer: vi.fn(() => producer) }
    kafkaInstance.mockReturnValue(kafka)

    const { publish } = await import('../../src/lib/publisherService.js')

    await publish('orders', 'first-message')
    await publish('orders', 'second-message')

    expect(kafka.producer).toHaveBeenCalledTimes(1)
    expect(kafka.producer).toHaveBeenCalledWith({ idempotent: true })
    expect(attachKafkaErrorHandlers).toHaveBeenCalledWith(producer, 'Producer')
    expect(connect).toHaveBeenCalledTimes(1)
    expect(send).toHaveBeenNthCalledWith(1, {
      topic: 'orders',
      acks: -1,
      messages: [{ value: 'first-message' }],
    })
    expect(send).toHaveBeenNthCalledWith(2, {
      topic: 'orders',
      acks: -1,
      messages: [{ value: 'second-message' }],
    })
  })

  it('serializa mensajes objeto antes de publicarlos', async () => {
    const connect = vi.fn().mockResolvedValue()
    const send = vi.fn().mockResolvedValue()
    const producer = { connect, send }
    const kafka = { producer: vi.fn(() => producer) }
    kafkaInstance.mockReturnValue(kafka)

    const { publish } = await import('../../src/lib/publisherService.js')

    await publish('orders', { id: 1, status: 'ok' })

    expect(send).toHaveBeenCalledWith({
      topic: 'orders',
      acks: -1,
      messages: [{ value: '{"id":1,"status":"ok"}' }],
    })
  })

  it('falla si el mensaje es undefined', async () => {
    const connect = vi.fn().mockResolvedValue()
    const send = vi.fn().mockResolvedValue()
    const producer = { connect, send }
    const kafka = { producer: vi.fn(() => producer) }
    kafkaInstance.mockReturnValue(kafka)

    const { publish } = await import('../../src/lib/publisherService.js')

    await expect(publish('orders')).rejects.toThrow('Message is required.')
    expect(send).not.toHaveBeenCalled()
  })

  it('reconecta y reintenta publicar si el producer esta desconectado', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const disconnectedError = new Error('producer disconnected')
    disconnectedError.name = 'KafkaJSError'
    const connect = vi.fn().mockResolvedValue()
    const send = vi.fn().mockRejectedValueOnce(disconnectedError).mockResolvedValueOnce()
    const producer = { connect, send }
    const kafka = { producer: vi.fn(() => producer) }
    kafkaInstance.mockReturnValue(kafka)

    const { publish } = await import('../../src/lib/publisherService.js')

    await publish('orders', Buffer.from('retry-message'))

    expect(warnSpy).toHaveBeenCalledWith('[Kafka] Producer disconnected, attempting to reconnect...')
    expect(connect).toHaveBeenCalledTimes(2)
    expect(send).toHaveBeenNthCalledWith(1, {
      topic: 'orders',
      acks: -1,
      messages: [{ value: Buffer.from('retry-message') }],
    })
    expect(send).toHaveBeenNthCalledWith(2, {
      topic: 'orders',
      acks: -1,
      messages: [{ value: Buffer.from('retry-message') }],
    })
  })

  it('propaga errores de envio que no son recuperables', async () => {
    const sendError = new Error('broker rejected request')
    const connect = vi.fn().mockResolvedValue()
    const send = vi.fn().mockRejectedValue(sendError)
    const producer = { connect, send }
    const kafka = { producer: vi.fn(() => producer) }
    kafkaInstance.mockReturnValue(kafka)

    const { publish } = await import('../../src/lib/publisherService.js')

    await expect(publish('orders', 'payload')).rejects.toThrow(sendError)
    expect(connect).toHaveBeenCalledTimes(1)
    expect(send).toHaveBeenCalledTimes(1)
  })

  it('propaga KafkaJSError si no corresponde a una desconexion', async () => {
    const sendError = new Error('request timeout')
    sendError.name = 'KafkaJSError'
    const connect = vi.fn().mockResolvedValue()
    const send = vi.fn().mockRejectedValue(sendError)
    const producer = { connect, send }
    const kafka = { producer: vi.fn(() => producer) }
    kafkaInstance.mockReturnValue(kafka)

    const { publish } = await import('../../src/lib/publisherService.js')

    await expect(publish('orders', 'payload')).rejects.toThrow(sendError)
    expect(connect).toHaveBeenCalledTimes(1)
    expect(send).toHaveBeenCalledTimes(1)
  })
})
