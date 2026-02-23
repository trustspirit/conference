import type { SurveyField } from '../types'

export const generateFieldId = (): string => {
  return `f_${crypto.randomUUID()}`
}

export const getDefaultFields = (t: (key: string) => string): SurveyField[] => [
  {
    id: 'f_name',
    type: 'short_text',
    label: t('builder.participantFields.name'),
    required: true,
    group: 'personal',
    participantField: 'name',
  },
  {
    id: 'f_email',
    type: 'short_text',
    label: t('builder.participantFields.email'),
    required: true,
    inputType: 'email',
    group: 'personal',
    participantField: 'email',
  },
  {
    id: 'f_phone',
    type: 'short_text',
    label: t('builder.participantFields.phoneNumber'),
    required: false,
    inputType: 'tel',
    group: 'contact',
    participantField: 'phoneNumber',
  },
  {
    id: 'f_gender',
    type: 'dropdown',
    label: t('builder.participantFields.gender'),
    required: false,
    group: 'contact',
    participantField: 'gender',
    options: [t('register.form.genderMale'), t('register.form.genderFemale')],
  },
  {
    id: 'f_age',
    type: 'short_text',
    label: t('builder.participantFields.age'),
    required: false,
    inputType: 'number',
    group: 'contact',
    participantField: 'age',
  },
  {
    id: 'f_church',
    type: 'church_info',
    label: t('builder.fieldType.church_info'),
    required: false,
  },
]

export const createEmptyField = (): SurveyField => ({
  id: generateFieldId(),
  type: 'short_text',
  label: '',
  required: false,
})
