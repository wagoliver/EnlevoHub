// Shared constants

export const API_VERSION = 'v1'

export const DEFAULT_PAGE_SIZE = 20
export const MAX_PAGE_SIZE = 100

export const PASSWORD_MIN_LENGTH = 8
export const PASSWORD_MAX_LENGTH = 128

export const JWT_EXPIRY = '15m'
export const REFRESH_TOKEN_EXPIRY = '7d'

export const UPLOAD_MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
export const SUPPORTED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

export const DATE_FORMAT = 'yyyy-MM-dd'
export const DATETIME_FORMAT = 'yyyy-MM-dd HH:mm:ss'

export const CURRENCIES = {
  BRL: 'R$',
  USD: '$',
  EUR: '€',
}

export const UNIT_MEASURES = {
  METER: 'm',
  SQUARE_METER: 'm²',
  CUBIC_METER: 'm³',
  LITER: 'L',
  KILOGRAM: 'kg',
  UNIT: 'un',
  BOX: 'cx',
  BAG: 'sc',
}
