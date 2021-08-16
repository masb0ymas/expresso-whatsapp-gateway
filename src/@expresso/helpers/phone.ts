import parsePhoneNumberFromString from 'libphonenumber-js'

const formatPhoneWA = function (phone: string) {
  let newPhone = ''

  if (phone.startsWith('08')) {
    const parsePhone = parsePhoneNumberFromString(phone, 'ID')
    // @ts-ignore
    newPhone = parsePhone?.number
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

export default formatPhoneWA
