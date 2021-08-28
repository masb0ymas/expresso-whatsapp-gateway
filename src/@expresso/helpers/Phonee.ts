import ResponseError from '@expresso/modules/Response/ResponseError'
import { parsePhoneNumberFromString } from 'libphonenumber-js'

function formatPhone(phone: string) {
  let transformPhone = ''

  if (phone.startsWith('+62')) {
    transformPhone = phone.replace('+62', '0')
  } else if (phone.startsWith('62')) {
    transformPhone = phone.replace('62', '0')
  } else if (phone.startsWith('08')) {
    transformPhone = phone
  } else {
    throw new ResponseError.BadRequest('Invalid phone number indonesia')
  }

  const parsePhone = parsePhoneNumberFromString(transformPhone, 'ID')
  const newPhone = parsePhone?.number

  return newPhone
}

function formatPhoneWhatsApp(phone: string) {
  let newPhone = ''

  if (phone.startsWith('08')) {
    // @ts-ignore
    newPhone = formatPhone(phone)
  } else {
    newPhone = phone
  }

  let formatted = ''

  // @ts-ignore
  if (!newPhone.endsWith('@c.us')) {
    formatted = `${newPhone}@c.us`
  }

  const result = formatted.replace('+', '')

  return result
}

export { formatPhone, formatPhoneWhatsApp }
