export const KAFKA_CONFIGS = {
  HOST: process.env.KAFKA_HOST,
  PORT: process.env.KAFKA_PORT || '9092',
  RETRIES: process.env.KAFKA_RETRIES ? Number(process.env.KAFKA_RETRIES) : 3,
  CLIENT_ID: process.env.KAFKA_CLIENT_ID || 'my-app',
  GROUP_ID: process.env.KAFKA_GROUP_ID || 'test-group',
  ACKS: process.env.KAFKA_ACKS ? Number(process.env.KAFKA_ACKS) : -1,
}
