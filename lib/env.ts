// Environment utilities
export const getEnvVar = (key: string, defaultValue?: string): string => {
  return process.env[key] || defaultValue || ''
}

export const isProduction = (): boolean => {
  return process.env.NODE_ENV === 'production'
}

export const isDevelopment = (): boolean => {
  return process.env.NODE_ENV === 'development'
}