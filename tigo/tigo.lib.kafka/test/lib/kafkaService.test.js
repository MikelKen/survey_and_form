import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const kafkaConstructor = vi.fn()

vi.mock('kafkajs', () => ({
  Kafka: kafkaConstructor,
}))

describe('src/lib/kafkaService.js', () => {
  const originalEnv = { ...process.env }
  let logSpy
  let errorSpy

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      KAFKA_HOST: 'broker.host',
      KAFKA_PORT: '29092',
      KAFKA_RETRIES: '2',
      KAFKA_CLIENT_ID: 'orders-api',
    }
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    process.env = { ...originalEnv }
    vi.restoreAllMocks()
    vi.clearAllMocks()
    vi.useRealTimers()
    vi.resetModules()
  })

  it('inicializa Kafka una sola vez con host y puerto del entorno', async () => {
    const kafkaClient = {}
    kafkaConstructor.mockImplementation(function KafkaMock() { return kafkaClient })

    const { initializeKafka, kafkaInstance } = await import('../../src/lib/kafkaService.js')

    await initializeKafka()
    await initializeKafka()

    expect(kafkaConstructor).toHaveBeenCalledTimes(1)
    expect(kafkaConstructor).toHaveBeenCalledWith({
      clientId: 'orders-api',
      brokers: ['broker.host:29092'],
    })
    expect(kafkaInstance()).toBe(kafkaClient)
    expect(logSpy).toHaveBeenCalledWith('Kafka instance initialized')
  })

  it('usa my-app como clientId por defecto cuando no existe en el entorno', async () => {
    delete process.env.KAFKA_CLIENT_ID
    const kafkaClient = {}
    kafkaConstructor.mockImplementation(function KafkaMock() { return kafkaClient })

    const { initializeKafka } = await import('../../src/lib/kafkaService.js')

    await initializeKafka()

    expect(kafkaConstructor).toHaveBeenCalledWith({
      clientId: 'my-app',
      brokers: ['broker.host:29092'],
    })
  })

  it('registra handlers de producer una sola vez', async () => {
    const handlers = {}
    const instance = {
      _handlersAttached: false,
      events: {
        DISCONNECT: 'disconnect',
        CONNECT: 'connect',
        REQUEST_TIMEOUT: 'request_timeout',
      },
      on: vi.fn((event, handler) => {
        handlers[event] = handler
      }),
      connect: vi.fn().mockResolvedValue(),
    }

    const { attachKafkaErrorHandlers } = await import('../../src/lib/kafkaService.js')

    attachKafkaErrorHandlers(instance, 'Producer')
    attachKafkaErrorHandlers(instance, 'Producer')

    expect(instance.on).toHaveBeenCalledTimes(3)
    expect(handlers.disconnect).toBeTypeOf('function')
    expect(handlers.connect).toBeTypeOf('function')
    expect(handlers.request_timeout).toBeTypeOf('function')
  })

  it('usa el valor por defecto de reintentos cuando no existe en el entorno', async () => {
    delete process.env.KAFKA_RETRIES

    const instance = {
      _handlersAttached: false,
      events: {
        DISCONNECT: 'disconnect',
        CONNECT: 'connect',
        REQUEST_TIMEOUT: 'request_timeout',
      },
      on: vi.fn(),
      connect: vi.fn().mockResolvedValue(),
    }

    const { attachKafkaErrorHandlers } = await import('../../src/lib/kafkaService.js')

    attachKafkaErrorHandlers(instance, 'Producer')

    expect(instance.on).toHaveBeenCalledTimes(3)
  })

  it('intenta reconectar un producer al desconectarse', async () => {
    vi.useFakeTimers()

    const handlers = {}
    const instance = {
      events: {
        DISCONNECT: 'disconnect',
        CONNECT: 'connect',
        REQUEST_TIMEOUT: 'request_timeout',
      },
      on: vi.fn((event, handler) => {
        handlers[event] = handler
      }),
      connect: vi.fn().mockResolvedValue(),
    }

    const { attachKafkaErrorHandlers } = await import('../../src/lib/kafkaService.js')

    attachKafkaErrorHandlers(instance, 'Producer')
    handlers.disconnect()
    await vi.advanceTimersByTimeAsync(60000)

    expect(errorSpy).toHaveBeenCalledWith('[Kafka] Producer disconnected')
    expect(logSpy).toHaveBeenCalledWith('[Kafka] Producer intentando reconectar (1/2) en 1 minuto...')
    expect(instance.connect).toHaveBeenCalledTimes(1)
    expect(logSpy).toHaveBeenCalledWith('[Kafka] Producer reconectado exitosamente')
  })

  it('registra eventos de producer connect y request timeout', async () => {
    const handlers = {}
    const timeoutEvent = { correlationId: 'abc' }
    const instance = {
      events: {
        DISCONNECT: 'disconnect',
        CONNECT: 'connect',
        REQUEST_TIMEOUT: 'request_timeout',
      },
      on: vi.fn((event, handler) => {
        handlers[event] = handler
      }),
      connect: vi.fn().mockResolvedValue(),
    }

    const { attachKafkaErrorHandlers } = await import('../../src/lib/kafkaService.js')

    attachKafkaErrorHandlers(instance, 'Producer')
    handlers.connect()
    handlers.request_timeout(timeoutEvent)

    expect(logSpy).toHaveBeenCalledWith('[Kafka] Producer connected')
    expect(errorSpy).toHaveBeenCalledWith('[Kafka] Producer request timeout:', timeoutEvent)
  })

  it('registra error cuando falla la reconexion', async () => {
    vi.useFakeTimers()

    const handlers = {}
    const failure = new Error('network down')
    const instance = {
      events: {
        DISCONNECT: 'disconnect',
        CONNECT: 'connect',
        REQUEST_TIMEOUT: 'request_timeout',
      },
      on: vi.fn((event, handler) => {
        handlers[event] = handler
      }),
      connect: vi.fn().mockRejectedValueOnce(failure).mockResolvedValueOnce(),
    }

    const { attachKafkaErrorHandlers } = await import('../../src/lib/kafkaService.js')

    attachKafkaErrorHandlers(instance, 'Producer')
    handlers.disconnect()
    await vi.advanceTimersByTimeAsync(120000)
    await Promise.resolve()

    expect(errorSpy).toHaveBeenCalledWith('[Kafka] Producer error al reconectar:', failure)
    expect(instance.connect).toHaveBeenCalledTimes(2)
  })

  it('registra cuando supera el maximo de reintentos', async () => {
    vi.useFakeTimers()

    process.env.KAFKA_RETRIES = '1'

    const handlers = {}
    const failure = new Error('network down')
    const instance = {
      events: {
        DISCONNECT: 'disconnect',
        CONNECT: 'connect',
        REQUEST_TIMEOUT: 'request_timeout',
      },
      on: vi.fn((event, handler) => {
        handlers[event] = handler
      }),
      connect: vi.fn().mockRejectedValue(failure),
    }

    const { attachKafkaErrorHandlers } = await import('../../src/lib/kafkaService.js')

    attachKafkaErrorHandlers(instance, 'Producer')
    handlers.disconnect()
    await vi.advanceTimersByTimeAsync(120000)
    await Promise.resolve()

    expect(instance.connect).toHaveBeenCalledTimes(1)
    expect(errorSpy).toHaveBeenCalledWith('[Kafka] Producer superó el máximo de reintentos de reconexión (1)')
  })

  it('registra eventos de consumer con asignacion de particiones', async () => {
    const handlers = {}
    const crashError = new Error('consumer failed')
    const memberAssignment = { 'topic-a': [0, 2], 'topic-b': [1] }
    const instance = {
      events: {
        DISCONNECT: 'disconnect',
        CRASH: 'crash',
        CONNECT: 'connect',
        GROUP_JOIN: 'group_join',
      },
      on: vi.fn((event, handler) => {
        handlers[event] = handler
      }),
      connect: vi.fn().mockResolvedValue(),
    }

    const { attachKafkaErrorHandlers } = await import('../../src/lib/kafkaService.js')

    attachKafkaErrorHandlers(instance, 'Consumer-group-a')
    handlers.connect()
    handlers.group_join({ payload: { groupId: 'group-a', memberAssignment } })
    handlers.crash({ payload: { error: crashError } })

    expect(instance.on).toHaveBeenCalledTimes(4)
    expect(logSpy).toHaveBeenCalledWith('[Kafka] Consumer-group-a connected')
    expect(logSpy).toHaveBeenCalledWith('[Kafka] Consumer-group-a joined group:', 'group-a')
    expect(logSpy).toHaveBeenCalledWith('[Kafka] Consumer-group-a partition assignment:', memberAssignment)
    expect(errorSpy).toHaveBeenCalledWith('[Kafka] Consumer-group-a crashed:', crashError)
    expect(handlers.disconnect).toBeTypeOf('function')
  })
})
