import '@testing-library/jest-dom'

// Mock environment variables
process.env.NODE_ENV = 'test'
process.env.DATABASE_URL = 'mysql://test:test@localhost:3306/test_db'
process.env.NEXTAUTH_SECRET = 'test-secret-min-32-characters-long-for-testing'
process.env.NEXTAUTH_URL = 'http://localhost:3000'
