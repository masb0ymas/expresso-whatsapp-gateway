import * as yup from 'yup'

const clearMessage = yup
  .object()
  .shape({
    phone: yup.string().required('phone is required'),
  })
  .required()

const sendMessage = yup
  .object()
  .shape({
    phone: yup.string().required('phone is required'),
    message: yup.string().required('message is required'),
  })
  .required()

const sendMedia = yup
  .object()
  .shape({
    phone: yup.string().required('phone is required'),
    caption: yup.string().required('caption is required'),
  })
  .required()

const sendMediaByUrl = yup
  .object()
  .shape({
    phone: yup.string().required('phone is required'),
    caption: yup.string().required('caption is required'),
    url: yup.string().required('url is required'),
  })
  .required()

const sendGroupMessage = yup
  .object()
  .shape({
    chatId: yup.string().required('chat id is required'),
    groupName: yup.string().required('group name is required'),
    message: yup.string().required('message is required'),
  })
  .required()

const whatsappSchema = {
  clearMessage,
  sendMessage,
  sendMedia,
  sendMediaByUrl,
  sendGroupMessage,
}

export default whatsappSchema
